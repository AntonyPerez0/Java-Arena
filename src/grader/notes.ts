// What the results list shows under each failed test (src/components/Results.tsx). Kept apart from grade.ts, which
// loads the Java engine's client, so that the results list doesn't pull it in.
import type { TestResult } from "./grade";

/**
 * The note to show under each test: a failed test whose crash went the same way as an earlier failed test's (in the order
 * the tests are shown) gets the short line in place of the crash's explanation, which is shown once, under the first one.
 * Whatever else the note says (the "checked as given" sentence, the window's note) stays.
 */
export function notesShown(tests: TestResult[]): (string | undefined)[] {
  const seen = new Set<string>();
  return tests.map((t) => {
    if (t.pass || !t.note || !t.crash) return t.note;
    if (!seen.has(t.crash.key)) {
      seen.add(t.crash.key);
      return t.note;
    }
    return t.note.includes(t.crash.text) ? t.note.replace(t.crash.text, t.crash.short) : t.note;
  });
}
