# SNS自動投稿システム - セッションログ

## 2026/5/26 セッション 🐛 予約投稿バグ修正

### 報告された現象
- Instagramストーリーで日時指定して予約投稿したのに、すぐに上がってしまった

### 調査で見つかったバグ2件

#### バグ① ストーリー予約が完全に無視されていた
- `public/js/app.js`: `submitInstagramPost()` で `postType === 'feed'` の時だけ `scheduled_publish_time` を送る作りになっていた
- ストーリーは予約時刻がbodyに含まれず即時投稿パスに進んでいた
- 前回（5/21）にUI側で「ストーリーでも予約欄を表示」する修正は入っていたが、送信側の修正漏れ
- **修正**: feed/storyどちらでも `scheduled_publish_time` を送るよう変更

#### バグ② 全予約投稿が9時間遅れて発火するタイムゾーン問題
- フロント `<input type="datetime-local">` はタイムゾーン情報なしのローカル時刻文字列を返す（JST）
- `routes/posts.js` の Instagram/Facebook/Google 予約パスはそれをそのままDBに保存
- `services/scheduler.js` は `datetime('now')`（**UTC**）と比較
- 結果: JST 12:30 指定 → 実際の発火は UTC 12:30（JST 21:30）= **9時間遅れ**
- ローカルDBで実証確認済み
- **修正**: 新規 `utils/timezone.js` を作って保存前に JST→UTC 変換、3箇所の予約ルートで適用

### 検証
- ローカルでAPI叩いてDB保存値を確認：JST 12:13 入力 → UTC 03:13 で保存 ✅
- サーバーログにも `JST=... UTC=...` 両方を出力するよう変更
- 既存の即時投稿パスは無変更（影響なし）

### コミット
- `a85495c` Fix scheduled story posts and timezone offset
- 一緒に未プッシュだった `a5a45be`（5/21の店舗案内ドキュメント追加）も本番反映

### 本番での実証結果（同日確認）
- post id=6 (Instagram Story): JST 12:35:00 予約 → JST 12:35:13 に発火・投稿成功（13秒遅延=cron毎分発火の許容範囲）
- kanon.nakasu のストーリーに実際に表示されることをユーザーが目視確認
- platform_post_id `18065614850416480` 取得済み
- **修正は完全に機能している**

### 追加でデプロイした改善
- `services/scheduler.js`: 予約投稿失敗時に Meta/Google API のレスポンス詳細（apiDetail）も DB に保存するよう改善
  - 今後同様の障害が起きた時、`/api/posts?status=failed` で即座に原因特定できる

### 次回確認すべきこと
1. ~~Render本番でストーリー予約投稿が指定時刻に上がるか~~ ✅ 完了
2. Instagram フィード予約 / Facebook予約 / Google予約 も同じ修正が効くか（仕組み上は効くはず、念のため実投稿で確認推奨）
3. TikTok審査ステータス確認（5/15再提出から11日経過、まだIn Review想定）
4. Meta App Review 申請
5. Google OAuth 本番公開申請

---

## 2026/5/26 セッション（午後） 📋 Meta App Review 申請準備

### やったこと

#### 1. Meta OAuth スコープを最終確定
- 紆余曲折あり: 一度 `instagram_business_*`（Instagram Login用）に変えてしまい OAuth で "Invalid Scopes" エラー → 元の `instagram_*`（Facebook Login用）に戻した
- 試しに `pages_manage_posts` を追加したが、Meta アプリ側で Use Case 未登録のためこれも "Invalid Scopes"
- 最終スコープ: `instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement`
- Facebook単独ページ投稿機能はコード残置、OAuthスコープから除外（必要になったら追加申請）

#### 2. プライバシーポリシー / 利用規約を Meta 要件に合わせて整備
- 運営会社 KOKO K.K. (Night Safari Group) 明記
- データ削除手順セクション（Section 8）追加 ← Meta必須項目
- 取得データの種類を Page list / IG Business Account ID 含めて拡充
- 連絡先ブロックに会社名・サイトURLも追記
- `docs/privacy.html`, `docs/terms.html` 更新済み・GitHub Pages反映済み

#### 3. App Review 提出用ドキュメント 3点を作成
- `META_APP_REVIEW.md`: 権限ごとの Use Case 説明文（英語、Metaダッシュボード貼り付け用）
- `META_REVIEWER_INSTRUCTIONS.md`: レビュアー向け step-by-step テスト手順書（英語）
- `META_SCREENCAST_SCRIPT.md`: スクリーンキャストの台本（8シーン、英語キャプション込み）

#### 4. 録画用アセット生成
- `meta_review_assets/title_card.png`: 動画冒頭5秒のタイトル画像（1920×1080）
- `meta_review_assets/test_image_feed.jpg`: フィード投稿用テスト画像（1080×1080）
- `meta_review_assets/test_image_story.jpg`: ストーリー投稿用テスト画像（1080×1920）
- `meta_review_assets/cheat_01〜06.png`: スマホ携帯用カンペ画像6枚（1080×1920、シーン別）

