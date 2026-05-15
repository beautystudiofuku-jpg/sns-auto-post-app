const axios = require('axios');
const fs = require('fs');
const { uploadChunks } = require('../../utils/chunked-upload');
const { withRetry } = require('../../utils/retry');

const INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
const STATUS_URL = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/';

async function initializeDirectPost(accessToken, options) {
  const { title, privacyLevel, videoSize, disableComment, disableDuet, disableStitch } = options;

  // 5MB未満はチャンク分割不要（1チャンクで送る）
  const chunkSize = videoSize < 5 * 1024 * 1024 ? videoSize : 10 * 1024 * 1024;
  const totalChunkCount = Math.ceil(videoSize / chunkSize);

  const payload = {
    post_info: {
      title: title || '',
      privacy_level: privacyLevel || 'SELF_ONLY',
      disable_comment: disableComment || false,
      disable_duet: disableDuet || false,
      disable_stitch: disableStitch || false,
    },
    source_info: {
      source: 'FILE_UPLOAD',
      video_size: videoSize,
      chunk_size: chunkSize,
      total_chunk_count: totalChunkCount,
    },
  };

  try {
    const response = await axios.post(INIT_URL, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data?.data;
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`TikTok投稿初期化失敗: ${detail}`);
  }
}

async function uploadVideo(uploadUrl, filePath) {
  const chunkSize = 10 * 1024 * 1024; // 10MB
  await uploadChunks(uploadUrl, filePath, chunkSize);
}

async function checkPostStatus(accessToken, publishId) {
  const response = await axios.post(STATUS_URL, { publish_id: publishId }, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data?.data;
}

async function pollPostStatus(accessToken, publishId, maxAttempts = 12, intervalMs = 5000) {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkPostStatus(accessToken, publishId);
    if (status?.status === 'PUBLISH_COMPLETE') return status;
    if (status?.status === 'FAILED') throw new Error(`投稿失敗: ${status.fail_reason || '不明なエラー'}`);
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return { status: 'PROCESSING' };
}

module.exports = {
  initializeDirectPost,
  uploadVideo,
  checkPostStatus,
  pollPostStatus,
};
