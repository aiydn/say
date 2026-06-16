const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const API_URL = 'https://0x0.st';

/**
 * Upload a local file to 0x0.st.
 * Returns the URL, e.g. "https://0x0.st/HF9Z.png"
 */
async function uploadFile(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const res = await fetch(API_URL, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });

  const text = await res.text();

  if (res.ok && text.trim().startsWith('https://')) {
    return text.trim();
  }

  throw new Error(`0x0.st upload failed: ${text.trim()}`);
}

/**
 * Upload a URL to 0x0.st (0x0 re-hosts the file).
 * Returns the URL.
 */
async function uploadURL(url) {
  const form = new FormData();
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

  throw new Error(`0x0.st URL upload failed: ${text.trim()}`);
}

/**
 * Download a Discord attachment to a temp file, then upload to 0x0.st.
 * Returns the URL.
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

  // Upload to 0x0.st
  let fileUrl;
  try {
    fileUrl = await uploadFile(tempPath);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }

  return fileUrl;
}

module.exports = { uploadFile, uploadURL, uploadFromDiscord };
