public class Main {
    public static void main(String[] args) {
        String json = """
            {
              "name": "Java Arena",
              "tags": ["java", "wasm"]
            }
            """;
        System.out.print(json);
        String poem = """
            Roses are red, \
            violets are blue\t(tab)
              indented line
            trailing spaces\s\s
            end""";
        System.out.println(poem);
        System.out.println(poem.lines().count() + " lines");
        String html = """
            <p>"quotes" and \"""triple\""" and a backslash \\</p>
            """.strip();
        System.out.println(html);
        System.out.println("""
            Hello, %s! You are %d.""".formatted("Ada", 36));
        System.out.println("Unicode: \u00e4\u00f6\u00e5 \u20ac " + "äöå €" + " \uD83D\uDE00".length());
    }
}
