// Playground share links: the program and its input, packed into the address after #.
// Compressed with deflate-raw where the browser can (CompressionStream), then base64url.

export type SharedProgram = { code: string; stdin: string };

const toBase64Url = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromBase64Url = (text: string) => {
  const b = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  // Blob wants bytes backed by a plain ArrayBuffer.
  const out = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** The part after # for a share link: "code=<compressed>" or, without CompressionStream, "src=<plain>". */
export async function encodeShare(p: SharedProgram): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ c: p.code, i: p.stdin }));
  if (typeof CompressionStream !== "undefined") {
    try {
      return "code=" + toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
    } catch {
      /* fall through to the plain form */
    }
  }
  return "src=" + toBase64Url(json);
}

/** Reads a share link's hash, or null when it has none. Throws when the link is damaged. */
export async function decodeShare(hash: string): Promise<SharedProgram | null> {
  const m = /^#(code|src)=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!m) return null;
  let bytes: Uint8Array = fromBase64Url(m[2]);
  if (m[1] === "code") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (typeof data?.c !== "string") throw new Error("not a Java Arena program");
  return { code: data.c, stdin: typeof data.i === "string" ? data.i : "" };
}
