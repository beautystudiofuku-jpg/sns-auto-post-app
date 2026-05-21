const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { decrypt } = require('../utils/crypto');
const { executePost } = require('../services/scheduler');
const { initializeDirectPost, uploadVideo, pollPostStatus } = require('../services/tiktok/post');
const { createLocalPost } = require('../services/google/post');
const { postImage, postToFacebookPage, postImageToFacebookPage } = require('../services/meta/post');
const config = require('../config');
const { canPost, recordPost } = require('../services/rate-limiter');
const { logger } = require('../middleware/error-handler');
const r2 = require('../services/storage/r2');

// 動画アップロード設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 128 * 1024 * 1024 }, // Sandbox: 128MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.mov', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('対応形式: MP4, MOV, WebM'));
    }
  },
});

// 画像アップロード設定（Instagram/Facebook用）
const imageUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // Instagram推奨: 8MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('対応形式: JPG, PNG'));
    }
  },
});

// 動画アップロード
router.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '動画ファイルが必要です' });

  res.json({
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
  });
});

// 画像アップロード（Instagram/Facebook用）
// R2 が設定されていれば R2 に保存、未設定ならローカル保存にフォールバック
router.post('/upload-image', imageUpload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '画像ファイルが必要です' });

  try {
    if (config.useR2) {
      // R2 にアップロード（外部からアクセス可能）
      const result = await r2.uploadFromLocalPath(req.file.path, req.file.mimetype, 'images');
      logger.info(`R2 画像アップロード成功: ${result.key}`);
      return res.json({
        filename: req.file.filename,
        size: req.file.size,
        url: result.url,
        storage: 'r2',
      });
    }

    // R2 未設定: ローカルURLを返す（外部からは見えない）
    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const publicUrl = `${baseUrl}/uploads/${req.file.filename}`;
    res.json({
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      url: publicUrl,
      storage: 'local',
    });
  } catch (err) {
    logger.error(`画像アップロード失敗: ${err.message}`);
    res.status(500).json({ error: '画像アップロードに失敗しました: ' + err.message });
  }
});

// 投稿作成（下書き保存）
router.post('/', (req, res) => {
  const { sns_account_id, title, video_path, video_size, privacy_level,
          disable_comment, disable_duet, disable_stitch, scheduled_at } = req.body;

  if (!sns_account_id || !video_path) {
    return res.status(400).json({ error: 'アカウントと動画は必須です' });
  }

  const account = db.prepare('SELECT * FROM sns_accounts WHERE id = ? AND is_active = 1').get(sns_account_id);
  if (!account) return res.status(404).json({ error: 'SNSアカウントが見つかりません' });

  const status = scheduled_at ? 'scheduled' : 'draft';

  const result = db.prepare(`
    INSERT INTO posts (sns_account_id, title, video_path, video_size, privacy_level,
      disable_comment, disable_duet, disable_stitch, scheduled_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sns_account_id, title || '', video_path, video_size || 0,
    privacy_level || 'SELF_ONLY',
    disable_comment ? 1 : 0, disable_duet ? 1 : 0, disable_stitch ? 1 : 0,
    scheduled_at || null, status
  );

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(post);
});

// 投稿一覧
router.get('/', (req, res) => {
  const { status, store_id, limit = 50, offset = 0 } = req.query;

  let sql = `
    SELECT p.*, sa.platform, sa.platform_username, sa.store_id, s.name as store_name
    FROM posts p
    JOIN sns_accounts sa ON p.sns_account_id = sa.id
    JOIN stores s ON sa.store_id = s.id
  `;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('p.status = ?');
    params.push(status);
  }
  if (store_id) {
    conditions.push('sa.store_id = ?');
    params.push(store_id);
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const posts = db.prepare(sql).all(...params);
  res.json(posts);
});

// 投稿詳細
router.get('/:id', (req, res) => {
  const post = db.prepare(`
    SELECT p.*, sa.platform, sa.platform_username, sa.store_id, s.name as store_name
    FROM posts p
    JOIN sns_accounts sa ON p.sns_account_id = sa.id
    JOIN stores s ON sa.store_id = s.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!post) return res.status(404).json({ error: '投稿が見つかりません' });
  res.json(post);
});

