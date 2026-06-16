const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const API_URL = 'https://catbox.moe/user/api.php';

/**
 * Upload a local file to Catbox.
 * Returns the catbox URL, e.g. "https://files.catbox.moe/abc123.png"
 */
async function uploadFile(filePath) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fs.createReadStream(filePath));

  const res = await fetch(API_URL, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });

  const text = await res.text();

  if (res.ok && text.trim().startsWith('https://')) {
    return text.trim();
  }

  throw new Error(`Catbox upload failed: ${text.trim()}`);
}

/**
 * Upload a URL to Catbox (Catbox re-hosts the file).
 * Returns the catbox URL.
 */
async function uploadURL(url) {
  const form = new FormData();
  form.append('reqtype', 'urlupload');
  form.append('url', url);

  const res = await fetch(API_URL, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });

  const text = await res.text();

  if (res.ok && text.trim().startsWith('https://')) {
    return text.trim();
  }

  throw new Error(`Catbox URL upload failed: ${text.trim()}`);
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

  // Upload to Catbox via file upload
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

module.exports = { uploadFile, uploadURL, uploadFromDiscord };
