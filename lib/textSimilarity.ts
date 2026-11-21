/** Classic Levenshtein edit distance (insertions/deletions/substitutions) between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True when two names are close enough to likely be the same person typed differently (e.g.
 * "Rama" / "Lama") rather than an exact match, which callers check separately. Short names must
 * be within 1 edit, longer names within 2 -- loose enough to catch a typo, tight enough that two
 * genuinely different short names rarely collide by accident. */
export function isSimilarName(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb || na === nb) return false;
  if (na.length < 3 || nb.length < 3) return false;

  const distance = levenshtein(na, nb);
  const threshold = Math.min(na.length, nb.length) <= 5 ? 1 : 2;
  return distance <= threshold;
}
