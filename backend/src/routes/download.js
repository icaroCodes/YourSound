const express = require('express');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');

const { verifyAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const fs = require('fs');
const isWindows = process.platform === 'win32';

// ffmpeg-static fornece o binário em qualquer plataforma — em produção
// (Railway/Render/Linux) o `ffmpeg` do PATH não existe, então temos que apontar
// explicitamente para o binário empacotado pelo npm.
const ffmpegExecutable = require('ffmpeg-static');

const ytDlpPath = path.join(__dirname, '..', '..', 'bin', isWindows ? 'yt-dlp.exe' : 'yt-dlp');

// Em Linux o binário pode ter perdido a flag de execução (ex.: cache do build).
// Garantimos chmod +x na primeira chamada.
if (!isWindows && fs.existsSync(ytDlpPath)) {
  try {
    fs.accessSync(ytDlpPath, fs.constants.X_OK);
  } catch {
    try { fs.chmodSync(ytDlpPath, 0o755); } catch {}
  }
}

// User-agent realista — IPs de datacenter (Railway/Vercel/Render) costumam
// receber bloqueio anti-bot do YouTube/TikTok quando o UA é o default do yt-dlp.
const REALISTIC_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

// Argumentos base do yt-dlp, compartilhados entre áudio e vídeo.
// Flags adicionais para burlar bloqueio em IPs de datacenter:
//  - user-agent realista de navegador
//  - geo-bypass
//  - retries + fragment-retries para resiliência de rede
//  - extractor-args para usar o client "android"/"web" do YouTube
//    (mais tolerante a anti-bot que o default)
function buildYtdlpArgs(url, isYoutube, kind) {
  const args = [
    '--force-ipv4',
    '--no-playlist',
    '--no-check-certificates',
    '--geo-bypass',
    '--user-agent', REALISTIC_UA,
    '--add-header', 'Accept-Language:en-US,en;q=0.9',
    '--retries', '5',
    '--fragment-retries', '5',
    '--socket-timeout', '20',
    '--quiet',
    '--no-warnings',
  ];

  if (kind === 'video') {
    // Melhor formato progressivo MP4 (vídeo+áudio em um único stream,
    // que pode ser enviado direto ao cliente sem remux/merge).
    args.push('-f', 'best[ext=mp4]/best');
  } else {
    args.push('-f', 'bestaudio/best');
  }

  args.push('-o', '-'); // stdout

  if (isYoutube) {
    args.push('--extractor-args', 'youtube:player_client=android,web');
  }

  args.push('--', url);
  return args;
}

// Handler genérico: kind === 'audio' converte para MP3 via ffmpeg,
// kind === 'video' envia o MP4 direto do yt-dlp.
async function handleMedia(req, res, kind) {
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
  console.log(`[DOWNLOAD:${kind}] Job na fila para: ${url.substring(0, 40)}...`);
  await concurrencyLimit.acquire();
  console.log(`[DOWNLOAD:${kind}] Job iniciado.`);

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
    console.error(`[DOWNLOAD:${kind}] TIMEOUT global atingido.`);
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
    // Verifica se o binário yt-dlp existe antes de prosseguir
    if (!fs.existsSync(ytDlpPath)) {
      console.error(`[DOWNLOAD:${kind}] yt-dlp binary not found at ${ytDlpPath}`);
      cleanup();
      return res.status(500).json({ error: 'Conversor indisponível no servidor (yt-dlp ausente).' });
    }

    const isYoutube = urlCheck.host.includes('youtube.com') || urlCheck.host.includes('youtu.be');
    const ytdlpArgs = buildYtdlpArgs(url, isYoutube, kind);

    // ── MODO VÍDEO: envia o MP4 direto do yt-dlp (sem reencode) ──────────
    if (kind === 'video') {
      const ytdlpProcess = spawn(ytDlpPath, ytdlpArgs, {
        signal: ac.signal,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let ytdlpErrorLog = '';
      ytdlpProcess.stderr.on('data', d => ytdlpErrorLog += d.toString());

      ytdlpProcess.on('error', (err) => {
        console.error(`[DOWNLOAD:video] yt-dlp spawn error:`, err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Não foi possível iniciar o conversor.' });
        } else {
          res.destroy(err);
        }
        cleanup();
      });

      // Suppress EPIPE on the pipe to the response.
      ytdlpProcess.stdout.on('error', () => {});

      // Só anexa headers/pipe quando o yt-dlp realmente produz dados,
      // assim uma falha precoce ainda consegue devolver JSON de erro.
      let firstChunkSent = false;
      ytdlpProcess.stdout.on('data', (chunk) => {
        if (!firstChunkSent) {
          firstChunkSent = true;
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
          res.write(chunk);
          ytdlpProcess.stdout.pipe(res);
        }
      });

      ytdlpProcess.on('exit', (code) => {
        if (code !== 0 && !ac.signal.aborted) {
          console.error(`[DOWNLOAD:video] yt-dlp error (${code}):`, ytdlpErrorLog.substring(0, 200));
          if (!res.headersSent) {
            res.status(500).json({ error: 'Falha ao baixar o vídeo da URL fornecida.' });
          } else {
            res.destroy(new Error('Stream crash on extraction'));
          }
          cleanup();
        } else if (code === 0 && !firstChunkSent && !res.headersSent) {
          res.status(500).json({ error: 'Nenhum vídeo foi extraído do link.' });
          cleanup();
        }
      });

      return;
    }

    // ── MODO ÁUDIO: yt-dlp -> ffmpeg -> MP3 ──────────────────────────────
    if (!ffmpegExecutable || !fs.existsSync(ffmpegExecutable)) {
      console.error(`[DOWNLOAD:audio] ffmpeg binary not found (ffmpeg-static path: ${ffmpegExecutable})`);
      cleanup();
      return res.status(500).json({ error: 'Codificador indisponível no servidor (ffmpeg ausente).' });
    }

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

    // Capture spawn errors (e.g. ENOENT) — these don't trigger 'exit'
    ytdlpProcess.on('error', (err) => {
      console.error('[DOWNLOAD:audio] yt-dlp spawn error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Não foi possível iniciar o conversor.' });
      } else {
        res.destroy(err);
      }
      cleanup();
    });
    ffmpegProcess.on('error', (err) => {
      console.error('[DOWNLOAD:audio] ffmpeg spawn error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Não foi possível iniciar o codificador MP3.' });
      } else {
        res.destroy(err);
      }
      cleanup();
    });

    // Suppress EPIPE on ytdlp->ffmpeg pipe — happens normally when ffmpeg
    // exits early or yt-dlp aborts; without this, an unhandled 'error' on
    // the stdin write would crash the request.
    ytdlpProcess.stdout.on('error', () => {});
    ffmpegProcess.stdin.on('error', () => {});

    // Defer attaching response headers/pipe until ffmpeg actually produces
    // data. This way, an early failure can still send a JSON error.
    let firstChunkSent = false;
    ffmpegProcess.stdout.on('data', (chunk) => {
      if (!firstChunkSent) {
        firstChunkSent = true;
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
        res.write(chunk);
        ffmpegProcess.stdout.pipe(res);
      }
    });

    // Stream topology: yt-dlp (stdout) -> ffmpeg (stdin)
    ytdlpProcess.stdout.pipe(ffmpegProcess.stdin);

    // Failure checks
    ytdlpProcess.on('exit', (code) => {
      if (code !== 0 && !ac.signal.aborted) {
        console.error(`[DOWNLOAD:audio] yt-dlp error (${code}):`, ytdlpErrorLog.substring(0, 200));
        if (!res.headersSent) {
          res.status(500).json({ error: 'Falha ao extrair áudio da URL fornecida.' });
        } else {
          res.destroy(new Error('Stream crash on extraction'));
        }
        cleanup();
      }
    });

    ffmpegProcess.on('exit', (code) => {
      if (code !== 0 && !ac.signal.aborted) {
        console.error(`[DOWNLOAD:audio] ffmpeg error (${code}):`, ffmpegErrorLog.substring(0, 200));
        if (!res.headersSent) {
          res.status(500).json({ error: 'Falha na conversão para MP3.' });
        } else {
          res.destroy(new Error('Stream crash on encode'));
        }
        cleanup();
      } else if (code === 0 && !firstChunkSent && !res.headersSent) {
        // ffmpeg exited cleanly but produced no audio
        res.status(500).json({ error: 'Nenhum áudio foi extraído do link.' });
        cleanup();
      }
    });

  } catch (err) {
    console.error(`[DOWNLOAD:${kind}] Exception:`, err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Erro interno no servidor de mídia.' });
    cleanup();
  }
}

// POST /api/download        → MP3 (áudio)
router.post('/', (req, res) => handleMedia(req, res, 'audio'));
// POST /api/download/video  → MP4 (vídeo)
router.post('/video', (req, res) => handleMedia(req, res, 'video'));

module.exports = router;
