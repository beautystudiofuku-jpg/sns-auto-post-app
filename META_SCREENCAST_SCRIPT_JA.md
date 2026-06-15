# 録画台本（日本語版）

> これはあなたが読む用の日本語訳です。
> **画面に焼き込むキャプションは英語**（レビュアーが日本語を読めないため）。
> 各シーンの「📝英語キャプション」をそのまま動画に入れてください。
> 英語の元ファイル：`META_SCREENCAST_SCRIPT.md`

- 長さの目安：**2〜4分**
- 解像度：**1920×1080以上**（Win + Shift + R でOK）
- 音声：なくてOK。ただし**英語キャプションは全シーン必須**

---

## シーン1 — タイトル画面（5秒）

**やること：** タイトル画像を5秒映すだけ

**📝英語キャプション（画面に表示する文）：**
> sns-auto-post — Internal social media publishing tool for KOKO K.K. (Night Safari Group)
> App Review demonstration · June 2026

（日本語の意味：KOKO株式会社の社内向けSNS投稿ツール。App Reviewのデモ動画）

---

## シーン2 — アプリを開いて店舗一覧を見せる（15秒）

**やること：**
1. ブラウザで `https://sns-auto-post-app.onrender.com` を開く
2. 「華音」の店舗カードにマウスを乗せ、緑のドット3つ（TikTok / Google / Instagram 連携済み）を見せる

**📝英語キャプション：**
> Production URL. The store "華音" already has its Instagram Business account and Facebook Page connected. The green dot next to Instagram (username: kanon.nakasu) was rendered by reading the username via `instagram_basic`.

（意味：本番URL。華音はすでにInstagramビジネスアカウントとFacebookページを連携済み。Instagram横の緑ドットは `instagram_basic` でユーザー名を読み取って表示している）

---

## シーン3 — Instagram連携を見せる（10秒）

**やること：**
- 華音のInstagram行を指して、`kanon.nakasu` を強調

**📝英語キャプション：**
> `pages_show_list` + `pages_read_engagement` were used at connection time to call `GET /me/accounts?fields=instagram_business_account` and find the Instagram Business Account linked to the Facebook Page. `instagram_basic` was then used to read the Instagram username displayed here.

（意味：連携時に `pages_show_list` と `pages_read_engagement` でFacebookページに紐づくInstagramビジネスアカウントを探し、`instagram_basic` でここに表示するユーザー名を読み取った）

---

## シーン4 — Instagramフィード投稿（実際に投稿する・40秒）

**やること：**
1. 「新規投稿」タブをクリック
2. アカウント選択 → `[華音] Instagram - kanon.nakasu`
3. 投稿タイプは「フィード投稿」のまま
4. テスト画像（料理写真など）をドロップゾーンに入れる
5. 短いキャプションを入力：`Today's special.`
6. 「投稿する」をクリック
7. 成功通知（トースト）が出るのを待つ
8. Instagramアプリ/Webに切り替えて、@kanon.nakasu に投稿が出ているのを見せる

**📝英語キャプション（順番に出す）：**
- "Selecting the Instagram destination account."
- "Uploading an image — stored in our Cloudflare R2 bucket so Meta can fetch a public URL."
- "Click Publish. The app now calls `POST /{ig-user-id}/media` (creates container) → polls `status_code` → `POST /{ig-user-id}/media_publish`. This is `instagram_content_publish` in action."
- "Confirmed live on @kanon.nakasu."

（意味：①投稿先のInstagramアカウントを選択 ②画像をアップロード（Meta が公開URLを取得できるようR2に保存）③投稿ボタンを押すとコンテナ作成→状態確認→公開、これが `instagram_content_publish` ④@kanon.nakasu に投稿完了を確認）

---

## シーン5 — Instagramストーリー投稿（実際に投稿する・40秒）

**やること：**
1. 新規投稿タブに戻る
2. アカウント：`[華音] Instagram - kanon.nakasu`
3. 投稿タイプを「ストーリー」に変更
4. 画像をドロップ。少し間を置く（キャプションで「自動で9:16にする」と説明）
5. 「投稿する」をクリック
6. @kanon.nakasu のストーリー欄に新しいストーリーが出ているのを見せる

**📝英語キャプション：**
- "Switching post type to Story."
- "The app automatically converts the image to 1080×1920 (9:16) with a blurred background fill."
- "`media_type=STORIES` is added to the container request."
- "`instagram_content_publish` is used again, this time for a Story."
- "Story confirmed live."

（意味：①投稿タイプをストーリーに切替 ②画像を自動で1080×1920・背景ぼかしに変換 ③コンテナ要求に `media_type=STORIES` を追加 ④ここでも `instagram_content_publish` を使用（今度はストーリー）⑤ストーリー公開を確認）

---

## シーン6 — Instagram予約投稿（35秒）

**やること：**
1. 新規投稿 → アカウント：`[華音] Instagram - kanon.nakasu`
2. 投稿タイプ：「ストーリー」または「フィード」
3. 画像をドロップ
4. 「予約日時」を5分後に設定
5. 「投稿する」をクリック
6. 「投稿管理」タブに切替 → 新しい行が「承認済み」＋予約時刻で表示されるのを見せる
7. （5分後）→ 同じ行が「投稿完了」になり、@kanon.nakasu に投稿が出ているのを見せる

**📝英語キャプション：**
- "Scheduling a post 5 minutes in the future."
- "Time is stored in the app's database. A server-side cron job (one tick per minute) re-runs the two-step publish at the scheduled time."
- "The same `instagram_content_publish` permission is used when the cron triggers."
- "Confirmed: scheduled post auto-published at the requested time."

（意味：①5分後に予約 ②時刻はアプリDBに保存。毎分動くサーバー側cronが指定時刻に投稿処理を実行 ③cron発火時も同じ `instagram_content_publish` を使用 ④予約投稿が指定時刻に自動で上がったのを確認）

---

## シーン7 — データ削除のデモ（15秒）

**やること：**
1. ホーム（店舗）画面に戻る
2. 華音のInstagram行で「解除」をクリック → 確認ダイアログでOK
3. Instagram行が「Instagram 連携する」に戻ったのを見せる

> ⚠️ 解除すると連携が切れます。**録画を全部撮り終わってから**やること。

**📝英語キャプション：**
- "User-initiated data deletion: clicking Disconnect immediately deletes the encrypted access token and Instagram Business Account ID from our database."
- "Users can also email night.safari.group@gmail.com to request full deletion (see Privacy Policy §8)."

（意味：①ユーザー操作によるデータ削除。解除を押すと暗号化されたアクセストークンとInstagramビジネスアカウントIDをDBから即削除 ②メールでも完全削除を依頼可能（プライバシーポリシー第8条参照））

---

## シーン8 — 終了画面（5秒）

**📝画面に表示する文：**
> Privacy Policy: https://beautystudiofuku-jpg.github.io/sns-auto-post-app/privacy.html
> Terms: https://beautystudiofuku-jpg.github.io/sns-auto-post-app/terms.html
> Contact: night.safari.group@gmail.com

---

## 録画後にやること

- [ ] 上の「📝英語キャプション」を字幕として入れる（または動画に焼き込む）
- [ ] 3〜5分にトリム
- [ ] YouTubeに「限定公開」でアップ、または Metaダッシュボードに直接アップ（1GB以下）
