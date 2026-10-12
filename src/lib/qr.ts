// QR codes of transfer links, drawn as SVG in the page. The encoder is uqr (MIT, a port of
// Project Nayuki's QR Code generator); this file turns its modules into a path. The page loads it
// only when a QR code is shown; the limits are in qr-limit.ts.
import { encode } from "uqr";
import { QR_ECC, QR_MAX_CHARS, QR_MAX_VERSION } from "./qr-limit.ts";

export { QR_ECC, QR_MAX_CHARS, QR_MAX_VERSION };

/** The quiet zone the QR standard asks for around the code, in modules. */
const QUIET = 4;

export type QrDrawing = {
  /** Modules across, the quiet zone included. */
  size: number;
  version: number;
  /** An SVG path of the dark modules, one unit per module. */
  path: string;
};

/** The QR code of a link, or null when it's longer than a code phones can scan. */
export function qrFor(text: string): QrDrawing | null {
  if (text.length > QR_MAX_CHARS || /[^\x20-\x7e]/.test(text)) return null;
  let qr;
  try {
    qr = encode(text, { ecc: QR_ECC, maxVersion: QR_MAX_VERSION, border: 0 });
  } catch {
    return null;
  }
  const parts: string[] = [];
  qr.data.forEach((row, y) => {
    // One rectangle per run of dark modules in a row.
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let end = x;
      while (end + 1 < row.length && row[end + 1]) end++;
      parts.push(`M${x + QUIET} ${y + QUIET}h${end - x + 1}v1h-${end - x + 1}z`);
      x = end;
    }
  });
  return { size: qr.size + 2 * QUIET, version: qr.version, path: parts.join("") };
}