#### 5. Instagram 再連携完了
- 古いスコープで取得したトークンを破棄し新スコープで取り直し
- `kanon.nakasu` 緑ドットで連携状態 OK

### 残タスク
1. **スクリーンキャスト録画**（ユーザー作業、後日）
2. **Meta開発者ポータルで App Review 提出**（ユーザー作業、録画後）

### TikTok 代替手段の検討（リサーチのみ）

- 「審査なしで完全自動投稿」は不可能と判明
- ただし **Upload (Draft Mode / `video.upload` スコープ)** なら審査不要
  - フロー: アプリで動画+キャプション送信 → TikTokアプリ受信箱に通知 → ユーザーが通知タップ → 投稿画面で最終確定して公開
  - メリット: 審査いらない、SELF_ONLY制限なし、誤投稿リスク低い
  - デメリット: 最後の「投稿」ボタンだけ人間が押す（完全自動ではない）、予約はTikTokアプリ側
- 実装は `services/tiktok/post.js` の `initializeDirectPost` を `initializeUpload` に差し替えるだけ（30分〜1時間）
- **判断**: TikTok審査結果次第で決める。リジェクトされたら Draft Mode 実装に切替検討

### コミット
- `aa84bf6` Revert to Facebook-Login scope names
- `f2cf230` Drop pages_manage_posts from Meta App Review scope

### 補足
- ユーザーが `.env` を確認のため一時的に IDE で開いた（編集なし）

### 注意点（次回のために）
- Render本番のNode.jsプロセスはUTCで動いている前提で修正している
- もしRender側のタイムゾーン設定を変える場合は `utils/timezone.js` の前提も見直すこと

---

## 2026/5/21 セッション（2回目） 🎉 本番運用開始日

### 今回やったこと

#### 1. 本番への華音店舗データ登録
- API経由で本番DBに「華音」（ID=1）追加
- 本番DBは前回デプロイ時点で空だったため、再構築開始

#### 2. Meta（Instagram/Facebook）本番URL対応
- Meta Developer Console の「Facebookログイン → 設定」に本番リダイレクトURI追加
  - `https://sns-auto-post-app.onrender.com/auth/meta/callback`
- アプリ設定「ベーシック」のアプリドメイン・サイトURLにも本番URL追加
- **問題発生**: 連携時に `localhost:3456` にリダイレクトされエラー
  - 原因: `docs/meta-callback.html`（GitHub Pages中継ページ）が `localhost:3456` にハードコーディング
- **解決**: Render環境変数 `META_REDIRECT_URI` を本番URLに書き換え（中継ページ不要に）
- 本番でInstagram再連携成功 → kanon.nakasu 登録完了

#### 3. Google Business Profile 本番URL対応
- Google Cloud Console「認証情報」の OAuth クライアントに本番URI追加
  - `https://sns-auto-post-app.onrender.com/auth/google/callback`
- ローカルURIは残したまま
- 本番でGoogle再連携成功 → 華音アカウント登録完了

#### 4. ローカルの未プッシュコミット発覚 → プッシュ
- 本番UIが古いまま（画像URL指定の旧版）の原因を調査
- ローカルに2コミット未プッシュ（`05faa12`, `e6e2e85`）
- `git push origin main` → 本番に画像アップロード機能が反映

#### 5. Google投稿に画像添付機能を追加（新規実装）
- Google Business Profile API は元から画像（PHOTO）対応していたが、UIが未対応だった
- `public/index.html`: Google用フォームにドラッグ&ドロップ画像欄追加
- `public/js/app.js`: `googleUploadedImageUrl` 管理、`media_url` を送信
- `routes/posts.js`: `media_url` を受け取り `createLocalPost` の `mediaUrl` に渡す
- `services/scheduler.js`: 予約投稿時も `image_url` を `mediaUrl` で渡す
- 本番Google画像投稿 **テスト成功**

#### 6. Instagram ストーリー 9:16自動変換機能（新規実装）
- 問題: ストーリーに正方形画像を上げると見切れる
- `sharp` パッケージ追加
- `/api/posts/upload-image?ratio=story` で 1080×1920 9:16に変換
  - 背景: 元画像をぼかして全面に配置
  - 前景: 元画像を縦長サイズにfit して中央配置
- フロントは投稿タイプ=story 選択時に `ratio=story` を付けてアップ
- 本番ストーリー投稿 **テスト成功**（kanon.nakasuのストーリーで確認）

#### 7. Instagram ストーリー予約投稿を解放
- バックエンドはすでに `instagram_story` 予約投稿対応していた（5/15実装済み）
- フロントUIだけが「ストーリー=予約不可」になっていたのを修正
- `toggleInstagramSchedule()` でストーリー選択時も予約日時欄を表示

#### 8. 本番DBに残り4店舗を一括登録
- API経由で本番DBに追加:
  - ID=2: Nancy's Diner
  - ID=3: なべやかん
  - ID=4: あきさんのご飯
  - ID=5: Beauty studio fuku

#### 9. 店舗担当者向け案内文書を作成
- `店舗担当者向け案内.md` 新規作成
- SNS連携前の準備チェックリスト、連携手順、現在の制約事項を記載

### 投稿動作確認結果（本番）

