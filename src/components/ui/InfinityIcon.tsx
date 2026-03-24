interface InfinityIconProps {
  size?: number;
  className?: string;
}

export default function InfinityIcon({ size = 24, className = '' }: InfinityIconProps) {
  return (
    <svg
      width={size}
      height={size * 0.5}
      viewBox="0 0 32 16"
      fill="none"
      className={className}
    >
      <path
        d="M8 3C4.5 3 2 5.5 2 8s2.5 5 6 5c2.2 0 4-1.2 5.5-3L16 8l2.5-2C20 4.2 21.8 3 24 3c3.5 0 6 2.5 6 5s-2.5 5-6 5c-2.2 0-4-1.2-5.5-3L16 8l-2.5 2C12 11.8 10.2 13 8 13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
