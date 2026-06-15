# 英語キャプション タイムライン（編集作業用）

> 録画した動画（クロップ版 `meta_review_cropped.mp4`）の実際の内容に合わせた、
> 「何秒の位置に、どの英語キャプションを出すか」の一覧。
> 編集ソフト（Clipchamp等）でこの通りにテキストを乗せれば完成。
>
> ⚠️ 時刻は録画フレームから推定した目安。編集時に微調整してください。
> ※先頭にタイトル画面、末尾に終了画面を別途5秒ずつ足す前提の「本編内の」相対秒数。

## タイムライン

| 本編の時刻 | 画面の内容 | 出す英語キャプション |
|---|---|---|
| 0:00〜0:35 | 店舗一覧・華音の緑ドット3つ | The store "華音" already has its Instagram Business account connected. The green dot was rendered by reading the username via `instagram_basic`. |
| 0:10〜0:30 | 華音のInstagram行 kanon.nakasu | `pages_show_list` + `pages_read_engagement` resolved the Instagram Business Account linked to the Facebook Page. |
| 0:35〜1:00 | 新規投稿→華音Instagram選択→フィード | Selecting the Instagram destination account. |
| 1:00〜1:40 | 画像アップ・"todays special"入力 | Uploading an image — stored in our Cloudflare R2 bucket so Meta can fetch a public URL. |
| 1:40〜2:00 | 「投稿中」→成功 | Click Publish. The app calls `POST /{ig-user-id}/media` → polls `status_code` → `media_publish`. This is `instagram_content_publish`. |
| 2:00〜2:20 | Instagramにフィード投稿が表示 | Confirmed live on @kanon.nakasu. |
| 2:20〜2:50 | 投稿タイプをストーリーに・縦長画像 | Switching to Story. The app auto-converts the image to 1080×1920 (9:16) with a blurred background fill. |
| 2:50〜3:10 | ストーリー投稿実行 | `media_type=STORIES` is added; `instagram_content_publish` is used again for a Story. |
| 3:10〜3:30 | ストーリー確認 | Story confirmed live. |
| 3:30〜4:10 | 予約日時を入力（10分後〜指定可） | Scheduling a future post. Time is stored in our database. A server-side cron job (one tick/min) re-runs the publish at the scheduled time. |
| 4:10〜4:30 | 投稿管理／投稿履歴 | The same `instagram_content_publish` permission is used when the cron triggers. |
| 4:30〜5:00 | 投稿履歴（全部「投稿完了」） | Confirmed: the scheduled post auto-published at the requested time. |
| 5:00〜5:30 | 連携解除→緑トースト「連携を解除しました」 | User-initiated data deletion: Disconnect immediately deletes the encrypted access token and IG Account ID from our database. Users can also email night.safari.group@gmail.com (Privacy Policy §8). |

## 編集の流れ（おすすめ順）

1. クロップ済み動画 `meta_review_cropped.mp4` を編集ソフトに読み込む
2. 先頭に `title_card.png` を5秒
3. 末尾に `closing_card.png` を5秒
4. 上の表どおりに各区間へ英語キャプション（テキスト）を乗せる
5. アップロード待ちなど「無言で待ってる時間」を早送り or カットして、本編を4分前後に圧縮
6. 書き出し → YouTube限定公開 or Metaダッシュボードに直アップ

## メモ
- 録画は実測 5分35秒。タイトル+終了で +10秒。待ち時間を詰めれば 4〜4.5分に収まる
- 解像度はクロップ後 1560×1192（基準クリア）
- 右側のチャット画面はクロップ済み。Geminiボタンはブラウザ標準UIなので残置（審査上問題なし）
