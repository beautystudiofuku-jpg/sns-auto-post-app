const cron = require('node-cron');
const db = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');
const { refreshAccessToken } = require('./tiktok/auth');
const { refreshAccessToken: refreshGoogleToken } = require('./google/auth');
const { refreshAccessToken: refreshMetaToken } = require('./meta/auth');
const { logger } = require('../middleware/error-handler');

function startTokenRefreshScheduler() {
  // 毎時0分にトークン更新チェック
  cron.schedule('0 * * * *', async () => {
    logger.info('トークン更新チェック開始');

    const accounts = db.prepare(`
      SELECT * FROM sns_accounts
      WHERE is_active = 1
        AND token_expires_at IS NOT NULL
        AND datetime(token_expires_at) <= datetime('now', '+2 hours')
    `).all();

    for (const account of accounts) {
      try {
        const refreshToken = decrypt(account.refresh_token_encrypted);

        let result;
        if (account.platform === 'tiktok') {
          result = await refreshAccessToken(refreshToken);
        } else if (account.platform === 'google_business') {
          result = await refreshGoogleToken(refreshToken);
        } else if (account.platform === 'instagram') {
          // Metaは現在のアクセストークンを使ってリフレッシュする
          const currentToken = decrypt(account.access_token_encrypted);
          result = await refreshMetaToken(currentToken);
        } else {
          continue;
        }

        const now = new Date();
        // Metaの長期トークンは expires_in（秒）が返る（約60日）
        const expiresIn = result.expires_in || 86400;
        const expiresAt = new Date(now.getTime() + expiresIn * 1000);
        const refreshExpiresAt = account.platform === 'instagram'
          ? new Date(expiresAt.getTime()) // Metaはトークン自体が期限管理
          : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

        // Metaの場合 refresh_token は存在しないので access_token を両方に保存
        const newAccessToken = result.access_token;
        const newRefreshToken = account.platform === 'instagram'
          ? newAccessToken
          : (result.refresh_token || refreshToken);

        db.prepare(`
          UPDATE sns_accounts
          SET access_token_encrypted = ?,
              refresh_token_encrypted = ?,
              token_expires_at = ?,
              refresh_token_expires_at = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(
          encrypt(newAccessToken),
          encrypt(newRefreshToken),
          expiresAt.toISOString(),
          refreshExpiresAt.toISOString(),
          account.id
        );

        db.prepare(`
          INSERT INTO activity_log (store_id, sns_account_id, action, details)
          VALUES (?, ?, 'token_refreshed', ?)
        `).run(account.store_id, account.id, JSON.stringify({ platform: account.platform }));

        logger.info(`トークン更新完了: ${account.platform} (account ${account.id})`);
      } catch (err) {
        logger.error(`トークン更新失敗: account ${account.id} - ${err.message}`);

        db.prepare(`
          INSERT INTO activity_log (store_id, sns_account_id, action, details)
          VALUES (?, ?, 'token_refresh_failed', ?)
        `).run(account.store_id, account.id, JSON.stringify({ error: err.message }));
      }
    }
  });

  logger.info('トークン自動更新スケジューラ起動');
}

module.exports = { startTokenRefreshScheduler };
