# Screencast Script for Meta App Review

Target length: **3 to 5 minutes**.
Resolution: **1920×1080 minimum** (Win + Shift + R / Xbox Game Bar is fine).
Audio: optional, but English **on-screen captions are required** for every scene.

> **Why captions matter**: Meta reviewers do not read Japanese, and the app's UI is Japanese (the end users are Japanese-speaking store managers). Captions like "permission `instagram_content_publish` is used here" are what get the submission approved.

---

## Scene 1 — Title card (5 sec)

**On-screen text (English caption):**
> sns-auto-post — Internal social media publishing tool for KOKO K.K. (Night Safari Group)
> App Review demonstration · May 2026

---

## Scene 2 — Open the app and show the store list (15 sec)

**Action:**
1. Open a browser, type `https://sns-auto-post-app.onrender.com`, press Enter.
2. Hover over the "華音" store card. Show the three green dots (TikTok / Google / Instagram connected).

**English caption:**
> Production URL. The store "華音" already has its Instagram Business account and Facebook Page connected. The green dot next to Instagram (username: kanon.nakasu) was rendered by reading the username via `instagram_basic`.

---

## Scene 3 — Show the existing Instagram connection (10 sec)

**Action:**
- Point at the Instagram row of "華音". Highlight `kanon.nakasu`.

**English caption:**
> `pages_show_list` + `pages_read_engagement` were used at connection time to call `GET /me/accounts?fields=instagram_business_account` and find the Instagram Business Account that is linked to the Facebook Page. `instagram_basic` was then used to read the Instagram username displayed here.

---

## Scene 4 — Publish an Instagram FEED post (40 sec)

**Action:**
1. Click "新規投稿" tab.
2. Account select → `[華音] Instagram - kanon.nakasu`.
3. Post type stays at "フィード投稿" (Feed).
4. Drop an image into the dropzone (use a generic test image such as a food photo).
5. Type a short caption: `Today's special.`
6. Click "投稿する" (Publish).
7. Wait for the success toast.
8. Switch to the Instagram app/web and show that the post is live on @kanon.nakasu.

**English captions (sequence):**
- "Selecting the Instagram destination account."
- "Uploading an image — stored in our Cloudflare R2 bucket so Meta can fetch a public URL."
- "Click Publish. The app now calls `POST /{ig-user-id}/media` (creates container) → polls `status_code` → `POST /{ig-user-id}/media_publish`. This is `instagram_content_publish` in action."
- "Confirmed live on @kanon.nakasu."

---

## Scene 5 — Publish an Instagram STORY (40 sec)

**Action:**
1. Back to New Post tab.
2. Account: `[華音] Instagram - kanon.nakasu`.
3. Post type: change to "ストーリー" (Story).
4. Drop an image. Pause briefly — caption: "The app automatically converts the image to 1080×1920 (9:16) with a blurred background fill."
5. Click "投稿する".
6. Show the Instagram app's Story tray on @kanon.nakasu — the new Story is there.

**English captions:**
- "Switching post type to Story."
- "`media_type=STORIES` is added to the container request."
- "`instagram_content_publish` is used again, this time for a Story."
- "Story confirmed live."

---

## Scene 6 — Schedule a future Instagram post (35 sec)

**Action:**
1. New Post → Account: `[華音] Instagram - kanon.nakasu`.
2. Post type: "ストーリー" (or Feed).
3. Drop an image.
4. Pick "予約日時" 5 minutes in the future.
5. Click "投稿する".
6. Switch to the "投稿管理" (Manage) tab — show the new row with status `承認済み` (approved) and scheduled time.
7. Cut to "5 minutes later" — show the same row now status `投稿完了` (published) and the post live on @kanon.nakasu.

**English captions:**
- "Scheduling a post 5 minutes in the future."
- "Time is stored in the app's database. A server-side cron job (one tick per minute) re-runs the two-step publish at the scheduled time."
- "The same `instagram_content_publish` permission is used when the cron triggers."
- "Confirmed: scheduled post auto-published at the requested time."

---

## Scene 7 — Publish a Facebook Page post (30 sec)

**Action:**
1. New Post → Account: `[華音] Facebook - kanon.nakasu`.
2. Type a short message.
3. Optionally drop an image.
4. Click "投稿する".
5. Switch to the "華音 中洲" Facebook Page — show the new post is live.

**English captions:**
- "Selecting the Facebook Page destination."
- "App fetches the Page Access Token via `GET /me/accounts` (this is why `pages_show_list` + `pages_read_engagement` are needed)."
- "Then calls `POST /{page-id}/photos` (or `/feed` for text-only). This is `pages_manage_posts` in action."
- "Confirmed live on the 華音 中洲 Page."

---

## Scene 8 — Demonstrate data deletion (15 sec)

**Action:**
1. Go back to the home (Stores) screen.
2. On "華音" Instagram row, click "解除" (Disconnect). Confirm the dialog.
3. Show the Instagram row is now back to "Instagram 連携する" (Connect Instagram).

**English captions:**
- "User-initiated data deletion: clicking Disconnect immediately deletes the encrypted access token and Instagram Business Account ID from our database."
- "Users can also email night.safari.group@gmail.com to request full deletion (see Privacy Policy §8)."

---

## Scene 9 — Closing card (5 sec)

**On-screen text:**
> Privacy Policy: https://beautystudiofuku-jpg.github.io/sns-auto-post-app/privacy.html
> Terms: https://beautystudiofuku-jpg.github.io/sns-auto-post-app/terms.html
> Contact: night.safari.group@gmail.com

---

## Recording Checklist

Before you hit record:

- [ ] Re-connect Instagram on store "華音" so the green dot is fresh (so reviewers see a working state).
- [ ] Prepare two test images saved on the desktop (one for feed, one for story).
- [ ] Open Instagram (web or mobile mirror) and the "華音 中洲" Facebook Page in adjacent browser tabs so you can switch quickly to show the live posts.
- [ ] Close any other tabs / windows that might contain personal information.
- [ ] Hide bookmarks bar in the browser.
- [ ] Set Windows time zone to JST.
- [ ] OBS or Win+Shift+R for capture.
- [ ] Record at 1920×1080 minimum.

After recording:

- [ ] Add English captions (subtitle track or burned-in) using the texts above.
- [ ] Trim to 3–5 minutes.
- [ ] Upload to YouTube as **Unlisted**, or upload directly to the Meta dashboard (≤1GB).
