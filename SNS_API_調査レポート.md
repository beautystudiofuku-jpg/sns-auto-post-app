# 複数店舗SNS自動投稿システム APIガイド

調査日: 2026年4月14日

---

## 目次

1. [Instagram (Meta Graph API)](#1-instagram-meta-graph-api)
2. [X / Twitter](#2-x--twitter)
3. [Facebook (Meta Graph API)](#3-facebook-meta-graph-api)
4. [LINE公式アカウント](#4-line公式アカウント)
5. [Google Business Profile](#5-google-business-profile)
6. [TikTok](#6-tiktok)
7. [複数店舗対応の全体設計](#7-複数店舗対応の全体設計)

---

## 1. Instagram (Meta Graph API)

### 1-1. 正式なAPI名

**Instagram Graph API**（Instagram Platform の一部）

- 旧「Instagram Basic Display API」は 2024年12月4日に完全廃止済み
- 現在は Instagram Graph API のみが公式サポート対象

### 1-2. 投稿に必要な権限/スコープ

| スコープ | 用途 |
|---|---|
| `instagram_basic` | プロフィール情報・メディアの読み取り |
| `instagram_content_publish` | 写真・動画・リール・カルーセル・ストーリーの投稿 |
| `pages_show_list` | 接続されたFacebookページの一覧取得 |
| `pages_read_engagement` | エンゲージメント（いいね・コメント・シェア）の読み取り |
| `business_management` | 複数ビジネスアカウントの管理（複数店舗対応時に必須） |

**前提条件:**
- Instagramアカウントが **Business** または **Creator** アカウントであること
- Facebookページに接続されていること

### 1-3. 料金

| 項目 | 料金 |
|---|---|
| API利用料 | **無料**（Meta は Graph API の利用料を徴収しない） |
| 制約 | レート制限・権限レベル・App Review が適用される |

### 1-4. API取得手順

1. **Meta for Developers** (https://developers.facebook.com/) にアクセスしアカウント作成
2. 新しいアプリを作成（アプリタイプは **Business** を選択）
3. App ID と App Secret を取得
4. Instagram Graph API の設定を追加
5. Instagramアカウント（Business/Creator）をFacebookページに接続
6. 必要な権限スコープを設定
7. **OAuth 2.0** フローでアクセストークンを取得
   - 短期トークン: 約1時間有効
   - 長期トークン: 約60日有効（期限前にリフレッシュが必要）
8. **App Review** を申請（本番運用には必須、数日〜数週間かかる場合あり）
9. ビジネス認証（Business Verification）を完了

### 1-5. 複数店舗対応方法

- **Facebook Login for Business** を使用（推奨）
  - Business Manager と統合し、複数クライアントアカウントを一元管理
- 各店舗のInstagram Businessアカウントを1つのMetaアプリに紐付け
- 各アカウントごとにOAuth認証を行い、個別のアクセストークンを管理
- レート制限は **アカウント単位** で適用（アカウント数 x 200 = 合計API呼び出し数/時間）
- ビジネスポートフォリオの認証を行うと上限が引き上げられる

### 1-6. レート制限

| 制限項目 | 値 |
|---|---|
| API呼び出し | **200回/時間/アカウント**（2024年10月に5,000から大幅削減） |
| コンテンツ公開 | **50投稿/24時間/アカウント** |
| 推奨投稿頻度 | 1〜3件/日/アカウント（アルゴリズム的に最適） |

### 1-7. 2025-2026年の最新変更点

- 2024年12月: Instagram Basic Display API が完全廃止
- 2024年10月: APIレート制限が 5,000回/時 から **200回/時** に96%削減
- 2025年1月: Graph API v21 でいくつかの Insights API メトリクスが廃止
- 個人アカウントはサードパーティAPIでのサポート対象外に
- ストーリーズ投稿がAPIで Business アカウント向けにサポート

---

## 2. X / Twitter

### 2-1. 正式なAPI名

**X API v2**（旧 Twitter API v2）

### 2-2. 投稿に必要な権限/スコープ

| スコープ | 用途 |
|---|---|
| `tweet.read` | ツイートの読み取り |
| `tweet.write` | ツイートの作成・削除 |
| `users.read` | ユーザー情報の読み取り |
| `offline.access` | リフレッシュトークンの使用（長期アクセス） |

- **OAuth 2.0 with PKCE** を使用（推奨）
- OAuth 1.0a も引き続きサポート

### 2-3. 料金

**2026年2月より、新規開発者は Pay-Per-Use（従量課金）がデフォルト:**

| プラン | 月額 | 投稿制限 | 備考 |
|---|---|---|---|
| **Pay-Per-Use（新規デフォルト）** | 投稿1件 $0.01 / 読み取り1件 $0.005 | 月200万読み取りまで | クレジットを事前購入 |
| Free（レガシー） | $0 | 極めて制限的 | 新規登録不可 |
| Basic（レガシー） | $100/月 | 10,000ツイート/月 | 既存契約者のみ |
| Pro（レガシー） | $5,000/月 | 100万ツイート/月 | 既存契約者のみ |
| Enterprise | $42,000+/月 | カスタム | 要個別契約 |

**コスト試算例（複数店舗）:**
- 50アカウント x 10投稿/日 = 500投稿/日 = 15,000投稿/月
- Pay-Per-Use: 約 **$150/月**（投稿のみ）

### 2-4. API取得手順

1. **X Developer Portal** (https://developer.x.com/) にアカウント登録
2. Developer Agreement に同意
3. アプリケーションを作成
4. API Key と API Secret Key を取得
5. OAuth 2.0 クライアント設定（Client ID / Client Secret）
6. Callback URL を設定
7. 必要なスコープを設定
8. Pay-Per-Use プランでクレジットを購入（自動チャージ設定も可能）
9. 支出上限（Spending Cap）を設定

### 2-5. 複数店舗対応方法

- **ユーザーレベル認証（OAuth 2.0）** で各店舗アカウントを個別に認証
- 1つのアプリで複数ユーザーアカウントのトークンを管理
- ユーザー単位: 100ツイート/15分
- アプリ単位: 10,000ツイート/24時間
- 複数アカウントでの同時大量操作は避ける（アプリレベルの制限に抵触するリスク）

### 2-6. レート制限

| 制限項目 | 値 |
|---|---|
| ツイート作成 | **100件/15分/ユーザー** |
| アプリ全体 | **10,000件/24時間** |
| 429エラー時 | `x-rate-limit-reset` ヘッダーでリセット時刻を確認 |

### 2-7. 2025-2026年の最新変更点

- 2026年2月: 固定料金プラン（Free/Basic/Pro）が新規登録不可に。**Pay-Per-Use が新規デフォルト**
- 自動チャージ（auto top-up）と支出上限（spending cap）機能が追加
- 既存の固定プラン契約者はレガシーとして継続利用可能
- 自動化ルールの厳格化（複数プロフィールでの同時一括操作はBAN対象になる可能性）

---

## 3. Facebook (Meta Graph API)

### 3-1. 正式なAPI名

**Facebook Graph API**（2026年4月時点の最新バージョン: v22.0 以降）

### 3-2. 投稿に必要な権限/スコープ

| スコープ | 用途 |
|---|---|
| `pages_manage_posts` | ページへの投稿の作成・編集・削除 |
| `pages_read_engagement` | エンゲージメントデータの読み取り |
| `pages_show_list` | 管理ページ一覧の取得 |
| `pages_read_user_content` | ユーザーがページに投稿したコンテンツの読み取り |
| `business_management` | ビジネスアセットの管理 |

**必要なトークン:** Page Access Token（ページ管理者のみ生成可能）

### 3-3. 料金

| 項目 | 料金 |
|---|---|
| API利用料 | **無料** |
| 制約 | App Review・権限レベル・レート制限が適用 |

### 3-4. API取得手順

1. **Meta for Developers** (https://developers.facebook.com/) でアプリ作成
2. アプリタイプ **Business** を選択
3. Facebook Login を設定
4. 必要な権限を追加（`pages_manage_posts` 等）
5. テスト用ページで動作確認
6. **App Review** を申請（本番運用に必須）
7. ビジネス認証を完了
8. Page Access Token を取得
   - User Access Token からページトークンへの変換が必要
   - 長期ページトークンは無期限（ユーザーがパスワード変更等しない限り）

### 3-5. 複数店舗対応方法

- Business Manager で複数のFacebookページを一元管理
- 各ページに対して個別の Page Access Token を取得・管理
- 1つのアプリで全ページのトークンを保持
- Instagramと同一のMetaアプリで統合管理が可能

### 3-6. レート制限

| 制限項目 | 値 |
|---|---|
| Pages API | **Business Use Case** レート制限が適用 |
| 一般的な制限 | 各ノード/エッジごとに個別の制限が設定 |
| スケジュール投稿 | Graph API v24 で改善されたスケジュール投稿機能 |

### 3-7. 2025-2026年の最新変更点

- Graph API バージョンが継続的に更新（各リリースでエンドポイントの追加・廃止あり）
- 権限取得ルールの厳格化
- プライバシー強化に伴うレート制限の引き締め
- ページのパブリックコンテンツアクセスに追加の審査が必要

---

## 4. LINE公式アカウント

### 4-1. 正式なAPI名

**LINE Messaging API**

- LINE Developers プラットフォームの一部
- LINE VOOM への投稿は別途対応

### 4-2. 投稿に必要な権限/スコープ

| 権限/設定 | 用途 |
|---|---|
| Channel Access Token | APIからのメッセージ送信に必要 |
| `message:send` | メッセージの送信 |
| `message:receive` | メッセージの受信（モジュールチャネル使用時） |
| Webhook URL | ユーザーからのメッセージ受信 |

**メッセージ送信タイプ:**
- **ブロードキャスト**: 全友だちに一斉配信
- **マルチキャスト**: 指定したユーザーに送信
- **プッシュメッセージ**: 個別ユーザーに送信

### 4-3. 料金

| プラン | 月額 | 無料メッセージ通数 | 追加メッセージ |
|---|---|---|---|
| **コミュニケーションプラン** | 0円 | 200通 | 不可 |
| **ライトプラン** | 5,000円 | 5,000通 | 不可 |
| **スタンダードプラン** | 15,000円 | 30,000通 | 最大3円/通（段階割引あり） |

**通数計算:** 送信先ユーザー数 x 吹き出し数
**LINE VOOM投稿:** 従量課金の対象外（無料で情報発信可能）

### 4-4. API取得手順

1. **LINE Developers Console** (https://developers.line.biz/) にアクセス
2. LINEアカウントでログイン
3. 開発者名とメールアドレスを入力して開発者登録
4. **プロバイダー** を作成（会社名や組織名）
5. **Messaging API チャネル** を作成
   - ホーム国: 日本
   - チャネルアイコン・名前・説明を設定
   - ビジネスカテゴリを選択
6. Channel Access Token を発行
7. LINE公式アカウントの管理画面で Messaging API の有効化を確認
8. Webhook URL を設定（メッセージ受信が必要な場合）

### 4-5. 複数店舗対応方法

**方法1: 個別チャネル方式**
- 各店舗ごとに個別の LINE公式アカウント + Messaging API チャネルを作成
- 各チャネルに個別の Channel Access Token を発行
- 1つのシステムから複数のトークンを管理して配信

**方法2: モジュールチャネル方式**
- 1つのモジュールチャネルを複数の LINE公式アカウントにアタッチ
- API呼び出し時にボットのユーザーIDをヘッダーで指定
- 複数アカウントの一元管理に適している

### 4-6. レート制限

| 制限項目 | 値 |
|---|---|
| ブロードキャスト | メッセージ通数はプランに依存 |
| APIリクエスト | エンドポイントごとに制限あり |
| プッシュメッセージ | 秒間のリクエスト制限あり |

### 4-7. 2025-2026年の最新変更点

- **2026年10月1日**: 追加メッセージ料金の改定が予定
- LINE VOOM投稿は引き続き従量課金対象外
- Webhook転送による複数ツール併用が可能

---

## 5. Google Business Profile

### 5-1. 正式なAPI名

**Google Business Profile API**（旧 Google My Business API）

関連API群（8つのAPIを有効化する必要あり）:
- My Business Account Management API
- My Business Business Information API
- My Business Lodging API
- My Business Place Actions API
- My Business Notifications API
- My Business Verifications API
- My Business Q&A API
- Business Profile Performance API

### 5-2. 投稿に必要な権限/スコープ

| 権限 | 用途 |
|---|---|
| **OAuth 2.0** | 認証・認可に必要 |
| ビジネスプロフィールのオーナー/管理者権限 | API経由でアクセスするプロフィールの管理権限 |
| `https://www.googleapis.com/auth/business.manage` | ビジネスプロフィールの管理スコープ |

### 5-3. 料金

| 項目 | 料金 |
|---|---|
| API利用料 | **無料**（現時点） |
| 注意事項 | 将来的にGoogle Cloud利用料が発生する可能性あり |

### 5-4. API取得手順

1. **Google Cloud Console** (https://console.cloud.google.com/) でプロジェクト作成
2. **Business Profile API アクセス申請フォーム** に記入（約30問の質問に回答）
3. Google からの **審査・承認** を待つ（承認に数日〜数週間、レスポンスがない場合もあり）
4. 承認後、Google Cloud Console で8つの関連APIを有効化
5. **OAuth 2.0 クライアントID** を作成
6. OAuth 同意画面を設定
7. サービスアカウントまたはユーザー認証でアクセストークンを取得
8. Googleビジネスプロフィールのオーナー/管理者権限を持つアカウントで認証

### 5-5. 複数店舗対応方法

- 1つのGoogle Cloud プロジェクトで複数のビジネスプロフィールを管理
- **ロケーショングループ**（Location Group）で複数店舗をまとめて管理
- 各ロケーションに対して個別に投稿を作成（一括投稿はAPI経由で実装）
- 管理画面では一括投稿が非対応のため、APIでの自動化が特に有効

**投稿対応コンテンツ:**
- 新着情報（What's New）
- イベント
- 特典/オファー
- CTA（Call to Action）付き投稿

### 5-6. レート制限

| 制限項目 | 値 |
|---|---|
| 全体リクエスト | **300リクエスト/分** |
| 編集操作 | **10回/分/ビジネスプロフィール** |
| クォータ超過時 | Google にクォータ増加リクエストが可能 |

### 5-7. 2025-2026年の最新変更点

- API利用申請プロセスが継続中（審査が厳格化傾向）
- 一部ユーザーから承認レスポンスの遅延が報告されている
- 正当なビジネス用途の証明が承認に必要
- API自体は無料だが、Google Cloud のインフラ利用に関連するコストが将来発生する可能性

---

## 6. TikTok

### 6-1. 正式なAPI名

**TikTok Content Posting API**（TikTok for Developers プラットフォームの一部）

### 6-2. 投稿に必要な権限/スコープ

| スコープ | 用途 |
|---|---|
| `video.publish` | 動画の投稿（公開/下書き） |
| `video.upload` | 動画のアップロード |
| `user.info.basic` | ユーザー基本情報の取得 |

**認証:** OAuth 2.0 PKCE フロー

### 6-3. 料金

| 項目 | 料金 |
|---|---|
| 基本API利用 | **無料**（標準開発者アカウント） |
| 高度なビジネス機能 | Business Developer アカウントまたはパートナー契約で有料の場合あり |

### 6-4. API取得手順

1. **TikTok for Developers** (https://developers.tiktok.com/) でアカウント作成
2. アプリケーションを作成し、Client Key / Client Secret を取得
3. Content Posting API を製品として追加
4. 必要なスコープ（`video.publish` 等）を設定
5. OAuth 2.0 PKCE フローでユーザー認証を実装
   - `access_token`: 24時間有効
   - `refresh_token`: 365日有効
6. **監査（Audit）申請**を提出（公開投稿に必須）
   - 未監査状態: 最大5ユーザーまで、**SELF_ONLY（非公開）** モードのみ
   - 監査完了後: 公開投稿が可能に
7. 審査完了まで通常 **5〜10営業日**

### 6-5. 複数店舗対応方法

- 1つのTikTokアプリで **無制限のユーザーアカウント** を管理可能
- 各アカウントはOAuth 2.0で個別に認証し、独自のトークンを取得
- **100アカウント以上** を管理する場合、複数のAPIアプリに分散させることを推奨
  - アプリごとのレート制限がアカウント全体に適用されるため
- スケジュール投稿はAPIでネイティブサポートなし（自前のジョブキュー/cronで実装）

### 6-6. レート制限

| 制限項目 | 値 |
|---|---|
| 投稿数 | **25件/24時間/アカウント**（一部情報では15件/日） |
| 未監査アプリ | **5ユーザーまで/24時間** |
| API呼び出し | `X-RateLimit-Remaining` / `X-RateLimit-Reset` ヘッダーで管理 |

### 6-7. 2025-2026年の最新変更点

- **写真投稿** が Content Posting API でサポート開始
- Duet / Stitch 権限の設定が API 経由で可能に
- ブランドコンテンツの開示（Branded Content Disclosure）機能追加
- ジオターゲティング（動画の地域別表示制御）機能追加
- アップロードステータスの **Webhook コールバック** 対応
- 未監査状態では全コンテンツが非公開（SELF_ONLY）に制限

---

## 7. 複数店舗対応の全体設計

### 7-1. アーキテクチャ概要

```
┌─────────────────────────────────────┐
│        統合管理ダッシュボード          │
│    (店舗選択・投稿作成・スケジュール)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│          投稿管理サーバー             │
│  - ジョブキュー (Redis/RabbitMQ)      │
│  - トークン管理 (暗号化保存)           │
│  - レート制限ハンドラー               │
│  - リトライロジック (指数バックオフ)    │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌───────┐ ┌───────┐ ┌───────┐
│店舗 A │ │店舗 B │ │店舗 C │
│       │ │       │ │       │
│IG     │ │IG     │ │IG     │
│X      │ │X      │ │X      │
│FB     │ │FB     │ │FB     │
│LINE   │ │LINE   │ │LINE   │
│GBP    │ │GBP    │ │GBP    │
│TikTok │ │TikTok │ │TikTok │
└───────┘ └───────┘ └───────┘
```

### 7-2. トークン管理の設計

| SNS | トークン種別 | 有効期限 | リフレッシュ方法 |
|---|---|---|---|
| Instagram | Long-lived Token | 60日 | 期限前にリフレッシュAPI呼び出し |
| X/Twitter | OAuth 2.0 Token | 2時間 | refresh_token で更新 |
| Facebook | Page Access Token | 無期限* | ユーザーパスワード変更時に再取得 |
| LINE | Channel Access Token | 無期限（v2.1）/ 30日（短期） | 必要に応じて再発行 |
| Google BP | OAuth 2.0 Token | 1時間 | refresh_token で更新 |
| TikTok | access_token | 24時間 | refresh_token（365日有効）で更新 |

*Page Access Token は長期トークンに変換後、理論上は無期限

### 7-3. コスト見積もり（10店舗の場合）

| SNS | API料金 | アカウント料金 | 月額合計目安 |
|---|---|---|---|
| Instagram | 無料 | 無料 | 0円 |
| X/Twitter | 投稿1件$0.01 | なし | ~$30（1日1投稿/店舗の場合） |
| Facebook | 無料 | 無料 | 0円 |
| LINE | API無料 | 5,000〜15,000円/アカウント | 50,000〜150,000円 |
| Google BP | 無料 | 無料 | 0円 |
| TikTok | 無料 | 無料 | 0円 |

### 7-4. 実装上の注意点

1. **レート制限の遵守**: 各APIのレート制限を厳守し、429エラー時は指数バックオフでリトライ
2. **トークンの安全な管理**: サーバーサイドで暗号化保存、クライアントサイドには絶対に保存しない
3. **App Review / 監査**: Instagram・Facebook は Meta の App Review、TikTok は監査プロセスが必須
4. **Google BP API 申請**: 承認に時間がかかるため早めに申請を開始する
5. **コンテンツポリシー準拠**: 各プラットフォームの利用規約・自動化ポリシーを遵守
6. **エラーハンドリング**: 各APIのエラーレスポンスに応じた適切な処理を実装
7. **ログ管理**: 投稿成功/失敗のログを全店舗・全SNSで一元管理

---

## 参考リンク

### Instagram / Facebook (Meta)
- [Meta for Developers](https://developers.facebook.com/)
- [Instagram Platform Overview](https://developers.facebook.com/docs/instagram-platform/overview/)
- [Permissions Reference](https://developers.facebook.com/docs/permissions/)
- [Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/)

### X / Twitter
- [X Developer Platform](https://developer.x.com/)
- [X API Pricing](https://postproxy.dev/blog/x-api-pricing-2026/)

### LINE
- [LINE Developers](https://developers.line.biz/ja/)
- [Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/overview/)
- [料金プラン](https://www.lycbiz.com/jp/service/line-official-account/plan/)

### Google Business Profile
- [Google Business Profile APIs](https://developers.google.com/my-business)
- [Basic Setup](https://developers.google.com/my-business/content/basic-setup)
- [Posts Data](https://developers.google.com/my-business/content/posts-data)

### TikTok
- [TikTok for Developers](https://developers.tiktok.com/)
- [Content Posting API](https://developers.tiktok.com/products/content-posting-api/)
- [Rate Limits](https://developers.tiktok.com/doc/tiktok-api-v2-rate-limit)
