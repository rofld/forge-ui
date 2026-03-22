type Status = 'online' | 'offline' | 'working' | 'idle';

const COLOR: Record<Status, string> = {
  online:  'bg-emerald-500',
  offline: 'bg-zinc-600',
  working: 'bg-amber-400 animate-pulse',
  idle:    'bg-zinc-400',
};

const LABEL: Record<Status, string> = {
  online:  'online',
  offline: 'offline',
  working: 'working',
  idle:    'idle',
};

interface StatusDotProps {
  status: Status;
  showLabel?: boolean;
  className?: string;
}

export default function StatusDot({ status, showLabel = false, className = '' }: StatusDotProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`inline-block w-2 h-2 rounded-full ${COLOR[status]}`} />
      {showLabel && (
        <span className="text-xs font-mono text-zinc-400">{LABEL[status]}</span>
      )}
    </span>
  );
}
