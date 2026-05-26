require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    redirectUri: process.env.TIKTOK_REDIRECT_URI || 'https://beautystudiofuku-jpg.github.io/sns-auto-post-app/callback',
    scopes: 'user.info.basic,video.publish',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3456/auth/google/callback',
    scopes: 'https://www.googleapis.com/auth/business.manage',
  },
  meta: {
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
    redirectUri: process.env.META_REDIRECT_URI || 'https://beautystudiofuku-jpg.github.io/sns-auto-post-app/meta-callback',
    scopes: 'instagram_business_basic,instagram_business_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts',
    graphApiVersion: 'v22.0',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  db: {
    path: process.env.DB_PATH || './db/sns_auto_post.db',
  },
  r2: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    endpoint: process.env.R2_ENDPOINT,
    bucket: process.env.R2_BUCKET || 'sns-auto-post-media',
    publicUrl: process.env.R2_PUBLIC_URL || 'https://pub-83018942c3124bfcb182011ba3ef7a72.r2.dev',
  },
  // R2が設定されている場合のみ有効化、未設定ならローカルファイル保存にフォールバック
  get useR2() {
    return !!(this.r2.accessKeyId && this.r2.secretAccessKey && this.r2.endpoint);
  },
};

module.exports = config;
