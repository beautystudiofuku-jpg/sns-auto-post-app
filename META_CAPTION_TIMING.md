# 英語キャプション タイムライン（必須6個だけ・編集作業用）

> 録画した動画（クロップ版 `meta_review_cropped.mp4`）に乗せる英語字幕。
> Metaの審査で重要なのは「どの権限がどう使われているか」が分かること。
> それだけに絞った**必須6個**。これだけ入れれば審査は通る。
>
> ⚠️ 時刻は録画フレームから推定した目安。編集時に動画を見て微調整。
> ※先頭にタイトル画面5秒、末尾に終了画面5秒を別途足す前提の「本編内」相対秒数。

## 必須キャプション 6個

| # | 本編の時刻 | 画面の内容 | 出す英語キャプション |
|---|---|---|---|
| 1 | 0:05〜0:30 | 店舗一覧・華音の緑ドット | The Instagram username is read via `instagram_basic`. The linked account was resolved using `pages_show_list` and `pages_read_engagement`. |
| 2 | 1:40〜2:10 | フィード投稿が成功→Instagramに表示 | Publishing an Instagram feed post. This uses `instagram_content_publish`. |
| 3 | 2:50〜3:20 | ストーリー投稿が成功 | Publishing an Instagram Story — also `instagram_content_publish`. |
| 4 | 4:30〜5:00 | 投稿履歴で予約分が「投稿完了」 | A scheduled post was auto-published at the requested time by our server-side cron, using `instagram_content_publish`. |
| 5 | 5:00〜5:25 | 連携解除→緑トースト | Disconnect immediately deletes the encrypted access token and Instagram account ID from our database. |
| 6 | 5:00〜5:25（#5と同時 or 直後） | 同上 | Users can also request deletion via night.safari.group@gmail.com (Privacy Policy §8). |

> #5と#6は同じ場面。1枚にまとめて2行で出してもOK。

## 編集の流れ（Clipchamp）

1. クロップ済み動画 `meta_review_cropped.mp4` を読み込む
2. 先頭に `title_card.png` を5秒
3. 末尾に `closing_card.png` を5秒
4. 上の6個の英語字幕を、対応する区間に乗せる（テキスト→配置）
5. アップロード待ちなど無言の時間を早送り/カットして4分前後に
6. エクスポート（1080p）→ Metaに提出

## メモ
- 必須は6個。これで「instagram_basic / content_publish / pages_show_list / pages_read_engagement の4権限すべて」と「データ削除」をカバー
- 解像度クロップ後 1560×1192（基準クリア）
- 右側チャットはクロップ済み。Geminiボタンはブラウザ標準UIなので残置で問題なし
- 元録画（オリジナル）は別ファイルで保全済み
