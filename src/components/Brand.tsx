/**
 * The Java Arena mark: a rounded tile in Java red with a white J on it. It is our own
 * drawing (no cup, steam or Java wordmark lettering). The same drawing is public/favicon.svg, the
 * MARK and the footer's Arena row in scripts/prerender.mjs, the share card's logo in src/lib/card.ts
 * and Java Arena's mark in src/components/Arenas.tsx.
 */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#E11D21" />
      <path d="M11.5 8.8H21.5M18.6 8.8V18.4c0 3-1.7 4.8-4.4 4.8-1.9 0-3.2-.9-3.9-2.5" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
