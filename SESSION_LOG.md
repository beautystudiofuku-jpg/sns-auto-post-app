# SNS自動投稿システム - セッションログ

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
