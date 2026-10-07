// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.ArrayList;
import java.util.List;

/**
 * Reads .arena/events.txt: one event per line; blank lines and lines starting with // are skipped.
 *
 * <pre>
 * click Button "Add"          click #3          click #addButton
 * type TextField 1 "Ada"      set TextArea 1 "two\nlines"
 * enter TextField 1           close
 * </pre>
 *
 * Text is in double quotes, with Java's escapes (\" \\ \n \t \r \b \f \' and \\uXXXX). A line
 * that can't be read becomes a problem, in plain English, that the window JSON lists.
 */
final class EventParser {
    private EventParser() {
    }

    /** A token of a line: a word, or a text in double quotes. */
    private static final class Token {
        final String text;
        final boolean quoted;

        Token(String text, boolean quoted) {
            this.text = text;
            this.quoted = quoted;
        }
    }

    /** Thrown inside the parser with the problem's wording. */
    private static final class Bad extends Exception {
        private static final long serialVersionUID = 1L;

        Bad(String message) {
            super(message, null, false, false);
        }
    }

    static List<EventLine> parse(String file) {
        List<EventLine> events = new ArrayList<EventLine>();
        int start = 0;
        while (start <= file.length()) {
            int end = file.indexOf('\n', start);
            if (end < 0) {
                end = file.length();
            }
            String line = file.substring(start, end).trim();
            start = end + 1;
            if (line.isEmpty() || line.startsWith("//")) {
                continue;
            }
            try {
                events.add(event(line));
            } catch (Bad bad) {
                events.add(EventLine.problem(line, bad.getMessage()));
            }
        }
        return events;
    }

    private static EventLine event(String line) throws Bad {
        List<Token> tokens = tokens(line);
        Token first = tokens.get(0);
        String command = first.text;
        if (first.quoted || !(command.equals("click") || command.equals("type") || command.equals("set") || command.equals("enter") || command.equals("close"))) {
            String lower = first.quoted ? "" : command.toLowerCase(java.util.Locale.ROOT);
            if (lower.equals("click") || lower.equals("type") || lower.equals("set") || lower.equals("enter") || lower.equals("close")) {
                throw new Bad("write the event in small letters: " + lower);
            }
            throw new Bad("there's no event called " + (first.quoted ? "\"" + command + "\"" : command) + " (the events are click, type, set, enter and close)");
        }
        if (command.equals("close")) {
            if (tokens.size() > 1) {
                throw new Bad("close takes nothing after it");
            }
            return EventLine.of(line, command, null, null);
        }
        int[] next = { 1 };
        Target target = target(command, tokens, next);
        String argument = null;
        if (command.equals("type") || command.equals("set")) {
            if (next[0] >= tokens.size() || !tokens.get(next[0]).quoted) {
                throw new Bad(command + " needs the text in double quotes after the target, such as " + command + " TextField 1 \"Ada\"");
            }
            argument = tokens.get(next[0]).text;
            next[0]++;
        }
        if (next[0] < tokens.size()) {
            throw new Bad("there's something extra at the end of the line");
        }
        return EventLine.of(line, command, target, argument);
    }

    private static Target target(String command, List<Token> tokens, int[] next) throws Bad {
        String example = command.equals("click") ? "click Button \"OK\"" : command.equals("enter") ? "enter TextField 1" : command + " TextField 1 \"Ada\"";
        if (next[0] >= tokens.size()) {
            throw new Bad(command + " needs a target, such as " + example);
        }
        Token t = tokens.get(next[0]++);
        if (t.quoted) {
            throw new Bad("the target comes before the text: a class and which one, such as " + example);
        }
        String word = t.text;
        if (word.startsWith("#")) {
            String rest = word.substring(1);
            if (digits(rest)) {
                int n = number(rest);
                if (n < 1) {
                    throw new Bad("the nodes are numbered from 1");
                }
                return Target.number(n);
            }
            if (cssId(rest)) {
                return Target.id(rest);
            }
            throw new Bad(word + " is neither a node number (such as #3) nor an id (such as #addButton)");
        }
        if (!identifier(word)) {
            throw new Bad(word + " isn't a target: write a class and which one, such as " + example);
        }
        if (!Outline.known(word)) {
            throw new Bad(word + " isn't a JavaFX class that Java Arena knows (use Button, Label, TextField, PasswordField, TextArea or a pane such as VBox)");
        }
        if (next[0] >= tokens.size() || !(tokens.get(next[0]).quoted || digits(tokens.get(next[0]).text))) {
            throw new Bad("say which " + Outline.noun(word) + ": " + word + " \"its text\", or " + word + " 1 for the first one");
        }
        Token which = tokens.get(next[0]);
        if (which.quoted && (command.equals("type") || command.equals("set")) && (next[0] + 1 >= tokens.size() || !tokens.get(next[0] + 1).quoted)) {
            throw new Bad("say which " + Outline.noun(word) + " (" + word + " 1 for the first one, or " + word + " \"its text\"), then the text in double quotes");
        }
        next[0]++;
        if (which.quoted) {
            return Target.withText(word, which.text);
        }
        int k = number(which.text);
        if (k < 1) {
            throw new Bad("the count starts at 1: " + word + " 1 is the first " + Outline.noun(word));
        }
        return Target.index(word, k);
    }

