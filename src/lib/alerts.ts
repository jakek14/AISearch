export type AlertEvent =
  | { type: "new-domain"; domain: string }
  | { type: "rank-drop"; topic: string; provider: string; delta: number }
  | { type: "competitor-win"; promptId: string; competitor: string };

export function evaluateAlerts(): AlertEvent[] {
  // Stub: wire real checks later
  return [];
} 