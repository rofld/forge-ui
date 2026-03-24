interface ShardIconProps {
  size?: number;
  className?: string;
}

export default function ShardIcon({ size = 16, className = 'text-amber-500' }: ShardIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 2L4 8l8 14 8-14-8-6z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M12 2l8 6-8 14"
        fill="currentColor"
        opacity="0.5"
      />
      <path
        d="M12 2v20"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.3"
      />
    </svg>
  );
}
