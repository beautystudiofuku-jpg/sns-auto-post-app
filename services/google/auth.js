const axios = require('axios');
const crypto = require('crypto');
const config = require('../../config');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

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
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    scope: config.google.scopes,
    access_type: 'offline',
    prompt: 'consent',
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

async function exchangeCodeForTokens(code) {
  const response = await axios.post(TOKEN_URL, {
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.google.redirectUri,
  });

  return response.data;
}

async function refreshAccessToken(refreshToken) {
  const response = await axios.post(TOKEN_URL, {
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  return response.data;
}

module.exports = {
  getAuthorizationUrl,
  validateState,
  exchangeCodeForTokens,
  refreshAccessToken,
};
