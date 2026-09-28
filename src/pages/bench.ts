import "./base.css";
import {
  compile,
  compileAndRun,
  downloadMegabytes,
  engineCached,
  engineReady,
  ensureEngine,
  getEngineStatus,
  mayAutoDownload,
  onMobileData,
  runClasses,
  subscribeEngine,
  DEFAULT_TIME_LIMIT_MS,
  type CompileRunResult,
} from "../engine/client";
import { explainCrash, explainDiagnostic } from "../engine/friendly";
import { registerServiceWorker } from "./sw-register";

registerServiceWorker();

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const EXAMPLES: { name: string; code: string; stdin: string }[] = [
  {
    name: "Hello World",
    stdin: "",
    code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}
`,
  },
  {
    name: "Reads input",
    stdin: "5\nAda\n",
    code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.println("How many cups?");
        int cups = Integer.valueOf(scanner.nextLine());
        System.out.println("Who is drinking?");
        String name = scanner.nextLine();
        System.out.println(name + " drinks " + cups + " cups, that is " + (cups * 2.5) + " dl.");
    }
}
`,
  },
  {
    name: "A loop that never ends",
    stdin: "",
    code: `public class Main {
    public static void main(String[] args) {
        int i = 0;
        int sum = 0;
        while (i < 10) {
            sum += i;
        }
        System.out.println("Sum: " + sum);
    }
}
`,
  },
  {
    name: "A crash",
    stdin: "",
    code: `public class Main {
    static int last(int[] numbers) {
        return numbers[numbers.length];
    }

    public static void main(String[] args) {
        int[] numbers = {3, 1, 4};
        System.out.println("The last number is " + last(numbers));
    }
}
`,
  },
  {
    name: "A compile error",
    stdin: "",
    code: `public class Main {
    public static void main(String[] args) {
        int x = 5
        System.out.println(x);
    }
}
`,
  },
];

// Settings kept in this browser only.
const MOBILE_KEY = "java-arena-mobile-data";
const allowMobile = () => {
  try {
    return localStorage.getItem(MOBILE_KEY) === "1";
  } catch {
    return false;
  }
};

// ---- Engine card ----
let asked = false;
async function renderEngine() {
  const el = $("engine");
  const s = getEngineStatus();
  if (s.state === "idle") {
    if (!asked) {
      el.innerHTML = `<p>Checking the connection...</p>`;
      return;
    }
    const mb = await downloadMegabytes();
    el.classList.add("warn");
    el.innerHTML = `<p><b>You're on mobile data.</b> Running Java needs the engine, a one-time download${mb ? ` of about ${mb} MB` : ""}. After that it's saved on this device and works offline.</p>
      <div class="row"><button id="dl" class="primary">Download the engine</button></div>
      <label class="inline"><input type="checkbox" id="always" ${allowMobile() ? "checked" : ""}> Always download on mobile data</label>`;
    $("dl").onclick = () => startEngine();
    ($("always") as HTMLInputElement).onchange = (e) => {
      try {
        localStorage.setItem(MOBILE_KEY, (e.target as HTMLInputElement).checked ? "1" : "0");
      } catch {
        /* private mode */
      }
    };
    return;
  }
  el.classList.remove("warn");
  if (s.state === "loading") {
    const mb = (n: number) => (n / 1e6).toFixed(1);
    const what = s.stage === "start" ? "Starting the engine..." : s.stage === "cache" ? "Loading the saved engine..." : `Downloading the engine: ${mb(s.loaded)} of ${mb(s.total)} MB`;
    el.innerHTML = `<p>${what}</p><progress max="${s.total}" value="${s.loaded}" aria-label="Engine download progress"></progress>`;
  } else if (s.state === "ready") {
    el.innerHTML = `<p class="ok"><b>Ready.</b> The engine is saved on this device${navigator.onLine ? "" : " and running offline"}.</p>`;
  } else {
    el.innerHTML = `<p class="bad"><b>The engine couldn't start.</b> ${esc(s.message)}</p><div class="row"><button id="retry">Try again</button></div>`;
    $("retry").onclick = () => startEngine();
  }
}
subscribeEngine(() => void renderEngine());

// How long the engine took to become ready on this visit, and whether it came from this device.
let startedAt = 0;
let engineStartMs: number | null = null;
let savedOnDevice: boolean | null = null;
function startEngine() {
  if (!startedAt) startedAt = performance.now();
  ensureEngine();
}
subscribeEngine(() => {
  if (engineStartMs === null && startedAt && getEngineStatus().state === "ready") engineStartMs = performance.now() - startedAt;
});

async function autoload() {
  const ok = await mayAutoDownload(allowMobile());
  savedOnDevice = await engineCached();
  asked = true;
  if (ok) startEngine();
  await renderEngine();
}

