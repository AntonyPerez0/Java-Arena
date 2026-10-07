// The task card's note about the tests it doesn't show: what they use that the shown one doesn't.
import type { TestCase } from "./types";

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
/** A test's command-line arguments, none written as an empty list or left out alike. */
const argsOf = (t?: TestCase) => (t?.args?.length ? t.args : undefined);

/**
 * What the tests that a task card doesn't show (`others`) use instead of what the shown test uses,
 * in words for its note "2 more hidden tests use other ...". A challenge whose tests have no clicks
 * and typing and all the same arguments keeps the older words (input, files, calls). Otherwise the
 * words name only what some other test changes: input (standard input), files, calls, command-line
 * arguments, clicks and typing (a test with none checks the window as it opens).
 */
export function otherTestsUse(shown: TestCase | undefined, others: TestCase[]): string {
  const calls = others.filter((t) => t.call).length;
  const files = others.some((t) => t.files);
  const plain = calls === 0 ? (files ? "input or files" : "input") : calls === others.length ? "calls" : "input or calls";
  const args = others.some((t) => !same(argsOf(t), argsOf(shown)));
  if (!args && !others.some((t) => t.events)) return plain;
  const parts = [
    others.some((t) => (t.stdin ?? "") !== (shown?.stdin ?? "")) && "input",
    others.some((t) => t.files && !same(t.files, shown?.files)) && "files",
    calls > 0 && "calls",
    args && "command-line arguments",
    others.some((t) => !same(t.events, shown?.events)) && "clicks and typing",
  ].filter((p): p is string => !!p);
  return parts.length ? parts.join(" or ") : plain;
}
