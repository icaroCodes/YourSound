const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const router = express.Router();
const axios = require('axios');
const ffmpegPath = require('ffmpeg-static');
const mm = require('music-metadata');

// Extract duration in seconds from an audio Buffer
async function getDuration(buffer, mimeType = 'audio/mpeg') {
  try {
    const meta = await mm.parseBuffer(buffer, { mimeType }, { duration: true });
    return meta.format.duration ?? null;
  } catch {
    return null;
  }
}
const { supabase } = require('../config/supabase');
const { verifyAuth } = require('../middleware/auth');
const {
  sanitizeString,
  ALLOWED_AUDIO_MIMES,
  ALLOWED_IMAGE_MIMES,
  MAX_AUDIO_SIZE,
  MAX_IMAGE_SIZE
} = require('../middleware/validate');

// yt-dlp binary — lives in backend/bin/
const ytdlpBin = path.join(__dirname, '..', '..', 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

/** Run yt-dlp with a hard timeout — never hangs */
function runYtdlp(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const proc = execFile(ytdlpBin, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const msg = (stderr || err.message || '').split('\n').find(l => l.startsWith('ERROR:')) || 'Falha ao extrair áudio.';
        reject(new Error(msg));
      } else {
        resolve(stdout);
      }
    });
  });
}

// Multer config — files go to memory, NEVER to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_SIZE }
});

router.get('/ping', (req, res) => res.send('pong'));

