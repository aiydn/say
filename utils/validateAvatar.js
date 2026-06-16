const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

function isValidAvatar(attachment) {
  if (!attachment) return false;
  return ALLOWED_TYPES.includes(attachment.contentType);
}

module.exports = { isValidAvatar };
