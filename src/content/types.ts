// The shape of src/generated/course.json, src/generated/modules/<id>.json and the lesson files in
// public/lessons (made by scripts/build-content.mjs).
import type { AssetFile, GivenFile } from "../grader/assets";
import type { WindowState } from "../grader/window";

/**
 * One test: the program's input, or `call`, code the check runs to call the learner's methods, or
 * `junit`, a test class of the program to run (on the program as written, or with the files in
 * `replace` swapped for other versions), which must give `outcome`: every test passes, or at least
 * one fails. `files` are files in the program's folder it can read (text, or an image of
 * content/assets, which the grader fetches from the site); `writes` are files it must
 * leave there, with their text as the reference solution wrote them (compared like output).
 * `args` are main's command-line arguments. `events` (a JavaFX program) are the clicks and typing
 * replayed after start, one event line each ([] checks the window as start leaves it); `window` is
 * the reference solution's window after them and `outline` its outline (windowOutline), which is
 * what the learner's window is compared with.
 */
export type TestCase = {
  name: string;
  stdin: string;
  args?: string[];
  call?: string;
  files?: Record<string, GivenFile>;
  writes?: Record<string, string>;
  expect: string;
  hidden?: boolean;
  junit?: string;
  replace?: Record<string, string>;
  outcome?: "pass" | "fail";
  events?: string[];
  window?: WindowState;
  outline?: string;
};
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
export type StepSummary = {
  id: string;
  slug: string;
  title: string;
  /** Names the step's lesson file: public/lessons/<module>/<slug>-<hash>.json. */
  hash: string;
  challenges: number;
  /** Drills this step unlocks. */
  drills: number;
};
export type ModuleSummary = Omit<Module, "steps"> & { steps: StepSummary[]; drills: number };

/**
 * One milestone of a project: a challenge (`seed` is the code it starts from when built on the
 * previous milestone's model solution, or the project's seed for milestone 1) with a title. `files`
 * are the files it adds to the program, with the text they start with; `replaces` names earlier
 * milestones' tests whose behavior it changes.
 */
export type Milestone = Exercise & { id: string; title: string; task: string; files?: Record<string, string>; replaces?: string[] };

/** A project (public/lessons/projects/<id>-<hash>.json): one program built over its milestones. */
export type Project = { id: string; title: string; summary: string; after: string; intro: string; milestones: Milestone[] };

/** A project as the course index lists it, without its file's contents. */
export type ProjectSummary = Omit<Project, "intro" | "milestones"> & { hash: string; milestones: { id: string; title: string }[] };

export type CourseIndex = {
  /** The reference JDK the expected outputs came from. */
  jdk: string;
  moocUrl: string;
  plan: PlannedModule[];
  modules: ModuleSummary[];
  interviewDrills: number;
  placementQuestions: number;
  /** The projects, in course order. */
  projects: ProjectSummary[];
  /** The images of content/assets (served under the site's base address), which the Playground offers as sample files. */
  assets: AssetFile[];
};

export type DrillType = "predict" | "fill" | "bug" | "compiles" | "choice" | "boss";

/**
 * A Deathmatch drill (src/generated/drills.json). `display` is the code shown; `answer` is what's
 * checked: the output (predict), the blank (fill), the 1-based line (bug), "yes" or "no"
 * (compiles), or the 1-based choice (choice). A boss drill is a whole challenge in `exercise`.
 */
export type Drill = {
  id: string;
  /** The module it practices, or "interview". */
  topic: string;
  type: DrillType;
  prompt: string;
  display: string;
  answer: string;
  /** Markdown: why the answer is what it is. */
  why: string;
  /** Accepted answers for a fill drill. */
  accept?: string[];
  /** The corrected line of a bug drill. */
  fix?: string;
  /** What the (fixed or filled-in) program prints. */
  output?: string;
  /** Input the program reads. */
  stdin?: string;
  choices?: string[];
  exercise?: Exercise;
  /** The step that unlocks it (none for interview drills). */
  after?: string;
};

export type PlacementQuestion = Drill & { module: string };

export type DrillSet = { drills: Drill[]; placement: PlacementQuestion[] };
