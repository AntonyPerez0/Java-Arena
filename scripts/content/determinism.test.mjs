// Tests of the content build's determinism check for programs with a window (determinism.mjs).
// Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { nondeterminism } from "./determinism.mjs";

const check = (body) => nondeterminism([{ path: "Main.java", text: `import java.util.*;\n\npublic class Main {\n    void f(List<String> cards, String[] arr, String a, String b, Random r) {\n        ${body}\n    }\n}\n` }]);
const flags = (body, what) => {
  const [m] = check(body);
  assert.ok(m?.includes(what), `${body}: ${m}`);
};

test("Collections.shuffle with one argument (whatever it holds) or as a method reference is flagged; with a Random it isn't", () => {
  for (const body of [
    "Collections.shuffle(cards);",
    "Collections . shuffle ( cards ) ;",
    "Collections.shuffle(new ArrayList<>(cards));",
    "Collections.shuffle(Arrays.asList(arr));",
    "Collections.shuffle(Arrays.asList(a, b));",
    "Collections.shuffle(getCards());",
    "Collections.shuffle((List<String>) cards);",
    "Collections.shuffle(deck.cards());",
    "Collections.<String>shuffle(cards);",
    "java.util.Collections.shuffle(cards);",
    "Consumer<List<String>> s = Collections::shuffle;",
  ])
    flags(body, "Collections.shuffle without a Random");
  for (const body of [
    "Collections.shuffle(cards, new Random(3));",
    "Collections.shuffle(new ArrayList<>(cards), new Random(3));",
    "Collections.shuffle(Arrays.asList(a, b), r);",
    "Collections.shuffle(cards, r);",
    "Collections.sort(cards);",
    '// Collections.shuffle(cards);\nString s = "Collections.shuffle(cards)";',
  ])
    assert.deepEqual(check(body), [], body);
});

test("other unseeded randomness and the clock are flagged; seeded ones aren't", () => {
  flags("String id = UUID.randomUUID().toString();", "UUID.randomUUID()");
  flags("Random s = new SecureRandom();", "SecureRandom");
  flags("Random s = new java.security.SecureRandom();", "SecureRandom");
  flags("Object s = java.security.SecureRandom.getInstanceStrong();", "SecureRandom");
  flags("double d = StrictMath.random();", "StrictMath.random()");
  flags("SplittableRandom s = new SplittableRandom();", "new SplittableRandom() without a seed");
  flags('var g = java.util.random.RandomGenerator.of("L64X128MixRandom");', "RandomGenerator");
  flags("var g = RandomGenerator.getDefault();", "RandomGenerator");
  flags("Calendar c = Calendar.getInstance();", "the current date");
  flags("Calendar c = new GregorianCalendar();", "the current date");
  flags("double d = Math.random();", "Math.random()");
  flags("Random x = new Random();", "new Random() without a seed");
  for (const body of ["Random x = new Random(42);", "SplittableRandom s = new SplittableRandom(7);", "Calendar c = new GregorianCalendar(2024, 0, 1);"]) assert.deepEqual(check(body), [], body);
  // Identity hash codes and the salted order of Set.of and Map.of change from run to run.
  flags("int h = System.identityHashCode(a);", "System.identityHashCode");
  flags('Set<String> s = Set.of("a", "b");', "Set.of or Map.of");
  flags('var m = Map.of("a", 1);', "Set.of or Map.of");
  flags("var m = Map.<String, Integer>ofEntries();", "Set.of or Map.of");
  flags("Set<String> s = Set.copyOf(cards);", "Set.of or Map.of");
  for (const body of ['List<String> l = List.of("a", "b");', "Set<String> s = new TreeSet<>(cards);", "int h = a.hashCode();", 'String s = "Set.of(a)";']) assert.deepEqual(check(body), [], body);
  // The message says how to shuffle with a seed.
  assert.match(check("Collections.shuffle(cards);")[0], /Collections\.shuffle\(list, new Random\(42\)\)/);
});