| プラットフォーム | 状態 |
|---|---|
| Instagram フィード投稿 | ✅ 成功 |
| Instagram ストーリー投稿（9:16自動変換） | ✅ 成功 |
| Google Business Profile 投稿 | ✅ 成功 |
| Facebook 単独投稿 | ⏭ 不要（Instagram連動で自動シェア） |
| TikTok 投稿 | ⏳ 審査中のため本番連携未実施 |

### 重要な気付き

- **他店舗の連携には各SNSの「審査通過」が必要**
  - TikTok: In Review（5/15再提出）
  - Meta: App Review未申請（ビジネス認証は完了済み）
  - Google: OAuth同意画面の本番公開未申請
- 他店舗を本番DBに登録しても審査前は実際には連携できない
- **「他店舗追加」より「審査通過」が先**

### 課金状況（変化なし）
- Render: 個人カード（$7.25/月）
- Cloudflare R2: 個人カード（無料枠内）
- Meta: 個人カード（認証完了済み）

### 次回やること（優先順）

1. **Meta App Review 申請**（一番進めやすい、ビジネス認証済み）
   - デモ動画作成（Instagram連携 → 投稿の流れ）
   - Permissions & Features で各権限の用途説明
   - Submit
2. **Google OAuth 本番公開申請**
3. **TikTok審査結果確認**（5/15再提出から1週間以上経過）
4. 審査通過後: 店舗担当者へ案内文書を共有、各店舗連携開始

---

## 2026/5/21 セッション（1回目） 🎉 本番デプロイ達成日

### 今回やったこと

#### 1. クラウド構成決定
- **DB**: SQLite継続使用（Render Persistent Disk上で永続化）— Postgres移行はコード変更量大きく見送り
- **画像/動画ストレージ**: Cloudflare R2（前日構築済み）
- **ホスティング**: Render (Starter $7/月 + Disk 1GB $0.25/月 = 約$7.25/月)
- **Supabase Postgres**: 作成済みだが今は未使用（将来のオプションとして保持）

#### 2. Supabase プロジェクト作成（将来用）
- アカウント: ナイトサファリ系（既存）
- プロジェクト名: `sns-auto-post`
- リージョン: Northeast Asia (Tokyo)
- 接続URL（Session pooler）を `.env` に DATABASE_URL として保存
- pg 接続テスト成功（PostgreSQL 17.6）
- **今は使わない**。Render Persistent Disk + SQLite で運用

#### 3. Render アカウント連携
- アカウント: beautystudiofuku-jpg（GitHubと統一）
- GitHub Appとして `sns-auto-post-app` リポジトリのみ許可
- 設定:
  - Region: Singapore
  - Branch: main
  - Build: npm install / Start: node server.js
  - Instance: Starter ($7/月)
  - Persistent Disk: /var/data, 1GB ($0.25/月)
  - Health Check: /api/health
  - Auto-Deploy: On Commit

#### 4. 環境変数の本番化
- ローカル `.env` をRenderにインポート
- 本番用に書き換えた3つ:
  - `PORT=10000`（Render規定）
  - `GOOGLE_REDIRECT_URI=https://sns-auto-post-app.onrender.com/auth/google/callback`
  - `DB_PATH=/var/data/sns_auto_post.db`
- 追加した1つ:
  - `PUBLIC_BASE_URL=https://sns-auto-post-app.onrender.com`

#### 5. 🚀 本番デプロイ成功
- **公開URL**: https://sns-auto-post-app.onrender.com
- 「sns-auto-post-app is live!」表示確認
- ブラウザで本番画面アクセス成功
- **携帯からアクセス成功** ← 大目標達成！
- 本番DBは空っぽ（次回店舗追加・再連携が必要）

### 課金状況（後で会社カードに切り替え予定）
- Cloudflare R2: 個人カード（無料枠内）
- Meta: 個人カード（認証完了済み）
- **Render: 個人カード** ← NEW、月$7.25

### 将来のTODO
- GitHubアカウント統一（beautystudiofuku-jpg → nightsafarigroup-ai）はTikTok審査完了後に
- DBをPostgresに移行は必要性を感じてから

### 次回やること
1. 本番で店舗（華音など）を新規追加
2. TikTok / Instagram / Facebook / Google を本番側で再連携（OAuth）
3. 各SNS Developer Console で本番URL（onrender.com）をRedirect URIに追加
   - Meta: `https://sns-auto-post-app.onrender.com/auth/meta/callback`
   - Google: 既に環境変数で設定済み
   - TikTok: GitHub Pages中継方式のままで可（callback.html）
4. 本番からSNS投稿テスト
5. 他店舗担当者にも本番URL共有して、各自で投稿してもらえる体制構築
6. **TikTok審査結果確認**（5/15再提出から1週間）

---

## 2026/5/20 セッション

### 今回やったこと

#### 1. 状況確認
- TikTok審査: まだ In Review（5/15再提出後 → 5日経過・継続審査中）
- Meta ビジネス認証: **すでに認証済み（5/16）** ← 大進展
- Google/TikTokトークン: 表示は緑（生きていた）