    private static List<Token> tokens(String line) throws Bad {
        List<Token> tokens = new ArrayList<Token>();
        int i = 0;
        int n = line.length();
        while (i < n) {
            char c = line.charAt(i);
            if (c <= ' ') {
                i++;
            } else if (c == '"') {
                StringBuilder text = new StringBuilder();
                i++;
                while (true) {
                    if (i >= n) {
                        throw new Bad("the text has no closing double quote");
                    }
                    char d = line.charAt(i++);
                    if (d == '"') {
                        break;
                    }
                    if (d != '\\') {
                        text.append(d);
                        continue;
                    }
                    if (i >= n) {
                        throw new Bad("the text has no closing double quote");
                    }
                    char e = line.charAt(i++);
                    switch (e) {
                        case '"':
                            text.append('"');
                            break;
                        case '\\':
                            text.append('\\');
                            break;
                        case '\'':
                            text.append('\'');
                            break;
                        case 'n':
                            text.append('\n');
                            break;
                        case 't':
                            text.append('\t');
                            break;
                        case 'r':
                            text.append('\r');
                            break;
                        case 'b':
                            text.append('\b');
                            break;
                        case 'f':
                            text.append('\f');
                            break;
                        case 'u':
                            while (i < n && line.charAt(i) == 'u') {
                                i++;
                            }
                            if (i + 4 > n || !hex(line.substring(i, i + 4))) {
                                throw new Bad("\\u must be followed by four hexadecimal digits, such as \\u00e4");
                            }
                            text.append((char) Integer.parseInt(line.substring(i, i + 4), 16));
                            i += 4;
                            break;
                        default:
                            throw new Bad("\\" + e + " isn't an escape Java knows (use \\\" \\\\ \\n \\t or \\uXXXX)");
                    }
                }
                tokens.add(new Token(text.toString(), true));
            } else {
                int from = i;
                while (i < n && line.charAt(i) > ' ' && line.charAt(i) != '"') {
                    i++;
                }
                tokens.add(new Token(line.substring(from, i), false));
            }
        }
        return tokens;
    }

    private static boolean digits(String s) {
        if (s.isEmpty()) {
            return false;
        }
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) < '0' || s.charAt(i) > '9') {
                return false;
            }
        }
        return true;
    }

    /** The number the digits make, or Integer.MAX_VALUE when it is too big for an int. */
    private static int number(String digits) {
        long v = 0;
        for (int i = 0; i < digits.length(); i++) {
            v = v * 10 + (digits.charAt(i) - '0');
            if (v > Integer.MAX_VALUE) {
                return Integer.MAX_VALUE;
            }
        }
        return (int) v;
    }

    /** Four hexadecimal digits of ASCII only, as in a Java \\u escape (Character.digit would also take fullwidth ones). */
    private static boolean hex(String s) {
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'))) {
                return false;
            }
        }
        return true;
    }

    // The words below are judged one UTF-16 unit at a time, with no Unicode tables (the JDK's and a
    // browser's Unicode versions differ), exactly as src/grader/window.ts judges them: ASCII by its
    // rules, and every unit from U+0080 on counts as a letter.

    private static boolean asciiLetter(char c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
    }

    /** An id as JavaFX code gives them: a letter or _, then letters, digits, _ and - (such as add-button or lisää). */
    private static boolean cssId(String s) {
        if (s.isEmpty()) {
            return false;
        }
        char first = s.charAt(0);
        if (!(asciiLetter(first) || first == '_' || first >= 0x80)) {
            return false;
        }
        for (int i = 1; i < s.length(); i++) {
            char c = s.charAt(i);
            if (!(asciiLetter(c) || (c >= '0' && c <= '9') || c == '_' || c == '-' || c >= 0x80)) {
                return false;
            }
        }
        return true;
    }

    /** A class's name: a letter, _ or $, then letters, digits, _ and $. */
    private static boolean identifier(String s) {
        if (s.isEmpty()) {
            return false;
        }
        char first = s.charAt(0);
        if (!(asciiLetter(first) || first == '_' || first == '$' || first >= 0x80)) {
            return false;
        }
        for (int i = 1; i < s.length(); i++) {
            char c = s.charAt(i);
            if (!(asciiLetter(c) || (c >= '0' && c <= '9') || c == '_' || c == '$' || c >= 0x80)) {
                return false;
            }
        }
        return true;
    }
}
