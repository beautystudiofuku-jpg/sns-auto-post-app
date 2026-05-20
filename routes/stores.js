const express = require('express');
const router = express.Router();
const db = require('../db/database');

// 店舗一覧
router.get('/', (req, res) => {
  const stores = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM sns_accounts sa WHERE sa.store_id = s.id AND sa.is_active = 1) as account_count
    FROM stores s
    ORDER BY s.id ASC
  `).all();
  res.json(stores);
});

// 店舗作成
router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: '店舗名は必須です' });

  const result = db.prepare('INSERT INTO stores (name, description) VALUES (?, ?)').run(name, description || '');
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(store);
});

// 店舗更新
router.put('/:id', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: '店舗名は必須です' });

  db.prepare('UPDATE stores SET name = ?, description = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(name, description || '', req.params.id);

  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: '店舗が見つかりません' });
  res.json(store);
});

// 店舗削除
router.delete('/:id', (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: '店舗が見つかりません' });

  db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
  res.json({ message: '削除しました' });
});

// 店舗のSNSアカウント一覧
router.get('/:id/accounts', (req, res) => {
  const accounts = db.prepare(`
    SELECT id, store_id, platform, platform_user_id, platform_username,
           token_expires_at, scopes, is_active, created_at
    FROM sns_accounts
    WHERE store_id = ?
    ORDER BY platform
  `).all(req.params.id);
  res.json(accounts);
});

module.exports = router;
