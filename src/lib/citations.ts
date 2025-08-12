/* eslint-disable @typescript-eslint/no-explicit-any */
import { parse } from "tldts";

export type NormalizedCitation = {
  url: string;
  domain: string;
  title?: string;
  snippet?: string;
  rankHint?: number;
};

export function extractDomain(url: string): string {
  try {
    const res = parse(url, { allowPrivateDomains: true });
    if (res.domainWithoutSuffix && res.publicSuffix) {
      return `${res.domainWithoutSuffix}.${res.publicSuffix}`;
    }
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Basic URL extraction from plain text; filters unsupported schemes and mailto
export function extractUrlsFromText(text: string): string[] {
  if (!text) return [];
  const urlRegex = /https?:\/\/[^\s)\]\">]+/gi;
  const matches = text.match(urlRegex) || [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    try {
      const u = new URL(m);
      if (!/^https?:$/.test(u.protocol)) continue;
      const normalized = u.toString().replace(/[).,]+$/g, "");
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(normalized);
      }
    } catch {
      // ignore bad URLs
    }
  }
  return unique;
}

export function citationsFromText(text: string): NormalizedCitation[] {
  const urls = extractUrlsFromText(text).slice(0, 10);
  const seenDomains = new Set<string>();
  const citations: NormalizedCitation[] = [];
  urls.forEach((url, i) => {
    const domain = extractDomain(url);
    if (!domain || seenDomains.has(domain)) return;
    seenDomains.add(domain);
    citations.push({ url, domain, rankHint: i + 1 });
  });
  return citations;
}

export function normalizeCitations(raw: unknown[], provider: "openai" | "anthropic" | "gemini"): NormalizedCitation[] {
  if (!Array.isArray(raw)) return [];
  const normalized = raw
    .map((c): NormalizedCitation | null => {
      try {
        const x = c as Record<string, unknown>;
        if (provider === "openai") {
          const url = (x?.url as string) ?? ((x?.source as any)?.url as string) ?? (x?.id as string) ?? "";
          if (!url) return null;
          return {
            url,
            domain: extractDomain(url),
            title: (x?.title as string) ?? ((x?.source as any)?.title as string),
            snippet: (x as any)?.snippet ?? (x as any)?.content,
            rankHint: typeof (x as any)?.rank === "number" ? ((x as any)?.rank as number) : undefined,
          };
        }
        if (provider === "anthropic") {
          const url = (x?.url as string) ?? ((x?.metadata as any)?.url as string) ?? "";
          if (!url) return null;
          return {
            url,
            domain: extractDomain(url),
            title: (x?.title as string) ?? ((x?.metadata as any)?.title as string),
            snippet: (x as any)?.text ?? (x as any)?.snippet,
            rankHint: typeof (x as any)?.score === "number" ? ((x as any)?.score as number) : undefined,
          };
        }
        const url = (x?.url as string) ?? ((x?.web as any)?.uri as string) ?? (x?.uri as string) ?? "";
        if (!url) return null;
        return {
          url,
          domain: extractDomain(url),
          title: (x?.title as string) ?? ((x?.web as any)?.title as string),
          snippet: (x as any)?.snippet ?? ((x?.web as any)?.snippet as string),
          rankHint: typeof (x as any)?.rank === "number" ? ((x as any)?.rank as number) : undefined,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as NormalizedCitation[];

  // De-duplicate by domain while preserving order, and assign default rank
  const seenDomains = new Set<string>();
  const deduped: NormalizedCitation[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const cit = normalized[i];
    if (!cit.domain || seenDomains.has(cit.domain)) continue;
    seenDomains.add(cit.domain);
    deduped.push({ ...cit, rankHint: cit.rankHint ?? i + 1 });
  }

  return deduped;
} 