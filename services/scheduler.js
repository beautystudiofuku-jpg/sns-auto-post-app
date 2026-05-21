const cron = require('node-cron');
const axios = require('axios');
const db = require('../db/database');
const config = require('../config');
const { decrypt } = require('../utils/crypto');
const { initializeDirectPost, uploadVideo, pollPostStatus } = require('./tiktok/post');
const { postImage, postToFacebookPage, postImageToFacebookPage } = require('./meta/post');
const { createLocalPost } = require('./google/post');
const { canPost, recordPost } = require('./rate-limiter');
const { logger } = require('../middleware/error-handler');

function startPostScheduler() {
  // 毎分チェック
  cron.schedule('* * * * *', async () => {
    // approved かつ予約時刻を過ぎた投稿を取得
    const duePosts = db.prepare(`
      SELECT p.*, sa.access_token_encrypted, sa.platform, sa.platform_user_id, sa.store_id
      FROM posts p
      JOIN sns_accounts sa ON p.sns_account_id = sa.id
      WHERE p.status = 'approved'
        AND p.scheduled_at IS NOT NULL
        AND datetime(p.scheduled_at) <= datetime('now')
        AND sa.is_active = 1
      ORDER BY p.scheduled_at ASC
    `).all();

    for (const post of duePosts) {
      await executePost(post);
    }
  });

  logger.info('投稿スケジューラ起動');
}

