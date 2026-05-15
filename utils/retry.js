function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, maxRetries = 3, baseDelayMs = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const status = err.response?.status;
      if (status === 429) {
        const resetTime = err.response.headers?.['x-ratelimit-reset'];
        const waitMs = resetTime
          ? (resetTime * 1000) - Date.now()
          : baseDelayMs * Math.pow(2, attempt);
        await sleep(Math.max(waitMs, 1000));
      } else if (status >= 500) {
        await sleep(baseDelayMs * Math.pow(2, attempt));
      } else {
        throw err;
      }
    }
  }
}

module.exports = { withRetry, sleep };
