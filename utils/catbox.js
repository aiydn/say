const { Catbox } = require('node-catbox');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const catbox = new Catbox();

/**
 * Upload a Discord attachment URL to Catbox.
 * Catbox downloads the file itself — no temp files needed.
 * Returns the catbox URL, e.g. "https://files.catbox.moe/abc123.png"
 */
async function uploadFromDiscord(attachmentUrl) {
  try {
    const catboxUrl = await catbox.uploadURL({ url: attachmentUrl });
    return catboxUrl;
  } catch (error) {
    console.error('Catbox URL upload failed:', error);
    throw error;
  }
}

module.exports = { uploadFromDiscord };
