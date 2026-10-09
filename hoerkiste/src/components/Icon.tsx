const PATHS = {
  play: <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />,
  pause: (
    <>
      <rect x="6" y="5" width="4.5" height="14" rx="1.5" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="1.5" />
    </>
  ),
  back: <path d="M15.5 4.5 8 12l7.5 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />,
  down: <path d="M4.5 8.5 12 16l7.5-7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />,
  gear: (
    <path
      fillRule="evenodd"
      d="M10.3 2h3.4l.5 2.6a7.8 7.8 0 0 1 1.9 1.1l2.5-.9 1.7 3-2 1.7a7.8 7.8 0 0 1 0 2.2l2 1.7-1.7 3-2.5-.9a7.8 7.8 0 0 1-1.9 1.1l-.5 2.6h-3.4l-.5-2.6a7.8 7.8 0 0 1-1.9-1.1l-2.5.9-1.7-3 2-1.7a7.8 7.8 0 0 1 0-2.2l-2-1.7 1.7-3 2.5.9a7.8 7.8 0 0 1 1.9-1.1zM12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"
    />
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  check: <path d="m4.5 12.5 5 5 10-11" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />,
  star: <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" />,
  close: <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />,
  retry: (
    <>
      <path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 3.5v5.5h-5.5z" />
    </>
  ),
  sad: (
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="8.5" cy="10" r="1.4" />
      <circle cx="15.5" cy="10" r="1.4" />
      <path d="M8 16.5c2.2-2 5.8-2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  headphones: (
    <path d="M12 3a9 9 0 0 0-9 9v6a3 3 0 0 0 3 3h1.5a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H5v-1a7 7 0 0 1 14 0v1h-2.5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1H18a3 3 0 0 0 3-3v-6a9 9 0 0 0-9-9z" />
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 32 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}

/** Pfeil mit Zahl 15 für ±15 s */
export function SkipIcon({ dir, size = 44 }: { dir: -1 | 1; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
      <g transform={dir < 0 ? 'matrix(-1 0 0 1 48 0)' : undefined}>
        <path d="M24 7a17 17 0 1 0 17 17" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M24 1v12l9-6z" fill="currentColor" />
      </g>
      <text x="24" y="30" textAnchor="middle" fontSize="15" fontWeight="800" fill="currentColor" fontFamily="inherit">
        15
      </text>
    </svg>
  );
}
