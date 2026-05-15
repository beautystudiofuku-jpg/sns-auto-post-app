const axios = require('axios');

const ACCOUNTS_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
const LOCATIONS_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const POSTS_URL = 'https://mybusiness.googleapis.com/v4';

function authHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
}

// アカウント一覧取得
async function listAccounts(accessToken) {
  const response = await axios.get(ACCOUNTS_URL, {
    headers: authHeader(accessToken),
  });
  return response.data.accounts || [];
}

// ロケーション一覧取得
async function listLocations(accessToken, accountId) {
  const response = await axios.get(
    `${LOCATIONS_URL}/${accountId}/locations`,
    {
      headers: authHeader(accessToken),
      params: { readMask: 'name,title,storefrontAddress' },
    }
  );
  return response.data.locations || [];
}

// ローカル投稿作成（What's New タイプ）
async function createLocalPost(accessToken, accountId, locationId, postData) {
  const { summary, callToActionType, callToActionUrl, mediaUrl } = postData;

  const body = {
    topicType: 'STANDARD',
    languageCode: 'ja',
    summary,
  };

  if (callToActionType && callToActionUrl) {
    body.callToAction = {
      actionType: callToActionType,
      url: callToActionUrl,
    };
  }

  if (mediaUrl) {
    body.media = [{
      mediaFormat: 'PHOTO',
      sourceUrl: mediaUrl,
    }];
  }

  const response = await axios.post(
    `${POSTS_URL}/${accountId}/${locationId}/localPosts`,
    body,
    { headers: authHeader(accessToken) }
  );

  return response.data;
}

module.exports = {
  listAccounts,
  listLocations,
  createLocalPost,
};
