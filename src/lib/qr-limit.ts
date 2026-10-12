// The limits of the QR codes of transfer links (drawn by qr.ts, which the page loads only when needed).

/**
 * The largest QR version drawn: 25 (117 by 117 modules). At error correction level L it holds
 * 1,273 bytes in byte mode, and on a phone's screen (about 320 CSS px wide, 2 to 3 device pixels
 * each) every module is 6 or more device pixels, which another phone's camera reads easily.
 * Bigger versions are refused: their modules get too small to scan from a phone's screen.
 */
export const QR_MAX_VERSION = 25;
/** Level L (7% of the code can be lost): a screen gives a clean, flat picture, so the space goes to data. */
export const QR_ECC = "L" as const;
/** The longest link (ASCII characters, one byte each) a version 25 code at level L holds. */
export const QR_MAX_CHARS = 1273;
