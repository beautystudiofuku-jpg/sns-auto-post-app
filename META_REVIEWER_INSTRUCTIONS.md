# Reviewer Instructions for sns-auto-post

Thank you for reviewing sns-auto-post. The app is an internal social-media-publishing tool used by KOKO K.K. (Night Safari Group), a hospitality company operating multiple venues in Nakasu, Fukuoka, Japan. It is not a public-facing product, so there is no end-user registration flow.

## Quick Summary

- **Production URL:** https://sns-auto-post-app.onrender.com
- **Connected test account (already set up):** Instagram Business account `kanon.nakasu` linked to Facebook Page `華音 中洲`. This account is owned by our company and belongs to the venue "華音".
- **What the app does:** Lets a store manager log in (via Meta OAuth), pick an image, write a caption, and publish to Instagram either (a) as a feed post or (b) as a Story. Scheduled publishing is also supported. (Posts shared to the connected Facebook Page rely on Instagram's native "Share to Facebook" linkage; the app does not call Facebook Page APIs directly.)

## How to Exercise Each Permission

To save you setup time, store "華音" is already connected. You can simply open the production URL and use the publishing flow. No login is required to reach the UI (the app's security model is "internal tool behind a known URL").

### Step 1 — Open the app
1. Open https://sns-auto-post-app.onrender.com in a browser.
2. The home screen lists registered stores. "華音" (store ID 1) shows three green status dots: TikTok / Google / Instagram.

### Step 2 — Verify the Instagram connection (`instagram_basic`, `pages_show_list`, `pages_read_engagement`)
1. On the "華音" card, look at the Instagram row. The username `kanon.nakasu` is displayed there.
2. This information was obtained by calling `GET /me/accounts?fields=id,name,access_token,instagram_business_account` after Facebook Login, then reading the username with `GET /{ig-user-id}?fields=username`. The Page list itself is never shown to the end user; we use it only to resolve the Instagram Business Account ID.

### Step 3 — Publish an Instagram feed post (`instagram_content_publish`)
1. Click the "新規投稿" (New Post) tab.
2. Account select: choose `[華音] Instagram - kanon.nakasu`.
3. Post type: leave as `フィード投稿` (Feed post).
4. Drop a JPG/PNG image into the image dropzone, or click and select one. Caption is optional.
5. Click "投稿する" (Publish).
6. The app calls `POST /{ig-user-id}/media` (image_url, caption) → polls `GET /{container-id}?fields=status_code` until `FINISHED` → calls `POST /{ig-user-id}/media_publish` (creation_id). The resulting Instagram post ID is stored in our database and shown on the "投稿履歴" (History) tab. The post will appear on @kanon.nakasu's feed.

### Step 4 — Publish an Instagram Story (`instagram_content_publish`)
1. New Post tab.
2. Account: `[華音] Instagram - kanon.nakasu`.
3. Post type: change to `ストーリー` (Story).
4. Drop an image. The app automatically converts it to 1080×1920 (9:16) with a blurred background fill so the original image is fully visible.
5. Click "投稿する" (Publish).
6. The app calls `POST /{ig-user-id}/media?media_type=STORIES&image_url=...` → polls status → calls `POST /{ig-user-id}/media_publish`. The Story will appear on @kanon.nakasu for 24 hours.

### Step 5 — Schedule a future Instagram post (`instagram_content_publish`)
1. Same as Step 3 or Step 4, but set "予約日時" (Scheduled date/time) to a time 5–10 minutes in the future (interpreted as Japan Standard Time, UTC+9).
2. The app saves the request to its own database with status `approved`. A server-side cron job runs once per minute and triggers the same two-step publish flow when the scheduled time arrives.
3. We deliberately do not use Meta's native `scheduled_publish_time` parameter because (a) it is only available after App Review approval and (b) using a server-side scheduler lets us coordinate scheduling across multiple platforms (TikTok / Instagram / Facebook / Google Business Profile) with a single UI.

### Step 6 — Verify data deletion (`instagram_basic`)
1. Go back to the home screen.
2. On the "華音" card's Instagram row, click "解除" (Disconnect).
3. The app immediately deletes the encrypted access token and Instagram Business Account ID from its database. Any future publish attempt requires re-authorization.
4. Users can also delete data by emailing `night.safari.group@gmail.com` (see Privacy Policy section 8).

## Notes for the Reviewer

- The UI is in Japanese because all end users are Japanese-speaking store managers. The screencast includes English captions explaining each on-screen action.
- The app uses long-lived Meta user tokens (60-day expiry). A daily cron job refreshes tokens automatically via the `fb_exchange_token` flow.
- All access tokens are stored AES-256 encrypted at rest. The encryption key is held only in the server's environment variables.
- Source code is private but can be shared with Meta on request.

## Contact

If you have any questions during review:
- Email: night.safari.group@gmail.com
- Operator: KOKO K.K. (Night Safari Group)
- Website: https://night-safari-group.com/
