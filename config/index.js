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
    scopes: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management',
    graphApiVersion: 'v22.0',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  db: {
    path: process.env.DB_PATH || './db/sns_auto_post.db',
  },
};

module.exports = config;
