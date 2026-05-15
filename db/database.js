const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');

const dbPath = path.resolve(config.db.path);
const db = new Database(dbPath);

// パフォーマンス設定
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// テーブル作成
db.exec(`
  -- 店舗テーブル
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- SNSアカウントテーブル
  CREATE TABLE IF NOT EXISTS sns_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    platform_user_id TEXT,
    platform_username TEXT,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TEXT,
    refresh_token_expires_at TEXT,
    scopes TEXT,
    privacy_level_options TEXT,
    max_video_duration_sec INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_sns_accounts_store_platform
    ON sns_accounts(store_id, platform);

  -- 投稿テーブル
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sns_account_id INTEGER NOT NULL,
    title TEXT,
    video_path TEXT,
    video_size INTEGER,
    privacy_level TEXT DEFAULT 'SELF_ONLY',
    disable_comment INTEGER DEFAULT 0,
    disable_duet INTEGER DEFAULT 0,
    disable_stitch INTEGER DEFAULT 0,
    scheduled_at TEXT,
    status TEXT DEFAULT 'draft',
    publish_id TEXT,
    platform_post_id TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    published_at TEXT,
    FOREIGN KEY (sns_account_id) REFERENCES sns_accounts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
  CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_at, status);

  -- 操作ログテーブル
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    sns_account_id INTEGER,
    post_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);
`);

// postsテーブルにカラム追加（既存DBとの互換性のためALTER TABLE）
const addColumnIfNotExists = (table, column, type) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.find(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
};

addColumnIfNotExists('posts', 'image_url', 'TEXT');
addColumnIfNotExists('posts', 'post_platform', 'TEXT');

module.exports = db;
