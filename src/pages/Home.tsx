import { ArrowRight, BookOpen, CalendarCheck, Check, Compass, Cpu, Crosshair, Lightbulb, ListChecks, Smartphone, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { course, modules, plan, stepPath, totalChallenges, totalSteps, modulePath } from "../content";
import { localDay, useStore } from "../state/store";
import { nextStep, stepsDone } from "../state/derived";
import { useTitle } from "../lib/title";
import { MOOC_URL } from "../lib/site";
import { highlight } from "../components/highlight";

const SAMPLE = `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String name = scanner.nextLine();
        System.out.println("Hello, " + name + "!");
    }
}`;

export default function Home() {
  useTitle(null);
  const s = useStore((x) => x);
  const next = nextStep(s);
  const done = stepsDone(s);
  const first = modules[0];
  const drillCount = modules.reduce((a, m) => a + m.drills, 0) + course.interviewDrills;
  const dailyDone = localDay() in s.daily;
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">Free and non-commercial</div>
            <h1>
              Learn Java by writing <span className="hero-accent">real Java</span>
            </h1>
            <p className="hero-lead">
              Every exercise is compiled by the real <code>javac</code> 21 compiler and run by a Java virtual machine, both inside your browser, on your own device. The lessons follow the University of Helsinki's Java Programming MOOC, with their own explanations and exercises.
            </p>
            <div className="hero-actions">
              {next && (
                <Link className="btn btn-brand btn-lg" to={done ? stepPath(next.module, next.step) : modulePath(first)}>
                  {done ? `Continue: ${next.step.title}` : "Start with module 1"} <ArrowRight className="icon" aria-hidden="true" />
                </Link>
              )}
              <Link className="btn btn-lg" to="/learn/">
                See all modules
              </Link>
            </div>
            <ul className="hero-points">
              <li>
                <Check className="icon" aria-hidden="true" /> No account, no ads
              </li>
              <li>
                <Check className="icon" aria-hidden="true" /> Works on phones
              </li>
              <li>
                <Check className="icon" aria-hidden="true" /> Works offline after one download
              </li>
            </ul>
          </div>
          <figure className="shot" aria-label="Example: a program that reads a name and greets it, with its tests passing">
            <div className="shot-bar">
              <span className="shot-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="shot-tab">Main.java</span>
            </div>
            <pre className="shot-code" tabIndex={0}>
              <code>{highlight(SAMPLE)}</code>
            </pre>
            <div className="shot-result">
              <span className="shot-pass">
                <Check className="icon" aria-hidden="true" /> All tests passed
              </span>
              <ul>
                <li>
                  <Check className="icon ic-good" aria-hidden="true" /> Input Ada prints Hello, Ada!
                </li>
                <li>
                  <Check className="icon ic-good" aria-hidden="true" /> Hidden test
                </li>
              </ul>
            </div>
          </figure>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <div className="card card-callout status-card">
            <h2 className="h3">Being built</h2>
            <p>
              Java Arena is new. {modules.length} of {plan.length} modules are online so far ({totalSteps} steps, {totalChallenges} challenges, and {drillCount} practice drills); the rest of the course is added in batches. <Link to="/learn/">The course page</Link> lists every planned module.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How it works</h2>
            <p className="section-lead">Read a short lesson, then solve three challenges on the same idea. Each challenge is checked the moment you press Check.</p>
          </div>
          <ol className="how">
            <li>
              <span className="how-icon" aria-hidden="true">
                <BookOpen className="icon" />
              </span>
              <h3>Read</h3>
              <p>A short explanation with example programs. Every example was compiled and run with a real JDK when the site was built, so the outputs shown are what Java really prints.</p>
            </li>
            <li>
              <span className="how-icon" aria-hidden="true">
                <ListChecks className="icon" />
              </span>
              <h3>Write</h3>
              <p>Fill in blanks, fix broken programs, or write whole programs. Tests compare your output with the expected output, including hidden tests with other inputs.</p>
            </li>
            <li>
              <span className="how-icon" aria-hidden="true">
                <Lightbulb className="icon" />
              </span>
              <h3>Learn from mistakes</h3>
              <p>Compiler errors and crashes come with a plain-English explanation of what they mean. Hints unlock one at a time, and a solution after a few tries.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section section-practice">
        <div className="container">
          <div className="section-head">
            <h2>Practice</h2>
            <p className="section-lead">Quick drills unlock as you finish the lessons, and the ones you miss come back more often until you know them.</p>
          </div>
          <div className="features">
            <Link className="feature" to="/deathmatch/">
              <span className="feature-icon" aria-hidden="true">
                <Crosshair className="icon" />
              </span>
              <h3>Deathmatch</h3>
              <p>Endless reps: predict the output, fill the blank, spot the bug, will it compile, and small programs to write. One miss ends a run, or play with three lives. Interview prep is open to everyone.</p>
            </Link>
            <Link className="feature" to="/daily/">
              <span className="feature-icon" aria-hidden="true">
                <CalendarCheck className="icon" />
              </span>
              <h3>Daily challenge</h3>
              <p>{dailyDone ? "Done for today. A new question comes at midnight." : "One question a day, the same for everyone. Answer it to keep your streak going."}</p>
            </Link>
            <Link className="feature" to="/placement/">
              <span className="feature-icon" aria-hidden="true">
                <Compass className="icon" />
              </span>
              <h3>Placement quiz</h3>
              <p>Already know some Java? One question per module shows where to start, and which modules you can skip.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <h2>Real Java, on your device</h2>
          </div>
          <div className="features">
            <div className="feature">
              <span className="feature-icon" aria-hidden="true">
                <Cpu className="icon" />
              </span>
              <h3>The real compiler</h3>
              <p>OpenJDK's javac 21, compiled to WebAssembly, with the real Java 21 class library. Error messages are the ones javac prints.</p>
            </div>
            <div className="feature">
              <span className="feature-icon" aria-hidden="true">
                <WifiOff className="icon" />
              </span>
              <h3>Offline after one download</h3>
              <p>The engine is about 15 MB, downloaded once and kept in your browser. On mobile data the site asks first.</p>
            </div>
            <div className="feature">
              <span className="feature-icon" aria-hidden="true">
                <Smartphone className="icon" />
              </span>
              <h3>Made for phones too</h3>
              <p>A row of symbol keys under the editor (with a key for System.out.println), and your progress saved in this browser.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container faq-wrap">
          <div className="section-head">
            <h2>Questions</h2>
          </div>
          <div className="faq">
            <details>
              <summary>Is this the University of Helsinki's course?</summary>
              <p>
                No. Java Arena follows the order and topics of their free <a href={MOOC_URL}>Java Programming MOOC</a> and credits it on every lesson, but it's an independent project with its own explanations and exercises. It isn't affiliated with or endorsed by the university, and it doesn't give MOOC credits or certificates.
              </p>
            </details>
            <details>
              <summary>Do I need to install anything?</summary>
              <p>No. A recent browser is enough: Chrome, Edge, Firefox or Safari. Some later modules will also have optional projects for your own computer.</p>
            </details>
            <details>
              <summary>Where is my progress saved?</summary>
              <p>In this browser only (its local storage). There's no account and nothing is sent to a server. Clearing the browser's site data removes it.</p>
            </details>
            <details>
              <summary>I found a mistake. What should I do?</summary>
              <p>Every challenge has a "Report a problem" link that opens a GitHub issue with your code filled in. Thank you!</p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
