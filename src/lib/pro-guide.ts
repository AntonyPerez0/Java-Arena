// The Pro Track page's text (/pro/): the same in the app (src/pages/ProTrack.tsx) and in the
// pre-rendered page (scripts/prerender.mjs), so the two never differ. Every link in it leaves the
// site; commands are drawn as the lessons draw them (src/components/code-blocks.ts).
import { readOnlyBlockHtml } from "../components/code-blocks.ts";

/** The first paragraph: what the Pro Track is. */
export const PRO_LEAD =
  "Projects for your own computer, built with the tools Java programmers use every day: a JDK 21, Maven and JUnit 5 tests. Each one is a few hours of work, for after the course.";

/** What the site does and doesn't do with them, said plainly. */
export const PRO_HONEST =
  "These projects run on your computer, not on this site. Java Arena can't see your code or your test results and doesn't grade anything: the project's tests tell you when it works. The checklist on each project's page is yours to tick.";

const ext = (href: string, text: string) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}<span class="visually-hidden"> (opens in a new tab)</span></a>`;
// Code boxes can scroll sideways on a phone, so they take the keyboard focus (as in lessons).
const shell = (text: string) => (readOnlyBlockHtml("shell", text) ?? "").replace("<pre>", '<pre tabindex="0">');

/** The guide: what you need, setting up the computer, and putting a project on GitHub. Headings start at h2. */
export const PRO_GUIDE_HTML = `<h2>What you need</h2>
<ul>
<li>A computer with Windows, macOS or Linux. A phone or a tablet isn't enough for these projects: you write and run them on the computer.</li>
<li>A JDK 21 (the Java Development Kit: the compiler and the Java virtual machine).</li>
<li>Maven, which downloads the libraries a project uses (such as JUnit) and runs its tests. IntelliJ IDEA, Eclipse and NetBeans have Maven built in; VS Code needs Maven installed to run Maven's commands.</li>
</ul>
<h2>Set up your computer</h2>
<ol>
<li>Install a JDK 21. Eclipse Temurin is free: on ${ext("https://adoptium.net/temurin/releases/?version=21", "adoptium.net")}, choose version 21 and your system, and run the installer (for Windows and macOS). On Linux, use your package manager (on Ubuntu 22.04 or newer, <code>sudo apt install openjdk-21-jdk</code>; on Fedora, <code>sudo dnf install java-21-openjdk-devel</code>), or unpack the <code>.tar.gz</code> from adoptium.net and add its <code>bin</code> folder to your PATH.</li>
<li>Install Maven: download it from ${ext("https://maven.apache.org/download.cgi", "maven.apache.org")} and follow its ${ext("https://maven.apache.org/install.html", "installation steps")} (unzip it and add its <code>bin</code> folder to your PATH), as you do on Windows. On macOS with Homebrew, <code>brew install maven</code> does it; on Ubuntu, <code>sudo apt install maven</code>. Or skip this step and use an IDE that has Maven built in.</li>
<li>Check both in a terminal (Command Prompt or PowerShell on Windows, Terminal on macOS and Linux). Each prints its version: Java should say 21, and Maven should name Java 21 too. If Maven names another Java (a package manager's Maven can bring its own), set <code>JAVA_HOME</code> to your JDK 21's folder. If you skipped step 2 and use an IDE's Maven, <code>mvn</code> isn't on your PATH: check only <code>java -version</code>, and run the tests from the IDE.
${shell("java -version\nmvn -version")}</li>
<li>Download a project's zip from its page, unzip it, and run its tests in the project's folder. The first run downloads JUnit and Maven's plugins, so it needs a connection and takes a minute or two. The tests fail at first: they are your to-do list.
${shell("cd PROJECT-FOLDER\nmvn test")}</li>
</ol>
<p>In an IDE, open the project's folder (or its <code>pom.xml</code>) as a project, and run the tests from the IDE's Maven panel or by right-clicking the <code>src/test/java</code> folder.</p>
<h2>Put a project on GitHub (optional)</h2>
<p>Each project has a GitHub Actions workflow (<code>.github/workflows/test.yml</code>): in your own GitHub repository, GitHub runs the tests on its computers every time you push. The results are in your repository, for you to see; Java Arena never sees them.</p>
<ol>
<li>Sign in to ${ext("https://github.com", "GitHub")} (an account is free) and create a new repository, public or private, without a README.</li>
<li>Put the project's files in it, with Git or in the browser:
<ul>
<li><strong>With Git</strong> on your computer, in the project's folder:
${shell('git init\ngit add .\ngit commit -m "Start the project"\ngit branch -M main\ngit remote add origin https://github.com/YOUR-NAME/YOUR-REPOSITORY.git\ngit push -u origin main')}
You need Git for this: get it from ${ext("https://git-scm.com/downloads", "git-scm.com")} or your package manager. The first time, tell it your name and email, or <code>git commit</code> stops with "Author identity unknown":
${shell('git config --global user.name "Your Name"\ngit config --global user.email you@example.com')}
The first <code>git push</code> asks you to sign in, and GitHub doesn't accept your account password there. Git for Windows opens a browser window to sign you in. On macOS and Linux, sign in first with ${ext("https://cli.github.com", "GitHub CLI")} (<code>gh auth login</code>), or paste a personal access token when Git asks for the password. ${ext("https://desktop.github.com", "GitHub Desktop")} signs you in for you, too.
</li>
<li><strong>In the browser</strong>: on the new repository's page, choose <strong>uploading an existing file</strong>, drag in everything inside the unzipped folder, then <strong>Commit changes</strong>. Don't upload <code>target/</code>. Check that the <code>.github</code> folder comes too: some file browsers hide folders whose names start with a dot (on macOS, Cmd+Shift+. in Finder shows them; on Linux, Ctrl+H in most file managers). Later uploads, once the repository has files, go through <strong>Add file</strong>, then <strong>Upload files</strong>.</li>
</ul></li>
<li>Open the repository's <strong>Actions</strong> tab. The workflow <strong>Tests</strong> runs <code>mvn -B test</code>: a red cross means some tests fail (open the run to see which), a green check means they all pass. Each push runs it again.</li>
</ol>
<p>On a phone, github.com in the browser and the GitHub mobile app both show your repository, its code and the Actions tab with each run's result. You can even fix a small thing in github.com's editor on the phone; the commit runs the tests again. Writing the project and running <code>mvn test</code> yourself need the computer.</p>`;