// ---- Try it ----
const select = $("example") as HTMLSelectElement;
const code = $("code") as HTMLTextAreaElement;
const stdin = $("stdin") as HTMLTextAreaElement;
EXAMPLES.forEach((ex, i) => select.append(new Option(ex.name, String(i))));
const load = (i: number) => {
  code.value = EXAMPLES[i].code;
  stdin.value = EXAMPLES[i].stdin;
};
select.onchange = () => load(Number(select.value));
load(0);

// Tab inserts four spaces; Escape then Tab leaves the editor (keyboard users are never trapped).
let escaped = false;
code.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    escaped = true;
    return;
  }
  if (e.key === "Tab" && !e.shiftKey && !escaped) {
    e.preventDefault();
    code.setRangeText("    ", code.selectionStart, code.selectionEnd, "end");
  }
  escaped = false;
});

function renderResult(r: CompileRunResult, wallMs: number): string {
  const c = r.compile;
  if (c.internalError) return `<div class="card"><p class="bad"><b>The compiler failed:</b> ${esc(c.internalError)}</p></div>`;
  if (!c.ok) {
    const errors = c.diagnostics.filter((d) => d.kind === "error");
    return `<div class="card"><p class="bad"><b>It didn't compile.</b> ${errors.length === 1 ? "1 error" : `${errors.length} errors`}.</p>${errors
      .slice(0, 4)
      .map((d) => {
        const why = explainDiagnostic(d);
        return `<pre>${esc(d.formatted)}</pre>${why ? `<p>${esc(why)}</p>` : ""}`;
      })
      .join("")}</div>`;
  }
  const run = r.runs[0];
  let html = "";
  const warnings = c.diagnostics.filter((d) => d.kind !== "error");
  if (warnings.length) html += warnings.map((d) => `<pre class="muted">${esc(d.formatted)}</pre>`).join("");
  if (run.internalError) return html + `<div class="card"><p class="bad"><b>The runner failed:</b> ${esc(run.internalError)}</p></div>`;
  html += `<p class="small muted">Compiled in ${Math.round(c.ms)} ms, ran in ${Math.round(run.ms)} ms (${Math.round(wallMs)} ms in all). Exit code ${run.exitCode ?? "none"}.</p>`;
  html += `<p><b>Output</b></p><pre>${esc(run.stdout) || '<span class="muted">(nothing printed)</span>'}</pre>`;
  if (run.timedOut) html += `<div class="card warn"><p><b>Stopped after ${DEFAULT_TIME_LIMIT_MS / 1000} seconds.</b> The program was still running. Is there a loop whose condition never becomes false?</p></div>`;
  if (run.truncated) html += `<p class="small">The output was cut off at 64 KB.</p>`;
  const crash = explainCrash(run.stderr);
  if (crash) {
    html += `<div class="card"><p class="bad"><b>The program crashed${crash.line ? ` on line ${crash.line}` : ""}${crash.method ? ` (in ${esc(crash.method)})` : ""}</b> with ${esc(crash.exception)}.</p><p>${esc(crash.explanation)}</p><pre>${esc(run.stderr)}</pre></div>`;
  } else if (run.stderr) {
    html += `<p><b>Error output</b></p><pre>${esc(run.stderr)}</pre>`;
  }
  return html;
}

$("run").onclick = async () => {
  const button = $("run") as HTMLButtonElement;
  button.disabled = true;
  $("run-note").textContent = getEngineStatus().state === "ready" ? "Running..." : "Waiting for the engine...";
  const t = performance.now();
  try {
    const r = await compileAndRun([{ path: "Main.java", text: code.value }], [{ stdin: stdin.value }]);
    $("result").innerHTML = renderResult(r, performance.now() - t);
  } catch (err) {
    $("result").innerHTML = `<div class="card"><p class="bad">${esc(String((err as Error)?.message ?? err))}</p></div>`;
  } finally {
    button.disabled = false;
    $("run-note").textContent = "";
  }
};

// ---- Benchmark ----
const TYPICAL = `import java.util.ArrayList;
import java.util.Scanner;

public class Main {
    static double average(ArrayList<Integer> numbers) {
        int sum = 0;
        for (int n : numbers) {
            sum += n;
        }
        return 1.0 * sum / numbers.size();
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        ArrayList<Integer> numbers = new ArrayList<>();
        while (true) {
            String line = scanner.nextLine();
            if (line.equals("end")) {
                break;
            }
            numbers.add(Integer.valueOf(line));
        }
        System.out.println("Count: " + numbers.size());
        System.out.println("Average: " + average(numbers));
        System.out.println("Largest: " + numbers.stream().mapToInt(i -> i).max().getAsInt());
    }
}
`;
const CPU = `public class Main {
    public static void main(String[] args) {
        long sum = 0;
        for (int i = 0; i < 10_000_000; i++) {
            sum += i % 7;
        }
        System.out.println(sum);
    }
}
`;
const LOOP = `public class Main {
    public static void main(String[] args) {
        while (true) {
        }
    }
}
`;
const HELLO = EXAMPLES[0].code;

const stats = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return { first: Math.round(xs[0]), median: Math.round(s[Math.floor(s.length / 2)]), min: Math.round(s[0]), max: Math.round(s[s.length - 1]) };
};