async function executePost(post) {
  const { id, sns_account_id, access_token_encrypted, platform, video_path, title,
          privacy_level, video_size, disable_comment, disable_duet, disable_stitch,
          store_id, image_url, post_platform, platform_user_id } = post;

  // post_platform が設定されていればそちらを優先、なければ sns_accounts.platform を使用
  const effectivePlatform = post_platform || platform;

  // レート制限チェック
  const rateCheck = canPost(sns_account_id);
  if (!rateCheck.allowed) {
    logger.warn(`レート制限中: post ${id} (${rateCheck.retryAfterMs}ms後に再試行)`);
    return;
  }

  try {
    // ステータス更新
    db.prepare('UPDATE posts SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('uploading', id);

    const accessToken = decrypt(access_token_encrypted);

    if (effectivePlatform === 'tiktok') {
      // TikTok投稿
      const initResult = await initializeDirectPost(accessToken, {
        title,
        privacyLevel: privacy_level,
        videoSize: video_size,
        disableComment: !!disable_comment,
        disableDuet: !!disable_duet,
        disableStitch: !!disable_stitch,
      });

      const { publish_id, upload_url } = initResult;

      db.prepare('UPDATE posts SET publish_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(publish_id, id);

      await uploadVideo(upload_url, video_path);

      db.prepare('UPDATE posts SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run('processing', id);

      const statusResult = await pollPostStatus(accessToken, publish_id);

      if (statusResult.status === 'PUBLISH_COMPLETE') {
        db.prepare('UPDATE posts SET status = ?, published_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?')
          .run('published', id);
        recordPost(sns_account_id);

        db.prepare('INSERT INTO activity_log (store_id, sns_account_id, post_id, action, details) VALUES (?, ?, ?, ?, ?)')
          .run(store_id, sns_account_id, id, 'post_published', JSON.stringify({ publish_id }));

        logger.info(`TikTok投稿完了: post ${id}`);
      } else {
        db.prepare('UPDATE posts SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run('processing', id);
        logger.info(`TikTok投稿処理中: post ${id}`);
      }

    } else if (effectivePlatform === 'instagram' || effectivePlatform === 'instagram_story') {
      // Instagram投稿（通常 or ストーリー）— scheduled_publish_timeは使わず通常投稿として実行
      const [igUserId] = (platform_user_id || '').split('|');
      if (!igUserId) throw new Error('InstagramビジネスアカウントIDがありません');

      const options = {};
      if (effectivePlatform === 'instagram_story') {
        options.is_story = true;
      }
      // scheduled_publish_time は意図的に設定しない（通常投稿として実行）

      const result = await postImage(accessToken, igUserId, image_url, title || '', options);

      db.prepare('UPDATE posts SET status = ?, platform_post_id = ?, published_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?')
        .run('published', result.postId, id);
      recordPost(sns_account_id);

      db.prepare('INSERT INTO activity_log (store_id, sns_account_id, post_id, action, details) VALUES (?, ?, ?, ?, ?)')
        .run(store_id, sns_account_id, id, 'post_published',
          JSON.stringify({ platform: effectivePlatform, postId: result.postId }));

      logger.info(`Instagram投稿完了: post ${id}`);

    } else if (effectivePlatform === 'facebook') {
      // Facebook投稿 — ページアクセストークンを取得して投稿
      const [, pageId] = (platform_user_id || '').split('|');
      if (!pageId) throw new Error('FacebookページIDがありません');

      // ページアクセストークンを取得
      const pagesRes = await axios.get(
        `https://graph.facebook.com/${config.meta.graphApiVersion}/me/accounts`, {
          params: { access_token: accessToken, fields: 'id,access_token' }
        }
      );
      const page = (pagesRes.data.data || []).find(p => p.id === pageId);
      if (!page) throw new Error('Facebookページへのアクセス権がありません');

      let result;
      if (image_url) {
        result = await postImageToFacebookPage(page.access_token, pageId, title || '', image_url);
      } else {
        result = await postToFacebookPage(page.access_token, pageId, title || '');
      }

      db.prepare('UPDATE posts SET status = ?, platform_post_id = ?, published_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?')
        .run('published', result.id || result.post_id || '', id);
      recordPost(sns_account_id);

      db.prepare('INSERT INTO activity_log (store_id, sns_account_id, post_id, action, details) VALUES (?, ?, ?, ?, ?)')
        .run(store_id, sns_account_id, id, 'post_published',
          JSON.stringify({ platform: 'facebook', postId: result.id }));

      logger.info(`Facebook投稿完了: post ${id}`);

    } else if (effectivePlatform === 'google_business') {
      // Google Business Profile投稿
      const [accountName, locationName] = (platform_user_id || '').split('|');
      if (!accountName || !locationName) throw new Error('Googleビジネスプロフィールのロケーション情報がありません');

      const locationPart = locationName.replace(accountName + '/', '');

      const result = await createLocalPost(accessToken, accountName, locationPart, {
        summary: title || '',
        mediaUrl: image_url || null,
      });

      db.prepare('UPDATE posts SET status = ?, platform_post_id = ?, published_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?')
        .run('published', result.name || '', id);
      recordPost(sns_account_id);

      db.prepare('INSERT INTO activity_log (store_id, sns_account_id, post_id, action, details) VALUES (?, ?, ?, ?, ?)')
        .run(store_id, sns_account_id, id, 'post_published',
          JSON.stringify({ platform: 'google_business', postName: result.name }));

      logger.info(`Google投稿完了: post ${id}`);

    } else {
      logger.warn(`未対応プラットフォーム: ${effectivePlatform} (post ${id})`);
      db.prepare('UPDATE posts SET status = ?, error_message = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run('failed', `未対応プラットフォーム: ${effectivePlatform}`, id);
    }
  } catch (err) {
    logger.error(`投稿失敗: post ${id} - ${err.message}`);

    const retryCount = (post.retry_count || 0) + 1;
    const newStatus = retryCount >= (post.max_retries || 3) ? 'failed' : 'approved';

    db.prepare('UPDATE posts SET status = ?, error_message = ?, retry_count = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(newStatus, err.message, retryCount, id);

    db.prepare('INSERT INTO activity_log (store_id, sns_account_id, post_id, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(post.store_id, sns_account_id, id, 'post_failed', JSON.stringify({ error: err.message, retryCount }));
  }
}

module.exports = { startPostScheduler, executePost };
