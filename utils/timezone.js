// JSTのローカル時刻文字列 (例: "2026-05-26T12:13" や "2026-05-26T12:13:00") を
// UTCのSQLite互換文字列 (例: "2026-05-26 03:13:00") に変換する。
//
// フロントの <input type="datetime-local"> はタイムゾーン情報を持たない文字列を返すため、
// サーバー側で「これはJSTである」と解釈してUTCに直してDBに保存する。
// スケジューラーは datetime('now') (UTC) と比較するので、これで一致する。

const JST_OFFSET_MINUTES = 9 * 60;

function jstLocalStringToUtcSqlite(jstLocalStr) {
  if (!jstLocalStr) return null;

  // "YYYY-MM-DDTHH:mm" または "YYYY-MM-DDTHH:mm:ss" を許容
  const m = String(jstLocalStr).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) {
    // 既にUTC ISO形式 (Z付き) などはそのまま使えるよう Date で解釈
    const d = new Date(jstLocalStr);
    if (isNaN(d.getTime())) throw new Error(`不正な日時形式: ${jstLocalStr}`);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }

  const [, y, mo, da, h, mi, se] = m;
  // JST時刻として UTC ミリ秒を計算
  const utcMs = Date.UTC(+y, +mo - 1, +da, +h, +mi, +(se || 0)) - JST_OFFSET_MINUTES * 60 * 1000;
  const d = new Date(utcMs);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

module.exports = { jstLocalStringToUtcSqlite };
