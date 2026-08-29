export function RelivioLogo({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <g fill="currentColor">
        <path d="M16 13 C 12 12.5, 10.5 8, 16 3 C 21.5 8, 20 12.5, 16 13 Z" />
        <path d="M16 13 C 12 12.5, 10.5 8, 16 3 C 21.5 8, 20 12.5, 16 13 Z" transform="rotate(120 16 16)" />
        <path d="M16 13 C 12 12.5, 10.5 8, 16 3 C 21.5 8, 20 12.5, 16 13 Z" transform="rotate(240 16 16)" />
      </g>
    </svg>
  );
}