#### 2. 画像/動画アップロード機能を追加
- Instagram/Facebookの「画像URL指定」を「ファイル直接アップロード」に変更
- `routes/posts.js` に `POST /api/posts/upload-image` 追加
- `public/index.html` にドラッグ&ドロップUI追加
- `public/js/app.js` でアップロード→プレビュー→URL自動設定

#### 3. Cloudflare R2 連携完了
- アカウント: Night.safari.group@gmail.com（既存利用）
- バケット作成: `sns-auto-post-media`
- パブリック開発URL: `https://pub-83018942c3124bfcb182011ba3ef7a72.r2.dev`
- Account APIトークン作成（Object Read & Write）
- `services/storage/r2.js` 新規実装（S3互換）
- `config/index.js` に r2 セクション追加・`useR2` フラグ
- `.env.example` を新規作成
- ローカル保存とR2の自動切り替え（R2_キー設定有無で判定）

#### 4. Instagram実投稿 成功確認
- PCの画像 → R2にアップ → r2.devの公開URL → Instagram投稿API → **投稿成功確認**
- kanon.nakasu のInstagramフィードに実際に表示された

### 課金状況（後で会社カードに切り替え予定）
- Cloudflare R2: 個人カード登録（無料枠10GB内で運用）
- Meta: 個人カード登録済み（認証完了済み）

### 次回やること
1. Supabase Postgres DB作成（クラウド対応のためSQLiteから移行）
2. DB接続コードを better-sqlite3 → pg に変更
3. Render アカウント連携・デプロイ
4. 各SNS Developer Console で本番URL（onrender.com）をリダイレクトURIに追加
5. 携帯から本番URLで動作確認

---

## 2026/5/16 セッション

### 今回やったこと

#### 1. 3店舗のDB登録
- 以下の3店舗を `stores` テーブルに追加（Node.js経由で直接INSERT、curlはWindows端末の文字化け問題あり）
  - ID=6: なべやかん
  - ID=7: あきさんのご飯
  - ID=8: Beauty studio fuku（元「ビューティースタジオフク」→英名に変更）

#### 2. 店舗一覧の並び順変更
- `routes/stores.js`: `ORDER BY s.created_at DESC` → `ORDER BY s.id ASC` に変更
- 華音（ID=1）が一番上に表示されるようになった

#### 3. Instagram ストーリーのメンション調査
- Instagram Graph APIではストーリーにメンション・ステッカー・テキスト追加は**不可**
- API経由では画像/動画のみ。メンション等はInstagramアプリ側の機能

### DB内の現在のデータ
| ID | 店舗名 | SNSアカウント |
|----|--------|--------------|
| 1 | 華音 | TikTok / Instagram / Google（3件） |
| 2 | Nancy's Diner | なし |
| 6 | なべやかん | なし |
| 7 | あきさんのご飯 | なし |
| 8 | Beauty studio fuku | なし |

### 他店舗のSNS連携に必要な情報（次回案内用）
各店舗の担当者に事前確認してもらう内容:

| SNS | 必要な準備 |
|-----|----------|
| TikTok | クリエイターアカウントであること |
| Instagram | ビジネス or クリエイターアカウント、Facebookページと紐付け済み |
| Facebook | 投稿先ページの管理者権限 |
| Google | ビジネスプロフィール作成済み＆オーナー確認済み |

連携手順: 店舗管理画面で「連携」ボタン → 各SNSにログイン＆許可（OAuth）。パスワード共有不要。

### 現在の待ち事項
1. **TikTok審査** — 再提出済み、結果待ち
2. **Meta ビジネス認証** — 本人確認書類待ち → 完了後にApp Review申請へ
3. **Google/TikTokトークン再連携** — 期限切れ

### 次回やること
1. 各店舗の担当者にSNS連携の事前準備を案内する（上記チェックリスト）
2. ボスから本人確認書類をもらってMeta ビジネス認証を完了させる
3. ビジネス認証完了後、Meta App Reviewを申請する
4. TikTok審査結果を確認する
5. Google/TikTokトークン再連携

---

## 2026/5/15 セッション（3回目）

### 今回やったこと

#### 1. サーバー側予約投稿スケジューラー拡張
- Instagram/Facebook/Googleの予約投稿をサーバー側スケジューラーで処理するように拡張
- `db/database.js`: postsテーブルに `image_url`, `post_platform` カラム追加
- `services/scheduler.js`: executePost()にInstagram/Facebook/Google対応追加
- `routes/posts.js`: 予約日時指定時はAPIの予約機能を使わずDBに保存しスケジューラーに委ねる
- 全プラットフォームの予約投稿APIテスト成功（DB保存確認済み）

#### 2. TikTok審査結果 → リジェクト → 再提出
- 審査結果: **承認されていません（リジェクト）**
- リジェクト理由:
  - 利用規約にアプリ名が記載されていない
  - プライバシーポリシーにアプリ名が記載されていない
  - ウェブサイトURLがランディングページではない
- 修正内容:
  - `docs/terms.html`: アプリ名「sns-auto-post」を明記、連絡先メール追加
  - `docs/privacy.html`: アプリ名「sns-auto-post」を明記、全プラットフォーム記載
  - `docs/index.html`: ランディングページ新規作成
