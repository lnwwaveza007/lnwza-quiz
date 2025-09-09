// Simple normalized Levenshtein similarity for short snippets
export function similarity(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length) || 1;
  const dist = levenshtein(s1, s2);
  return 1 - dist / maxLen;
}

export function containsFuzzy(haystack: string, needle: string, threshold = 0.9): boolean {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase().trim();
  if (!n) return false;
  if (h.includes(n)) return true;
  // sliding window compare for near matches when evidence is short
  const window = Math.max(10, Math.min(120, n.length + Math.ceil(n.length * 0.2)));
  for (let i = 0; i <= h.length - window; i++) {
    const chunk = h.slice(i, i + window);
    if (similarity(chunk, n) >= threshold) return true;
  }
  return false;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}


