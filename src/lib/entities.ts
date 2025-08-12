import type { Brand } from "@prisma/client";

export type EntityRegexes = {
  namePatterns: RegExp[];
  domainPatterns: RegExp[];
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordBoundaryPattern(s: string): string {
  // Require word boundaries around words; allow spaces and hyphens within
  return `(?<![\w@])${escapeRegex(s)}(?![\w@])`;
}

export function buildEntityRegexes(brand: Pick<Brand, "name" | "aliases" | "domains">): EntityRegexes {
  const names = [brand.name, ...(brand.aliases || [])]
    .map((n) => n.trim())
    .filter(Boolean);
  const domains = (brand.domains || []).map((d) => d.trim()).filter(Boolean);

  const namePatterns = names.map((n) => new RegExp(wordBoundaryPattern(n), "gi"));
  const domainPatterns = domains.map((d) => new RegExp(`(?<=https?:\\/\\/|\\s|^)(?:www\\.)?${escapeRegex(d)}(?=\\b|\\/|\\s|$)`, "gi"));

  return { namePatterns, domainPatterns };
}

export type FoundMention = { start: number; end: number; confidence: number };

export function findMentions(text: string, brand: Pick<Brand, "name" | "aliases" | "domains">): FoundMention[] {
  const { namePatterns, domainPatterns } = buildEntityRegexes(brand);
  const results: FoundMention[] = [];
  const lower = text;

  // Helper to avoid duplicates
  function pushMatch(index: number, length: number, confidence: number) {
    if (index < 0) return;
    const end = index + length;
    // Merge overlapping
    const exists = results.some((r) => !(end <= r.start || index >= r.end));
    if (!exists) results.push({ start: index, end, confidence });
  }

  // Domains: accept inside URLs/emails only if domain matches
  for (const re of domainPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower))) {
      pushMatch(m.index, m[0].length, 1.0);
    }
  }

  // Names/aliases: skip email-like or URL-like local parts
  for (const re of namePatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower))) {
      const before = lower.slice(Math.max(0, m.index - 2), m.index);
      const after = lower.slice(m.index + m[0].length, m.index + m[0].length + 2);
      const looksLikeEmailLocal = before.includes("@");
      const looksLikeUrlContext = /https?:\/\//i.test(before) || /\.[a-z]{2,}/i.test(after);
      if (looksLikeEmailLocal || looksLikeUrlContext) continue;
      const isCanonical = m[0].toLowerCase() === brand.name.toLowerCase();
      pushMatch(m.index, m[0].length, isCanonical ? 0.9 : 0.7);
    }
  }

  return results.sort((a, b) => a.start - b.start);
} 