- **再提出完了 → 審査中**

#### 3. Meta Business Verification（ビジネス認証）開始
- Meta Business Manager でビジネス認証を開始
- ビジネスタイプ: 非公開会社
- ビジネス名: KOKO K.K.（KOKO株式会社）
- 別のビジネス名: Night Safari Group
- ウェブサイト: https://night-safari-group.com/
- 公的記録からKOKO K.K.を選択済み
- **本人確認書類のアップロード待ち**（ボスに書類を依頼中）

### 現在の待ち事項
1. **TikTok審査** — 再提出済み、結果待ち（5〜10営業日）
2. **Meta ビジネス認証** — 本人確認書類待ち → 完了後にApp Review申請へ進む
3. **Google/TikTokトークン再連携** — 期限切れ

### 次回やること
1. ボスから本人確認書類をもらってMeta ビジネス認証を完了させる
2. ビジネス認証完了後、Meta App Reviewを申請する
3. TikTok審査結果を確認する
4. Google/TikTokトークン再連携

---

## 2026/5/15 セッション（2回目）

### 今回やったこと
- **動作確認テスト結果（3つ中2つ成功）**
  - Instagram ストーリー投稿 → **成功**（API経由でそのまま画像をストーリーに投稿）
  - Instagram 予約投稿 → **失敗**（`User must be on whitelist` エラー → テストモードでは使えない、App Review通過後のみ）
  - Facebookページ投稿 → **成功**（テキスト投稿を華音中洲ページに即時投稿）

### Instagram予約投稿の問題
- エラー: `(#3) User must be on whitelist` / `OAuthException` / `code: 3`
- 原因: `scheduled_publish_time` パラメータはApp Review通過済みの本番アプリのみ使用可能
- 対処法:
  - **正規ルート**: Meta App Reviewを申請・通過する
  - **代替案**: サーバー側スケジューラーで予約時刻を管理し、時刻が来たら通常投稿として実行

### 備考
- Instagram ストーリーはAPI経由では加工なしの画像/動画のみ（メンション・ステッカー・テキスト等はInstagramアプリ側で行う）
- Googleトークン（5/14期限切れ）、TikTokトークン（5/15期限切れ）→ 要再連携

### 全機能テスト結果まとめ
| 機能 | 状態 |
|------|------|
| TikTok動画投稿 | 成功（Sandbox / SELF_ONLY） |
| Google BP投稿 | 成功 |
| Instagram フィード投稿 | 成功 |
| Instagram ストーリー投稿 | **成功 ← NEW** |
| Instagram 予約投稿 | **失敗 ← テストモード制限（App Review後に使用可能）** |
| Facebookページ投稿 | **成功 ← NEW** |

### 次回やること
1. Meta App Review申請（本番公開に必須、予約投稿の解放にも必要）
2. TikTok審査結果確認（5/10提出、5月下旬頃）
3. Google/TikTokトークン再連携（期限切れ）
4. Google OAuth同意画面の本番公開
5. （任意）サーバー側予約投稿スケジューラーの実装（API予約投稿が使えない場合の代替）

---

## 2026/5/15 セッション（1回目）

### 今回やったこと
- **Instagram連携完了！テスト投稿成功！**
- FacebookログインによるAPI設定で権限追加（content permissions + messaging permissions）
- App ID / App Secret 取得 → `.env`に追加
- サイトURL `http://localhost:3456` をアプリ設定に追加
- OAuthリダイレクトURI設定（HTTPS強制のためGitHub Pages中継方式に変更）
  - `https://beautystudiofuku-jpg.github.io/sns-auto-post-app/meta-callback`
- GitHub Pagesに `docs/meta-callback.html`（Meta用中継ページ）をデプロイ
- Facebookページ「華音 中洲」とInstagramアカウント（kanon.nakasu）をリンク
- Meta OAuth認証フロー実装（`services/meta/auth.js`）
- Instagram投稿API実装（`services/meta/post.js`）
- 認証ルート追加（`/auth/meta/authorize/:storeId`, `/auth/meta/callback`）
- 投稿ルート追加（`/api/posts/instagram`）
- UIにInstagram連携ボタン＆画像投稿フォーム追加
- トークン自動リフレッシュ Meta対応済み

### 3SNS全て連携・投稿成功
| SNS | アカウント | 状態 |
|-----|----------|------|
| TikTok | 華音 (@kanon_fukuoka) | 連携済み・投稿成功・Production審査待ち |
| Google BP | 華音 | 連携済み・投稿成功 |
| Instagram | kanon.nakasu | 連携済み・投稿成功 |

### 追加実装（同日）
- **Instagram通常投稿/ストーリー切り替え** UIに投稿タイプ選択追加（フィード/ストーリー）
- **Facebookページ投稿機能** 追加（テキスト+画像URL、Instagram連携から同じトークンで投稿）
- **Instagram予約投稿機能** 追加（10分後〜75日先まで、Graph API scheduled_publish_time）
- **Facebook予約投稿** にも対応
- 投稿ルート追加: `POST /api/posts/facebook`
- `services/meta/post.js` にストーリー・予約・Facebook投稿関数追加
- UIにFacebook投稿フォーム（テキスト+画像URL+予約日時）追加
- CSSにFacebookバッジ（`.platform-facebook`）追加
- ※動作確認は次回実施

