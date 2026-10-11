import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { course } from "../content";
import type { AssetFile } from "../grader/assets";
import { AssetImage } from "./AssetImage";
import { FileName } from "./Results";

const BASE = import.meta.env.BASE_URL;

/** The images of content/assets that the Playground offers, by name (landscape.png). */
export const sampleAssets = new Map((course.assets ?? []).map((a) => [a.asset, a]));

/** The sample images in the program's folder, by name, as the files a run gives it (undefined: none). */
export function sampleFiles(names: string[]): Record<string, AssetFile> | undefined {
  const files = names.flatMap((n) => (sampleAssets.has(n) ? [[n, sampleAssets.get(n)!] as const] : []));
  return files.length ? Object.fromEntries(files) : undefined;
}

/** A thumbnail's scale in the list: whole pixels, at most 64 x 48. */
const thumbScale = (a: AssetFile) => Math.max(1, Math.min(8, Math.floor(64 / a.width), Math.floor(48 / a.height)));

/**
 * The Playground's sample images: the ones in the program's folder (each drawn, with Remove), and
 * "Add a sample image", which lists the others to add. `say` tells screen readers what happened.
 */
export default function SampleImages({ names, onChange, say }: { names: string[]; onChange: (names: string[]) => void; say: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const shown = names.filter((n) => sampleAssets.has(n));
  const left = [...sampleAssets.values()].filter((a) => !shown.includes(a.asset));
  if (!sampleAssets.size) return null;
  const add = (name: string) => {
    onChange([...shown, name]);
    setOpen(false);
    addRef.current?.focus();
    say(`Added ${name}. Your program can read it from its folder.`);
  };
  const remove = (name: string) => {
    onChange(shown.filter((n) => n !== name));
    addRef.current?.focus();
    say(`Removed ${name}.`);
  };
  return (
    <div className="pg-files">
      {shown.length > 0 && (
        <>
          <ul className="pg-samples" aria-label="Images in your program's folder">
            {shown.map((name) => (
              <li key={name} className="pg-sample">
                <span className="lbl">
                  The image <FileName name={name} />
                </span>
                <AssetImage image={sampleAssets.get(name)!} />
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => remove(name)} aria-label={`Remove ${name}`}>
                  <X className="icon" aria-hidden="true" /> Remove
                </button>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Your program finds {shown.length === 1 ? "it" : "them"} in its folder: <code>new Image("file:{shown[0]}")</code> reads {shown.length === 1 ? "it" : shown[0]} with JavaFX.
          </p>
        </>
      )}
      <button type="button" ref={addRef} className="btn btn-sm" aria-expanded={open} aria-controls="pg-sample-list" onClick={() => setOpen(!open)}>
        <ImagePlus className="icon" aria-hidden="true" /> Add a sample image
      </button>
      {open && !left.length && (
        <p id="pg-sample-list" className="muted small">
          Every sample image is in your program's folder already.
        </p>
      )}
      {open && left.length > 0 && (
        <ul id="pg-sample-list" className="sample-list" aria-label="Sample images">
          {left.map((a) => {
            const k = thumbScale(a);
            return (
              <li key={a.asset}>
                <button type="button" className="sample-pick" onClick={() => add(a.asset)}>
                  <span className="sample-thumb" aria-hidden="true">
                    <img src={BASE + a.url} width={a.width * k} height={a.height * k} alt="" className="asset-img" decoding="async" />
                  </span>
                  <span className="sample-name">
                    {a.asset}
                    <span className="muted small">
                      {a.width} x {a.height} pixels
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
