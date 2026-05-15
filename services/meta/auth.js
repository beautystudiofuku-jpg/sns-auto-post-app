const axios = require('axios');
const crypto = require('crypto');
const config = require('../../config');

const AUTH_URL = 'https://www.facebook.com/v22.0/dialog/oauth';
const TOKEN_URL = `https://graph.facebook.com/${config.meta.graphApiVersion}/oauth/access_token`;
const GRAPH_URL = `https://graph.facebook.com/${config.meta.graphApiVersion}`;

// state管理（CSRF対策）
const pendingStates = new Map();

function getAuthorizationUrl(storeId) {
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, { storeId, createdAt: Date.now() });

  // 古いstateを削除（10分以上前）
  for (const [key, value] of pendingStates) {
    if (Date.now() - value.createdAt > 10 * 60 * 1000) {
      pendingStates.delete(key);
    }
  }

  const params = new URLSearchParams({
    client_id: config.meta.appId,
    redirect_uri: config.meta.redirectUri,
    response_type: 'code',
    scope: config.meta.scopes,
    state,
  });

  return `${AUTH_URL}?${params.toString()}`;
}

function validateState(state) {
  const data = pendingStates.get(state);
  if (!data) return null;
  pendingStates.delete(state);

  // 10分以内
  if (Date.now() - data.createdAt > 10 * 60 * 1000) return null;
  return data;
}

/**
 * 認証コードを短期アクセストークンに交換する
 */
async function exchangeCodeForTokens(code) {
  const response = await axios.get(TOKEN_URL, {
    params: {
      client_id: config.meta.appId,
      client_secret: config.meta.appSecret,
      redirect_uri: config.meta.redirectUri,
      code,
    },
  });

  return response.data;
}

/**
 * 短期トークンを長期トークン（60日）に変換する
 */
async function getLongLivedToken(shortLivedToken) {
  const response = await axios.get(TOKEN_URL, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: config.meta.appId,
      client_secret: config.meta.appSecret,
      fb_exchange_token: shortLivedToken,
    },
  });

  // expires_in（秒）が返ってくる場合がある
  return response.data;
}

/**
 * Facebookページ一覧を取得する
 * @param {string} userAccessToken - ユーザーアクセストークン
 * @returns {Array} pages
 */
async function getFacebookPages(userAccessToken) {
  const response = await axios.get(`${GRAPH_URL}/me/accounts`, {
    params: {
      access_token: userAccessToken,
      fields: 'id,name,access_token,instagram_business_account',
    },
  });

  return response.data.data || [];
}

/**
 * FacebookページからInstagramビジネスアカウントIDを取得する
 * @param {string} userAccessToken - ユーザーアクセストークン
 * @returns {{ igUserId: string, igUsername: string, pageId: string, pageName: string, pageAccessToken: string } | null}
 */
async function getInstagramBusinessAccount(userAccessToken) {
  const pages = await getFacebookPages(userAccessToken);

  for (const page of pages) {
    if (page.instagram_business_account) {
      const igUserId = page.instagram_business_account.id;

      // Instagramアカウントの詳細情報を取得
      let igUsername = '';
      try {
        const igResponse = await axios.get(`${GRAPH_URL}/${igUserId}`, {
          params: {
            access_token: userAccessToken,
            fields: 'id,username,name',
          },
        });
        igUsername = igResponse.data.username || igResponse.data.name || '';
      } catch (e) {
        igUsername = '';
      }

      return {
        igUserId,
        igUsername,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
      };
    }
  }

  return null;
}

/**
 * トークンの有効期限情報を取得する
 * @param {string} accessToken
 * @returns {{ expires_at: number|null }}
 */
async function getTokenInfo(accessToken) {
  const response = await axios.get(`${GRAPH_URL}/debug_token`, {
    params: {
      input_token: accessToken,
      access_token: `${config.meta.appId}|${config.meta.appSecret}`,
    },
  });

  return response.data.data || {};
}

/**
 * 長期トークンをリフレッシュする
 * Meta長期トークンは期限前に再度getLongLivedTokenを呼ぶことで更新する
 * @param {string} longLivedToken
 */
async function refreshAccessToken(longLivedToken) {
  // Meta長期トークンはfb_exchange_tokenで再発行する
  const response = await axios.get(TOKEN_URL, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: config.meta.appId,
      client_secret: config.meta.appSecret,
      fb_exchange_token: longLivedToken,
    },
  });

  return response.data;
}

module.exports = {
  getAuthorizationUrl,
  validateState,
  exchangeCodeForTokens,
  getLongLivedToken,
  getFacebookPages,
  getInstagramBusinessAccount,
  getTokenInfo,
  refreshAccessToken,
};
