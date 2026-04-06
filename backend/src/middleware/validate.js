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
  ALLOWED_AUDIO_MIMES,
  ALLOWED_IMAGE_MIMES,
  MAX_AUDIO_SIZE,
  MAX_IMAGE_SIZE
};
