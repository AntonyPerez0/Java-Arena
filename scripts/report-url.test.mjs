// Tests of where "Report a problem" goes (src/lib/site.ts): by default this repository's issues, and
// for a copy hosted by someone else (REPORT_URL) a GitHub issue, an email or another address. Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { REPORT_ON_GITHUB, REPORT_URL, REPO_URL, reportAddress } from "../src/lib/site.ts";

test("by default reports go to this repository's issues, and the source stays the repository", () => {
  assert.equal(REPORT_URL, "https://github.com/AntonyPerez0/Java-Arena/issues/new");
  assert.equal(REPO_URL, "https://github.com/AntonyPerez0/Java-Arena");
  assert.equal(REPORT_ON_GITHUB, true);
});

test("a GitHub issue gets the title and body filled in", () => {
  const href = reportAddress("https://github.com/someone/their-copy/issues/new", "[Lesson step] Printing", "**ID:** `a`\nmy code");
  const u = new URL(href);
  assert.equal(u.origin + u.pathname, "https://github.com/someone/their-copy/issues/new");
  assert.equal(u.searchParams.get("title"), "[Lesson step] Printing");
  assert.equal(u.searchParams.get("body"), "**ID:** `a`\nmy code");
});

test("an email address gets the subject and body, with spaces that stay spaces", () => {
  const href = reportAddress("mailto:java-arena@example.edu", "[Lesson step] Printing", "line one\nline two");
  assert.equal(href, "mailto:java-arena@example.edu?subject=%5BLesson%20step%5D%20Printing&body=line%20one%0Aline%20two");
});

test("any other address is used as it is", () => {
  assert.equal(reportAddress("https://forms.example.edu/java-arena", "t", "b"), "https://forms.example.edu/java-arena");
  assert.equal(reportAddress("mailto:a@example.edu?subject=Java%20Arena", "t", "b"), "mailto:a@example.edu?subject=Java%20Arena");
  assert.equal(reportAddress("https://github.com/someone/their-copy/issues", "t", "b"), "https://github.com/someone/their-copy/issues");
});
