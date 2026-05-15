const axios = require('axios');
const crypto = require('crypto');
const config = require('../../config');

const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const REVOKE_URL = 'https://open.tiktokapis.com/v2/oauth/revoke/';

// state管理（メモリ内、10分TTL）
const pendingStates = new Map();

function getAuthorizationUrl(storeId) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = Buffer.from(JSON.stringify({ storeId, nonce })).toString('base64url');

  pendingStates.set(nonce, { storeId, createdAt: Date.now() });

  // 期限切れstateを掃除
  for (const [key, val] of pendingStates) {
    if (Date.now() - val.createdAt > 10 * 60 * 1000) {
      pendingStates.delete(key);
    }
  }

  const params = new URLSearchParams({
    client_key: config.tiktok.clientKey,
    response_type: 'code',
    scope: config.tiktok.scopes,
    redirect_uri: config.tiktok.redirectUri,
    state,
  });

  return `${AUTH_URL}?${params.toString()}`;
}

function validateState(stateStr) {
  try {
    const { storeId, nonce } = JSON.parse(Buffer.from(stateStr, 'base64url').toString());
    const pending = pendingStates.get(nonce);
    if (!pending) return null;
    if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
      pendingStates.delete(nonce);
      return null;
    }
    pendingStates.delete(nonce);
    return { storeId, nonce };
  } catch {
    return null;
  }
}

async function exchangeCodeForTokens(code) {
  const params = new URLSearchParams({
    client_key: config.tiktok.clientKey,
    client_secret: config.tiktok.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.tiktok.redirectUri,
  });

  const response = await axios.post(TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data;
}

async function refreshAccessToken(refreshToken) {
  const params = new URLSearchParams({
    client_key: config.tiktok.clientKey,
    client_secret: config.tiktok.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await axios.post(TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data;
}

async function revokeToken(accessToken) {
  const params = new URLSearchParams({
    client_key: config.tiktok.clientKey,
    token: accessToken,
  });

  await axios.post(REVOKE_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

module.exports = {
  getAuthorizationUrl,
  validateState,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
};
