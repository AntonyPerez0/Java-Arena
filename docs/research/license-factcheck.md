# Fact-check of the licensing findings (license.md)

Checked 2026-09-28 by the license fact-check agent. Research only, not legal advice. Scratch files: `/home/user/ref/research/license-factcheck/` (SPDX CC BY-NC-SA 4.0 text `cc.txt`, `teachers-en.ts`, `oracle.html`, full-history clone `etu/` of testmycode/edu-test-utils).

Verdict key: CONFIRMED (re-checked against a primary source), REFUTED (primary source contradicts it), UNCERTAIN (could not confirm, or it is an inference or a policy choice presented too strongly).

## Summary

The core findings hold: the MOOC material is CC BY-NC-SA 4.0, the website code is Apache 2.0, no license is stated for TMC templates and tests, and all cited CC BY-NC-SA 4.0 section numbers are correct. Corrections needed:

1. REFUTED (overstatement): "no login wall" is not a CC BY-NC-SA 4.0 obligation. CC's FAQ says limiting recipients by username and password does not restrict further use and is not prohibited; only additional terms and Effective Technological Measures (DRM-type measures) that restrict the licensed rights are. Keeping lessons public is a good recommendation, not a license duty.
2. REFUTED (count): the visible YouTube embeds are 10 (10 distinct ids), not 11. One `-DzOKI6iH5w` embed (`data/part-1/2-printing.md` l.175) sits inside an HTML comment (l.173 to l.200).
3. REFUTED (omission): the third-party media inventory misses a photo shown on a visible page: `data/part-1/7-programming-in-our-society.md` l.28 `![Margaret Hamilton in action](./margeret-action.jpg)` (file `data/part-1/margeret-action.jpg`, 181,916 bytes, no EXIF, no source or license stated). The report only inventoried `data/img`. Treat as unknown provenance; do not reuse.
4. UNCERTAIN (inference stated as fact): "default copyright applies (all rights reserved)" for TMC templates and tests is a presumption from not finding a license, not a verified fact (tmc.mooc.fi and maven.mooc.fi could not be inspected). Also, trivial starter files may not be protectable at all. The practical advice (do not copy, write your own) stands.
5. UNCERTAIN (policy choice): treating own, freshly written tests and solutions (code) as CC BY-NC-SA Adapted Material is a conservative choice that conflicts with CC's advice not to use CC licenses for software and is only required if they are actually derived from MOOC material.
6. UNCERTAIN (minor gaps): the two course slideshow PDFs contain embedded images (16 in `test-driven-development.pdf`, 4 in `binary_search.pdf`, counted by `/Subtype /Image`), provenance not checked; the house photo EXIF also contains `2006:12:23 10:20:03` (probably the capture date) besides `2019:01:17`; TeaVM's README also names jzlib (BSD style) as a class-library source, which may need a notice if that code ends up in the output.

## Claim-by-claim

### 1. Material license

