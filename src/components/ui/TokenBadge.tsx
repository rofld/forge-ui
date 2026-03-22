import { formatTokens, estimateCost, formatCost } from '@/lib/format';

interface TokenBadgeProps {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  operations?: number;
  className?: string;
}

export default function TokenBadge({
  model,
  inputTokens,
  outputTokens,
  cacheReadTokens = 0,
  operations,
  className = '',
}: TokenBadgeProps) {
  const cost = estimateCost(model, inputTokens, outputTokens, cacheReadTokens);

  return (
    <div className={`flex items-center gap-3 font-mono text-xs text-zinc-400 ${className}`}>
      <span title="Input tokens">
        <span className="text-zinc-500">↑</span>
        {formatTokens(inputTokens)}
      </span>
      <span title="Output tokens">
        <span className="text-zinc-500">↓</span>
        {formatTokens(outputTokens)}
      </span>
      {cacheReadTokens > 0 && (
        <span title="Cache read tokens" className="text-zinc-500">
          cache:{formatTokens(cacheReadTokens)}
        </span>
      )}
      <span title="Estimated cost" className="text-emerald-600">
        {formatCost(cost)}
      </span>
      {operations != null && (
        <span title="Operations">
          <span className="text-zinc-500">op:</span>
          {operations}
        </span>
      )}
    </div>
  );
}
