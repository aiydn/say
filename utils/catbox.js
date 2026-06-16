const { Catbox } = require('node-catbox');
const fs = require('fs');
const path = require('path');

const catbox = new Catbox();

/**
 * Upload a local file to Catbox.
 * Returns the catbox URL.
 */
async function uploadFile(filePath) {
  const response = await catbox.uploadFile({ path: filePath });
  return response;
}

/**
 * Download a Discord attachment to a temp file, then upload to Catbox.
 * Returns the catbox URL.
 */
async function uploadFromDiscord(attachmentUrl) {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const tempPath = path.join(dataDir, `temp_${Date.now()}`);

  // Download using fetch (handles redirects properly)
  const response = await fetch(attachmentUrl, {
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to download attachment: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tempPath, buffer);

  // Verify we actually got data
  if (buffer.length === 0) {
    fs.unlinkSync(tempPath);
    throw new Error('Downloaded file is empty (0 bytes)');
  }

  // Upload to Catbox
  let catboxUrl;
  try {
    catboxUrl = await uploadFile(tempPath);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }

  return catboxUrl;
}

module.exports = { uploadFile, uploadFromDiscord };
