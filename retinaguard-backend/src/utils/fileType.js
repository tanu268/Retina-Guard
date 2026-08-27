'use strict';
const fs = require('node:fs');

/**
 * Magic-byte sniffing. Never trust the client-supplied MIME type or extension
 * (security baseline, blueprint §12 G-security "input validation").
 */
const SIGNATURES = [
  { mime: 'image/jpeg', ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/tiff', ext: 'tif', bytes: [0x49, 0x49, 0x2a, 0x00] },
  { mime: 'image/tiff', ext: 'tif', bytes: [0x4d, 0x4d, 0x00, 0x2a] },
];

function detectFromBuffer(buf) {
  for (const sig of SIGNATURES) {
    if (buf.length >= sig.bytes.length && sig.bytes.every((b, i) => buf[i] === b)) {
      return { mime: sig.mime, ext: sig.ext };
    }
  }
  return null;
}

async function detectFromFile(filePath) {
  const fd = await fs.promises.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(16);
    await fd.read(buf, 0, 16, 0);
    return detectFromBuffer(buf);
  } finally {
    await fd.close();
  }
}

module.exports = { detectFromBuffer, detectFromFile, SIGNATURES };