### システム構成（更新）
```
services/
├── meta/
│   ├── auth.js        # Meta OAuth認証（短期→長期トークン変換）
│   └── post.js        # Instagram投稿（フィード/ストーリー/予約）+ Facebookページ投稿
```

### 次回やること
1. **動作確認**: Instagram ストーリー / 予約投稿 / Facebookページ投稿のテスト
2. Meta App Review申請（本番公開に必須、現在テストモードで自分のアカウントのみ）
3. TikTok審査結果確認（5/10提出、5月下旬頃）
4. Google OAuth同意画面の本番公開

---

## 2026/5/11 セッション

### 今回やったこと
- **Meta開発者アカウント認証完了**（自分のクレカで本人確認突破）
- **Metaアプリ「sns-auto-post」作成完了**
- ビジネスポートフォリオ「Night Safari Group」をリンク
- ユースケース追加：
  - マーケティングAPIで広告を作成・管理
  - Instagramでメッセージとコンテンツを管理
  - ページのすべてを管理

### 追加済みの権限（テスト準備完了）
- `ads_management`
- `ads_read`
- `business_management`
- `instagram_business_basic`
- `instagram_business_content_publish`（投稿に必須）
- `instagram_business_manage_messages`
- `instagram_manage_comments`
- `pages_read_engagement`
- `pages_show_list`
- `public_profile`

### 発生した問題
- ステップ2「アカウントを追加」でInstagramログイン時に「開発者の役割が不十分です」エラー
- アプリの役割で華音アカウントをテスターとして追加が必要

### 次回やること（Meta続き）
1. 「アプリの役割」画面で **「テスター」を選択** → 華音アカウントを追加
2. ダッシュボード → 「Instagramでメッセージとコンテンツを管理」→ ステップ2「アカウントを追加」を再試行
3. Instagramビジネスアカウントの連携
4. ステップ4「Instagramビジネスログインを設定する」
5. アプリの設定 → ベーシック → App IDとApp Secretを取得 → .envに追加
6. OAuth認証フロー実装 → 投稿機能開発

### カード情報の削除について
- 認証完了済みなので、カード情報は削除可能
- 削除前に2FA（二段階認証）を設定推奨

### その他の待ち事項
- TikTok審査結果待ち（2026/5/10提出、5月下旬頃）
- Google OAuth同意画面の本番公開（現在テストモード）

---

## 2026/5/10 セッション

### 今回やったこと
- TikTok再連携（アクセストークン期限切れのため）
- デモ動画を画面録画で撮影（PC画面録画のみ）
- **TikTok Developer Portal で Production審査を提出完了**

### TikTok審査提出の詳細
- アプリアイコン（1024x1024）アップロード済み
- アプリ説明文を記入
- 利用規約URL / プライバシーポリシーURL 設定済み
- プラットフォーム: ウェブ
- ウェブURL: https://beautystudiofuku-jpg.github.io/sns-auto-post-app/
- 製品: ログインキット + コンテンツ投稿API を追加
- スコープ: ユーザー情報.基本（ログインキット含む）、ビデオアップロード（コンテンツ投稿API含む）、ユーザー情報統計（手動追加）
- リダイレクトURI: https://beautystudiofuku-jpg.github.io/sns-auto-post-app/callback
- デモ動画アップロード済み
- **審査提出完了（2026/5/10）** → 結果: 5〜10営業日（5月下旬頃）

### 判明した問題
- アクセストークンが約1ヶ月で失効していた → 再連携で解決
- 48MBのMOVファイルで「The total chunk count is invalid」エラー → 小さいMP4（1.5MB）では成功
- 予約日時を設定すると即時投稿されない仕様（approved状態で待機） → 予約日時を空にすれば即時投稿可能

### Google Business Profile 進捗
- **審査通過確認済み**
- Google Cloud Console（sns-auto-postプロジェクト）で確認：
  - My Business Account Management API — 有効
  - My Business Business Information API — 有効
  - My Business Verifications API — 有効
- OAuthクライアントID作成済み（sns-auto-post-client / 2026/4/14作成）
- リダイレクトURIを `http://localhost:3456/auth/google/callback` に変更・保存済み
- クライアントID: 89632287295-nhvqs...（Google Cloud Consoleで確認可能）
- **次回**: クライアントシークレットを.envに追加 → OAuth認証フロー実装 → 投稿機能開発

### Google Business Profile 開発完了
- OAuth認証フロー実装（`services/google/auth.js`）
- 投稿API実装（`services/google/post.js`）
- 認証ルート追加（`/auth/google/authorize/:storeId`, `/auth/google/callback`）
- 投稿ルート追加（`/api/posts/google`）
- UIにGoogle連携ボタン＆テキスト投稿フォーム追加
- トークン自動リフレッシュ Google対応済み
- Google Cloud Consoleで有効化したAPI：
  - My Business Account Management API
  - My Business Business Information API
  - My Business Verifications API
  - Google My Business API（v4 / 投稿用）
