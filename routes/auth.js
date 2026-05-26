const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');
const tiktokAuth = require('../services/tiktok/auth');
const { queryCreatorInfo } = require('../services/tiktok/creator');
const googleAuth = require('../services/google/auth');
const { listAccounts, listLocations } = require('../services/google/post');
const metaAuth = require('../services/meta/auth');
const { logger } = require('../middleware/error-handler');

// TikTok OAuth開始
router.get('/tiktok/authorize/:storeId', (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.storeId);
  if (!store) return res.status(404).json({ error: '店舗が見つかりません' });

  const authUrl = tiktokAuth.getAuthorizationUrl(parseInt(req.params.storeId));
  res.redirect(authUrl);
});

// TikTok OAuthコールバック（GitHub Pagesから中継される）
router.get('/tiktok/callback', async (req, res) => {
  const { code, state, scopes, error } = req.query;

  if (error) {
    logger.error(`TikTok認証エラー: ${error}`);
    return res.redirect('/?error=' + encodeURIComponent('TikTok認証がキャンセルされました'));
  }

  if (!code || !state) {
    return res.redirect('/?error=' + encodeURIComponent('認証情報が不足しています'));
  }

  // state検証
  const stateData = tiktokAuth.validateState(state);
  if (!stateData) {
    return res.redirect('/?error=' + encodeURIComponent('認証の有効期限が切れました。もう一度お試しください。'));
  }

  try {
    // トークン取得
    const tokenData = await tiktokAuth.exchangeCodeForTokens(code);
    const { access_token, refresh_token, open_id, expires_in } = tokenData;

    if (!access_token) {
      throw new Error('トークンの取得に失敗しました');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expires_in || 86400) * 1000);
    const refreshExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // クリエイター情報取得
    let creatorInfo = {};
    try {
      creatorInfo = await queryCreatorInfo(access_token);
    } catch (e) {
      logger.warn('クリエイター情報取得スキップ: ' + e.message);
    }

    // DB保存（UPSERT）
    db.prepare(`
      INSERT INTO sns_accounts (store_id, platform, platform_user_id, platform_username,
        access_token_encrypted, refresh_token_encrypted, token_expires_at, refresh_token_expires_at,
        scopes, privacy_level_options, max_video_duration_sec)
      VALUES (?, 'tiktok', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id, platform) DO UPDATE SET
        platform_user_id = excluded.platform_user_id,
        platform_username = excluded.platform_username,
        access_token_encrypted = excluded.access_token_encrypted,
        refresh_token_encrypted = excluded.refresh_token_encrypted,
        token_expires_at = excluded.token_expires_at,
        refresh_token_expires_at = excluded.refresh_token_expires_at,
        scopes = excluded.scopes,
        privacy_level_options = excluded.privacy_level_options,
        max_video_duration_sec = excluded.max_video_duration_sec,
        is_active = 1,
        updated_at = datetime('now')
    `).run(
      stateData.storeId,
      open_id,
      creatorInfo.creator_nickname || '',
      encrypt(access_token),
      encrypt(refresh_token),
      expiresAt.toISOString(),
      refreshExpiresAt.toISOString(),
      scopes || '',
      JSON.stringify(creatorInfo.privacy_level_options || ['SELF_ONLY']),
      creatorInfo.max_video_post_duration_sec || 60
    );

    // ログ記録
    db.prepare(`
      INSERT INTO activity_log (store_id, action, details)
      VALUES (?, 'auth_connected', ?)
    `).run(stateData.storeId, JSON.stringify({ platform: 'tiktok', open_id }));

    logger.info(`TikTokアカウント連携完了: store ${stateData.storeId}`);
    res.redirect('/?success=' + encodeURIComponent('TikTokアカウントを連携しました'));

  } catch (err) {
    logger.error(`TikTokトークン取得失敗: ${err.message}`);
    res.redirect('/?error=' + encodeURIComponent('TikTok連携に失敗しました: ' + err.message));
  }
});

// TikTok接続解除
router.delete('/tiktok/disconnect/:accountId', async (req, res) => {
  const account = db.prepare('SELECT * FROM sns_accounts WHERE id = ? AND platform = ?').get(req.params.accountId, 'tiktok');
  if (!account) return res.status(404).json({ error: 'アカウントが見つかりません' });

  try {
    const accessToken = decrypt(account.access_token_encrypted);
    await tiktokAuth.revokeToken(accessToken);
  } catch (e) {
    logger.warn('トークン取り消しスキップ: ' + e.message);
  }

  db.prepare('UPDATE sns_accounts SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?')
    .run(req.params.accountId);

  db.prepare('INSERT INTO activity_log (store_id, sns_account_id, action) VALUES (?, ?, ?)')
    .run(account.store_id, account.id, 'auth_disconnected');

  res.json({ message: 'TikTokアカウントを切断しました' });
});

