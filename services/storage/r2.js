const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

let _client = null;

function getClient() {
  if (_client) return _client;

  if (!config.useR2) {
    throw new Error('R2 が設定されていません。.env で R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT を設定してください。');
  }

  _client = new S3Client({
    region: 'auto',
    endpoint: config.r2.endpoint,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
  });

  return _client;
}

// バッファまたはファイルパスを R2 にアップロード
// 戻り値: { key, url }
async function uploadBuffer(key, buffer, contentType) {
  const client = getClient();

  await client.send(new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return {
    key,
    url: `${config.r2.publicUrl}/${key}`,
  };
}

// multer が保存したローカルファイルを R2 に転送して、ローカルファイルを削除
async function uploadFromLocalPath(localPath, mimeType, prefix = 'uploads') {
  const filename = path.basename(localPath);
  const key = `${prefix}/${filename}`;

  const buffer = fs.readFileSync(localPath);
  const result = await uploadBuffer(key, buffer, mimeType);

  // ローカルの一時ファイルは削除
  try {
    fs.unlinkSync(localPath);
  } catch (err) {
    // 削除失敗は致命的ではない
  }

  return result;
}

async function deleteObject(key) {
  const client = getClient();
  await client.send(new DeleteObjectCommand({
    Bucket: config.r2.bucket,
    Key: key,
  }));
}

// 公開URLから key を逆算するヘルパー
function keyFromPublicUrl(url) {
  if (!url || !url.startsWith(config.r2.publicUrl + '/')) return null;
  return url.slice(config.r2.publicUrl.length + 1);
}

module.exports = {
  uploadBuffer,
  uploadFromLocalPath,
  deleteObject,
  keyFromPublicUrl,
};