- OAuth同意画面でテストユーザー追加（night.safari.group@gmail.com）
- **テスト投稿成功**

### Meta開発者アカウント作成（再挑戦 → 再中断）
- https://www.facebook.com/ で華音アカウントにログイン済み
- https://developers.facebook.com/ → 「開始する」→ Register完了
- **Verify account画面まで到達**
- SMS認証は電話番号問題でスキップ
- 「クレジットカードを追加」リンクを確認 → **会社のカードが手元にないため中断**

### 次回やること（Meta再開手順）
1. **会社のカードを用意**（代表がいる時に）
2. https://developers.facebook.com/ を開く（華音アカウントでログイン済みであること）
3. 「開始する」→ Verify account 画面で「**クレジットカードを追加**」リンクをクリック
4. 会社のカード情報を入力 → 認証完了（課金されない）
5. Contact info → About you と進める
6. 「マイアプリ」→「アプリを作成」
7. Instagram Graph API / Facebook Graph API を追加
8. Facebookページ（華音）とInstagramビジネスアカウントを連携
9. 認証完了後、カード情報は削除可能（削除前に2FA設定推奨）

### その他の待ち事項
- TikTok審査結果待ち（2026/5/10提出、5月下旬頃）
- Google OAuth同意画面の本番公開（現在テストモード）

---

## 2026/4/17 セッション（中断）

### 今回やったこと
- `.env`に OpenRouter APIキー追加（確認完了）
- 取得済みAPI一覧を整理（TikTok✅/ OpenRouter✅ / Google BP⏳審査中 / Meta❌未取得）
- **Meta for Developers アカウント作成に着手** ← 中断中

### Meta開発者アカウント作成の進捗

#### 判明したこと
- Facebook/Meta APIは**未申請**だった（「多分申請済み」は記憶違い）
- Facebookページは作成済み（華音アカウント）だが、**開発者アカウント未完成**

#### 試したこと
1. https://developers.facebook.com/ → 「開始する」クリック
2. Meta for Developers アカウント作成フロー開始
   - Register → 利用規約同意OK
   - **Verify account → SMS認証でエラー**（電話番号が既存アカウントで使用中の可能性）
3. 「クレジットカードを追加」での認証に切替を試みる
4. Meta Pay 個人情報設定画面（配送先住所/メール/電話）に到達
   - `night.safari.group@gmail.com` でメール登録済み確認
   - 住所・電話は登録済み
   - **支払い方法（カード）追加欄が見つからず**
5. developers.facebook.com/apps/ に戻ったら「アカウント作成」画面に戻る
   = **Facebookログイン状態が切れている可能性**

### 次回の再開手順

#### ステップ1: Facebookログイン確認
1. https://www.facebook.com/ を通常ブラウザ（シークレットではない）で開く
2. 華音アカウントでログイン
3. 右上にプロフィールアイコンが出ることを確認

#### ステップ2: 開発者登録フロー再開
1. 同じブラウザで https://developers.facebook.com/ を開く
2. 右上が「マイアプリ」になっているか確認
3. ログイン済みなら登録フローに戻れる

#### ステップ3: Verify account をカード認証で突破
- SMS認証はスキップ（電話番号が既存アカウント紐付けで失敗）
- **「クレジットカードを追加」リンクからカード認証**
- カード情報削除は**認証完了後に可能**（ただし2FA設定推奨）
- 請求先住所はカード登録住所と一致させる

#### ステップ4: アカウント作成完了後
- Contact info → About you と進める
- マイアプリ → 「アプリを作成」
- Instagram Graph API / Facebook Graph API を追加
- Facebookページ（華音）とInstagramビジネスアカウントを連携

### 重要メモ（忘れないように）
- **電話番号問題**: 個人番号は既存アカウント紐付けでSMS不可 → カード認証ルート
- **メール**: `night.safari.group@gmail.com` がMeta側に登録済み
- **カード認証の課金**: 開発者認証目的なら課金されない（公式確認済み）
- **カード削除**: 認証完了後に削除可能だが、削除前に2FA設定推奨（Google Authenticator等）
- **OpenRouter APIキー**: `.env`に追加済み（未使用）

---

## 2026/4/15 セッション

### 完了したこと

#### 1. Google Business Profile API申請
- Google Cloud Console（ナイトサファリアカウント）でプロジェクト確認
- My Business API 3つが有効化済み（Account Management, Business Information, Verifications）
- クォータが0 → アクセス申請フォーム未提出だった
- **申請フォーム提出完了**（審査: 7-10営業日、4月下旬〜5月上旬に結果）

#### 2. Instagram/Facebook確認
- Meta for Developers: https://developers.facebook.com/
- Facebookアカウント新規作成済み（華音）
- **Facebookページ作成完了**（当初レート制限エラー → 後日リトライで成功）
- Instagram Graph APIにはFacebookページとの連携が必須
- **次回**: Facebookページ → Instagram連携 → Meta for Developersでアプリ作成

