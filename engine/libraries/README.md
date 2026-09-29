# Java Arena libraries: JUnit 4 for the unit testing lessons

The MOOC's part 6 teaches unit testing with JUnit 4. `build.mjs` packs JUnit and the Hamcrest classes it needs into one archive, `engine/dist/libraries/junit4.bin`, which both halves of the engine read:

- the compiler puts its classes on javac's class path for a program that uses `org.junit` (`javac.loadLibrary` and the `libraries` option of `compile` in `engine/dist/compiler/javac-host.mjs`);
- the runner loads its classes next to the program's own, so JUnit's runner really runs.

The site fetches the archive only when a program uses JUnit, and keeps it in the same cache as the rest of the engine.

## Rebuild

```sh
node engine/libraries/build.mjs
```

It downloads the two jars from Maven Central (repo1.maven.org), checks their SHA-256, keeps their class files, and writes `junit4.bin` (a gzip stream of entries sorted by name, each `short nameLength, UTF-8 name, int dataLength, data`, with a fixed gzip header, so two runs give the same bytes), `manifest.json` and the license texts that come inside the jars.

## Pinned sources

| Library | Jar | SHA-256 | Source | License |
|---|---|---|---|---|
| JUnit 4.13.2 | https://repo1.maven.org/maven2/junit/junit/4.13.2/junit-4.13.2.jar | `8e495b634469d64fb8acfa3495a065cbacc8a0fff55ce1e31007be4c16dc57d3` | https://github.com/junit-team/junit4 tag `r4.13.2`, or `junit-4.13.2-sources.jar` on Maven Central | Eclipse Public License 1.0 (`licenses/JUnit-4.13.2-LICENSE.txt`) |
| Hamcrest Core 1.3 | https://repo1.maven.org/maven2/org/hamcrest/hamcrest-core/1.3/hamcrest-core-1.3.jar | `66fdef91e9739348df7a096aa384a5685f4e875584cce89386a7a47251c4d8e9` | https://github.com/hamcrest/JavaHamcrest tag `hamcrest-java-1.3`, or `hamcrest-core-1.3-sources.jar` on Maven Central | BSD 3-Clause (`licenses/Hamcrest-Core-1.3-LICENSE.txt`) |

The class files are the ones in the jars, unchanged. Their source code is available at the addresses above.