// ===== Google Business Profile =====

// Google OAuth開始
router.get('/google/authorize/:storeId', (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.storeId);
  if (!store) return res.status(404).json({ error: '店舗が見つかりません' });

  const authUrl = googleAuth.getAuthorizationUrl(parseInt(req.params.storeId));
  res.redirect(authUrl);
});

// Google OAuthコールバック
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    logger.error(`Google認証エラー: ${error}`);
    return res.redirect('/?error=' + encodeURIComponent('Google認証がキャンセルされました'));
  }

  if (!code || !state) {
    return res.redirect('/?error=' + encodeURIComponent('認証情報が不足しています'));
  }

  const stateData = googleAuth.validateState(state);
  if (!stateData) {
    return res.redirect('/?error=' + encodeURIComponent('認証の有効期限が切れました。もう一度お試しください。'));
  }

  try {
    const tokenData = await googleAuth.exchangeCodeForTokens(code);
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      throw new Error('トークンの取得に失敗しました');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expires_in || 3600) * 1000);
    const refreshExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // アカウント・ロケーション情報を取得
    let accountName = '';
    let locationName = '';
    let locationTitle = '';
    try {
      const accounts = await listAccounts(access_token);
      if (accounts.length > 0) {
        accountName = accounts[0].name; // "accounts/123456789"
        const locations = await listLocations(access_token, accountName);
        if (locations.length > 0) {
          locationName = locations[0].name; // "accounts/123/locations/456"
          locationTitle = locations[0].title || '';
        }
      }
    } catch (e) {
      logger.warn('Google アカウント/ロケーション取得スキップ: ' + e.message);
    }

    // DB保存（UPSERT）
    db.prepare(`
      INSERT INTO sns_accounts (store_id, platform, platform_user_id, platform_username,
        access_token_encrypted, refresh_token_encrypted, token_expires_at, refresh_token_expires_at,
        scopes)
      VALUES (?, 'google_business', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id, platform) DO UPDATE SET
        platform_user_id = excluded.platform_user_id,
        platform_username = excluded.platform_username,
        access_token_encrypted = excluded.access_token_encrypted,
        refresh_token_encrypted = excluded.refresh_token_encrypted,
        token_expires_at = excluded.token_expires_at,
        refresh_token_expires_at = excluded.refresh_token_expires_at,
        scopes = excluded.scopes,
        is_active = 1,
        updated_at = datetime('now')
    `).run(
      stateData.storeId,
      accountName ? `${accountName}|${locationName}` : '',
      locationTitle || accountName,
      encrypt(access_token),
      refresh_token ? encrypt(refresh_token) : null,
      expiresAt.toISOString(),
      refreshExpiresAt.toISOString(),
      'business.manage'
    );

    db.prepare(`
      INSERT INTO activity_log (store_id, action, details)
      VALUES (?, 'auth_connected', ?)
    `).run(stateData.storeId, JSON.stringify({ platform: 'google_business', accountName, locationTitle }));

    logger.info(`Googleアカウント連携完了: store ${stateData.storeId}`);
    res.redirect('/?success=' + encodeURIComponent('Googleビジネスプロフィールを連携しました'));

  } catch (err) {
    logger.error(`Googleトークン取得失敗: ${err.message}`);
    res.redirect('/?error=' + encodeURIComponent('Google連携に失敗しました: ' + err.message));
  }
});

// Google接続解除
router.delete('/google/disconnect/:accountId', async (req, res) => {
  const account = db.prepare('SELECT * FROM sns_accounts WHERE id = ? AND platform = ?').get(req.params.accountId, 'google_business');
  if (!account) return res.status(404).json({ error: 'アカウントが見つかりません' });

  db.prepare('UPDATE sns_accounts SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?')
    .run(req.params.accountId);

  db.prepare('INSERT INTO activity_log (store_id, sns_account_id, action) VALUES (?, ?, ?)')
    .run(account.store_id, account.id, 'auth_disconnected');

  res.json({ message: 'Googleアカウントを切断しました' });
});

// ===== Meta（Instagram） =====

