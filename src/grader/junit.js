// Unit tests with JUnit 4 (the MOOC's part 6). A program that uses org.junit is compiled with
// JUnit 4.13.2 and Hamcrest 1.3 on the class path (the engine's "junit4" library), and its test
// classes are run by ArenaTests, a small main class of ours that uses JUnit's own runner and prints
// a report that is the same on every run: JUnit's text runner prints the time the tests took, and
// runs tests in an order of its own. The results and the failure messages are JUnit's.

/** The engine library with JUnit 4 and Hamcrest. */
export const JUNIT_LIBRARY = "junit4";
export const TEST_RUNNER_FILE = "ArenaTests.java";
export const TEST_RUNNER_CLASS = "ArenaTests";

/** True when a program uses JUnit (and so needs it on the class path). */
export const usesJUnit = (files) => files.some((f) => /\borg\s*\.\s*junit\b/.test(f.text));

/** The classes of a program that have JUnit tests: files with a @Test, by class name. */
export const testClassesOf = (files) =>
  files.filter((f) => f.path !== TEST_RUNNER_FILE && /@Test\b/.test(f.text)).map((f) => f.path.replace(/\.java$/, "").replace(/\//g, "."));

/**
 * The report ArenaTests prints, for example:
 *
 *   CounterTest: 2 tests
 *     addsAmounts: passed
 *     startsAtZero: FAILED
 *       java.lang.AssertionError: expected:<0> but was:<1>
 *       at CounterTest.startsAtZero(CounterTest.java:15)
 *   1 of 2 tests passed
 *
 * Tests are listed in alphabetical order. A failure shows the exception JUnit reports and the
 * first line of the program's own code in its stack trace.
 */
export const TEST_RUNNER_SOURCE = `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.junit.runner.Description;
import org.junit.runner.JUnitCore;
import org.junit.runner.Request;
import org.junit.runner.notification.Failure;
import org.junit.runner.notification.RunListener;

public class ArenaTests {
    public static void main(String[] args) throws Exception {
        int run = 0;
        int passed = 0;
        for (String name : args) {
            Class<?> testClass = Class.forName(name);
            final List<Description> tests = new ArrayList<>();
            final List<Failure> failures = new ArrayList<>();
            JUnitCore core = new JUnitCore();
            core.addListener(new RunListener() {
                public void testStarted(Description d) {
                    tests.add(d);
                }

                public void testFailure(Failure f) {
                    failures.add(f);
                    if (!tests.contains(f.getDescription())) {
                        tests.add(f.getDescription());
                    }
                }
            });
            core.run(Request.aClass(testClass).sortWith(new Comparator<Description>() {
                public int compare(Description a, Description b) {
                    return String.valueOf(a.getMethodName()).compareTo(String.valueOf(b.getMethodName()));
                }
            }));
            System.out.println(name + ": " + tests.size() + (tests.size() == 1 ? " test" : " tests"));
            for (Description test : tests) {
                Failure failure = null;
                for (Failure f : failures) {
                    if (f.getDescription().equals(test)) {
                        failure = f;
                    }
                }
                String method = test.getMethodName() == null ? test.getDisplayName() : test.getMethodName();
                run++;
                if (failure == null) {
                    passed++;
                    System.out.println("  " + method + ": passed");
                } else {
                    System.out.println("  " + method + ": FAILED");
                    Throwable e = failure.getException();
                    System.out.println("    " + e);
                    for (StackTraceElement frame : e.getStackTrace()) {
                        String c = frame.getClassName();
                        if (!c.startsWith("org.junit.") && !c.startsWith("junit.") && !c.startsWith("org.hamcrest.")
                                && !c.startsWith("java.") && !c.startsWith("jdk.") && !c.startsWith("sun.")) {
                            System.out.println("    at " + c + "." + frame.getMethodName() + "(" + frame.getFileName() + ":" + frame.getLineNumber() + ")");
                            break;
                        }
                    }
                }
            }
        }
        System.out.println(passed + " of " + run + (run == 1 ? " test" : " tests") + " passed");
    }
}
`;

/** The results in an ArenaTests report: every test with whether it passed. */
export function parseTestReport(stdout) {
  const tests = [];
  for (const line of String(stdout).split("\n")) {
    const m = /^ {2}(\S+): (passed|FAILED)$/.exec(line);
    if (m) tests.push({ name: m[1], passed: m[2] === "passed" });
  }
  const summary = /^(\d+) of (\d+) tests? passed$/m.exec(String(stdout));
  return { tests, run: summary ? Number(summary[2]) : tests.length, passed: summary ? Number(summary[1]) : tests.filter((t) => t.passed).length, complete: !!summary };
}
