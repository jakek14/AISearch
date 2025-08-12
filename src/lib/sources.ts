export type DomainAgg = { domain: string; citations: number; sharePct: number };

export function computeDomainShares(domainToCount: Record<string, number>): DomainAgg[] {
  const total = Object.values(domainToCount).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(domainToCount)
    .map(([domain, citations]) => ({ domain, citations, sharePct: Math.round((citations / total) * 1000) / 10 }))
    .sort((a, b) => b.citations - a.citations);
} 