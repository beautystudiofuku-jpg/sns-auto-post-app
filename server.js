const express = require('express');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const db = require('./db/database');
const { errorHandler, logger } = require('./middleware/error-handler');
const { startTokenRefreshScheduler } = require('./services/token-manager');
const { startPostScheduler } = require('./services/scheduler');

const app = express();

// ミドルウェア
app.use(morgan('short'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ルート
app.use('/api/stores', require('./routes/stores'));
app.use('/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// アクティビティログ
app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const logs = db.prepare(`
    SELECT al.*, s.name as store_name
    FROM activity_log al
    LEFT JOIN stores s ON al.store_id = s.id
    ORDER BY al.created_at DESC
    LIMIT ?
  `).all(limit);
  res.json(logs);
});

// エラーハンドラー
app.use(errorHandler);

// サーバー起動
app.listen(config.port, () => {
  logger.info(`サーバー起動: http://localhost:${config.port}`);

  // スケジューラ起動
  startTokenRefreshScheduler();
  startPostScheduler();
});
