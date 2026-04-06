const express = require('express');
const multer = require('multer');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { verifyAuth } = require('../middleware/auth');
const { 
  sanitizeString, 
  ALLOWED_AUDIO_MIMES, 
  ALLOWED_IMAGE_MIMES, 
  MAX_AUDIO_SIZE, 
  MAX_IMAGE_SIZE 
} = require('../middleware/validate');

// Multer config — files go to memory, NEVER to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_SIZE }
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
    const q = sanitizeString(req.query.q, 100);
    if (q.length < 2) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .or(`and(is_public.eq.true,status.eq.approved),user_id.eq.${req.userId}`)
      .ilike('title', `%${q}%`)
      .limit(10);

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
          status: isPublic ? 'pending' : 'approved'
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

module.exports = router;