let report = "";
$("bench").onclick = async () => {
  const button = $("bench") as HTMLButtonElement;
  const out = $("bench-out");
  button.disabled = true;
  ($("copy") as HTMLButtonElement).hidden = true;
  const rows: [string, string][] = [];
  const show = (note: string) => {
    out.innerHTML = `<p>${esc(note)}</p>${rows.length ? `<div class="table-wrap"><table><thead><tr><th scope="col">Measure</th><th scope="col">Result</th></tr></thead><tbody>${rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
  };
  try {
    let t = 0;
    show("Starting the engine...");
    startEngine();
    await engineReady();
    rows.push(["Engine start (this visit)", `${Math.round(engineStartMs ?? 0)} ms, ${savedOnDevice ? "from this device" : "downloaded first"}`]);

    show("Compiling Hello World 5 times...");
    const compileMs: number[] = [];
    let hello = null;
    for (let i = 0; i < 5; i++) {
      hello = await compile([{ path: "Main.java", text: HELLO }]);
      compileMs.push(hello.ms);
    }
    const c = stats(compileMs);
    rows.push(["Compile Hello World", `first ${c.first} ms, then median ${stats(compileMs.slice(1)).median} ms`]);

    show("Running Hello World 3 times...");
    const startMs: number[] = [];
    const wallMs: number[] = [];
    for (let i = 0; i < 3; i++) {
      t = performance.now();
      const r = await runClasses(hello!.classes, "Main", [{}]);
      wallMs.push(performance.now() - t);
      startMs.push(r[0].workerStartMs ?? NaN);
      if (r[0].stdout !== "Hello World!\n") throw new Error("Hello World printed the wrong thing: " + JSON.stringify(r[0]));
    }
    rows.push(["Run Hello World (click to output)", `median ${stats(wallMs).median} ms (runner start ${stats(startMs).median} ms)`]);

    show("Compiling and running a typical program 3 times...");
    const typical: number[] = [];
    const typicalCompile: number[] = [];
    for (let i = 0; i < 3; i++) {
      t = performance.now();
      const r = await compileAndRun([{ path: "Main.java", text: TYPICAL }], [{ stdin: "4\n8\n15\n16\n23\n42\nend\n" }]);
      typical.push(performance.now() - t);
      typicalCompile.push(r.compile.ms);
      if (!r.runs[0]?.stdout.includes("Average: 18.0")) throw new Error("The typical program printed the wrong thing");
    }
    rows.push(["Typical program, Check to output", `median ${stats(typical).median} ms (compile ${stats(typicalCompile).median} ms)`]);

    show("Running a loop of 10 million steps...");
    const cpu = await compileAndRun([{ path: "Main.java", text: CPU }], [{}], { timeLimitMs: 60_000 });
    rows.push(["10 million loop steps", cpu.runs[0]?.timedOut ? "over 60 s" : `${Math.round(cpu.runs[0]?.ms ?? NaN)} ms`]);

    show("Stopping a program that never ends (2 s limit)...");
    const loop = await compile([{ path: "Main.java", text: LOOP }]);
    t = performance.now();
    const killed = await runClasses(loop.classes, "Main", [{}], 2000);
    const killWall = performance.now() - t;
    t = performance.now();
    const after = await runClasses(hello!.classes, "Main", [{}]);
    rows.push(["Endless loop stopped", `${killed[0].timedOut ? "yes" : "NO"}, ${Math.round(killWall - 2000 - (killed[0].workerStartMs ?? 0))} ms after the limit`]);
    rows.push(["Next run after stopping", `${Math.round(performance.now() - t)} ms${after[0].stdout === "Hello World!\n" ? "" : " (wrong output!)"}`]);

    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string; type?: string } };
    rows.push(["Device", `${nav.hardwareConcurrency ?? "?"} cores, ${nav.deviceMemory ?? "?"} GB memory (as reported)`]);
    report = [
      "Java Arena engine benchmark",
      new Date().toISOString(),
      navigator.userAgent,
      `connection: ${nav.connection?.type ?? "?"} / ${nav.connection?.effectiveType ?? "?"}, mobile data: ${onMobileData()}`,
      ...rows.map(([a, b]) => `${a}: ${b}`),
    ].join("\n");
    show("Done. Tap Copy results and send them to the site's author.");
    ($("copy") as HTMLButtonElement).hidden = false;
  } catch (err) {
    show(`The benchmark stopped: ${String((err as Error)?.message ?? err)}`);
  } finally {
    button.disabled = false;
  }
};

$("copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText(report);
    $("copy").textContent = "Copied";
  } catch {
    const area = document.createElement("textarea");
    area.value = report;
    area.rows = 10;
    area.setAttribute("aria-label", "Benchmark results");
    $("bench-out").append(area);
    area.select();
  }
};

// Start the engine once the page itself has loaded, so the download doesn't compete with it.
if (document.readyState === "complete") void autoload();
else window.addEventListener("load", () => void autoload(), { once: true });
