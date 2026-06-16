const { Catbox } = require('node-catbox');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const catbox = new Catbox();

/**
 * Upload a file from a URL to Catbox (re-hosts it).
 * Returns the catbox URL, e.g. "https://files.catbox.moe/abc123.png"
 */
async function urlUpload(url) {
  const response = await catbox.uploadURL({ url });
  return response;
}

/**
 * Upload a local file to Catbox.
 * Returns the catbox URL.
 */
async function fileUpload(filePath) {
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

  // Download Discord attachment to temp file
  await new Promise((resolve, reject) => {
    const client = attachmentUrl.startsWith('https') ? https : http;

    const doRequest = (url) => {
      client.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location);
        } else {
          const stream = fs.createWriteStream(tempPath);
          res.pipe(stream);
          stream.on('finish', resolve);
          stream.on('error', reject);
        }
      }).on('error', reject);
    };

    doRequest(attachmentUrl);
  });

  // Upload to Catbox
  let catboxUrl;
  try {
    catboxUrl = await fileUpload(tempPath);
  } finally {
    // Always clean up temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }

  return catboxUrl;
}

module.exports = { urlUpload, fileUpload, uploadFromDiscord };
