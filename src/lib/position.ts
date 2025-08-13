export function computeMentionPosition(answerText: string, orderedBrandNames: string[]): number | null {
  if (!answerText || orderedBrandNames.length === 0) return null;
  const lower = answerText.toLowerCase();
  const target = orderedBrandNames[0]?.toLowerCase();
  if (!target) return null;

  // 1) Numbered/listed roundup heuristic: find lines like `1. Brand ...` or `2) Brand ...`
  const lines = lower.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*(\d+)[\.)]\s+(.*)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      const text = m[2] || "";
      if (!Number.isNaN(num) && text.includes(target)) {
        return num; // Use explicit list order when brand appears on that line
      }
    }
  }

  // 2) Fallback: earliest-mention order among tracked brands in the text
  const seen: Array<{ name: string; pos: number }> = [];
  for (const name of orderedBrandNames) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx >= 0) {
      seen.push({ name, pos: idx });
    }
  }
  if (seen.length === 0) return null; // brand not mentioned

  // Sort by first occurrence in the text
  seen.sort((a, b) => a.pos - b.pos);
  const rank = seen.findIndex((s) => s.name.toLowerCase() === target);
  if (rank === -1) return null; // target brand absent
  return rank + 1;
} 