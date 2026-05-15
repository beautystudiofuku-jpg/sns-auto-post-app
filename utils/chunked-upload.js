const fs = require('fs');
const axios = require('axios');
const { logger } = require('../middleware/error-handler');

async function uploadChunks(uploadUrl, filePath, chunkSize = 10 * 1024 * 1024) {
  const fileSize = fs.statSync(filePath).size;
  const totalChunks = Math.ceil(fileSize / chunkSize);
  const fileHandle = fs.openSync(filePath, 'r');

  try {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const currentChunkSize = Math.min(chunkSize, fileSize - start);
      const end = start + currentChunkSize - 1;
      const buffer = Buffer.alloc(currentChunkSize);
      fs.readSync(fileHandle, buffer, 0, currentChunkSize, start);

      await axios.put(uploadUrl, buffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': currentChunkSize.toString(),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      logger.info(`チャンク ${i + 1}/${totalChunks} アップロード完了 (${Math.round(((end + 1) / fileSize) * 100)}%)`);
    }
  } finally {
    fs.closeSync(fileHandle);
  }
}

module.exports = { uploadChunks };
