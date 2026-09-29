/** The Java Arena mark: curly braces around a J on an orange tile. Also used as the favicon (public/favicon.svg). */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="ja-bm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fdba74" />
          <stop offset="0.55" stopColor="#f97316" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#ja-bm)" />
      <path d="M10 8.5c-2 0-2.6 1-2.6 2.8v2.2c0 1.4-.6 2.2-1.9 2.5 1.3.3 1.9 1.1 1.9 2.5v2.2c0 1.8.6 2.8 2.6 2.8M22 8.5c2 0 2.6 1 2.6 2.8v2.2c0 1.4.6 2.2 1.9 2.5-1.3.3-1.9 1.1-1.9 2.5v2.2c0 1.8-.6 2.8-2.6 2.8" fill="none" stroke="#1c0a02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.2 10v7.6c0 2.2-1.1 3.4-3 3.4-1.3 0-2.2-.6-2.7-1.6" fill="none" stroke="#1c0a02" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