| Claim | Verdict | Evidence |
|---|---|---|
| README "Course material": "The course material is licensed under a Creative Commons BY-NC-SA 4.0 license" | CONFIRMED | `/home/user/ref/java-programming/README.md`, last section; repo HEAD `28541c8` 2025-06-05 ("Removed email from possible support.") |
| `data/credits.md` l.47 repeats it and links the Finnish deed | CONFIRMED | l.47 links `https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fi` |
| Website code ("Material template") is Apache 2.0, "Copyright 2018 Henrik Nygren, Antti Leinonen, and the Agile Education Research group" | CONFIRMED | README "## Material template"; also `package.json` l.102 `"license": "Apache-2.0"` (not cited by the report, supports it). No LICENSE file in repo (`find -maxdepth 2 -iname 'licen*'`). |
| README scope: content in `data/`, everything else is the website | CONFIRMED | README first paragraph |
| Live credits page says the same | CONFIRMED (WebSearch snippet only) | snippet for `https://java-programming.mooc.fi/credits/`: "licensed under a Creative Commons BY-NC-SA 4.0-license and the course page has been made by Henrik Nygren and Antti Leinonen" |
| Footer has no license text; credits the group "of the University of Helsinki"; links /credits and GitHub; UH and MOOC.fi logos | CONFIRMED | `src/components/Footer.js` (GitHub link, `makers` + link text `rage`, `/credits` Link, `uh-logo.png` alt "Helsingin yliopisto", `moocfi-logo-bw.png`); `src/locales/common/en.json` l.5 to l.8 |
| MOOC.fi teacher guide wording ("most of them", "check the course materials for confirmation", "preserve the information of the original creators ... non-commercial") | CONFIRMED | `https://raw.githubusercontent.com/rage/mooc.fi/master/frontend/translations/teachers/en.ts` keys `teachingText`, `teachingText2`. Note: `organizeText2` distinguishes "full course materials and exercise sets", which supports reading "materials" as not clearly including the exercise sets. |
| No licensor and no copyright notice for the material | CONFIRMED | grep for `©`, `copyright`, `(c) 20` in `data/` and `src/` finds nothing; the only copyright line is the README template line |
| Credit lists (2 authors, 13 contributors, 11 translators, "made by the Agile Education Research group") | CONFIRMED | `data/credits.md` l.8 to l.44 (names match exactly, including Reetta Puska in both lists and "Henrik Nygren (Coordinator)") |
| UH as publisher in `course-metadata.json` | CONFIRMED, with note | `course-metadata.json` "publisher": University of Helsinki, "provider": MOOC.fi. This file belongs to the website code, not to the material's attribution designation; crediting UH is reasonable (also `data/index.md` l.9 "University of Helsinki's ... MOOC") but UH is not formally "designated to receive attribution" in the material. |
| Copyright ownership unverified; UH says teachers as a rule own their materials | CONFIRMED as stated (unverified) | WebSearch snippet of `https://teaching.helsinki.fi/instructions/article/copyrights-and-openness-teaching-materials`: "As a rule, teachers own the rights to the learning materials they routinely prepare." |
| 66 quiz embeds loaded by id | CONFIRMED | 66 `<quiz ...>` tags outside HTML comments in `data/part-*/*.md` (69 in all of `data/`, 3 in Finnish `data/osa-15`); `course-settings.js` `quizzesId: "6a635a2d-..."` |
| Two PDF slideshows in the material | CONFIRMED | `data/part-6/3-introduction-to-testing.md` -> `slideshows/test-driven-development.pdf`; `data/part-7/2-algorithms.md` -> `slideshows/binary_search.pdf` (only these two referenced outside comments). Both are Google-made PDFs with embedded images (see summary item 6). |
| Legacy course, not maintained (`data/index.md` l.11) | CONFIRMED | `data/index.md` l.11 |

### 2. Templates and tests

| Claim | Verdict | Evidence |
|---|---|---|
| No license stated for exercise templates, tests, hidden tests, model solutions | CONFIRMED within searched sources | Nothing in `rage/java-programming`; teacher guide separates "materials" from "exercise sets"; no official exercise repo found |
| `org:rage java` returns only java-programming and java-programming-fall-19 | CONFIRMED | GitHub MCP repository search, total_count 2 |
| Code search `"Part01_01.Sandbox" org:rage` finds only material markdown and tmc-langs-rust code | CONFIRMED | 7 hits: `data/part-1/1-starting-programming.md` in rage/java-programming, java-programming-fall-19, programming-f20; 4 files in rage/tmc-langs-rust |
| 560 `src/test` Java files in 3 student repos, zero license headers, no LICENSE | CONFIRMED | 268 (cardouken/mooc2020 `88483bd`) + 188 (chadwyck242/... `9b72aab`) + 104 (rwu8/... `2a70785`); the only grep hits are `LicensePlate` identifiers in `VehicleRegistryTest.java` |
| junit 4.12 and edu-test-utils 0.4.2 | CONFIRMED | 190 pom.xml files in cardouken/mooc2020 use both; rwu8 poms likewise, repository `https://maven.mooc.fi/releases` |
| AdaLovelaceTest.java fixture in tmc-langs-rust | CONFIRMED | `crates/tmc-langs-plugins/tests/data/zip/exercise-name/src/test/java/AdaLovelaceTest.java` at `20aa4fa` |
| MOOC.fi withholds model solutions "to stop cheating" | CONFIRMED | `teachers/en.ts` key `howtoNB` |
| "Default copyright applies (all rights reserved)" | UNCERTAIN | Presumption, not verified (TMC server-side course repos not inspected). WebSearch AI summaries claimed the CC license covers the TMC exercises; no primary source supports that and it should be ignored. |
| Starter code and sample outputs printed on material pages are CC BY-NC-SA | CONFIRMED | e.g. `data/part-1/2-printing.md` l.206 to l.231 prints the full AdaLovelace boilerplate and sample output inside `data/` |
| TMC tooling licenses | CONFIRMED | tmc-junit-runner pom "GNU Lesser General Public License" (no version); edu-test-utils `LICENSE.txt` LGPL v3, and the full-history clone shows LICENSE.txt added 2012-06-21 (`32340cb`), before the 0.4.2 release (`6a081c7`, 2012-11-24); `git show 0.4.2:LICENSE.txt` is LGPL v3; tmc-langs pom GPL v2; tmc-langs-rust MIT (c) 2020 UH + Apache, `license = "MIT OR Apache-2.0"`; tmc-server and tmc-netbeans GPL v2 LICENSE; tmc-vscode MIT (c) 2020 UH; tmc-intellij MIT (c) 2016 Tuomo Oila et al.; tmc-cli-rust Apache-2.0; tmc-check, tmc-core, tmc-maven-plugin, tmc-testcourse, tmc-course-template: no LICENSE and no license in pom/README |

