// The determinism check of the content build (scripts/build-content.mjs) for programs with a window:
// a model solution with events tests and a ```java window example must show the same window on
// every run, so the build rejects code that would make it differ between runs.

/**
 * Why a program with a window might not give the same window on every run, as an error message,
 * or none. A window is compared with the model solution's after the same clicks, and the page
 * reruns the program from the start for every click, so a program with a window must be
 * deterministic: no unseeded Random (nor Collections.shuffle without one, UUID.randomUUID() or
 * SecureRandom), no Math.random(), no clock, no identity hash codes, and no Set.of or Map.of (whose
 * order changes from run to run). Comments and strings don't count. A node's toString has its
 * identity hash too (Label@1b6d3586), which a pattern can't see: the JDK-versus-browser check of
 * every lesson program (scripts/content-browser.mjs) finds a program that prints one.
 */
export function nondeterminism(files) {
  const code = files.map((f) => f.text.replace(/"""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, " ")).join("\n");
  const found = [
    [/\bMath\s*\.\s*random\s*\(/, "Math.random()"],
    [/\bnew\s+(?:java\s*\.\s*util\s*\.\s*)?Random\s*\(\s*\)/, "new Random() without a seed"],
    [/\bThreadLocalRandom\b/, "ThreadLocalRandom"],
    [/\bSystem\s*\.\s*(?:currentTimeMillis|nanoTime)\s*\(/, "the clock (System.currentTimeMillis() or nanoTime())"],
    [/\b(?:LocalDate|LocalTime|LocalDateTime|Instant|ZonedDateTime|OffsetDateTime|Year|YearMonth|MonthDay|Clock)\s*\.\s*(?:now|system\w*)\s*\(/, "the current date or time (now())"],
    [/\bnew\s+(?:java\s*\.\s*util\s*\.\s*)?Date\s*\(\s*\)/, "the current date (new Date())"],
    [/\bCalendar\s*\.\s*getInstance\s*\(|\bnew\s+(?:java\s*\.\s*util\s*\.\s*)?GregorianCalendar\s*\(\s*\)/, "the current date (Calendar.getInstance() or new GregorianCalendar())"],
    // One argument (up to two levels of parentheses inside it, where a comma doesn't count), or a method reference: no Random.
    [/\bCollections\s*(?:\.\s*(?:<[^<>()]*>\s*)?shuffle\s*\((?:[^(),]|\((?:[^()]|\([^()]*\))*\))*\)|::\s*shuffle\b)/, "Collections.shuffle without a Random"],
    [/\bUUID\s*\.\s*randomUUID\s*\(/, "UUID.randomUUID()"],
    [/\bnew\s+(?:java\s*\.\s*security\s*\.\s*)?SecureRandom\b|\bSecureRandom\s*\.\s*getInstance(?:Strong)?\s*\(/, "SecureRandom"],
    [/\bStrictMath\s*\.\s*random\s*\(/, "StrictMath.random()"],
    [/\bnew\s+(?:java\s*\.\s*util\s*\.\s*)?SplittableRandom\s*\(\s*\)/, "new SplittableRandom() without a seed"],
    [/\bRandomGenerator\s*\.\s*(?:getDefault|of)\s*\(/, "RandomGenerator.getDefault() or RandomGenerator.of(...)"],
    // Identity hash codes change from run to run (in the browser's Java engine, even between two runs on one page).
    [/\bSystem\s*\.\s*identityHashCode\s*\(/, "System.identityHashCode (it changes from run to run)"],
    // Their order is salted per run, even on the JDK and for strings.
    [/\b(?:Set|Map)\s*\.\s*(?:<[^<>()]*>\s*)?(?:of|ofEntries|copyOf)\s*\(/, "Set.of or Map.of (their order changes from run to run: use List.of, or a TreeSet or TreeMap)"],
  ]
    .filter(([re]) => re.test(code))
    .map(([, what]) => what);
  return found.length ? [`uses ${found.join(", ")}, but a program with a window must show the same window on every run (give a Random a seed, new Random(42), and shuffle with one: Collections.shuffle(list, new Random(42)))`] : [];
}
