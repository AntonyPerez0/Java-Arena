// Compiles many small Java programs in one JVM, for the content build (scripts/build-content.mjs).
//
// Usage: java JavaCheck.java <jobs folder> <job> [<job> ...]
//
// Each job is a folder <jobs folder>/<job>/src holding .java files. For each job this runs
// javac -encoding UTF-8 -d <job>/classes <files> through the JDK's own javac (the same code the
// javac command runs, so it prints exactly what the command would) and writes <job>/result.txt:
// the exit code on the first line, then everything javac printed, with the folder prefix removed
// from file names so messages read "Main.java:3: error: ...".
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;

public class JavaCheck {
    public static void main(String[] args) throws IOException {
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        Path root = Path.of(args[0]).toAbsolutePath();
        for (int i = 1; i < args.length; i++) {
            Path job = root.resolve(args[i]);
            Path src = job.resolve("src");
            List<String> files = new ArrayList<>();
            try (Stream<Path> walk = Files.walk(src)) {
                walk.filter(p -> p.toString().endsWith(".java")).sorted().forEach(p -> files.add(p.toString()));
            }
            List<String> options = new ArrayList<>(List.of("-encoding", "UTF-8", "-d", job.resolve("classes").toString()));
            options.addAll(files);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PrintStream ps = new PrintStream(out, true, StandardCharsets.UTF_8);
            int code = javac.run(null, ps, ps, options.toArray(new String[0]));
            String text = out.toString(StandardCharsets.UTF_8).replace(src + "/", "");
            Files.writeString(job.resolve("result.txt"), code + "\n" + text, StandardCharsets.UTF_8);
        }
    }
}
