const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const config = require('../config.json');

const API_URL = 'https://freeimage.host/api/1/upload';

/**
 * Upload a local file to freeimage.host.
 * Returns the direct image URL.
 */
async function uploadFile(filePath) {
  const form = new FormData();
  form.append('key', config.freeimageApiKey);
  form.append('action', 'upload');
  form.append('source', fs.createReadStream(filePath));
  form.append('format', 'json');

  const res = await fetch(API_URL, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });

  const json = await res.json();

  if (json.status_code === 200) {
    return json.image.url; // direct link to the image
  }

  throw new Error(`freeimage.host upload failed: ${json.error?.message || JSON.stringify(json)}`);
}

/**
 * Upload a base64 string to freeimage.host.
 * Returns the direct image URL.
 */
async function uploadBase64(base64String) {
  const form = new FormData();
  form.append('key', config.freeimageApiKey);
  form.append('action', 'upload');
  form.append('source', base64String);
  form.append('format', 'json');

  const res = await fetch(API_URL, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });

  const json = await res.json();

  if (json.status_code === 200) {
    return json.image.url;
  }

  throw new Error(`freeimage.host upload failed: ${json.error?.message || JSON.stringify(json)}`);
}

/**
 * Download a Discord attachment to a temp file, then upload to freeimage.host.
 * Returns the direct image URL.
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

  // Upload to freeimage.host
  let imageUrl;
  try {
    imageUrl = await uploadFile(tempPath);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }

  return imageUrl;
}

module.exports = { uploadFile, uploadBase64, uploadFromDiscord };
