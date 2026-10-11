import { assetScale, assetSizeWords, binaryWords, type AssetFile, type GivenFile } from "../grader/assets";

const BASE = import.meta.env.BASE_URL;

/**
 * An image of content/assets that a test or the Playground gives a program: drawn several times
 * larger with its pixels kept crisp (on a checkerboard, where it's transparent), and its size in
 * words under it. The label above it (the file's name) is the caller's.
 */
export function AssetImage({ image }: { image: AssetFile }) {
  const k = assetScale(image.width, image.height);
  return (
    <figure className="asset-figure">
      <div className="asset-frame">
        <img src={BASE + image.url} width={image.width * k} height={image.height * k} alt={image.alt} className="asset-img" decoding="async" />
      </div>
      <figcaption className="asset-size">{assetSizeWords(image)}</figcaption>
    </figure>
  );
}

/** A file a test gives the program, under its label: its text in a console box, or the image drawn. */
export function GivenFileView({ value, className = "console tiny" }: { value: GivenFile; className?: string }) {
  if (typeof value !== "string") return <AssetImage image={value} />;
  return (
    <pre className={className} tabIndex={0}>
      {value.replace(/\n$/, "")}
    </pre>
  );
}

/** A file's bytes that aren't text, where its text would be: what it holds, in words (never as text). */
export function BinaryFile({ bytes }: { bytes: Uint8Array }) {
  return <p className="binary-file muted small">{binaryWords(bytes)}, so it isn't shown here.</p>;
}
