# SNS自動投稿システム - 次のステップ

## 対象SNS
- TikTok ← 今ここ
- Instagram/Facebook（Meta）← 申請済み（多分）
- Google Business Profile ← API申請済み（2026/4/15）、審査待ち（7-10営業日）
- ~~X/Twitter~~ ← やらない
- ~~LINE~~ ← やらない

## 現在の状況
- [x] SNS API調査レポート完了
- [x] TikTok開発者アカウント作成
- [x] TikTokアプリ作成（Sandbox）
- [x] GitHub Pages（Terms/Privacy）公開
- [x] Client Key / Client Secret 取得済み
- [?] Instagram/Facebook - 多分申請済み、要確認
- [x] Google Business Profile - API申請完了（2026/4/15）、審査結果待ち（4月下旬〜5月上旬）

---

## 次にやること

### Step 1: TikTok投稿機能の開発
- Node.jsプロジェクトのセットアップ
- OAuth 2.0 認証フロー（TikTokログイン → トークン取得）
- 動画アップロード＆投稿機能
- Sandboxでテスト

### Step 2: TikTok審査提出
- アプリの動作画面を録画してデモ動画を作成
- Production側のApp reviewにデモ動画をアップロード
- Submit for review（審査期間: 5〜10営業日）

### Step 3: Instagram/Facebook
- Meta for Developersで申請状況を確認
- Instagram Graph APIの投稿機能を開発
- App Reviewを申請（審査に時間がかかる）

### Step 4: Google Business Profile
- Google Cloud Consoleに再アクセス
- API申請フォームを提出（審査に時間がかかる）
- 投稿機能を開発

### Step 5: 統合管理ダッシュボード
- 全SNS統合の投稿画面
- 店舗ごとのアカウント管理
- スケジュール投稿機能
- 投稿ログ管理

### Step 6: 本番運用準備
- トークン自動リフレッシュ
- レート制限ハンドリング
- エラーハンドリング・リトライ
- セキュリティ（トークン暗号化保存）
