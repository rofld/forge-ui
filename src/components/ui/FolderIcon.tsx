interface FolderIconProps {
  size?: number;
  className?: string;
}

export default function FolderIcon({ size = 16, className = 'text-amber-500' }: FolderIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M3 7V19a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M3 7V19a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        fill="currentColor"
        opacity="0.5"
        transform="translate(0.5, 0.5) scale(0.96)"
      />
    </svg>
  );
}
