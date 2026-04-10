/**
 * Downloads the yt-dlp binary if it doesn't already exist.
 * Runs automatically after `npm install` (postinstall script).
 */
const path = require('path');
const fs = require('fs');

const binDir = path.join(__dirname, '..', 'bin');
const isWindows = process.platform === 'win32';
const binName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const binPath = path.join(binDir, binName);

if (fs.existsSync(binPath)) {
  console.log('[postinstall] yt-dlp already exists, skipping download.');
  process.exit(0);
}

(async () => {
  try {
    const YTDlpWrap = require('yt-dlp-wrap').default;
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
    console.log('[postinstall] Downloading yt-dlp...');
    await YTDlpWrap.downloadFromGithub(binPath);
    console.log('[postinstall] yt-dlp downloaded successfully.');
  } catch (err) {
    console.warn('[postinstall] Failed to download yt-dlp:', err.message);
    console.warn('[postinstall] You may need to download it manually to backend/bin/');
  }
})();
