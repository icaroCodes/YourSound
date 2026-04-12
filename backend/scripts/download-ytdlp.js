/**
 * Downloads the yt-dlp binary for the current platform if not already present.
 * Runs automatically after `npm install` (postinstall script).
 */
const path = require('path');
const fs = require('fs');

const binDir = path.join(__dirname, '..', 'bin');
const isWindows = process.platform === 'win32';
const binName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const binPath = path.join(binDir, binName);

// On Linux/Mac, check if the platform-specific binary exists AND is executable
const needsDownload = () => {
  if (!fs.existsSync(binPath)) return true;
  if (isWindows) return false;
  try {
    fs.accessSync(binPath, fs.constants.X_OK);
    return false; // exists and executable
  } catch {
    return true; // exists but not executable — re-download
  }
};

if (!needsDownload()) {
  console.log(`[postinstall] yt-dlp already exists at ${binPath}, skipping download.`);
  process.exit(0);
}

(async () => {
  try {
    const YTDlpWrap = require('yt-dlp-wrap').default;
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

    console.log(`[postinstall] Downloading yt-dlp for ${process.platform}...`);
    await YTDlpWrap.downloadFromGithub(binPath);

    // Ensure executable on Unix
    if (!isWindows) {
      fs.chmodSync(binPath, 0o755);
      console.log('[postinstall] Set yt-dlp as executable (chmod 755).');
    }

    console.log('[postinstall] yt-dlp downloaded successfully.');
  } catch (err) {
    console.warn('[postinstall] Failed to download yt-dlp:', err.message);
    console.warn('[postinstall] Proxy-stream video feature will not work until yt-dlp is available.');
  }
})();
