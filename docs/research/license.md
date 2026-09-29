# Licensing research: a free, non-commercial Java learning site that follows the Helsinki "Java Programming" MOOC

Prepared 2026-09-28 by the license research agent. Research only; this is not legal advice. Every factual claim below cites a file path, repository path at a named commit, or URL. Where a web page was blocked in this environment, the claim is marked "(WebSearch snippet)" and should be treated as reported, not directly read.

Scratch files for this report: `/home/user/ref/research/license-agent/` (cloned repos under `clones/`, CC and SPDX license texts, `used-images.txt`).

---

## 0. Summary

| Question | Answer (short) |
|---|---|
| MOOC course material | CC BY-NC-SA 4.0 ("The course material is licensed under a Creative Commons BY-NC-SA 4.0 license"). Source: `/home/user/ref/java-programming/README.md` (section "Course material") and `data/credits.md` line 47, repo `rage/java-programming` at commit `28541c8` (2025-06-05). |
| MOOC website code ("material template") | Apache License 2.0, "Copyright 2018 Henrik Nygren, Antti Leinonen, and the Agile Education Research group". Source: same README, section "Material template". Not needed by the new site. |
| Exercise templates, tests, model solutions (TMC) | No license found anywhere. Not in the material repo, no LICENSE or header in any of 560 test files in 3 public student copies, no official public exercise repository found. Default copyright applies: do not copy them. |
| Third-party media | Part 14 uses a CC BY 2.0 photo (Linda Tanner), two CC BY 3.0 sounds (Daniel Simion, Yannick Lemieux) and a Mona Lisa image; part 4 uses a house photo and a blueprint with no stated source; 10 YouTube videos have no stated license. Do not reuse; make or pick your own. |
| Is a site that follows the same order and topics "Adapted Material"? | Ideas, facts and a generic topic order are not protected. Paraphrased text, reused examples, reused exercise scenarios and sample outputs, or a mirror of the detailed section and exercise structure very likely are. Conservative choice: treat all lesson content as Adapted Material and license it CC BY-NC-SA 4.0 with attribution on every lesson page. |
| Site code | Can be MIT (separate work); keep content in separate files with its own license file. |
| Non-commercial | No ads, paid tiers, paid certificates, paid sponsorship placements, affiliate links or selling copies. Donation links are a gray area; conservative choice is none on lesson pages. |
| Trademarks | Do not use University of Helsinki or MOOC.fi logos, do not say "official". Use "adapted from" / "based on" plus a non-affiliation line. Also note Oracle's guideline against using "Java" as part of a product name or domain (relevant to the name "Java Arena"). |
| Runtimes | CheerpJ: proprietary Community License (free for individuals and FOSS, must load from Leaning Technologies' CDN, no self-hosting, "give appropriate credits"). TeaVM: Apache 2.0 plus NOTICE. OpenJDK javac: GPLv2 with Classpath Exception, source must be offered if its compiled form is redistributed. JUnit 4: EPL 1.0; JUnit 5: EPL 2.0. TMC edu-test-utils: LGPL 3.0 (do not bundle). |
| cpp-arena | No LICENSE file, `package.json` has `"private": true` and no `license` field. Default "all rights reserved". The same owner can reuse his own code freely; third-party parts keep their own licenses. |

---

## 1. License of the MOOC course material

### 1.1 What the repository states

Repository: `https://github.com/rage/java-programming`, local clone `/home/user/ref/java-programming`, commit `28541c8fcc6c6116c03b7cb0e065a932eb399ac0` (2025-06-05, "Removed email from possible support."). The clone has no `LICENSE` file (checked with `find . -iname 'license*'`); the licensing is stated in the README only.

`README.md`, section "# License":

- "## Material template": "Copyright 2018 Henrik Nygren, Antti Leinonen, and the Agile Education Research group. Licensed under the Apache License, Version 2.0". The README defines the repository as "the source code of this course's webpage and the source for the content of the course. The content is located in the `data` folder and everything else is for the website." So Apache 2.0 covers the Gatsby website code (everything outside `data/`).
- "## Course material": "The course material is licensed under a Creative Commons BY-NC-SA 4.0 license" (link to `https://creativecommons.org/licenses/by-nc-sa/4.0/deed`). This covers the content in `data/`.

Note: several WebSearch summaries during this research described the whole repo as "licensed under the Apache License, Version 2.0". That is a misreading; Apache 2.0 applies only to the material template (website code).

`data/credits.md` (served at `/credits`):

- "The course was made by the Agile Education Research -group" (link `https://www.helsinki.fi/en/researchgroups/data-driven-education`).
- "The course material was written by Arto Hellas (né Vihavainen) and Matti Luukkainen."
- Contributors (alphabetical, 13): Antti Laaksonen, Antti Leinonen, Henrik Nygren, Joel Kaasinen, Juhana Laurinharju, Juho Leinonen, Martin Pärtel, Matti Paksula, Mikael Nousiainen, Nea Pirttinen, Pekka Mikkola, Reetta Puska, Vilma Kangas.
- Translation (alphabetical, 11): Ava Heinonen, Daniel Koch, Elias Eskelinen, Henrik Nygren (Coordinator), Jesper Kuutti, Jesper Pettersson, Joel Hassan, Kaius Koivunen, Kalle Belmo, Reetta Puska, Tero Tapio.
- Line 47: "The course material is licensed under a Creative Commons BY-NC-SA 4.0-license." (link points to the Finnish deed, `.../by-nc-sa/4.0/deed.fi`).
- "The course page has been made by Henrik Nygren and Antti Leinonen." and "The automatic programming assignment assessment tool "Test My Code" (or TMC) has been created by the Agile Education Research group at University of Helsinki."

Site footer, `src/components/Footer.js` and `src/locales/common/en.json`: no license text in the footer. It shows "Source code of the material" (link to the GitHub repo), "This course is created by the Agile Education Research -research group of the University of Helsinki", a link "Credits and about the material" to `/credits`, social links, and two logos: `src/images/uh-logo.png` (alt "Helsingin yliopisto") and `src/images/moocfi-logo-bw.png` (alt "MOOC.fi").

`course-metadata.json` (schema.org): "provider": MOOC.fi; "publisher": University of Helsinki; "isAccessibleForFree": true.

`data/index.md` line 11: "this is a *legacy course*. It is no longer possible to gain ECTS credits for completing the course. The course content is also no longer updated or maintained."

### 1.2 Live site and MOOC.fi statements

- java-programming.mooc.fi is blocked here. WebSearch snippet for `https://java-programming.mooc.fi/credits/`: "The course material is licensed under a Creative Commons BY-NC-SA 4.0-license. The course page has been made by Henrik Nygren and Antti Leinonen." This matches the repo.
- MOOC.fi teacher guide (`https://www.mooc.fi/en/teacher-guide/`, blocked; text read from its source): `https://raw.githubusercontent.com/rage/mooc.fi/master/frontend/translations/teachers/en.ts` says: "You can utilize most of our materials freely. Most of them are licensed with a [Creative Commons BY-NC-SA] -license, but check the course materials for confirmation. Creative Commons BY-NC-SA -licence means that you can use the materials either as is or modify them to better suit your teaching purposes as long as you preserve the information of the original creators in the materials, and the usage is non-commercial." The link is to `https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en` (`frontend/pages/_old/teacher-guide.tsx` in the same repo). The same wording is in `rage/old.mooc.fi` `src/pages/TeacherGuide.js` (commit `5db5739`, 2019-07-03).
- The same teacher guide text says model solutions are withheld until an organization is verified: "you won't see the model solutions for exercises until we have verified your organization. This arrangement is meant to stop cheating in the exercises" (`teachers/en.ts`, key `howtoNB`).

### 1.3 Exactly what is licensed under what

| Item | License | Evidence |
|---|---|---|
| Lesson text, headings, text boxes, sample outputs, code examples shown on the pages, exercise descriptions shown on the pages, diagrams and drawings made for the course, the two PDF slideshows embedded in parts 6 and 7 (`data/slideshows/test-driven-development.pdf`, `binary_search.pdf`) | CC BY-NC-SA 4.0 | README "Course material"; `data/credits.md` l.47; content lives in `data/` |
| Website code (Gatsby, React components, plugins) | Apache 2.0, (c) 2018 Nygren, Leinonen, Agile Education Research group | README "Material template" |
| Quiz content (66 `<quiz id="...">` embeds in `data/part-*`) | Not stated. The quiz text is not in the repo; it is loaded by id from the MOOC.fi quizzes service (`course-settings.js` `quizzesId`). | grep of `data/part-*/*.md` |
| TMC exercise projects (starter code files, `pom.xml`, JUnit tests, hidden tests, model solutions) | Not stated (see section 2) | section 2 |
| Embedded YouTube videos | Not stated | section 3 |
| Third-party images and sounds | Their own licenses (CC BY 2.0, CC BY 3.0, public domain, unknown) | section 3 |
| University of Helsinki and MOOC.fi names and logos | Not licensed (trademark and patent rights are excluded by CC BY-NC-SA 4.0 Section 2(b)(2)) | legal code, section 4 |

### 1.4 Licensor and credit holders

- The material does not name a licensor and supplies no copyright notice (no "Copyright ..." line) for the course material; the only copyright line in the repo is for the material template. So Section 3(a)(1)(A)(ii) "a copyright notice" has nothing to retain; attribution rests on the creator identification, the license notice and the link.
- Credit holders named by the material: authors Arto Hellas and Matti Luukkainen; 13 contributors; 11 translators (coordinator Henrik Nygren); "made by" the Agile Education Research group; University of Helsinki (footer; `course-metadata.json` publisher).
- Who owns the copyright is not stated. University of Helsinki teaching instructions say "As a rule, teachers own the rights to the learning materials they routinely prepare" (`https://teaching.helsinki.fi/instructions/article/copyrights-and-openness-teaching-materials`, WebSearch snippet), but agreements for MOOC material may differ. Unverified. Practical consequence: credit the authors, contributors, translators, the research group and the University, and do not state who owns the copyright.

---

## 2. License of the exercise templates and tests (TMC)

### 2.1 Where they come from

The material refers to an "exercise template" / "exercise base" that students download and submit through TMC (for example `data/part-1/1-starting-programming.md`, exercise `part01-Part01_01.Sandbox`; `data/part-14/2-multimedia-in-programs.md` "included in the exercise base"). The TMC course is on `tmc.mooc.fi` (WebSearch lists `https://tmc.mooc.fi/org/mooc/courses/600` "Java Programming I - TestMyCode"). `tmc.mooc.fi` and `maven.mooc.fi` are blocked or unreachable here, so the server-side course repositories could not be inspected.

### 2.2 Search for an official repository and a license

- `api.github.com/orgs/rage/repos` and the other org and search REST endpoints were refused in this session ("This GitHub API path is not available: sessions are bound to their configured repositories"). I used the GitHub MCP search tools and `git clone` instead.
- GitHub repository search `org:rage java` returns only `rage/java-programming` and `rage/java-programming-fall-19`; `org:rage tmc` returns tooling only (tmc-vscode, tmc-langs-rust, tmc-cli-rust, tmc-sandbox-images, tmc-web-client, tmc-snapshot-api, tmc-eclipse, tmc-core-abandoned, tmc-csharp-testcourse); `org:rage exercises OR tehtavat` returns only `rage/parqu`. `org:testmycode` returns 33 repos, all tooling or test fixtures.
- Code search `"Part01_01.Sandbox" org:rage` finds only the material markdown (`rage/java-programming`, `rage/java-programming-fall-19`, `rage/programming-f20`) and test code in `rage/tmc-langs-rust`.
- Result: no official public repository of the Java MOOC exercise templates or tests was found.

### 2.3 What the uploaded copies show

Three public student repositories that contain the downloaded templates were cloned and inspected:

| Repo (commit) | `src/test` Java files | Files with a license or copyright header in `src/test` | LICENSE file |
|---|---|---|---|
| `cardouken/mooc2020` (`88483bd`) | 268 | 0 | none |
| `chadwyck242/mooc.fi_java_programming_2020` (`9b72aab`) | 188 | 0 | none |
| `rwu8/mooc-java-programming-ii` (`2a70785`) | 104 | 0 | none |

Search terms: `copyright|licen[cs]e|all rights reserved|creative commons|SPDX`. The only "license" hits were the NetBeans placeholder "To change this license header, choose License Headers in Project Properties." in some `src/main` files and the `LicensePlate` exercise class names. A typical template (`rwu8/mooc-java-programming-ii/part08-Part08_01.Cubes`) has `pom.xml` (groupId `tkt`, dependencies `junit:junit:4.12` and `fi.helsinki.cs.tmc:edu-test-utils:0.4.2`, repository `https://maven.mooc.fi/releases`), `.tmcproject.yml`, `src/main/java/Cubes.java` and `src/test/java/CubestTest.java` (uses `MockStdio`, `@Points("08-01")`), with no header.

One official test appears as a fixture in a licensed repo: `rage/tmc-langs-rust` (MIT OR Apache-2.0, "Copyright (c) 2020 University of Helsinki", commit `20aa4fa`) contains `crates/tmc-langs-plugins/tests/data/zip/exercise-name/src/test/java/AdaLovelaceTest.java`. Code search also shows `rage/tmc-sandbox-images` `tmc-langs-rust/maven-template/src/test/java/AdaLovelaceTest.java` (not inspected). A single fixture in a tooling repo does not license the exercise set.

### 2.4 Conclusion for templates and tests

No license is stated for the Java MOOC exercise templates, tests, hidden tests or model solutions. The CC BY-NC-SA statement in the README covers "the course material" whose content is in `data/`; the TMC projects are not in that folder and carry no notice, and MOOC.fi deliberately restricts access to model solutions (section 1.2). Consequence: default copyright applies (all rights reserved by whoever holds them). The hundreds of student uploads on GitHub do not grant any permission. Do not copy the template projects, the JUnit tests, the hidden tests or the model solutions, and do not reproduce their test data. Write your own starter code and tests.

Exception worth using: starter code and sample outputs that are printed on the material pages themselves (for example the boilerplate shown in `data/part-1/2-printing.md` for "Ada Lovelace") are part of the CC BY-NC-SA material and may be adapted with attribution.

### 2.5 TMC tooling licenses (tests import these)

| Repo (commit, date) | License | Evidence |
|---|---|---|
| `testmycode/tmc-junit-runner` (`7ed6ff3`, 2020-06-10) | "GNU Lesser General Public License" (no version number; URL `http://www.gnu.org/licenses/lgpl.html`); no LICENSE file | `pom.xml` `<licenses>` |
| `testmycode/edu-test-utils` (`7c5e371`, 2018-12-15) | LGPL 3.0 | `LICENSE.txt` (GNU LGPL Version 3, 29 June 2007) and `pom.xml` |
| `testmycode/tmc-langs` (`6808020`, 2020-12-03) | GPL 2.0 | `pom.xml` `<licenses>` "GNU General Public License, version 2" |
| `rage/tmc-langs-rust` (`20aa4fa`, 2026-09-15) | MIT OR Apache-2.0, (c) 2020 University of Helsinki | `LICENSE-MIT`, `LICENSE-APACHE`, `Cargo.toml` |
| `testmycode/tmc-check` (`7d9ebd1`, 2014-10-12) | none found | no LICENSE, no header, no license in README |
| `testmycode/tmc-server` (`f831c3e`, 2026-09-17) | GPL 2.0 | `LICENSE`, README "## License ## GPLv2" |
| `testmycode/tmc-netbeans` (`6530421`) | GPL 2.0 | `LICENSE`, README |
| `rage/tmc-vscode` (`7d0fc74`) | MIT, (c) 2020 University of Helsinki | `LICENSE`, `package.json` |
| `testmycode/tmc-intellij` (`21727e7`) | MIT, (c) 2016 Tuomo Oila et al. | `LICENSE` |
| `rage/tmc-cli-rust` (`2e194ff`) | Apache 2.0 | `LICENSE`, `Cargo.toml` |
| `testmycode/tmc-core`, `tmc-maven-plugin`, `tmc-testcourse`, `tmc-course-template` | none found | no LICENSE, no `<licenses>` in pom |

Implication: the new site should not bundle `edu-test-utils` (LGPL 3.0) or `tmc-junit-runner` (LGPL) in the browser. Writing a small stdin/stdout capture and assertion helper is simpler and avoids LGPL obligations.

---

## 3. Third-party images and media inside the material

Inventory: `data/img` is 50 MB and 299 files (`du -sh`, `find`); 146 distinct image paths are referenced from `data/part-*/*.md` (list in `license-agent/used-images.txt`, includes commented-out lines).

| Media | Where | Stated license and source | Recommendation |
|---|---|---|---|
| Hummingbird photo by Linda Tanner | `data/part-14/2-multimedia-in-programs.md` l.163; screenshots `img/material/image-ja-imageview.png`, `humming-kaannetty.png` | "Creative Commons CC BY 2.0", via `freestockphotos.biz/stockphoto/17874`, author link `flickr.com/photos/15323831@N05` | Do not reuse; if used, attribute per CC BY 2.0. Better: your own or CC0 image. |
| Mona Lisa image | part 14 exercise "Collage" (`part14-Part14_07.Collage/monalisa.png` in `rwu8/mooc-java-programming-ii`); `img/kollaasi-monalisa*.png` | "downloaded from ... commons.wikimedia.org/wiki/Category:Mona_Lisa. It can be used freely." (exact file not identified) | Painting is in the public domain; in the EU, faithful reproductions of public-domain visual art are not protected (Directive (EU) 2019/790 Art. 14, WebSearch snippet of `eur-lex.europa.eu/eli/dir/2019/790/oj`). Still pick and record your own specific Commons file. |
| "Front desk bells" sound | part 14 l.316-323, `img/front-desk-bells-daniel_simon.wav` | "Creative Commons Attribution 3.0", from soundbible.com. The English text says "Daniel Simionin" (a Finnish genitive left untranslated); SoundBible lists the author as Daniel Simion (WebSearch snippet, `soundbible.com/2190-Front-Desk-Bell.html`) | Do not reuse without CC BY 3.0 attribution; prefer CC0 sounds. |
| Applause sound by Yannick Lemieux | exercise "Hurray" (`part14-Part14_08.Hurray/Applause-Yannick_Lemieux.wav`, seen in `rwu8/mooc-java-programming-ii`) | "Creative Commons attribution license ... by/3.0" (l.374-376) | Same as above. |
| Detached house photo and blueprint ("rintamamiestalo") | `data/part-4/1-introduction-to-object-oriented-programming.md` l.93 and l.99 | No source or license stated. EXIF: photo from a Canon PowerShot A620 dated 2019:01:17; blueprint edited in Adobe Photoshop CS2 dated 2007:12:14 | Provenance unknown: do not reuse. |
| `img/et_phone_home.wav` | not referenced by any page | none | Do not use. |
| YouTube videos | 11 visible embeds, 10 distinct ids, parts 1 to 5 (e.g. `zvE8XA8D0gE`, titled "Ohjelmoinnin MOOC 2019: Ohjelmoinnin aloittaminen" per WebSearch) | Not stated | Link or use YouTube's embed player only; do not download or re-host; do not label them CC. |
| Data from Wikipedia and rankings (Nordic populations, Shanghai ranking) | part 14 | Facts | Facts are free to use; cite the source. |
| Links to Wikipedia articles | many parts | Links only | No license issue. |

Mixing CC BY 2.0 / 3.0 media into a CC BY-NC-SA site is possible as a collection with each item attributed, but the simplest path is to create new media or use CC0 media.

---

## 4. What CC BY-NC-SA 4.0 requires in practice

Legal code text used: SPDX copy of the official text, `https://raw.githubusercontent.com/spdx/license-list-data/main/text/CC-BY-NC-SA-4.0.txt` (saved as `license-agent/CC-BY-NC-SA-4.0.txt`; creativecommons.org is blocked here). Official URL to link from the site: `https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.en`.

### 4.1 The grant and its limits

- Section 2(a)(1): you may "(A) reproduce and Share the Licensed Material, in whole or in part, for NonCommercial purposes only; and (B) produce, reproduce, and Share Adapted Material for NonCommercial purposes only."
- Section 2(a)(4): format and medium changes "never produce Adapted Material" (so moving content from Gatsby markdown to another site format is not by itself an adaptation).
- Section 2(b)(1): moral rights are not licensed, but waived "to the limited extent necessary". Section 2(b)(2): "Patent and trademark rights are not licensed".
- Section 8(a): the license does not restrict uses that "could lawfully be made without permission" (for example using unprotected ideas and facts).

### 4.2 Attribution, Section 3(a)

Section 3(a)(1): if you Share the Licensed Material (including in modified form) you must:

- (A) retain, **if supplied by the Licensor**: (i) identification of the creator(s) and others designated to receive attribution; (ii) a copyright notice; (iii) a notice that refers to this Public License; (iv) a notice that refers to the disclaimer of warranties; (v) a URI or hyperlink to the Licensed Material "to the extent reasonably practicable";
- (B) indicate if you modified the Licensed Material and retain an indication of any previous modifications (the English material is itself a translation credited to its translators, so keep that credit);
- (C) indicate the material is licensed under CC BY-NC-SA 4.0 and include the text of, or a URI or hyperlink to, the license.

What the MOOC supplies: creator identification (credits page), a license notice (README and credits), and URIs (site and repo). It supplies no copyright notice and no disclaimer notice for the material. Retaining what is supplied is mandatory; adding "provided as is, see Section 5 of the license" is harmless and recommended.

Section 3(a)(2): conditions may be met "in any reasonable manner based on the medium, means, and context", for example a link to a page with the full information (so a short per-page line plus a full `/credits` page is fine). Section 3(a)(3): if the licensor asks, remove attribution information to the extent reasonably practicable.

CC's recommended practice is TASL: Title, Author, Source, License (`https://wiki.creativecommons.org/wiki/Recommended_practices_for_attribution`, WebSearch snippet), and for derivatives a line like "This work, X, is a derivative of Y by Z, used under CC BY. X is licensed under CC BY by [you]" (CC FAQ via WebSearch snippet).

### 4.3 NonCommercial, Section 1(k)

"NonCommercial means not primarily intended for or directed towards commercial advantage or monetary compensation." The word "primarily" matters: CC says the test is the primary purpose of the use, not the identity of the user, and that CC does not list specific permitted or prohibited uses and "cannot advise you on what is and is not commercial use" (`https://wiki.creativecommons.org/wiki/NonCommercial_interpretation`, WebSearch snippet).

### 4.4 ShareAlike, Section 3(b)

If you Share Adapted Material you produce:

1. "The Adapter's License You apply must be a Creative Commons license with the same License Elements, this version or later, or a BY-NC-SA Compatible License." Correction to the task brief: this is not "BY-SA-compatible". The compatible-license list is per license, and CC's compatible licenses page reports that no license has been designated as compatible with BY-NC-SA 4.0 (`https://creativecommons.org/compatible-licenses/`, WebSearch snippet). In practice the adapted lessons must be CC BY-NC-SA 4.0 (or a later BY-NC-SA version). CC BY-SA 4.0, CC BY-NC 4.0 or MIT are not allowed for adapted lesson content.
2. You must include the text of, or a link to, the Adapter's License.
3. You may not impose additional terms or apply Effective Technological Measures that restrict the rights under the Adapter's License.

The Adapter's License applies to the adapter's own contributions; the original material stays under the original license (`https://wiki.creativecommons.org/wiki/4.0/Treatment_of_adaptations`, WebSearch snippet).

### 4.5 No additional restrictions or technological measures

Section 2(a)(5)(C) (Licensed Material) and Section 3(b)(3) (Adapted Material). In practice: keep lesson pages readable without login or payment; no DRM or copy-blocking scripts on lesson text; no site terms of service that forbid copying or reusing lesson content (if the site has terms, carve the lesson content out and point to CC BY-NC-SA 4.0). Publishing the lesson source files in the public repo makes compliance obvious.

### 4.6 No endorsement, Section 2(a)(6)

"Nothing in this Public License constitutes or may be construed as permission to assert or imply that You are, or that Your use of the Licensed Material is, connected with, or sponsored, endorsed, or granted official status by, the Licensor or others designated to receive attribution". Naming the authors and the University in the credit line is required and fine; implying affiliation or official status is not.

### 4.7 Termination, Section 6

Rights end automatically on breach and are reinstated automatically if the breach is cured within 30 days of discovering it (Section 6(a), 6(b)(1)).

### 4.8 When is a new site "Adapted Material"?

Definition, Section 1(a): material "derived from or based upon the Licensed Material and in which the Licensed Material is translated, altered, arranged, transformed, or otherwise modified in a manner requiring permission under the Copyright and Similar Rights held by the Licensor."

The key phrase is "in a manner requiring permission". If nothing protected is taken, the license is not triggered at all.

Not protected (free to use without the license):

- Ideas, concepts, methods and facts: "Copyright protection shall extend to expressions and not to ideas, procedures, methods of operation or mathematical concepts as such" (TRIPS Art. 9(2), `https://www.wto.org/english/docs_e/legal_e/27-trips_04_e.htm`, WebSearch snippet); US 17 U.S.C. 102(b) (`https://www.law.cornell.edu/uscode/text/17/102`, WebSearch snippet). Java syntax, what a loop is, binary search, how `equals`/`hashCode` work, and "teach printing before variables before loops" are all ideas or methods.
- Facts and data (Feist v. Rural, 499 U.S. 340 (1991), `https://supreme.justia.com/cases/federal/us/499/340/`, WebSearch snippet).
- Individual short names and titles, in US law (37 CFR 202.1(a), "words and short phrases such as names, titles, and slogans", `https://www.ecfr.gov/current/title-37/chapter-II/subchapter-A/part-202/section-202.1`, WebSearch snippet). EU law is stricter: under Infopaq (C-5/08) even an 11-word extract can be protected if it expresses the author's own intellectual creation (WebSearch snippet, `https://en.wikipedia.org/wiki/Infopaq_International_A/S_v_Danske_Dagblades_Forening`). The licensors are in Finland, so assume the EU standard.

Protected (taking it requires the license):

- The prose, examples, example programs, sample outputs, exercise descriptions and their specific scenarios, diagrams, and the slideshows.
- Selection and arrangement, where original: collections that "by reason of the selection and arrangement of their contents, constitute intellectual creations shall be protected as such" (Berne Convention Art. 2(5), `https://www.wipo.int/wipolex/en/text/283698`, WebSearch snippet); Feist likewise protects original selection and arrangement of facts; EU originality is "author's own intellectual creation" (Infopaq).

Applied to this project:

| Approach | Adapted Material? |
|---|---|
| Own prose and own examples; a generic beginner topic order (printing, input, variables, conditionals, loops, methods, lists, arrays, strings, classes, ...) that many textbooks share; own exercises with different scenarios; own tests | Most likely not. The generic order of standard topics is close to an unprotectable idea or teaching method. Attribution is then a courtesy, not an obligation. |
| Paraphrasing MOOC sections sentence by sentence, translating, or rewriting while keeping the same explanations and examples | Yes ("altered", "transformed", "translated"). |
| Reusing MOOC exercise scenarios (e.g. the same "LiquidContainers", "PaymentCard", "Asteroids" specs), their sample inputs and outputs, or example programs | Very likely yes. |
| Mirroring the detailed structure: the same 14 parts, the same section breakdown and headings, and the same 262 visible exercises in the same order (the plan in `/home/user/ref/mooc-outline.txt` lists exactly these) | Plausibly yes, as an arrangement of the MOOC's selection, even with rewritten text. Not settled; a court would decide on the facts. |

Conservative recommendation: because the brief is to follow the MOOC's order and topics section by section, treat all lesson content (lesson text, exercise statements, starter code, tests, solutions, quizzes written for the site) as Adapted Material of the MOOC. Then:

1. License all lesson content CC BY-NC-SA 4.0.
2. Put an "adapted from" attribution on every lesson page, with a link to the matching MOOC section, and a full `/credits` page.
3. Keep the site non-commercial.
4. Still write everything fresh: own wording, own examples and own exercise scenarios where practical. This lowers the risk if anything is ever disputed and keeps the site honest about what it adds.
5. Never copy TMC templates, tests, hidden tests, model solutions, quiz text or third-party media (none of these are covered, see sections 2 and 3).

Cost of this choice: the owner cannot later sell or monetize the adapted lesson content, or relicense it permissively, without replacing the MOOC-derived parts or getting permission from the rights holders. Purely original parts remain the owner's, but separating them later is hard, so decide this up front.

### 4.9 Licensing site code separately from lesson content

- CC recommends against CC licenses for software and suggests software licenses (FSF or OSI) instead; CC licenses are fine for documentation and non-code assets (CC FAQ, `https://creativecommons.org/faq/`, WebSearch snippet). So: site code under MIT (SPDX `MIT`, text at `https://raw.githubusercontent.com/spdx/license-list-data/main/text/MIT.txt`), lesson content under CC BY-NC-SA 4.0 (SPDX `CC-BY-NC-SA-4.0`).
- The app code (UI, editor, runner, grader, build scripts) is not derived from the MOOC text, so it is not Adapted Material. When the build bundles lesson content with the app, that is a collection; ShareAlike does not extend to independent works in a collection (CC certificate course, "Remixing CC-licensed work", `https://creativecommons.org/course/cc-cert-edu/unit-4-using-cc-licenses-and-cc-licensed-works/4-4-remixing-cc-licensed-work/`, WebSearch snippet).
- How to make the boundary clear:
  - root `LICENSE`: MIT, with a first line stating its scope, e.g. "This license covers the source code of this repository except the `content/` directory and third-party files listed in THIRD_PARTY_NOTICES.md."
  - `content/LICENSE`: full CC BY-NC-SA 4.0 legal code, plus `content/CREDITS.md` with the MOOC attribution (all names from `data/credits.md`) and a list of modifications.
  - `THIRD_PARTY_NOTICES.md`: runtime and library licenses (section 6).
  - keep lessons, exercise statements, starter code, per-exercise tests and solutions in `content/` data files, not hard-coded in components.
  - `package.json`: keep `"private": true`; set `"license": "SEE LICENSE IN LICENSE"` or `"MIT"` with the scope note in the README.
- Code snippets inside lessons are part of the lesson content (CC BY-NC-SA). Trivial snippets are unlikely to be protected at all, but do not promise learners that lesson code is MIT.

### 4.10 What "non-commercial" rules out for the site

Clearly out (conservative reading of Section 1(k) and 2(a)(1)):

- display advertising of any kind, including ads "only to cover hosting". CC's 2009 study found creators and users rate uses "in connection with online advertising" as commercial (84.6 and 82.6 on its scale); the specific case "not-for-profit uses work on its site, makes enough from ads to cover hosting costs" scored 59.2 and 71.7, still leaning commercial (`https://creativecommons.org/2009/09/14/creative-commons-publishes-study-of-noncommercial-use/`, report PDF `https://mirrors.creativecommons.org/defining-noncommercial/Defining_Noncommercial_fullreport.pdf`, WebSearch snippets; scale direction taken from the snippet saying higher values mean "commercial");
- paid tiers, premium lessons, paid "pro" features that include lesson content, paid certificates;
- paid sponsorship placements (logo or "sponsored by" in exchange for money), affiliate links on lesson pages;
- selling the content in any form (ebook, PDF, paid app), licensing it to a company or bootcamp, or using it mainly as lead generation for a paid service.

Gray areas (not decided by the license text; CC declines to advise):

- A donation link. A general "support the developer" link that does not gate anything and is not attached to lesson pages is arguably not the primary purpose of the use; a "donate to unlock" or donation prompts on lesson pages would lean commercial. Conservative choice: no donation links on lesson pages; if at all, one link on an About page. (A Freesound forum answer draws the same line, but that is not an authority: `https://freesound.org/forum/legal-help-and-attribution-questions/43071/`, WebSearch snippet.)
- GitHub Sponsors on the developer's profile, or listing the site in a job portfolio: incidental benefit, probably not "primarily intended for" commercial advantage. Unverified; no authority found.

Fine:

- hosting on commercial infrastructure (GitHub Pages, Cloudflare). Courts have held that a noncommercial licensee may use a commercial third party to exercise the license (Great Minds v. FedEx Office, 2d Cir. 2018, `https://law.justia.com/cases/federal/appellate-courts/ca2/17-808/17-808-2018-03-21.html`, WebSearch snippet);
- free certificates issued by the site, cookie-free analytics that are not monetized.

---

## 5. Trademarks, endorsement, and credit wording

### 5.1 University of Helsinki and MOOC.fi

- University of Helsinki brand book: "The University of Helsinki's name, abbreviations indicating that name or the flame logo can only be used in the operations of the University of Helsinki" and staff, alumni and students may not register a domain, name or trademark containing "University of Helsinki" without permission (`https://www.helsinki.fi/en/brand-book/brand-and-logo`, WebSearch snippet; helsinki.fi is blocked here).
- MOOC.fi: formal trademark registration not verified (WebSearch found none). It is the University's MOOC brand (`course-metadata.json` "provider": MOOC.fi, "publisher": University of Helsinki). Treat it as the University's mark.
- CC BY-NC-SA 4.0 does not license these (Section 2(b)(2)) and forbids implying endorsement (Section 2(a)(6)).

Rules for the site:

- Do not use the University flame logo, the `uh-logo.png` or `moocfi-logo-bw.png` files, or MOOC.fi visual styling.
- Use the names only in the factual attribution line and on the credits page. Not in the site name, domain, page titles, headings, social cards, or app icons.
- Do not put the University of Helsinki or MOOC.fi as `provider`, `publisher` or `author` in schema.org structured data (cpp-arena's prerender writes `Course` and `LearningResource` data, see its README). Use `isBasedOn` with the MOOC URL instead.
- Certificates must say they are issued by the site, carry no credits, and are not from the University of Helsinki or MOOC.fi.
- Avoid "TMC" or "Test My Code" as names for the site's checker.

Wording: say "adapted from" (when content is adapted) or "based on" / "follows the order of" (for structure only). Never "official", "the University of Helsinki's course", "in partnership with", "endorsed", "certified by".

### 5.2 Oracle "Java" (not in the brief, but relevant to the name "Java Arena")

`https://www.oracle.com/legal/trademarks/` (fetched directly): "Oracle, Java, MySQL, and NetSuite are registered trademarks of Oracle and/or its affiliates." Under "Prohibited Use": "Do not use Oracle trademarks or potentially confusing variations as all or part of your company, product or service names ... use an appropriate tag line ... For example, 'XYZ for Oracle database' not 'OraXYZ or XYZ Oracle'", and "Domain Names: Do not use Oracle trademarks or potentially confusing variations in your Internet domain name." A name like "Java Arena" and a domain containing "java" run against these guidelines. Options: a name that does not contain "Java" with a tag line such as "... for Java", and the notice "Java is a registered trademark of Oracle and/or its affiliates." Decision for the owner; enforcement risk not assessed.

### 5.3 Model attribution texts

Per lesson page (short, under the lesson; replace bracketed parts):

> Adapted from "[MOOC section title]" (Part [N]) of *Java Programming* by Arto Hellas, Matti Luukkainen and contributors, Agile Education Research group, University of Helsinki: https://java-programming.mooc.fi/part-[N]/[section-slug]. Licensed under CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/). Changes: text rewritten, new examples and exercises, checking runs in your browser. This lesson is also licensed under CC BY-NC-SA 4.0. [Full credits](/credits). Not affiliated with or endorsed by the University of Helsinki or MOOC.fi.

Footer (every page):

> Lessons and exercises on this site are adapted from *Java Programming* (https://java-programming.mooc.fi), a free course written by Arto Hellas and Matti Luukkainen with contributors and translators, made by the Agile Education Research group at the University of Helsinki, and licensed under CC BY-NC-SA 4.0. We rewrote the text and made new examples, exercises and tests. Lesson content here is licensed under CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/) and provided as is, without warranties (see Section 5 of the license). Site source code is MIT licensed. [Site name] is an independent, non-commercial project and is not affiliated with, sponsored or endorsed by the University of Helsinki, MOOC.fi or Oracle. Java is a registered trademark of Oracle and/or its affiliates. [Credits and licenses](/credits).

Credits page (`/credits`) should contain: the full author, contributor and translator lists from `data/credits.md` (section 1.1); "The course was made by the Agile Education Research group, University of Helsinki" with the link; links to `https://java-programming.mooc.fi/credits/` and `https://github.com/rage/java-programming`; the list of changes; the CC BY-NC-SA 4.0 link; runtime and library notices (section 6); credits for any third-party media the site itself uses.

---

## 6. Runtime and library license flags (high level; a separate agent covers runtimes)

| Component | License | Obligations to flag | Source |
|---|---|---|---|
| CheerpJ (Leaning Technologies) | Proprietary. "CheerpJ Community License": free for individuals (including one-person companies), FOSS projects and technical evaluations; action point "Give appropriate credits". Community use is "from the `cjrtnc.leaningtech.com` domain"; self-hosting, redistribution and OEM need a Commercial License; business, public-sector, non-profit and academic organizations need a commercial or special quote | Must load from Leaning Technologies' CDN (no self-hosting, so no bundling in the site or offline copy of the runtime); credit CheerpJ; dependency on a third-party domain; if the owner ever runs the site through an organization, recheck | `leaningtech/labs` `sites/cheerpj/src/content/docs/23-licensing.md` (commit `2218f66`, 2026-09-28); cheerpj.com blocked |
| TeaVM | Apache 2.0 | Include the Apache 2.0 text and the contents of TeaVM's NOTICE file ("This product includes software developed by Alexey Andreev", "... by The Apache Software Foundation", "... by Joda.org") in distributions; state changes if modified | `https://raw.githubusercontent.com/konsoletyper/teavm/master/LICENSE`, `.../NOTICE`, README "## License"; Maven POM `org.teavm:teavm-core:0.15.0` |
| teavm-javac | Its own code Apache 2.0; its build compiles OpenJDK source (javac, class library) into the Wasm output | The compiled OpenJDK parts stay GPLv2 with Classpath Exception (see next row); the README's "as permitted by the Classpath Exception" covers linking independent modules, not the GPL obligations for the OpenJDK code itself | `konsoletyper/teavm-javac` README "## License" (commit `2ddcf02`, 2026-09-04) |
| OpenJDK javac (and class library) | GPL 2.0 only with the "Classpath" exception (file header of `src/jdk.compiler/share/classes/com/sun/tools/javac/Main.java` in `openjdk/jdk21u`) | If you redistribute its compiled form (e.g. javac compiled to Wasm served from your site): include GPLv2 + Classpath Exception text and notices, and provide the complete corresponding source (GPLv2 Section 3; offering the source "from the same place" counts). The exception lets your own independent code keep its own license (MIT) | `https://raw.githubusercontent.com/openjdk/jdk21u/master/src/jdk.compiler/.../Main.java`; SPDX `GPL-2.0-only.txt` and `Classpath-exception-2.0.txt`; local `/usr/lib/jvm/java-21-openjdk-amd64/legal/java.base/ASSEMBLY_EXCEPTION` |
| JUnit 4 (`junit:junit` 4.12, used by the MOOC templates, and 4.13.2) | EPL 1.0 | If bundled: include the license, say where source is available | Maven Central POMs `junit-4.12.pom`, `junit-4.13.2.pom` |
| JUnit 5 Jupiter (`junit-jupiter-api` 5.11.0) | EPL 2.0 | If bundled: EPL 2.0 Section 3.1(a) requires a statement that source is available and how to get it; Section 3.3 keep notices; modified JUnit files stay EPL | Maven Central POM; SPDX `EPL-2.0.txt` |
| Hamcrest core 1.3 (JUnit 4 dependency) | "New BSD License" | Keep copyright and license text | `hamcrest-parent-1.3.pom` |
| TMC `edu-test-utils` / `tmc-junit-runner` | LGPL 3.0 / LGPL (unversioned) | Do not bundle; write own helpers | section 2.5 |

Also carry over the licenses of front-end libraries reused from cpp-arena (section 7) into `THIRD_PARTY_NOTICES.md`.

---

## 7. License of the reference repo `cpp-arena`

Checked `/home/user/antonyperez0/cpp-arena` (origin `https://github.com/AntonyPerez0/cpp-arena`, shallow clone, 1 commit `f90cc1c`, 2026-09-28, author "Antony Perez", "Merge pull request #22 ..."):

- No `LICENSE`, `COPYING` or `NOTICE` file anywhere (excluding `node_modules` and `.git`).
- `package.json`: `"private": true`, no `"license"` field.
- `README.md`: no license section (the only license mentions are about browsercc being MIT and a Pro Track lesson about choosing dependencies).
- The GitHub API returned "GitHub access to this repository is not enabled for this session", so the repository's license metadata and visibility on GitHub were not checked.

What this means:

- Without a license, default copyright applies: nobody else may copy, modify or redistribute the code, even if the repo is public.
- The owner of cpp-arena (Antony Perez, `AntonyPerez0`, who also owns Java-Arena) does not need a license to reuse his own code: he can copy it into Java-Arena and publish it there under MIT. Adding the same MIT license to cpp-arena too would make the relationship clean, but is not required.
- Caveats: (1) only one commit is visible in the shallow clone, so full authorship was not verified; any code contributed by other people needs their permission; (2) third-party parts keep their own licenses and notices: runtime npm dependencies are MIT (CodeMirror, React, react-router, marked, qrcode-generator, browsercc 0.1.1), "MIT OR Apache-2.0" (`@bjorn3/browser_wasi_shim` 0.4.2), ISC (`lucide-react`), and OFL-1.1 (`@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`) per `package-lock.json`; `vendor/libcxx-eh` holds libc++, libc++abi and libunwind built from LLVM, which is "Apache License v2.0 with LLVM Exceptions" (`https://raw.githubusercontent.com/llvm/llvm-project/main/libcxx/LICENSE.TXT`). The C/C++ toolchain and `libcxx-eh` are irrelevant to a Java site and should not be carried over.

---

## 8. Checklist for the build agents

1. Add `LICENSE` (MIT, scoped), `content/LICENSE` (CC BY-NC-SA 4.0 legal code), `content/CREDITS.md`, `THIRD_PARTY_NOTICES.md`.
2. Every lesson page: the per-lesson attribution line with a deep link to the matching MOOC section and a "Changes" note.
3. Footer: the model footer text; `/credits` page with all names.
4. Write all prose, examples, exercise statements, starter code, tests and solutions fresh. Never copy TMC templates, tests, hidden tests, model solutions, quiz text, YouTube videos, the house photo/blueprint, or other third-party media.
5. No ads, paid features, paid certificates, sponsorship placements or affiliate links; no donation prompts on lesson pages.
6. Lesson content public, no login wall, no DRM, no restrictive terms.
7. No University of Helsinki or MOOC.fi logos; no "official"; no UH/MOOC.fi in structured data except `isBasedOn`; add the non-affiliation line.
8. Reconsider "Java" in the product name and domain (Oracle guidelines).
9. Runtime: follow the obligations in section 6 for whichever runtime is chosen (CheerpJ credit and CDN loading; or TeaVM NOTICE plus GPLv2+CE source offer for any compiled OpenJDK code; EPL notices if JUnit is bundled).

---

## Sources

Local files (commit noted):

- `/home/user/ref/java-programming/README.md`, `data/credits.md`, `data/index.md`, `data/part-4/1-introduction-to-object-oriented-programming.md`, `data/part-14/2-multimedia-in-programs.md`, `data/img/`, `src/components/Footer.js`, `src/locales/common/en.json`, `course-metadata.json`, `course-settings.js` (rage/java-programming `28541c8`, 2025-06-05)
- `/home/user/ref/mooc-outline.txt`
- `/home/user/antonyperez0/cpp-arena/README.md`, `package.json`, `package-lock.json`, `vendor/libcxx-eh/` (`f90cc1c`)
- `/usr/lib/jvm/java-21-openjdk-amd64/legal/java.base/ASSEMBLY_EXCEPTION`
- `/home/user/ref/research/license-agent/CC-BY-NC-SA-4.0.txt`, `EPL-2.0.txt`, `GPL-2.0.txt`, `GPL-2.0-CE.txt`, `teachers-en.ts`, `oracle-tm.html`, `used-images.txt`

Cloned repositories (under `/home/user/ref/research/license-agent/clones/`):

- testmycode/tmc-junit-runner `7ed6ff3`; testmycode/edu-test-utils `7c5e371`; testmycode/tmc-langs `6808020`; rage/tmc-langs-rust `20aa4fa`; testmycode/tmc-check `7d9ebd1`; testmycode/tmc-server `f831c3e`; testmycode/tmc-netbeans `6530421`; rage/tmc-vscode `7d0fc74`; testmycode/tmc-intellij `21727e7`; rage/tmc-cli-rust `2e194ff`; testmycode/tmc-core `2a42d5d`; testmycode/tmc-maven-plugin `6ab0714`; testmycode/tmc-testcourse `d111e80`; testmycode/tmc-course-template `076b538`
- cardouken/mooc2020 `88483bd`; chadwyck242/mooc.fi_java_programming_2020 `9b72aab`; rwu8/mooc-java-programming-ii `2a70785`
- rage/old.mooc.fi `5db5739`; UniversityHelsinkiTKTL/MOOC-material `4de69c2`; konsoletyper/teavm-javac `2ddcf02`; leaningtech/labs `2218f66` (sparse)

URLs read directly (curl or GitHub raw):

- https://raw.githubusercontent.com/spdx/license-list-data/main/text/CC-BY-NC-SA-4.0.txt
- https://raw.githubusercontent.com/spdx/license-list-data/main/text/EPL-2.0.txt
- https://raw.githubusercontent.com/spdx/license-list-data/main/text/GPL-2.0-only.txt
- https://raw.githubusercontent.com/spdx/license-list-data/main/text/Classpath-exception-2.0.txt
- https://raw.githubusercontent.com/spdx/license-list-data/main/text/MIT.txt
- https://raw.githubusercontent.com/rage/mooc.fi/master/frontend/translations/teachers/en.ts
- https://raw.githubusercontent.com/rage/mooc.fi/master/frontend/pages/_old/teacher-guide.tsx
- https://raw.githubusercontent.com/openjdk/jdk21u/master/src/jdk.compiler/share/classes/com/sun/tools/javac/Main.java
- https://raw.githubusercontent.com/konsoletyper/teavm/master/LICENSE , /NOTICE , /README.md
- https://raw.githubusercontent.com/llvm/llvm-project/main/libcxx/LICENSE.TXT
- https://repo1.maven.org/maven2/junit/junit/4.12/junit-4.12.pom , junit-4.13.2.pom
- https://repo1.maven.org/maven2/org/junit/jupiter/junit-jupiter-api/5.11.0/junit-jupiter-api-5.11.0.pom
- https://repo1.maven.org/maven2/org/hamcrest/hamcrest-parent/1.3/hamcrest-parent-1.3.pom
- https://repo1.maven.org/maven2/org/teavm/teavm-core/0.15.0/teavm-core-0.15.0.pom
- https://www.oracle.com/legal/trademarks/

URLs known only from WebSearch snippets (blocked or not fetched):

- https://java-programming.mooc.fi/credits/ ; https://java-programming.mooc.fi/
- https://www.mooc.fi/en/teacher-guide/
- https://tmc.mooc.fi/org/mooc/courses/600
- https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.en
- https://creativecommons.org/compatible-licenses/
- https://creativecommons.org/faq/
- https://wiki.creativecommons.org/wiki/NonCommercial_interpretation
- https://wiki.creativecommons.org/wiki/Recommended_practices_for_attribution
- https://wiki.creativecommons.org/wiki/4.0/Treatment_of_adaptations
- https://creativecommons.org/course/cc-cert-edu/unit-4-using-cc-licenses-and-cc-licensed-works/4-4-remixing-cc-licensed-work/
- https://creativecommons.org/2009/09/14/creative-commons-publishes-study-of-noncommercial-use/
- https://mirrors.creativecommons.org/defining-noncommercial/Defining_Noncommercial_fullreport.pdf
- https://law.justia.com/cases/federal/appellate-courts/ca2/17-808/17-808-2018-03-21.html
- https://www.wto.org/english/docs_e/legal_e/27-trips_04_e.htm
- https://www.law.cornell.edu/uscode/text/17/102
- https://supreme.justia.com/cases/federal/us/499/340/
- https://www.ecfr.gov/current/title-37/chapter-II/subchapter-A/part-202/section-202.1
- https://www.wipo.int/wipolex/en/text/283698
- https://en.wikipedia.org/wiki/Infopaq_International_A/S_v_Danske_Dagblades_Forening
- https://eur-lex.europa.eu/eli/dir/2019/790/oj/eng
- https://www.helsinki.fi/en/brand-book/brand-and-logo
- https://teaching.helsinki.fi/instructions/article/copyrights-and-openness-teaching-materials
- https://soundbible.com/2190-Front-Desk-Bell.html
- https://www.youtube.com/watch?v=zvE8XA8D0gE
- https://freesound.org/forum/legal-help-and-attribution-questions/43071/
