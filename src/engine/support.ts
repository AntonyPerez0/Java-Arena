// Whether this browser can run the Java engine. javac.wasm needs WebAssembly GC and exception
// handling (the original try/catch form, which TeaVM 0.13.1 emits). Each check validates a tiny
// module that uses the feature, so nothing is downloaded when the browser can't run it.

const header = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];

// Type section with one struct type that has no fields: (type (struct)).
const gcModule = new Uint8Array([...header, 0x01, 0x03, 0x01, 0x5f, 0x00]);

// One function () -> () whose body is an empty try block: (func (try (do))).
const ehModule = new Uint8Array([
  ...header,
  0x01, 0x04, 0x01, 0x60, 0x00, 0x00, // type section: func type () -> ()
  0x03, 0x02, 0x01, 0x00, // function section: one function of type 0
  0x0a, 0x07, 0x01, 0x05, 0x00, 0x06, 0x40, 0x0b, 0x0b, // code: no locals, try (empty) end, end
]);

let cached: boolean | null = null;

export function engineSupported(): boolean {
  if (cached !== null) return cached;
  try {
    cached =
      typeof WebAssembly === "object" &&
      typeof DecompressionStream === "function" &&
      WebAssembly.validate(gcModule) &&
      WebAssembly.validate(ehModule);
  } catch {
    cached = false;
  }
  return cached;
}