// PATCH /api/songs/:id/duration — backfill duration for existing songs (called by player on load)
router.patch('/:id/duration', verifyAuth, async (req, res) => {
  try {
    const { duration } = req.body;
    if (!duration || typeof duration !== 'number' || duration <= 0) {
      return res.status(400).json({ error: 'Duração inválida.' });
    }
    const { error } = await supabase
      .from('songs')
      .update({ duration })
      .eq('id', req.params.id)
      .eq('user_id', req.userId) // only owner can update
      .is('duration', null);     // only backfill if not set yet
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/songs
 * Returns songs the authenticated user is allowed to see:
 *   - Public + approved songs (visible to everyone)
 *   - User's own songs regardless of status
 * 
 * The user_id comes from the server-validated token, NOT from query params.
 */
router.get('/', verifyAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .or(`and(is_public.eq.true,status.eq.approved),user_id.eq.${req.userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[GET /songs]', err.message);
    res.status(500).json({ error: 'Erro ao buscar músicas.' });
  }
});

/**
 * GET /api/songs/search?q=<query>
 * Search songs by title. Returns only songs the user is allowed to see.
 */
router.get('/search', verifyAuth, async (req, res) => {
  try {
    const q = sanitizeString(req.query.q || '', 100);

    let query = supabase
      .from('songs')
      .select('*')
      .or(`and(is_public.eq.true,status.eq.approved),user_id.eq.${req.userId}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (q.length >= 2) {
      query = query.ilike('title', `%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[GET /songs/search]', err.message);
    res.status(500).json({ error: 'Erro na busca.' });
  }
});

/**
 * POST /api/songs/upload
 * Upload a song with audio file + optional cover image.
 * 
 * SECURITY: 
 *   - user_id is taken from the verified token, not from the body
 *   - File types are validated server-side against whitelist
 *   - File sizes are enforced by multer AND our own checks
 *   - Filenames are sanitized to prevent path traversal
 *   - status is always forced to 'pending' for public songs — client cannot override
 */
router.post(
  '/upload',
  verifyAuth,
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const title = sanitizeString(req.body.title, 100);
      const artist = sanitizeString(req.body.artist, 100);
      const isPublic = req.body.is_public === 'true';

      // --- Validation ---
      if (!title || !artist) {
        return res.status(400).json({ error: 'Título e artista são obrigatórios.' });
      }

      if (!req.files?.audio?.[0]) {
        return res.status(400).json({ error: 'Arquivo de áudio é obrigatório.' });
      }

      const audioFile = req.files.audio[0];

      // Validate audio mime type against whitelist
      if (!ALLOWED_AUDIO_MIMES.includes(audioFile.mimetype)) {
        return res.status(400).json({ 
          error: `Tipo de áudio não permitido: ${audioFile.mimetype}. Envie MP3, WAV, OGG, AAC, FLAC ou M4A.` 
        });
      }

      if (audioFile.size > MAX_AUDIO_SIZE) {
        return res.status(400).json({ error: 'Arquivo de áudio excede 15MB.' });
      }

      // --- Upload Audio to Supabase Storage ---
      const cleanAudioName = audioFile.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const audioPath = `${req.userId}/${Date.now()}_${cleanAudioName}`;

      const { error: audioUploadError } = await supabase.storage
        .from('songs')
        .upload(audioPath, audioFile.buffer, {
          contentType: audioFile.mimetype,
          upsert: false
        });

      if (audioUploadError) {
        throw new Error(`Storage audio error: ${audioUploadError.message}`);
      }

      const { data: { publicUrl: audioUrl } } = supabase.storage
        .from('songs')
        .getPublicUrl(audioPath);

      // --- Upload Cover (optional) ---
      let coverUrl = null;
      if (req.files?.cover?.[0]) {
        const coverFile = req.files.cover[0];

        if (!ALLOWED_IMAGE_MIMES.includes(coverFile.mimetype)) {
          return res.status(400).json({ error: 'Tipo de imagem não permitido. Envie JPG, PNG, WebP ou GIF.' });
        }

        if (coverFile.size > MAX_IMAGE_SIZE) {
          return res.status(400).json({ error: 'Imagem de capa excede 5MB.' });
        }

        const cleanCoverName = coverFile.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const coverPath = `${req.userId}/${Date.now()}_${cleanCoverName}`;

        const { error: coverUploadError } = await supabase.storage
          .from('covers')
          .upload(coverPath, coverFile.buffer, {
            contentType: coverFile.mimetype,
            upsert: false
          });

        if (coverUploadError) {
          throw new Error(`Storage cover error: ${coverUploadError.message}`);
        }

        const { data: { publicUrl: cUrl } } = supabase.storage
          .from('covers')
          .getPublicUrl(coverPath);

        coverUrl = cUrl;
      }

      // --- Extract duration ---
      const duration = await getDuration(audioFile.buffer, audioFile.mimetype);

      // --- Insert DB record ---
      // SECURITY: user_id comes from req.userId (server-verified),
      // status is forced server-side — client CANNOT set themselves as 'approved'
      const { data: songData, error: dbError } = await supabase
        .from('songs')
        .insert({
          title,
          artist,
          file_url: audioUrl,
          cover_url: coverUrl,
          user_id: req.userId,
          is_public: isPublic,
          status: isPublic ? 'pending' : 'approved',
          ...(duration != null ? { duration } : {})
        })
        .select()
        .single();

      if (dbError) throw dbError;

      res.status(201).json({ 
        message: isPublic 
          ? 'Música enviada! Aguardando aprovação do admin.' 
          : 'Música privada adicionada com sucesso!',
        song: songData
      });

    } catch (err) {
      console.error('[POST /songs/upload]', err.message);
      res.status(500).json({ error: err.message || 'Erro ao fazer upload.' });
    }
  }
);

/**
 * POST /api/songs/from-link
 * Import a song from a YouTube or TikTok link.
 *
 * YouTube/TikTok URLs are NOT direct audio files — they cannot be played
 * in a <audio> tag. The only reliable method is server-side extraction:
 *   1. yt-dlp downloads the best audio stream
 *   2. ffmpeg converts it to MP3
 *   3. The MP3 buffer is uploaded to Supabase Storage
 */
router.post(
  '/from-link',
  verifyAuth,
  upload.fields([{ name: 'cover', maxCount: 1 }]),
  async (req, res) => {
    // Hard timeout — guarantee a response within 90s no matter what
    const ROUTE_TIMEOUT = 90000;
    let responded = false;
    const safeJson = (status, body) => {
      if (!responded) { responded = true; res.status(status).json(body); }
    };
    const timer = setTimeout(() => {
      console.error('[FROM-LINK] TIMEOUT: 90s exceeded, forcing response.');
      safeJson(504, { error: 'Importação demorou demais. Tente novamente.' });
    }, ROUTE_TIMEOUT);

    // Track temp files so we always clean up
    const tempFiles = [];
    const cleanup = () => {
      clearTimeout(timer);
      tempFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });
    };

    try {
      console.log('[FROM-LINK] === Handler entered ===');
      console.log('[FROM-LINK] body keys:', Object.keys(req.body || {}));

      const title = sanitizeString(req.body.title, 100);
      const artist = sanitizeString(req.body.artist, 100);
      const isPublic = req.body.is_public === 'true';
      const url = req.body.url;

      if (!title || !artist || !url) {
        cleanup();
        return safeJson(400, { error: 'Título, artista e URL são obrigatórios.' });
      }

      const isSupported = /(?:youtube\.com|youtu\.be|tiktok\.com)/.test(url);
      if (!isSupported) {
        cleanup();
        return safeJson(400, { error: 'Link não suportado. Use YouTube ou TikTok.' });
      }

      console.log(`[FROM-LINK] URL: ${url}`);

      // ── Step 1: yt-dlp downloads best audio ──
      const tmpId = `${req.userId}_${Date.now()}`;
      const rawPath = path.join(os.tmpdir(), `${tmpId}_raw`);
      const mp3Path = path.join(os.tmpdir(), `${tmpId}.mp3`);
      tempFiles.push(rawPath, mp3Path);

      console.log('[FROM-LINK] Step 1: yt-dlp extract...');
      await runYtdlp([
        url,
        '-f', 'bestaudio/best',
        '-o', rawPath,
        '--no-playlist',
        '--no-warnings',
        '--max-filesize', '15M',
      ], 45000);
      console.log('[FROM-LINK] Step 1 done.');

      // Find the actual file (yt-dlp may add an extension)
      let actualRawPath = rawPath;
      if (!fs.existsSync(rawPath)) {
        const dir = os.tmpdir();
        const match = fs.readdirSync(dir).find(f => f.startsWith(`${tmpId}_raw`));
        if (match) {
          actualRawPath = path.join(dir, match);
          tempFiles.push(actualRawPath);
        } else {
          throw new Error('Falha ao extrair áudio. Tente outro link.');
        }
      }
      console.log('[FROM-LINK] Raw file:', actualRawPath);

      // ── Step 2: ffmpeg converts to MP3 128kbps ──
      console.log('[FROM-LINK] Step 2: ffmpeg convert...');
      await new Promise((resolve, reject) => {
        execFile(ffmpegPath, [
          '-i', actualRawPath,
          '-vn',
          '-ar', '44100',
          '-ac', '2',
          '-b:a', '128k',
          '-f', 'mp3',
          '-y',
          mp3Path
        ], { timeout: 60000 }, (err, stdout, stderr) => {
          if (err) reject(new Error('Falha na conversão do áudio.'));
          else resolve();
        });
      });
      console.log('[FROM-LINK] Step 2 done.');

      const audioBuffer = fs.readFileSync(mp3Path);
      console.log(`[FROM-LINK] MP3 size: ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`);

      if (audioBuffer.length > MAX_AUDIO_SIZE) {
        cleanup();
        return safeJson(400, { error: 'O áudio é maior que 15MB. Tente um vídeo mais curto.' });
      }

      const duration = await getDuration(audioBuffer, 'audio/mpeg');

      // ── Step 3: Upload to Supabase Storage ──
      console.log('[FROM-LINK] Step 3: Supabase upload...');
      const audioStoragePath = `${req.userId}/${Date.now()}_imported.mp3`;

      const { error: uploadError } = await supabase.storage
        .from('songs')
        .upload(audioStoragePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false
        });

      if (uploadError) throw new Error(`Erro no Storage: ${uploadError.message}`);

      const { data: { publicUrl: audioUrl } } = supabase.storage
        .from('songs')
        .getPublicUrl(audioStoragePath);
      console.log('[FROM-LINK] Step 3 done.');

      // --- Cover ---
      let coverUrl = null;
      if (req.files?.cover?.[0]) {
        console.log('[FROM-LINK] Uploading cover...');
        const coverFile = req.files.cover[0];
        const coverPath = `${req.userId}/${Date.now()}_${coverFile.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

        await supabase.storage.from('covers').upload(coverPath, coverFile.buffer, {
          contentType: coverFile.mimetype
        });

        const { data: { publicUrl: cUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath);
        coverUrl = cUrl;
      }

      // --- Insert DB record ---
      console.log('[FROM-LINK] Step 4: DB insert...');
      const { data: songData, error: dbError } = await supabase
        .from('songs')
        .insert({
          title,
          artist,
          file_url: audioUrl,
          cover_url: coverUrl,
          user_id: req.userId,
          is_public: isPublic,
          status: isPublic ? 'pending' : 'approved',
          ...(duration != null ? { duration } : {})
        })
        .select()
        .single();

      if (dbError) throw dbError;

      cleanup();
      console.log('[FROM-LINK] === SUCCESS ===');
      safeJson(201, {
        message: isPublic
          ? 'Música importada! Aguardando aprovação.'
          : 'Música importada com sucesso!',
        song: songData
      });
    } catch (err) {
      cleanup();
      console.error('[FROM-LINK] === ERROR ===', err.message);
      safeJson(500, { error: err.message || 'Erro ao importar do link.' });
    }
  }
);

module.exports = router;
