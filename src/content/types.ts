// The shape of src/generated/course.json and src/generated/modules/<id>.json (made by scripts/build-content.mjs).

/** One test: the program's input, or `call`, code the check runs to call the learner's methods. */
export type TestCase = { name: string; stdin: string; call?: string; expect: string; hidden?: boolean };
export type Rule = { pattern: string; flags?: string; message: string; min?: number; max?: number; raw?: boolean };

/**
 * One challenge: a fill-in (`seed` holds the [[blanks]]), a program to write or fix, or "What does it
 * print?" (`predict`: the learner types each line of `lines`, the program's real output).
 */
export type Exercise = {
  kind: "fill" | "code" | "predict";
  seed: string;
  solution: string;
  tests: TestCase[];
  hints: string[];
  require: Rule[];
  forbid: Rule[];
  /** "indent": the indentation must match the braces for the challenge to pass. */
  style?: "indent";
  /** Predict challenges: each line the program prints. */
  lines?: string[];
};

/** One of a step's further challenges, with its own task. */
export type Challenge = Exercise & { task: string };

/** A lesson step: its text, its own challenge (`task` and the exercise fields) and two more. */
export type Step = Exercise & { id: string; slug: string; title: string; text: string; task: string; more: Challenge[] };

/** A section of the University of Helsinki MOOC that a module follows. */
export type MoocSection = { section: string; title: string; path: string; portion?: string };

export type Course = "I" | "II" | "extra";

export type Module = {
  id: string;
  /** Place in the course, from 1. */
  number: number;
  title: string;
  course: Course;
  part: number | null;
  mooc: MoocSection[];
  summary: string;
  steps: Step[];
};

/** Every module of the course plan, written or not. */
export type PlannedModule = {
  id: string;
  number: number;
  title: string;
  course: Course;
  part: number | null;
  mooc: MoocSection[];
  steps: number;
  live: boolean;
};

/** A module as the course index lists it: its steps' titles and addresses, without the lessons. */
export type StepSummary = { id: string; slug: string; title: string; challenges: number };
export type ModuleSummary = Omit<Module, "steps"> & { steps: StepSummary[] };

export type CourseIndex = {
  /** The reference JDK the expected outputs came from. */
  jdk: string;
  moocUrl: string;
  plan: PlannedModule[];
  modules: ModuleSummary[];
};
