/**
 * Input validation/sanitization helpers.
 * Never trust anything that comes from req.body or req.params.
 */

const sanitizeString = (str, maxLength = 200) => {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
};

const isValidUUID = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

/**
 * Escapes SQL LIKE wildcard characters to prevent filter injection.
 * Use when building .ilike() queries with user input.
 */
const escapeLike = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[%_\\]/g, '\\$&');
};

/**
 * Validates that a URL is a supported media platform URL.
 * Returns { valid: boolean, hostname: string | null }.
 *
 * SECURITY: Strict hostname whitelist — prevents SSRF and command injection
 * via yt-dlp by ensuring only known-safe domains are processed.
 */
const ALLOWED_MEDIA_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
];

const validateMediaUrl = (url) => {
  if (typeof url !== 'string' || !url) return { valid: false, hostname: null };

  // Reject anything that looks like a yt-dlp flag
  if (url.startsWith('-') || url.includes(' --')) return { valid: false, hostname: null };

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, hostname: null };
  }

  // Only allow http(s)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, hostname: null };
  }

  // Strict hostname match
  if (!ALLOWED_MEDIA_HOSTS.includes(parsed.hostname)) {
    return { valid: false, hostname: parsed.hostname };
  }

  return { valid: true, hostname: parsed.hostname };
};

const ALLOWED_AUDIO_MIMES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav', 
  'audio/ogg',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/webm',
  'audio/flac'
];

const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

const MAX_AUDIO_SIZE = 15 * 1024 * 1024;  // 15MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB

module.exports = {
  sanitizeString,
  isValidUUID,
  escapeLike,
  validateMediaUrl,
  ALLOWED_MEDIA_HOSTS,
  ALLOWED_AUDIO_MIMES,
  ALLOWED_IMAGE_MIMES,
  MAX_AUDIO_SIZE,
  MAX_IMAGE_SIZE
};
