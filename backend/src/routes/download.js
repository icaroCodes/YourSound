const express = require('express');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');

const { verifyAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const isWindows = process.platform === 'win32';
const ffmpegExecutable = isWindows ? require('ffmpeg-static') : 'ffmpeg';
const ytDlpPath = path.join(__dirname, '..', '..', 'bin', isWindows ? 'yt-dlp.exe' : 'yt-dlp');

// 1. ANTI-ABUSE: Strict Rate Limiting
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 downloads por IP (evita spam e overload de CPU)
  message: { error: 'Limite de downloads (5/15min) atingido. Evite sobrecarga.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. CONCURRENCY CONTROL: Prevent fork bomb and CPU exhaustion
class Semaphore {
  constructor(max) {
    this.max = max;
    this.active = 0;
    this.waiting = [];
  }
  async acquire() {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    return new Promise(resolve => this.waiting.push(resolve));
  }
  release() {
    if (this.active > 0) this.active--;
    if (this.waiting.length > 0) {
      this.active++;
      const next = this.waiting.shift();
      next();
    }
  }
}
// Limita max threads rodando yt-dlp/ffmpeg na máquina
const concurrencyLimit = new Semaphore(3);

function validateMediaUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const valid = host.includes('youtube.com') || host.includes('youtu.be') || host.includes('tiktok.com');
    return { valid, host };
  } catch {
    return { valid: false, host: null };
  }
}

router.post('/', verifyAuth, downloadLimiter, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }

  // Validação rígida contra command injection
  const urlCheck = validateMediaUrl(url);
  if (!urlCheck.valid) {
    return res.status(400).json({ error: 'Link não suportado. Use YouTube ou TikTok.' });
  }

  // 3. ENQUEUE REQUEST (prevents CPU explosion)
  console.log(`[DOWNLOAD] Job na fila para: ${url.substring(0, 40)}...`);
  await concurrencyLimit.acquire();
  console.log(`[DOWNLOAD] Job iniciado.`);

  let released = false;
  const releaseSlot = () => {
    if (!released) {
      released = true;
      concurrencyLimit.release();
    }
  };

  // 4. PROCESS ABORT CONTROLLER (Strict Timeouts per process)
  const ac = new AbortController();
  
  // Hard limit global de 120s para liberar a fila em caso de zumbi process
  const timeoutId = setTimeout(() => {
    console.error(`[DOWNLOAD] TIMEOUT global atingido.`);
    ac.abort('TIMEOUT');
  }, 120000);

  const cleanup = () => {
    clearTimeout(timeoutId);
    if (!ac.signal.aborted) ac.abort('CLEANUP');
    releaseSlot();
  };

  // Libera slot e mata subprocessos caso o usuário cancele/feche o navegador
  req.on('close', cleanup);
  res.on('finish', cleanup);
  res.on('error', cleanup);

  try {
    // 5. ARGUMENT WHITELISTING (Strict Sandboxing against injections)
    const ytdlpArgs = [
      '--force-ipv4',
      '--no-playlist',
      '-f', 'bestaudio/best',
      '--quiet',         // Required para não poluir stdout
      '--no-warnings',
      '-o', '-',         // Stream directly to stdout
      '--', url          // Isolador absoluto de URL
    ];

    const ffmpegArgs = [
      '-i', 'pipe:0',    // Lê do stdin de forma contínua
      '-vn',             // Elimina qualquer stream de video
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '128k',
      '-f', 'mp3',
      'pipe:1'           // Escreve chunk a chunk no stdout
    ];

    // 6. PIPING DIRECTLY TO RESPONSE (Zero disk I/O)
    const ytdlpProcess = spawn(ytDlpPath, ytdlpArgs, { 
      signal: ac.signal,
      stdio: ['ignore', 'pipe', 'pipe'] 
    });

    const ffmpegProcess = spawn(ffmpegExecutable, ffmpegArgs, { 
      signal: ac.signal,
      stdio: ['pipe', 'pipe', 'pipe'] 
    });

    let ytdlpErrorLog = '';
    ytdlpProcess.stderr.on('data', d => ytdlpErrorLog += d.toString());

    let ffmpegErrorLog = '';
    ffmpegProcess.stderr.on('data', d => ffmpegErrorLog += d.toString());

    // Stream topology: yt-dlp (stdout) -> ffmpeg (stdin)
    ytdlpProcess.stdout.pipe(ffmpegProcess.stdin);

    // Stream topology: ffmpeg (stdout) -> HTTP res
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
    
    ffmpegProcess.stdout.pipe(res);

    // Failure checks
    ytdlpProcess.on('exit', (code) => {
      if (code !== 0 && !ac.signal.aborted) {
        console.error(`[DOWNLOAD] yt-dlp error (${code}):`, ytdlpErrorLog.substring(0, 200));
        if (!res.headersSent) {
          res.status(500).json({ error: 'Falha ao extrair áudio da URL fornecida.' });
        } else {
          // Force stream to crash so frontend knows it's an incomplete file
          res.destroy(new Error('Stream crash on extraction'));
        }
        cleanup();
      }
    });

    ffmpegProcess.on('exit', (code) => {
      if (code !== 0 && !ac.signal.aborted) {
        console.error(`[DOWNLOAD] ffmpeg error (${code}):`, ffmpegErrorLog.substring(0, 200));
        if (!res.headersSent) {
          res.status(500).json({ error: 'Falha na conversão para MP3.' });
        } else {
          res.destroy(new Error('Stream crash on encode'));
        }
        cleanup();
      }
    });

  } catch (err) {
    console.error(`[DOWNLOAD] Exception:`, err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Erro interno no servidor de mídia.' });
    cleanup();
  }
});

module.exports = router;
