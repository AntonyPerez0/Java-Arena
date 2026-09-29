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
  ctx.fillStyle = "#0c0a09";
  ctx.fillRect(0, 0, 1200, 630);
  const glow = ctx.createRadialGradient(1000, 150, 0, 1000, 150, 620);
  glow.addColorStop(0, "rgba(249, 115, 22, 0.24)");
  glow.addColorStop(1, "rgba(249, 115, 22, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 630);

  // The logo (public/favicon.svg), at twice its 32 px size.
  ctx.save();
  ctx.translate(80, 72);
  ctx.scale(2, 2);
  const tile = ctx.createLinearGradient(0, 0, 32, 32);
  tile.addColorStop(0, "#fdba74");
  tile.addColorStop(0.55, "#f97316");
  tile.addColorStop(1, "#dc2626");
  ctx.fillStyle = tile;
  ctx.beginPath();
  ctx.roundRect(0, 0, 32, 32, 8);
  ctx.fill();
  ctx.strokeStyle = "#1c0a02";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 2;
  ctx.stroke(new Path2D("M10 8.5c-2 0-2.6 1-2.6 2.8v2.2c0 1.4-.6 2.2-1.9 2.5 1.3.3 1.9 1.1 1.9 2.5v2.2c0 1.8.6 2.8 2.6 2.8M22 8.5c2 0 2.6 1 2.6 2.8v2.2c0 1.4.6 2.2 1.9 2.5-1.3.3-1.9 1.1-1.9 2.5v2.2c0 1.8-.6 2.8-2.6 2.8"));
  ctx.lineWidth = 2.6;
  ctx.stroke(new Path2D("M18.2 10v7.6c0 2.2-1.1 3.4-3 3.4-1.3 0-2.2-.6-2.7-1.6"));
  ctx.restore();
  ctx.fillStyle = "#f5f5f4";
  ctx.font = `700 40px ${font}`;
  ctx.fillText("Java Arena", 166, 118);

  ctx.fillStyle = "#fb923c";
  ctx.font = `700 28px ${font}`;
  ctx.fillText(card.kicker.toUpperCase(), 80, 240);
  ctx.fillStyle = "#fafaf9";
  ctx.font = `750 68px ${font}`;
  const title = wrap(ctx, card.title, 1040).slice(0, 2);
  title.forEach((l, i) => ctx.fillText(l, 80, 320 + i * 78));
  ctx.fillStyle = "#d6d3d1";
  ctx.font = `500 32px ${font}`;
  card.lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 80, 320 + title.length * 78 + 20 + i * 46));
  ctx.fillStyle = "#a8a29e";
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
