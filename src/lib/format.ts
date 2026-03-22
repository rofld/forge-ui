/** Format a token count as a compact string: 12400 → "12.4k", 1200000 → "1.2M" */
export function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return String(count);
}

/** Per-token pricing (USD) — rough estimates for common models */
const PRICING: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-opus-4-6':       { input: 15 / 1e6,   output: 75 / 1e6,  cacheRead: 1.5 / 1e6 },
  'claude-sonnet-4-6':     { input: 3 / 1e6,    output: 15 / 1e6,  cacheRead: 0.3 / 1e6 },
  'claude-haiku-4-5':      { input: 0.8 / 1e6,  output: 4 / 1e6,   cacheRead: 0.08 / 1e6 },
  'gpt-4o':                { input: 5 / 1e6,    output: 15 / 1e6,  cacheRead: 2.5 / 1e6 },
  'gpt-4o-mini':           { input: 0.15 / 1e6, output: 0.6 / 1e6, cacheRead: 0.075 / 1e6 },
};

/** Estimate cost in USD given model name and token counts. */
export function estimateCost(
  model: string,
  input: number,
  output: number,
  cacheRead: number
): number {
  // Try exact match, then prefix match
  const price =
    PRICING[model] ??
    Object.entries(PRICING).find(([k]) => model.startsWith(k))?.[1] ??
    { input: 3 / 1e6, output: 15 / 1e6, cacheRead: 0.3 / 1e6 };

  return price.input * input + price.output * output + price.cacheRead * cacheRead;
}

/** Format cost as dollar string: 0.082 → "$0.082" */
export function formatCost(usd: number): string {
  if (usd < 0.001) return `<$0.001`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

/** Shorten a model id to a compact display name: "claude-opus-4-6" → "opus-4.6" */
export function shortModel(model: string): string {
  return model
    .replace('claude-', '')
    .replace(/-(\d+)-(\d+)$/, '-$1.$2')   // "4-6" → "4.6"
    .replace(/-(\d{8})$/, '');            // strip date suffix like "-20251001"
}

const MINUTE = 60_000;
const HOUR   = 60 * MINUTE;
const DAY    = 24 * HOUR;

/** Return a human-readable "time ago" string from an ISO date string. */
export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const diff = Date.now() - date.getTime();

  if (diff < MINUTE)     return 'just now';
  if (diff < HOUR)       return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY)        return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY)   return `${Math.floor(diff / DAY)}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Format a byte count: 1234567 → "1.2 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
