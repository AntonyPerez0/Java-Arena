import { Link } from "react-router-dom";
import { course } from "../content";
import { MOOC_LICENSE_URL, MOOC_URL, REPO_URL } from "../lib/site";
import { useTitle } from "../lib/title";

const ext = <span className="visually-hidden"> (opens in a new tab)</span>;
const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
    {ext}
  </a>
);

export default function About() {
  useTitle("About and credits");
  return (
    <div className="narrow about md">
      <div className="page-head">
        <h1>About and credits</h1>
        <p className="lead">Java Arena is a free, non-commercial site for learning Java, with real compiling and running in the browser.</p>
      </div>

      <h2>The course it follows</h2>
      <p>
        The modules follow the order and topics of <A href={MOOC_URL}>Java Programming</A>, a free online course (MOOC) by Arto Hellas, Matti Luukkainen and contributors, made by the Agile Education Research group at the University of Helsinki. Its material is licensed under <A href={MOOC_LICENSE_URL}>Creative Commons BY-NC-SA 4.0</A>. The course's <A href={`${MOOC_URL}/credits`}>credits page</A> names everyone who made it, including its contributors and translators. Every lesson page names the MOOC sections it follows and links to them.
      </p>
      <p>
        Java Arena's explanations and exercises are written for this site; no exercise templates, tests or images are copied from the MOOC. Because the lessons follow the MOOC's structure, the lesson content is shared under the same license, CC BY-NC-SA 4.0. Java Arena is an independent project: it is not affiliated with, sponsored or endorsed by the University of Helsinki or MOOC.fi, and completing modules here doesn't earn MOOC credits.
      </p>

      <h2>How the Java engine works</h2>
      <p>
        When you press Check, your program is compiled by OpenJDK's javac 21, compiled to WebAssembly with <A href="https://github.com/konsoletyper/teavm-javac">teavm-javac</A> and TeaVM, and run by a patched copy of <A href="https://github.com/theseus-rs/ristretto">Ristretto</A>, a Java virtual machine written in Rust, with the OpenJDK 21 class library. Both run on your device; your code isn't sent anywhere.
      </p>
      <p>
        The expected outputs come from a real JDK ({course.jdk}) at build time, and every lesson program is run through the browser engine too, to check that both give the same result.
      </p>
      <p>
        The lessons on graphical user interfaces use Java Arena's practice version of JavaFX, written for this site (it isn't OpenJFX's code). It has only the classes and methods those lessons use. The page draws your window approximately, and each click or bit of typing runs your program again from the start with your earlier clicks and typing. A check, <code>npm run fx-check</code>, runs every model solution and example on real OpenJFX 21 too and confirms that they show the same window contents and print the same output. On your own computer, the same code runs with real JavaFX once JavaFX is installed, which the MOOC explains.
      </p>

      <h2>Privacy</h2>
      <p>No account, no ads, no analytics. Your progress and code are saved in this browser's storage only. The Java engine is kept in the browser's cache so it works offline.</p>

      <h2>Licenses</h2>
      <ul>
        <li>Lesson content (the files in <code>content/</code>): CC BY-NC-SA 4.0.</li>
        <li>
          The site's own code: MIT (<A href={`${REPO_URL}/blob/main/LICENSE`}>LICENSE</A>). It uses React, React Router, CodeMirror, marked and Lucide icons (MIT and ISC licenses) and the Inter and JetBrains Mono fonts (SIL Open Font License); <a href={import.meta.env.BASE_URL + "licenses/npm-packages.txt"}>their license texts</a>.
        </li>
        <li>
          The Java engine includes OpenJDK code under GPL 2.0 with the Classpath Exception, and other open-source parts under their own licenses. Details, sources and the written offer: <A href={`${REPO_URL}/blob/main/THIRD_PARTY_NOTICES.md`}>third-party notices</A> and <A href={`${REPO_URL}/blob/main/engine/SOURCES.md`}>engine sources</A>. The license texts are also published with the engine files, for example <a href={import.meta.env.BASE_URL + "engine/licenses/compiler/OpenJDK-LICENSE.txt"}>OpenJDK's license</a> and <a href={import.meta.env.BASE_URL + "engine/licenses/runner/THIRD_PARTY_LICENSES.txt"}>the runner's third-party licenses</a>.
        </li>
        <li>
          The unit testing lessons run <A href="https://github.com/junit-team/junit4">JUnit</A> 4.13.2 (Eclipse Public License 1.0, <a href={import.meta.env.BASE_URL + "engine/licenses/libraries/JUnit-4.13.2-LICENSE.txt"}>license</a>; its source code is at the JUnit link) with <A href="https://github.com/hamcrest/JavaHamcrest">Hamcrest</A> Core 1.3 (BSD, <a href={import.meta.env.BASE_URL + "engine/licenses/libraries/Hamcrest-Core-1.3-LICENSE.txt"}>license</a>), unchanged. They're downloaded only when a program uses JUnit.
        </li>
      </ul>
      <p>Java, JavaFX and OpenJDK are trademarks or registered trademarks of Oracle and/or its affiliates.</p>

      <h2>Source and problems</h2>
      <p>
        The source is on <A href={REPO_URL}>GitHub</A>. Found a mistake? Every challenge has a "Report a problem" link, or <A href={`${REPO_URL}/issues/new`}>open an issue</A>. Settings for the theme, text size and the engine download are on the <Link to="/settings/">settings page</Link>.
      </p>
    </div>
  );
}