### 3. CC BY-NC-SA 4.0 obligations and section numbers

All section numbers re-checked against `https://raw.githubusercontent.com/spdx/license-list-data/main/text/CC-BY-NC-SA-4.0.txt` (identical to the report's saved copy).

| Claim | Verdict | Evidence |
|---|---|---|
| 2(a)(1) NonCommercial-only grant | CONFIRMED | 2(a)(1)(A),(B) |
| 3(a)(1)(A) i to v retained "if it is supplied by the Licensor" | CONFIRMED | exact wording |
| 3(a)(1)(B) indicate modifications, retain previous ones | CONFIRMED | Keeping the translation credit as the "previous modification" indication is a reasonable interpretation, not stated in the license. |
| 3(a)(1)(C), 3(a)(2), 3(a)(3) | CONFIRMED | exact wording |
| 1(k) NonCommercial definition | CONFIRMED | exact wording |
| NC rules out ads even to cover hosting, etc. | UNCERTAIN (policy, not law) | The license text does not list uses; CC wiki says the test is primary purpose and it does not list cases (WebSearch snippet, `wiki.creativecommons.org/wiki/NonCommercial_interpretation`). The 2009 study numbers (84.6 / 82.6 for online advertising; 59.2 / 71.7 for a not-for-profit covering hosting with ads) are confirmed by WebSearch snippet, but they are survey perceptions. The report labels this "conservative"; the finding's word "Rules out" is stronger than the evidence. Fine as a site policy. |
| 3(b)(1) same License Elements or BY-NC-SA Compatible License; none listed | CONFIRMED | 3(b)(1); 1(c) points to creativecommons.org/compatiblelicenses; WebSearch snippet: "currently, no non-CC licenses have been designated as compatible with BY-NC-SA 4.0" |
| 3(b)(2) link adapter's license | CONFIRMED | exact wording |
| 2(a)(5)(C), 3(b)(3): no additional terms or ETMs | CONFIRMED | exact wording |
| "keep lessons public, no login wall" as an obligation | REFUTED | CC FAQ (WebSearch snippet, `https://creativecommons.org/faq/`): "Limiting recipients to a particular set of users (for example, by requiring a username and password to enter a site) does not restrict further use of the content by the recipients." ETM is defined in 1(e) by reference to WIPO Copyright Treaty Art. 11 anti-circumvention. No DRM and no restrictive terms remain correct obligations. |
| 2(a)(6) no endorsement; 2(b)(2) trademarks not licensed | CONFIRMED | exact wording |
| 6(a) termination, 6(b)(1) 30-day cure | CONFIRMED | exact wording |
| 2(a)(4) format changes never produce Adapted Material; 8(a) | CONFIRMED | exact wording |
| Great Minds v. FedEx (2d Cir. 2018) | CONFIRMED (WebSearch snippet) | FindLaw / Justia / CC blog snippets: licensee may use a commercial third party (FedEx) to exercise BY-NC-SA 4.0 rights |

### 4. Third-party media

| Claim | Verdict | Evidence |
|---|---|---|
| Linda Tanner hummingbird, CC BY 2.0 via freestockphotos.biz 17874 | CONFIRMED | `data/part-14/2-multimedia-in-programs.md` l.163 |
| Mona Lisa from Wikimedia Category, "can be used freely" | CONFIRMED | l.304 |
| Front desk bell, CC BY 3.0, soundbible; text says "Daniel Simionin"; SoundBible lists Daniel Simion | CONFIRMED | l.317 to l.323; WebSearch snippet for `soundbible.com/2190-Front-Desk-Bell.html` |
| Yannick Lemieux applause, CC BY 3.0 | CONFIRMED | l.370, l.376 |
| House photo and blueprint, no source; EXIF Canon PowerShot A620, Photoshop CS2 2007-12-14 | CONFIRMED with correction | `strings` shows Canon PowerShot A620, `2019:01:17 23:39:53` and also `2006:12:23 10:20:03`; blueprint Photoshop CS2 `2007:12:14 17:05:24` |
| `et_phone_home.wav` unreferenced | CONFIRMED | 0 references in `data/` and `src/` |
| 11 visible YouTube embeds, 10 distinct ids | REFUTED | 10 visible embeds, 10 distinct ids (HTML comments stripped); the 11th is inside a comment in `data/part-1/2-printing.md` |
| `data/img` 50 MB, 299 files | CONFIRMED | `du -sh`, `find -type f` |
| Inventory complete | REFUTED | misses `data/part-1/margeret-action.jpg` (Margaret Hamilton photo, visible, no source) |

### 5. Adaptation analysis

UNCERTAIN overall, correctly hedged. The legal anchors are accurately described (Section 1(a) and 8(a) wording confirmed; TRIPS 9(2), 17 U.S.C. 102(b), Feist, 37 CFR 202.1(a), Infopaq C-5/08, Berne 2(5) cited via WebSearch snippets). The report does not claim a syllabus-following site definitely is or is not Adapted Material ("most likely not", "very likely", "plausibly ... not settled"). Two notes: Berne Art. 2(5) concerns collections of works, so applying it to a course outline is an analogy; and CC BY-NC-SA 4.0 Section 4 also licenses Sui Generis Database Rights, which the report does not discuss (probably marginal here, unverified).

### 6. Recommendations and attribution text

- "Treat all lesson content as Adapted Material" is a choice, labelled conservative in the report; acceptable. Caveat: if content really is written fresh, "Adapted from" may overstate the relationship; "Based on the structure of" is more accurate for structure-only reuse (the report itself says so in 5.1). Including own tests and solutions (code) under CC BY-NC-SA is permitted but not required unless derived, and runs against CC's advice for software.
- Per-lesson URL pattern `https://java-programming.mooc.fi/part-[N]/[section-slug]` matches frontmatter paths (e.g. `path: "/part-1/2-printing"`).
- The "Changes" and "We rewrote the text and made new examples, exercises and tests" lines are only accurate if the content is actually written that way; they must be checked per lesson.
- The license link to the deed URL satisfies 3(a)(1)(C) ("the URI or hyperlink to, this Public License"); linking `legalcode` is also fine.
- Oracle guideline quotes CONFIRMED against `https://www.oracle.com/legal/trademarks/` (HTTP 200 here): "Do not use Oracle trademarks or potentially confusing variations as all or part of your company, product or service names", "Do not use Oracle trademarks ... in your Internet domain name", and "Oracle®, Java, MySQL, and NetSuite are registered trademarks of Oracle and/or its affiliates." These are Oracle's guidelines, not statutes. Java-Arena's origin is `https://github.com/AntonyPerez0/Java-Arena`.
- UH brand book quote CONFIRMED by WebSearch snippet (`https://www.helsinki.fi/en/brand-book/brand-and-logo`).
- "Keep lessons publicly readable without login" is fine as a recommendation but should not be described as required by the license (see 3).

### 7. cpp-arena

CONFIRMED: shallow clone (`git rev-parse --is-shallow-repository` = true), one commit `f90cc1c` 2026-09-28 by Antony Perez (a merge of PR #22 from a `claude/...` branch), origin `https://github.com/AntonyPerez0/cpp-arena`; no LICENSE/COPYING/NOTICE outside node_modules; `package.json` `"private": true`, no `license`. Dependency licenses from `package-lock.json` match (MIT, ISC lucide-react 1.48.0, OFL-1.1 fontsource 5.3.0, MIT OR Apache-2.0 browser_wasi_shim 0.4.2, browsercc 0.1.1 MIT). `vendor/libcxx-eh` also holds `libarena.a`, `uncaught.cpp` (site code) and `llvm-wasm-eh.patch`; LLVM license header confirmed at `https://raw.githubusercontent.com/llvm/llvm-project/main/libcxx/LICENSE.TXT`. Ownership of copyright by the same person is plausible from the GitHub owner name but not legally verified.

### 8. Runtime flags

| Claim | Verdict | Evidence |
|---|---|---|
| CheerpJ Community License terms | CONFIRMED | `leaningtech/labs` `sites/cheerpj/src/content/docs/23-licensing.md` at `2218f66`: individuals incl. one-person companies, FOSS, technical evaluations; "Give appropriate credits"; "unlimited, unmetered use of CheerpJ from the `cjrtnc.leaningtech.com` domain, such as its usage via npm package manager"; self-hosting, redistribution, OEM need Commercial License; public sector, non-profit, academic organisations "Contact us for a special quote" |
| TeaVM Apache 2.0, NOTICE (Alexey Andreev, ASF, Joda.org), no OpenJDK or (L)GPL | CONFIRMED | `raw.githubusercontent.com/konsoletyper/teavm/master/LICENSE`, `/NOTICE`, README "## License"; teavm-core 0.15.0 POM "The Apache Software License, Version 2.0". Addition: README also lists jzlib (BSD style). |
| teavm-javac Apache 2.0, OpenJDK compiled in | CONFIRMED | README l.279 to l.290 at `2ddcf02`: "OpenJDK source code may be downloaded and compiled into bytecode for inclusion in the final WebAssembly output" |
| javac GPLv2 only + Classpath exception; GPLv2 s.3 same-place source | CONFIRMED | jdk21u `Main.java` header; GPL-2.0 text "offering equivalent access to copy the source code from the same place counts as distribution of the source code" |
| JUnit 4.12 / 4.13.2 EPL 1.0, Jupiter 5.11.0 EPL 2.0, Hamcrest 1.3 New BSD, EPL-2.0 3.1(a) and 3.3 | CONFIRMED | Maven Central POMs; SPDX EPL-2.0 text |
| edu-test-utils LGPL-3.0, tmc-junit-runner LGPL unversioned | CONFIRMED | see section 2 |

## Sources used for this check

- `/home/user/ref/java-programming/` at `28541c8`: README.md, package.json, course-settings.js, course-metadata.json, data/credits.md, data/index.md, data/part-1/2-printing.md, data/part-1/7-programming-in-our-society.md, data/part-1/margeret-action.jpg, data/part-4/1-introduction-to-object-oriented-programming.md, data/part-14/2-multimedia-in-programs.md, data/img/, data/slideshows/, src/components/Footer.js, src/locales/common/en.json
- `/home/user/ref/research/license-agent/clones/` (commits as listed above); `/home/user/ref/research/license-factcheck/etu` (testmycode/edu-test-utils full history)
- `/home/user/antonyperez0/cpp-arena` (`f90cc1c`); `/home/user/Java-Arena` git remote
- https://raw.githubusercontent.com/spdx/license-list-data/main/text/CC-BY-NC-SA-4.0.txt
- https://raw.githubusercontent.com/rage/mooc.fi/master/frontend/translations/teachers/en.ts
- https://raw.githubusercontent.com/konsoletyper/teavm/master/LICENSE , /NOTICE , /README.md
- https://raw.githubusercontent.com/openjdk/jdk21u/master/src/jdk.compiler/share/classes/com/sun/tools/javac/Main.java
- https://raw.githubusercontent.com/llvm/llvm-project/main/libcxx/LICENSE.TXT
- Maven Central POMs: junit 4.12, 4.13.2; junit-jupiter-api 5.11.0; hamcrest-parent 1.3; teavm-core 0.15.0
- https://www.oracle.com/legal/trademarks/ (fetched, HTTP 200)
- GitHub MCP searches: repositories `org:rage java`; code `"Part01_01.Sandbox" org:rage`; code `"edu-test-utils" filename:pom.xml org:testmycode`
- WebSearch snippets: https://creativecommons.org/faq/ (login/ETM), https://creativecommons.org/compatible-licenses/ , https://wiki.creativecommons.org/wiki/NonCommercial_interpretation , https://creativecommons.org/2009/09/14/creative-commons-publishes-study-of-noncommercial-use/ , https://mirrors.creativecommons.org/defining-noncommercial/Defining_Noncommercial_fullreport.pdf , https://law.justia.com/cases/federal/appellate-courts/ca2/17-808/17-808-2018-03-21.html , https://java-programming.mooc.fi/credits/ , https://teaching.helsinki.fi/instructions/article/copyrights-and-openness-teaching-materials , https://www.helsinki.fi/en/brand-book/brand-and-logo , https://soundbible.com/2190-Front-Desk-Bell.html
