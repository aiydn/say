const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const API_URL = 'https://catbox.moe/user/api.php';

/**
 * Make a multipart/form-data POST to Catbox.
 * Returns the response body as text (the catbox URL on success).
 */
function postForm(form) {
  return new Promise((resolve, reject) => {
    form.submit(API_URL, (err, res) => {
      if (err) return reject(err);

      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 200 && body.trim().startsWith('https://')) {
          resolve(body.trim());
        } else {
          reject(new Error(`Catbox upload failed: ${body.trim()}`));
        }
      });
    });
  });
}

/**
 * Upload a local file to Catbox.
 * Returns the catbox URL, e.g. "https://files.catbox.moe/abc123.png"
 */
async function uploadFile(filePath) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fs.createReadStream(filePath));

  return postForm(form);
}

/**
 * Upload a URL to Catbox (Catbox re-hosts the file).
 * Returns the catbox URL.
 */
async function uploadURL(url) {
  const form = new FormData();
  form.append('reqtype', 'urlupload');
  form.append('url', url);

  return postForm(form);
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

  // Download Discord attachment
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
    // Always clean up
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }

  return catboxUrl;
}

module.exports = { uploadFile, uploadURL, uploadFromDiscord };