// Meta OAuth開始
router.get('/meta/authorize/:storeId', (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.storeId);
  if (!store) return res.status(404).json({ error: '店舗が見つかりません' });

  const authUrl = metaAuth.getAuthorizationUrl(parseInt(req.params.storeId));
  res.redirect(authUrl);
});

// Meta OAuthコールバック（GitHub Pagesから中継される）
router.get('/meta/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    logger.error(`Meta認証エラー: ${error}`);
    return res.redirect('/?error=' + encodeURIComponent('Meta認証がキャンセルされました'));
  }

  if (!code || !state) {
    return res.redirect('/?error=' + encodeURIComponent('認証情報が不足しています'));
  }

  const stateData = metaAuth.validateState(state);
  if (!stateData) {
    return res.redirect('/?error=' + encodeURIComponent('認証の有効期限が切れました。もう一度お試しください。'));
  }

  try {
    // 短期トークン取得
    const tokenData = await metaAuth.exchangeCodeForTokens(code);
    const shortLivedToken = tokenData.access_token;

    if (!shortLivedToken) {
      throw new Error('トークンの取得に失敗しました');
    }

    // 長期トークン（60日）に変換
    const longTokenData = await metaAuth.getLongLivedToken(shortLivedToken);
    const accessToken = longTokenData.access_token;
    const expiresIn = longTokenData.expires_in || (60 * 24 * 60 * 60); // デフォルト60日

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresIn * 1000);
    // Meta長期トークンの期限を参照（token_expires_at）、refresh_token_expires_atも同じ日付にする
    const refreshExpiresAt = new Date(expiresAt.getTime());

    // InstagramビジネスアカウントID取得
    let igUserId = '';
    let igUsername = '';
    let pageId = '';
    try {
      const igAccount = await metaAuth.getInstagramBusinessAccount(accessToken);
      if (igAccount) {
        igUserId = igAccount.igUserId;
        igUsername = igAccount.igUsername;
        pageId = igAccount.pageId;
      }
    } catch (e) {
      logger.warn('Instagramアカウント情報取得スキップ: ' + e.message);
    }

    // DB保存（UPSERT）
    // platform_user_id: "igUserId|pageId" の形式で保存
    db.prepare(`
      INSERT INTO sns_accounts (store_id, platform, platform_user_id, platform_username,
        access_token_encrypted, refresh_token_encrypted, token_expires_at, refresh_token_expires_at,
        scopes)
      VALUES (?, 'instagram', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id, platform) DO UPDATE SET
        platform_user_id = excluded.platform_user_id,
        platform_username = excluded.platform_username,
        access_token_encrypted = excluded.access_token_encrypted,
        refresh_token_encrypted = excluded.refresh_token_encrypted,
        token_expires_at = excluded.token_expires_at,
        refresh_token_expires_at = excluded.refresh_token_expires_at,
        scopes = excluded.scopes,
        is_active = 1,
        updated_at = datetime('now')
    `).run(
      stateData.storeId,
      igUserId ? `${igUserId}|${pageId}` : '',
      igUsername || '',
      encrypt(accessToken),
      encrypt(accessToken), // Metaは同一トークンでリフレッシュするためaccess_tokenを保持
      expiresAt.toISOString(),
      refreshExpiresAt.toISOString(),
      'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement'
    );

    db.prepare(`
      INSERT INTO activity_log (store_id, action, details)
      VALUES (?, 'auth_connected', ?)
    `).run(stateData.storeId, JSON.stringify({ platform: 'instagram', igUserId, igUsername }));

    logger.info(`Instagramアカウント連携完了: store ${stateData.storeId}, ig_user_id ${igUserId}`);
    res.redirect('/?success=' + encodeURIComponent('Instagramアカウントを連携しました'));

  } catch (err) {
    logger.error(`Metaトークン取得失敗: ${err.message}`);
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    res.redirect('/?error=' + encodeURIComponent('Instagram連携に失敗しました: ' + detail));
  }
});

// Meta（Instagram）接続解除
router.delete('/meta/disconnect/:accountId', async (req, res) => {
  const account = db.prepare('SELECT * FROM sns_accounts WHERE id = ? AND platform = ?').get(req.params.accountId, 'instagram');
  if (!account) return res.status(404).json({ error: 'アカウントが見つかりません' });

  db.prepare('UPDATE sns_accounts SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?')
    .run(req.params.accountId);

  db.prepare('INSERT INTO activity_log (store_id, sns_account_id, action) VALUES (?, ?, ?)')
    .run(account.store_id, account.id, 'auth_disconnected');

  res.json({ message: 'Instagramアカウントを切断しました' });
});

module.exports = router;
