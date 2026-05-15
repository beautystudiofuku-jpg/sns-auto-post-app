const axios = require('axios');
const config = require('../../config');

const GRAPH_URL = `https://graph.facebook.com/${config.meta.graphApiVersion}`;

/**
 * 画像投稿コンテナを作成する（ステップ1）
 * @param {string} accessToken - ユーザーアクセストークン
 * @param {string} igUserId - InstagramビジネスアカウントID
 * @param {string} imageUrl - 画像のURL（公開アクセス可能）
 * @param {string} caption - キャプション
 * @param {object} options - オプション（is_story, scheduled_publish_time）
 * @returns {string} creationId
 */
async function createImageContainer(accessToken, igUserId, imageUrl, caption, options = {}) {
  const params = {
    image_url: imageUrl,
    access_token: accessToken,
  };

  if (options.is_story) {
    // ストーリーズの場合：media_typeを指定、キャプションなし
    params.media_type = 'STORIES';
  } else {
    // 通常投稿
    params.caption = caption || '';
    // 予約投稿
    if (options.scheduled_publish_time) {
      params.published = false;
      params.scheduled_publish_time = options.scheduled_publish_time;
    }
  }

  const response = await axios.post(
    `${GRAPH_URL}/${igUserId}/media`,
    params
  );

  return response.data.id;
}

/**
 * 作成済みコンテナを公開する（ステップ2）
 * @param {string} accessToken
 * @param {string} igUserId
 * @param {string} creationId
 * @returns {{ id: string }} 公開された投稿ID
 */
async function publishContainer(accessToken, igUserId, creationId) {
  const response = await axios.post(
    `${GRAPH_URL}/${igUserId}/media_publish`,
    {
      creation_id: creationId,
      access_token: accessToken,
    }
  );

  return response.data;
}

/**
 * 投稿ステータスを確認する
 * @param {string} accessToken
 * @param {string} creationId
 * @returns {{ status_code: string, id: string }}
 */
async function getContainerStatus(accessToken, creationId) {
  const response = await axios.get(`${GRAPH_URL}/${creationId}`, {
    params: {
      fields: 'status_code,status',
      access_token: accessToken,
    },
  });

  return response.data;
}

/**
 * Instagramに画像を投稿する（2ステップ: コンテナ作成 -> 公開）
 * @param {string} accessToken - ユーザーアクセストークン
 * @param {string} igUserId - InstagramビジネスアカウントID
 * @param {string} imageUrl - 公開アクセス可能な画像URL
 * @param {string} caption - キャプション
 * @param {object} options - { is_story, scheduled_publish_time }
 * @returns {{ postId: string, creationId: string }}
 */
async function postImage(accessToken, igUserId, imageUrl, caption, options = {}) {
  // ステップ1: メディアコンテナ作成
  const creationId = await createImageContainer(accessToken, igUserId, imageUrl, caption, options);

  // 予約投稿の場合はコンテナ作成のみで完了（自動的に予約される）
  if (options.scheduled_publish_time && !options.is_story) {
    return {
      postId: creationId,
      creationId,
      scheduled: true,
    };
  }

  // ステップ2: コンテナ公開（FINISHED になるまで最大30秒待機）
  let statusCode = 'IN_PROGRESS';
  let attempts = 0;
  const maxAttempts = 6;

  while (statusCode === 'IN_PROGRESS' && attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 5000));
    const statusData = await getContainerStatus(accessToken, creationId);
    statusCode = statusData.status_code || 'IN_PROGRESS';
    attempts++;
  }

  if (statusCode === 'ERROR') {
    throw new Error('Instagramメディアコンテナの処理に失敗しました');
  }

  // ステップ3: 公開
  const publishResult = await publishContainer(accessToken, igUserId, creationId);

  return {
    postId: publishResult.id,
    creationId,
  };
}

/**
 * Facebookページにテキスト投稿する
 * @param {string} pageAccessToken - ページアクセストークン
 * @param {string} pageId - FacebookページID
 * @param {string} message - 投稿テキスト
 * @param {object} options - { link, scheduled_publish_time }
 * @returns {{ id: string }}
 */
async function postToFacebookPage(pageAccessToken, pageId, message, options = {}) {
  const params = {
    message,
    access_token: pageAccessToken,
  };

  if (options.link) {
    params.link = options.link;
  }

  if (options.scheduled_publish_time) {
    params.published = false;
    params.scheduled_publish_time = options.scheduled_publish_time;
  }

  const response = await axios.post(
    `${GRAPH_URL}/${pageId}/feed`,
    params
  );

  return response.data;
}

/**
 * Facebookページに画像付き投稿する
 * @param {string} pageAccessToken - ページアクセストークン
 * @param {string} pageId - FacebookページID
 * @param {string} message - 投稿テキスト
 * @param {string} imageUrl - 画像URL
 * @param {object} options - { scheduled_publish_time }
 * @returns {{ id: string }}
 */
async function postImageToFacebookPage(pageAccessToken, pageId, message, imageUrl, options = {}) {
  const params = {
    url: imageUrl,
    caption: message || '',
    access_token: pageAccessToken,
  };

  if (options.scheduled_publish_time) {
    params.published = false;
    params.scheduled_publish_time = options.scheduled_publish_time;
  }

  const response = await axios.post(
    `${GRAPH_URL}/${pageId}/photos`,
    params
  );

  return response.data;
}

module.exports = {
  createImageContainer,
  publishContainer,
  getContainerStatus,
  postImage,
  postToFacebookPage,
  postImageToFacebookPage,
};
