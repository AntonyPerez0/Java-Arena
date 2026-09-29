// Launches Chromium for the tests: Playwright's own build when it is installed (CI runs
// "npx playwright install chromium"), otherwise any Chromium found under PLAYWRIGHT_BROWSERS_PATH.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

function fallbackExecutable() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;
  for (const dir of readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
    for (const sub of ['chrome-linux64', 'chrome-linux']) {
      const exe = join(root, dir, sub, 'chrome');
      if (existsSync(exe)) return exe;
    }
  }
  return undefined;
}

// Full Chromium (the "chromium" channel, what real browsers are built from) rather than the
// headless shell, so the tests see the same WebAssembly engine as learners' browsers.
export async function launchChromium(options = {}) {
  if (existsSync(chromium.executablePath())) return chromium.launch({ channel: 'chromium', ...options });
  return chromium.launch({ ...options, executablePath: fallbackExecutable() });
}
