// アカウント別レート制限管理（メモリ内）
const postHistory = new Map(); // accountId -> [timestamp, ...]
const initHistory = new Map(); // accountId -> [timestamp, ...]

const DAILY_POST_LIMIT = 25;
const MINUTE_INIT_LIMIT = 6;

function canPost(accountId) {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const minuteAgo = now - 60 * 1000;

  // 24時間以内の投稿数チェック
  const posts = (postHistory.get(accountId) || []).filter(t => t > dayAgo);
  postHistory.set(accountId, posts);

  if (posts.length >= DAILY_POST_LIMIT) {
    const oldest = posts[0];
    return { allowed: false, retryAfterMs: oldest + 24 * 60 * 60 * 1000 - now };
  }

  // 1分以内のinit数チェック
  const inits = (initHistory.get(accountId) || []).filter(t => t > minuteAgo);
  initHistory.set(accountId, inits);

  if (inits.length >= MINUTE_INIT_LIMIT) {
    const oldest = inits[0];
    return { allowed: false, retryAfterMs: oldest + 60 * 1000 - now };
  }

  return { allowed: true, retryAfterMs: 0 };
}

function recordPost(accountId) {
  const now = Date.now();
  const posts = postHistory.get(accountId) || [];
  posts.push(now);
  postHistory.set(accountId, posts);
}

function recordInit(accountId) {
  const now = Date.now();
  const inits = initHistory.get(accountId) || [];
  inits.push(now);
  initHistory.set(accountId, inits);
}

module.exports = { canPost, recordPost, recordInit };
