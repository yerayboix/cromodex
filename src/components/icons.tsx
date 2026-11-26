/** Icons drawn for the theme (lucide has no "two cards on a table"). */

export function BoardIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="5" width="9" height="13" rx="1.5" transform="rotate(-8 7.5 11.5)" />
      <rect x="11" y="5" width="9" height="13" rx="1.5" transform="rotate(8 15.5 11.5)" />
    </svg>
  );
}

export function TradesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 7h11l-3-3M17 17H6l3 3" />
    </svg>
  );
}

export function SwapIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 8h12l-3-3M17 16H5l3 3" />
    </svg>
  );
}

/** Compass rose watermark for the table. */
export function CompassRose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <path d="M50 2 L56 44 L98 50 L56 56 L50 98 L44 56 L2 50 L44 44 Z" fill="currentColor" />
    </svg>
  );
}
