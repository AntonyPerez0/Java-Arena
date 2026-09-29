// Shapes shared by the page, the compile worker and the run worker.

export type SourceFile = { path: string; text: string };

export type Diagnostic = {
  kind: "error" | "warning" | "note";
  /** javac's diagnostic key, for example compiler.err.expected. */
  code: string;
  file: string;
  line: number;
  column: number;
  message: string;
  /** Exactly what javac prints for this diagnostic (header, source line, caret, details). */
  formatted: string;
};

export type ClassFile = { path: string; bytes: Uint8Array };

export type CompileResult = {
  ok: boolean;
  diagnostics: Diagnostic[];
  classes: ClassFile[];
  ms: number;
  /** Everything javac printed, exactly as the javac command prints it (with the "1 error" line). */
  output?: string;
  /** Set when the compiler itself failed (not the learner's code). */
  internalError?: string;
};

/** One run's input: stdin text, plus optional starter files and command-line arguments. */
export type RunInput = { stdin?: string; args?: string[]; files?: Record<string, string> };

export type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  truncated: boolean;
  ms: number;
  /** Files in the program's working folder after the run. */
  files: Record<string, string>;
  /** Set when the engine failed to run the program at all. */
  internalError?: string;
  /** On the first case only: time from asking for a runner to the program starting. */
  workerStartMs?: number;
};

export type EngineStatus =
  | { state: "idle" }
  | { state: "loading"; loaded: number; total: number; stage: "download" | "cache" | "start" }
  | { state: "ready" }
  | { state: "error"; message: string };