#### 3. TikTok投稿システム開発 ← メイン作業
- **Node.js + Express + SQLite でシステム完成**
- サーバー起動: `npm start` → http://localhost:3456
- OAuth認証フロー動作確認済み
- **実際にTikTokへの動画投稿成功！**（Sandbox/SELF_ONLYモード）

#### 4. TAISUN Agent更新
- `git pull origin main` → Already up to date
- `install.ps1` 実行 → v2.53.0 インストール完了

---

### システム構成（現在の状態）

```
C:\Users\サロン\Desktop\dev\sns_test\
├── server.js                 # Express サーバー（ポート3456）
├── config/index.js           # 設定（TikTok/Google/Meta）
├── db/database.js            # SQLite DB
├── routes/
│   ├── auth.js               # TikTok / Google / Meta OAuth
│   ├── stores.js             # 店舗CRUD
│   └── posts.js              # 投稿API（TikTok/Google/Instagram/Facebook）
├── services/
│   ├── tiktok/auth.js        # TikTok OAuth処理
│   ├── tiktok/post.js        # TikTok動画投稿
│   ├── tiktok/creator.js     # クリエイター情報
│   ├── google/auth.js        # Google OAuth処理
│   ├── google/post.js        # Google BP投稿
│   ├── meta/auth.js          # Meta OAuth処理（短期→長期トークン変換）
│   ├── meta/post.js          # Instagram投稿（フィード/ストーリー/予約）+ FB投稿
│   ├── token-manager.js      # トークン自動更新（TikTok/Google/Meta）
│   ├── scheduler.js          # 予約投稿
│   └── rate-limiter.js       # レート制限
├── utils/
│   ├── crypto.js             # AES-256暗号化
│   ├── chunked-upload.js     # 動画チャンクアップロード
│   └── retry.js              # リトライ
├── public/                   # UI
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── docs/
│   ├── callback.html         # TikTok OAuth中継（GitHub Pages）
│   └── meta-callback.html    # Meta OAuth中継（GitHub Pages）
└── uploads/                  # 動画一時保存
```

### DB内の現在のデータ
- 店舗: Nancy's Diner, 華音
- SNSアカウント: 華音 → TikTok(@kanon_fukuoka) / Google(華音) / Instagram(kanon.nakasu)
- 投稿: TikTok 2件、Google投稿成功、Instagram投稿成功

---

## 次回やること（優先順）

### 1. TikTok審査提出（デモ動画）
**画面録画で以下の操作を撮影：**
1. http://localhost:3456 を開く
2. 店舗管理 → TikTok連携する → TikTokログイン → 連携完了
3. 新規投稿 → 動画アップロード → キャプション入力 → 下書き保存
4. 投稿管理 → 「投稿する」→ 投稿完了
5. TikTokアプリで投稿が表示されていることを確認

**画面録画方法:** Win + Shift + R（Xbox Game Bar）

**録画後：**
1. https://developers.tiktok.com/ にログイン
2. アプリ「sns-auto-post」を開く
3. 「Submit for review」または「App Review」
4. デモ動画をアップロード → 提出
5. 審査期間: 5-10営業日

### 2. Instagram/Facebook連携
- Facebookページ（作成済み）にInstagramビジネスアカウントを連携
  - Facebookページ設定 → リンク済みアカウント → Instagram接続
- Meta for Developers（https://developers.facebook.com/）でアプリ作成
- Instagram Graph API の投稿機能を開発
- App Reviewを申請

### 3. Google Business Profile
- 審査結果待ち（2026/4/15申請、7-10営業日）
- 承認後: クォータ確認 → 残りのAPIを有効化 → 投稿機能開発

---

## 各サービスのアカウント情報

| サービス | アカウント | 状態 |
|---------|----------|------|
| TikTok Developer | sns-auto-post | Sandbox稼働中・Production審査待ち(5/10提出)、テストユーザー: @kanon_fukuoka |
| Google Cloud Console | ナイトサファリ | 審査通過・投稿成功・OAuth同意画面テストモード |
| Meta for Developers | sns-auto-post (App ID: 1513223523915534) | Instagram連携・投稿成功・テストモード |
| Facebook | 華音 中洲（ページ） | Instagramとリンク済み |
| Instagram | kanon.nakasu | ビジネスアカウント・連携済み・投稿成功 |
| GitHub | beautystudiofuku-jpg | sns-auto-post-app リポジトリ（public） |

## 技術メモ
- サーバーポート: 3456（3000は別システムで使用中）
- TikTok Redirect URI: https://beautystudiofuku-jpg.github.io/sns-auto-post-app/callback
- Meta Redirect URI: https://beautystudiofuku-jpg.github.io/sns-auto-post-app/meta-callback
- Sandbox制限: SELF_ONLY、最大5テストユーザー、128MBファイル制限
- 5MB未満の動画はチャンク分割なしで1回で送信（修正済み）
- Express 5使用中
- Meta HTTPS強制: 無効化できないためGitHub Pages中継方式を採用
- Instagram Graph API: v22.0使用
- Metaトークン: 長期トークン（60日有効）、fb_exchange_tokenでリフレッシュ
