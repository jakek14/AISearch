export function computeMentionPosition(answerText: string, orderedBrandNames: string[]): number | null {
  if (!answerText || orderedBrandNames.length === 0) return null;
  const lower = answerText.toLowerCase();
  const indices = orderedBrandNames
    .map((b, idx) => ({ idx: idx + 1, pos: lower.indexOf(b.toLowerCase()) }))
    .filter((x) => x.pos >= 0)
    .sort((a, b) => a.pos - b.pos);
  if (indices.length === 0) return null;

  // Numbered list heuristic
  const listMatch = lower.match(/\n\s*(\d+)[\.)]/);
  if (listMatch) {
    const listPos = parseInt(listMatch[1], 10);
    if (!Number.isNaN(listPos)) return listPos;
  }
  return indices[0].idx;
} 