// 投稿承認（即時投稿）
router.post('/:id/approve', async (req, res) => {
  const post = db.prepare(`
    SELECT p.*, sa.access_token_encrypted, sa.platform, sa.store_id
    FROM posts p
    JOIN sns_accounts sa ON p.sns_account_id = sa.id
    WHERE p.id = ? AND p.status IN ('draft', 'scheduled')
  `).get(req.params.id);

  if (!post) return res.status(404).json({ error: '承認可能な投稿が見つかりません' });

  // 予約投稿の場合はapprovedにするだけ
  if (post.scheduled_at && new Date(post.scheduled_at) > new Date()) {
    db.prepare('UPDATE posts SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('approved', post.id);
    return res.json({ message: '投稿を承認しました。予約時刻に投稿されます。', status: 'approved' });
  }

  // 即時投稿
  const rateCheck = canPost(post.sns_account_id);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: 'レート制限中です。しばらく待ってからお試しください。' });
  }

  try {
    db.prepare('UPDATE posts SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('uploading', post.id);

    const accessToken = decrypt(post.access_token_encrypted);

    const initResult = await initializeDirectPost(accessToken, {
      title: post.title,
      privacyLevel: post.privacy_level,
      videoSize: post.video_size,
      disableComment: !!post.disable_comment,
      disableDuet: !!post.disable_duet,
      disableStitch: !!post.disable_stitch,
    });

    db.prepare('UPDATE posts SET publish_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(initResult.publish_id, post.id);

    await uploadVideo(initResult.upload_url, post.video_path);

    db.prepare('UPDATE posts SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('processing', post.id);

    const statusResult = await pollPostStatus(accessToken, initResult.publish_id);

    if (statusResult.status === 'PUBLISH_COMPLETE') {
      db.prepare('UPDATE posts SET status = ?, published_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?')
        .run('published', post.id);
      recordPost(post.sns_account_id);
      logger.info(`即時投稿完了: post ${post.id}`);
      res.json({ message: '投稿が完了しました', status: 'published' });
    } else {
      res.json({ message: '投稿処理中です', status: 'processing' });
    }

    db.prepare('INSERT INTO activity_log (store_id, sns_account_id, post_id, action) VALUES (?, ?, ?, ?)')
      .run(post.store_id, post.sns_account_id, post.id, 'post_published');

  } catch (err) {
    logger.error(`即時投稿失敗: post ${post.id} - ${err.message}`);
    db.prepare('UPDATE posts SET status = ?, error_message = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('failed', err.message, post.id);
    res.status(500).json({ error: '投稿に失敗しました: ' + err.message });
  }
});

// 投稿キャンセル
router.post('/:id/cancel', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND status IN (?, ?, ?)').get(
    req.params.id, 'draft', 'scheduled', 'approved'
  );
  if (!post) return res.status(404).json({ error: 'キャンセル可能な投稿が見つかりません' });

  db.prepare('UPDATE posts SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run('cancelled', post.id);
  res.json({ message: 'キャンセルしました' });
});

// Google Business Profile 投稿
router.post('/google', async (req, res) => {
  const { sns_account_id, summary, call_to_action_type, call_to_action_url, scheduled_publish_time, media_url } = req.body;

  if (!sns_account_id || !summary) {
    return res.status(400).json({ error: 'アカウントと投稿内容は必須です' });
  }

  const account = db.prepare('SELECT * FROM sns_accounts WHERE id = ? AND platform = ? AND is_active = 1')
    .get(sns_account_id, 'google_business');
  if (!account) return res.status(404).json({ error: 'Googleアカウントが見つかりません' });

  // 予約投稿: サーバー側スケジューラーに委ねる
  if (scheduled_publish_time) {
    const postResult = db.prepare(`
      INSERT INTO posts (sns_account_id, title, image_url, post_platform, scheduled_at, status)
      VALUES (?, ?, ?, 'google_business', ?, 'approved')
    `).run(sns_account_id, summary, media_url || null, scheduled_publish_time);

    db.prepare('INSERT INTO activity_log (store_id, sns_account_id, post_id, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(account.store_id, sns_account_id, postResult.lastInsertRowid, 'post_scheduled',
        JSON.stringify({ platform: 'google_business', scheduled_at: scheduled_publish_time }));

    logger.info(`Google予約登録: account ${sns_account_id}, scheduled_at ${scheduled_publish_time}`);
    return res.json({
      message: 'Googleビジネスプロフィールに予約投稿しました（サーバー側スケジューラー）',
      data: { postId: postResult.lastInsertRowid, scheduled: true, scheduled_at: scheduled_publish_time },
    });
  }

  // 即時投稿
  try {
    const accessToken = decrypt(account.access_token_encrypted);
    // platform_user_id に "accounts/xxx|accounts/xxx/locations/yyy" が入っている
    const [accountName, locationName] = (account.platform_user_id || '').split('|');

    if (!accountName || !locationName) {
      return res.status(400).json({ error: 'Googleビジネスプロフィールのロケーション情報がありません。再連携してください。' });
    }

    // locationName から "accounts/xxx/locations/yyy" のうち "locations/yyy" 部分を取得
    const locationPart = locationName.replace(accountName + '/', '');

    const result = await createLocalPost(accessToken, accountName, locationPart, {
      summary,
      callToActionType: call_to_action_type,
      callToActionUrl: call_to_action_url,
      mediaUrl: media_url || null,
    });

    // 投稿記録をDBに保存
    const postResult = db.prepare(`
      INSERT INTO posts (sns_account_id, title, post_platform, platform_post_id, status, published_at)
      VALUES (?, ?, 'google_business', ?, 'published', datetime('now'))
    `).run(sns_account_id, summary, result.name || '');

    db.prepare('INSERT INTO activity_log (store_id, sns_account_id, post_id, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(account.store_id, sns_account_id, postResult.lastInsertRowid, 'post_published',
        JSON.stringify({ platform: 'google_business', postName: result.name }));

    logger.info(`Google投稿完了: account ${sns_account_id}`);
    res.json({ message: 'Googleビジネスプロフィールに投稿しました', data: result });

  } catch (err) {
    logger.error(`Google投稿失敗: ${err.message}`);
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    res.status(500).json({ error: 'Google投稿に失敗しました: ' + detail });
  }
});

// Instagram投稿（通常投稿 / ストーリー / 予約投稿）
router.post('/instagram', async (req, res) => {
  const { sns_account_id, image_url, caption, post_type, scheduled_publish_time } = req.body;

  if (!sns_account_id || !image_url) {
    return res.status(400).json({ error: 'アカウントと画像URLは必須です' });
  }

  const account = db.prepare('SELECT * FROM sns_accounts WHERE id = ? AND platform = ? AND is_active = 1')
    .get(sns_account_id, 'instagram');
  if (!account) return res.status(404).json({ error: 'Instagramアカウントが見つかりません' });

  // 予約投稿: サーバー側スケジューラーに委ねる（API の scheduled_publish_time は使わない）
  if (scheduled_publish_time) {
    const postPlatform = post_type === 'story' ? 'instagram_story' : 'instagram';
    const postResult = db.prepare(`
      INSERT INTO posts (sns_account_id, title, image_url, post_platform, scheduled_at, status)
      VALUES (?, ?, ?, ?, ?, 'approved')
    `).run(sns_account_id, caption || '', image_url, postPlatform, scheduled_publish_time);

    db.prepare('INSERT INTO activity_log (store_id, sns_account_id, post_id, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(account.store_id, sns_account_id, postResult.lastInsertRowid, 'post_scheduled',
        JSON.stringify({ platform: postPlatform, type: post_type || 'feed', scheduled_at: scheduled_publish_time }));

    const typeLabel = post_type === 'story' ? 'ストーリー' : '通常投稿';
    logger.info(`Instagram${typeLabel}予約登録: account ${sns_account_id}, scheduled_at ${scheduled_publish_time}`);
    return res.json({
      message: `Instagramに${typeLabel}を予約しました（サーバー側スケジューラー）`,
      data: { postId: postResult.lastInsertRowid, scheduled: true, scheduled_at: scheduled_publish_time },
    });
  }

  // 即時投稿
  try {
    const accessToken = decrypt(account.access_token_encrypted);
    const [igUserId] = (account.platform_user_id || '').split('|');

    if (!igUserId) {
      return res.status(400).json({ error: 'InstagramビジネスアカウントIDがありません。再連携してください。' });
    }

    const options = {};
    if (post_type === 'story') {
      options.is_story = true;
    }

    const result = await postImage(accessToken, igUserId, image_url, caption || '', options);

    const typeLabel = post_type === 'story' ? 'ストーリー' : '通常投稿';
    const postPlatform = post_type === 'story' ? 'instagram_story' : 'instagram';

    const postResult = db.prepare(`
      INSERT INTO posts (sns_account_id, title, image_url, post_platform, platform_post_id, status, published_at)
      VALUES (?, ?, ?, ?, ?, 'published', datetime('now'))
    `).run(sns_account_id, caption || '', image_url, postPlatform, result.postId);

    db.prepare('INSERT INTO activity_log (store_id, sns_account_id, post_id, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(account.store_id, sns_account_id, postResult.lastInsertRowid, 'post_published',
        JSON.stringify({ platform: 'instagram', postId: result.postId, type: post_type || 'feed' }));

    logger.info(`Instagram${typeLabel}完了: account ${sns_account_id}, post_id ${result.postId}`);
    res.json({ message: `Instagramに${typeLabel}を投稿しました`, data: result });

  } catch (err) {
    logger.error(`Instagram投稿失敗: ${err.message}`);
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    res.status(500).json({ error: 'Instagram投稿に失敗しました: ' + detail });
  }
});

// Facebookページ投稿
router.post('/facebook', async (req, res) => {
  const { sns_account_id, message, image_url, scheduled_publish_time } = req.body;

  if (!sns_account_id || !message) {
    return res.status(400).json({ error: 'アカウントと投稿内容は必須です' });
  }

  const account = db.prepare('SELECT * FROM sns_accounts WHERE id = ? AND platform = ? AND is_active = 1')
    .get(sns_account_id, 'instagram');
  if (!account) return res.status(404).json({ error: 'アカウントが見つかりません（Instagram連携からFacebookページに投稿します）' });

  // 予約投稿: サーバー側スケジューラーに委ねる（API の scheduled_publish_time は使わない）
  if (scheduled_publish_time) {
    const postResult = db.prepare(`
      INSERT INTO posts (sns_account_id, title, image_url, post_platform, scheduled_at, status)
      VALUES (?, ?, ?, 'facebook', ?, 'approved')
    `).run(sns_account_id, message, image_url || null, scheduled_publish_time);

    db.prepare('INSERT INTO activity_log (store_id, sns_account_id, post_id, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(account.store_id, sns_account_id, postResult.lastInsertRowid, 'post_scheduled',
        JSON.stringify({ platform: 'facebook', scheduled_at: scheduled_publish_time }));

    logger.info(`Facebook予約登録: account ${sns_account_id}, scheduled_at ${scheduled_publish_time}`);
    return res.json({
      message: 'Facebookページに予約投稿しました（サーバー側スケジューラー）',
      data: { postId: postResult.lastInsertRowid, scheduled: true, scheduled_at: scheduled_publish_time },
    });
  }

  // 即時投稿
  try {
    const accessToken = decrypt(account.access_token_encrypted);
    const [igUserId, pageId] = (account.platform_user_id || '').split('|');

    if (!pageId) {
      return res.status(400).json({ error: 'FacebookページIDがありません。再連携してください。' });
    }

    // ページアクセストークンを取得
    const pagesRes = await require('axios').get(
      `https://graph.facebook.com/${config.meta.graphApiVersion}/me/accounts`, {
        params: { access_token: accessToken, fields: 'id,access_token' }
      }
    );
    const page = (pagesRes.data.data || []).find(p => p.id === pageId);
    if (!page) {
      return res.status(400).json({ error: 'Facebookページへのアクセス権がありません。再連携してください。' });
    }

    let result;
    if (image_url) {
      result = await postImageToFacebookPage(page.access_token, pageId, message, image_url);
    } else {
      result = await postToFacebookPage(page.access_token, pageId, message);
    }

    const postResult = db.prepare(`
      INSERT INTO posts (sns_account_id, title, image_url, post_platform, platform_post_id, status, published_at)
      VALUES (?, ?, ?, 'facebook', ?, 'published', datetime('now'))
    `).run(sns_account_id, message, image_url || null, result.id || result.post_id || '');

    db.prepare('INSERT INTO activity_log (store_id, sns_account_id, post_id, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(account.store_id, sns_account_id, postResult.lastInsertRowid, 'post_published',
        JSON.stringify({ platform: 'facebook', postId: result.id }));

    logger.info(`Facebook投稿完了: account ${sns_account_id}`);
    res.json({ message: 'Facebookページに投稿しました', data: result });

  } catch (err) {
    logger.error(`Facebook投稿失敗: ${err.message}`);
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    res.status(500).json({ error: 'Facebook投稿に失敗しました: ' + detail });
  }
});

// 投稿削除
router.delete('/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '投稿が見つかりません' });

  // アップロードファイル削除
  if (post.video_path && fs.existsSync(post.video_path)) {
    fs.unlinkSync(post.video_path);
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ message: '削除しました' });
});

module.exports = router;
