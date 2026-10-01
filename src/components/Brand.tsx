/**
 * The Java Arena mark: an arena seen from above, a rounded tile split corner to corner into a red
 * corner and a blue corner (the two Java colors), with a white J standing across both. It is our own
 * drawing (no cup, steam or Java wordmark lettering). The same drawing is public/favicon.svg, the
 * MARK in scripts/prerender.mjs and the share card's logo in src/lib/card.ts.
 */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0D6EB5" />
      <path d="M2.34 29.66A8 8 0 0 1 0 24V8A8 8 0 0 1 8 0H24A8 8 0 0 1 29.66 2.34Z" fill="#E11D21" />
      <path d="M11.5 8.8H21.5M18.6 8.8V18.4c0 3-1.7 4.8-4.4 4.8-1.9 0-3.2-.9-3.9-2.5" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
