# Meta App Review - Submission Materials

This document contains all materials needed to submit sns-auto-post for Meta App Review.

App: **sns-auto-post** (App ID: 1513223523915534)
Operator: **KOKO K.K. (Night Safari Group)**
Production URL: **https://sns-auto-post-app.onrender.com**
Privacy Policy: **https://beautystudiofuku-jpg.github.io/sns-auto-post-app/privacy.html**
Terms of Service: **https://beautystudiofuku-jpg.github.io/sns-auto-post-app/terms.html**

---

## Permissions to Submit

| Permission | Status |
|---|---|
| `instagram_basic` | Submit |
| `instagram_content_publish` | Submit |
| `pages_show_list` | Submit |
| `pages_read_engagement` | Submit |
| `pages_manage_posts` | Submit |
| `public_profile` | Default (no review needed) |

---

## Use Case Descriptions (paste into the Meta dashboard)

### 1. `instagram_basic`

**How will your app use this permission?**

sns-auto-post is an internal social media management tool used by KOKO K.K. (Night Safari Group), the operator of multiple restaurants and entertainment venues in Nakasu, Fukuoka, Japan. After a store manager connects an Instagram Business account via Facebook Login, the app uses `instagram_basic` to read the connected Instagram Business Account's ID and username. This information is shown in the app's "Store" screen so the manager can confirm which Instagram account is linked to which physical store, and so the publishing screen can display the correct destination account ("posting to @kanon.nakasu"). The permission is also used to fetch the Instagram Business Account ID that is required as the parent node when calling the `/{ig-user-id}/media` and `/{ig-user-id}/media_publish` endpoints in step 2.

**Will users be able to access this feature in a published state?**

Yes. After App Review approval, store managers of KOKO K.K.'s venues will use this feature in production.

---

### 2. `instagram_content_publish`

**How will your app use this permission?**

This is the core publishing feature of sns-auto-post. After a store manager selects a connected Instagram Business account and uploads an image, the app uses `instagram_content_publish` to publish the image either as a feed post (with caption) or as a Story. The flow is the standard two-step Graph API flow: (1) POST `/{ig-user-id}/media` to create a media container (with `media_type=STORIES` for stories, or with `caption` for feed posts), then (2) POST `/{ig-user-id}/media_publish` to publish the container. The app also supports scheduled publishing: the manager picks a future date/time, the app stores the request in its own database, and a server-side cron job runs the same two-step publish at the scheduled time. No content is ever posted without the manager initiating it.

**Will users be able to access this feature in a published state?**

Yes. This is the primary value of the app.

---

### 3. `pages_show_list`

**How will your app use this permission?**

To publish to an Instagram Business account through the Graph API, the app must first find the Facebook Page that the Instagram account is linked to. After Facebook Login, the app calls `GET /me/accounts` to retrieve the list of Facebook Pages the user manages, then reads the `instagram_business_account` field of each Page to find the linked Instagram Business account. The page list itself is not displayed to the user; it is used only to resolve the correct Instagram Business Account ID and Page Access Token needed for publishing.

**Will users be able to access this feature in a published state?**

Yes. This permission is required for the initial connection step.

---

### 4. `pages_read_engagement`

**How will your app use this permission?**

`pages_read_engagement` is required by Meta to read Page-level metadata when calling `GET /me/accounts` with the `instagram_business_account` field. Without this permission, the API returns the Page list but does not include the `instagram_business_account` field, which makes it impossible to determine which Instagram Business account is connected to which Facebook Page. The app does not read post engagement data (likes, comments, shares); it only uses the permission to satisfy Meta's requirement for resolving the Page-to-Instagram linkage during the connection step.

**Will users be able to access this feature in a published state?**

Yes. This permission is required for the initial connection step.

---

### 5. `pages_manage_posts`

**How will your app use this permission?**

The app lets a store manager publish text and image posts to the Facebook Page of their venue (for example, posting today's special menu to the "華音 中洲" Facebook Page). The app uses `pages_manage_posts` together with the Page Access Token to call `POST /{page-id}/feed` (text posts) or `POST /{page-id}/photos` (image posts). The store manager must explicitly click "Post to Facebook" to trigger publishing; the app never posts on its own. Scheduled Facebook posts are also supported via the same server-side cron job described for Instagram.

**Will users be able to access this feature in a published state?**

Yes. This is used by store managers to keep their venue's Facebook Page updated.

---

## Verification Details (paste into the Meta dashboard)

### Test Credentials for Reviewers

URL: **https://sns-auto-post-app.onrender.com**

The app is an internal tool with no public registration. For review purposes, please use the following pre-configured store ("華音"), which is already connected to a real Instagram Business account (`kanon.nakasu`) and Facebook Page (`華音 中洲`).

No login is required to access the app's UI (the app's auth model is "internal tool behind a known URL"). To exercise the Meta permissions, please follow the step-by-step instructions in the next section.

### Step-by-Step Reproduction

(See `META_REVIEWER_INSTRUCTIONS.md` in this repository for the full step-by-step English walkthrough that is pasted into the Meta dashboard.)

---

## Screencast Plan

(See the script and shot list in `META_SCREENCAST_SCRIPT.md`.)
