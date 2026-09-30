// Share cards: a 1200x630 image (the size social sites use for link previews) drawn on a canvas,
// shared with the phone's share sheet or downloaded.
export type Card = { kicker: string; title: string; lines: string[]; file: string };

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(" ")) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = w;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export async function drawCard(card: Card): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 630;
  const ctx = c.getContext("2d")!;
  const font = '"Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  await Promise.all([document.fonts.load('700 40px "Inter Variable"'), document.fonts.load('800 68px "Inter Variable"')]).catch(() => {});
  // The site's dark theme: its page color, a blue glow on the right and a red one in the top-left
  // corner, like the home page's hero (the logo's two corners).
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, 1200, 630);
  const glow = ctx.createRadialGradient(1000, 150, 0, 1000, 150, 620);
  glow.addColorStop(0, "rgba(31, 128, 208, 0.24)");
  glow.addColorStop(1, "rgba(31, 128, 208, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 630);
  const glowRed = ctx.createRadialGradient(0, 0, 0, 0, 0, 460);
  glowRed.addColorStop(0, "rgba(225, 29, 33, 0.16)");
  glowRed.addColorStop(1, "rgba(225, 29, 33, 0)");
  ctx.fillStyle = glowRed;
  ctx.fillRect(0, 0, 1200, 630);

  // The logo (public/favicon.svg), at twice its 32 px size: the blue tile, its red corner, the white J.
  ctx.save();
  ctx.translate(80, 72);
  ctx.scale(2, 2);
  ctx.fillStyle = "#0D6EB5";
  ctx.beginPath();
  ctx.roundRect(0, 0, 32, 32, 8);
  ctx.fill();
  ctx.fillStyle = "#E11D21";
  ctx.fill(new Path2D("M2.34 29.66A8 8 0 0 1 0 24V8A8 8 0 0 1 8 0H24A8 8 0 0 1 29.66 2.34Z"));
  ctx.strokeStyle = "#fff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3.6;
  ctx.stroke(new Path2D("M11.5 8.8H21.5M18.6 8.8V18.4c0 3-1.7 4.8-4.4 4.8-1.9 0-3.2-.9-3.9-2.5"));
  ctx.restore();
  ctx.fillStyle = "#f4f4f5";
  ctx.font = `700 40px ${font}`;
  ctx.fillText("Java Arena", 166, 118);

  ctx.fillStyle = "#5aaef0";
  ctx.font = `700 28px ${font}`;
  ctx.fillText(card.kicker.toUpperCase(), 80, 240);
  ctx.fillStyle = "#fafafa";
  ctx.font = `750 68px ${font}`;
  const title = wrap(ctx, card.title, 1040).slice(0, 2);
  title.forEach((l, i) => ctx.fillText(l, 80, 320 + i * 78));
  ctx.fillStyle = "#d4d4d8";
  ctx.font = `500 32px ${font}`;
  card.lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 80, 320 + title.length * 78 + 20 + i * 46));
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `600 30px ${font}`;
  ctx.fillText("Java Arena  ·  learn Java with the real compiler, free", 80, 580);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("The image couldn't be drawn"))), "image/png"));
}

/** Shares the card (the phone's share sheet) or downloads it. */
export async function shareCard(card: Card, text: string): Promise<"shared" | "downloaded"> {
  const blob = await drawCard(card);
  const file = new File([blob], card.file, { type: "image/png" });
  const url = location.origin + import.meta.env.BASE_URL;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: `${text} ${url}` });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "shared";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = card.file;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return "downloaded";
}
