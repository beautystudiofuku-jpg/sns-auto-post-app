# Meta審査 録画 実行チェックリスト（これ1枚見ながらやればOK）

> 詳しい台本は `META_SCREENCAST_SCRIPT.md`、提出文は `META_REVIEWER_INSTRUCTIONS.md`。
> このファイルは「手を動かす順番」だけをまとめたもの。

## 事前準備（録画ボタンを押す前）

- [ ] **連携チェック → 済み**：華音のInstagramトークンは 2026/7/25 まで有効。再連携は不要。
- [ ] テスト画像2枚を準備（`meta_review_assets/test_image_feed.jpg` と `test_image_story.jpg`）
- [ ] ブラウザのタブを整理（個人情報が映るタブ・ブックマークバーは隠す）
- [ ] Windowsのタイムゾーンが JST になっているか確認
- [ ] 録画ツール準備：**Win + Shift + R**（Xbox Game Bar）でOK。1920×1080以上。
- [ ] Instagram（@kanon.nakasu）を別タブで開いておく（投稿後すぐ確認用）

## 録画する（音声なしでOK・キャプションは後付け）

各シーンの頭で、対応するカンペ画像をスマホに出しておくと迷わない。

1. **タイトル（5秒）** … 静止画でも口頭でもOK
2. **本番URLを開く** … `https://sns-auto-post-app.onrender.com` → 華音カードの緑ドット3つを見せる
3. **Instagram連携を見せる** … 華音のInstagram行 `kanon.nakasu` を指す
4. **フィード投稿（実投稿）** … 新規投稿 → 華音Instagram → フィード → test_image_feed.jpg → キャプション `Today's special.` → 投稿する → 成功 → Instagramで実物確認
5. **ストーリー投稿（実投稿）** … 投稿タイプをストーリーに → test_image_story.jpg → 投稿する → Instagramのストーリーで確認
6. **予約投稿** … 5分後を指定 → 投稿する → 投稿管理タブで「承認済み」確認 →（5分後）「投稿完了」に変わるのを確認
7. **連携解除（データ削除デモ）** … 華音のInstagram行「解除」→ 確認 →「連携する」に戻る

> ⚠️ シーン7で解除すると連携が切れます。**録画が全部終わってから**やること。解除後に他のシーンを撮り直したくなったら再連携が必要になります。

## 録画後

- [ ] 英語キャプションを焼き込む or YouTube字幕で付ける（文言は `META_SCREENCAST_SCRIPT.md` のコピペ）
- [ ] 3〜5分にトリム
- [ ] YouTubeに「限定公開」でアップ、または Metaダッシュボードに直接アップ（1GB以下）

## 提出（Meta開発者ポータル）

- [ ] 各権限の Use Case 説明文 … `META_APP_REVIEW.md` の英文をコピペ
- [ ] レビュアー手順 … `META_REVIEWER_INSTRUCTIONS.md` の内容をコピペ
- [ ] 動画URL or ファイルを添付
- [ ] Submit for Review

## 申請する権限（4つ）

`instagram_basic` / `instagram_content_publish` / `pages_show_list` / `pages_read_engagement`
