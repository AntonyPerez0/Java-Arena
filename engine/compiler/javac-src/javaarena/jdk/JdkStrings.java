/*
 * Copyright (c) 1994, 2024, Oracle and/or its affiliates. All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  Oracle designates this
 * particular file as subject to the "Classpath" exception as provided
 * by Oracle in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Please contact Oracle, 500 Oracle Parkway, Redwood Shores, CA 94065 USA
 * or visit www.oracle.com if you need additional information or have any
 * questions.
 */

package javaarena.jdk;

import java.util.ArrayList;
import java.util.List;

/**
 * String.stripIndent() and String.translateEscapes() of OpenJDK 21, which javac
 * applies to string literals and text blocks, as static methods that use JDK 21
 * character data (JdkChars) instead of TeaVM's String and Character.
 *
 * Java Arena: adapted from openjdk/jdk21u jdk-21.0.10+7
 * src/java.base/share/classes/java/lang/String.java (with StringLatin1/StringUTF16
 * indexOfNonWhitespace, lastIndexOfNonWhitespace and lines()).
 */
public final class JdkStrings {
    private JdkStrings() {
    }

    public static String stripIndent(String s) {
        int length = s.length();
        if (length == 0) {
            return "";
        }
        char lastChar = s.charAt(length - 1);
        boolean optOut = lastChar == '\n' || lastChar == '\r';
        List<String> lines = lines(s);
        final int outdent = optOut ? 0 : outdent(lines);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            if (i > 0) {
                sb.append('\n');
            }
            int firstNonWhitespace = indexOfNonWhitespace(line);
            int lastNonWhitespace = lastIndexOfNonWhitespace(line);
            int incidentalWhitespace = Math.min(outdent, firstNonWhitespace);
            if (firstNonWhitespace <= lastNonWhitespace) {
                sb.append(line, incidentalWhitespace, lastNonWhitespace);
            }
        }
        if (optOut) {
            sb.append('\n');
        }
        return sb.toString();
    }

    private static int outdent(List<String> lines) {
        // Note: outdent is guaranteed to be zero or positive number.
        // If there isn't a non-blank line then the last must be blank
        int outdent = Integer.MAX_VALUE;
        for (String line : lines) {
            int leadingWhitespace = indexOfNonWhitespace(line);
            if (leadingWhitespace != line.length()) {
                outdent = Integer.min(outdent, leadingWhitespace);
            }
        }
        String lastLine = lines.get(lines.size() - 1);
        if (indexOfNonWhitespace(lastLine) == lastLine.length()) {
            outdent = Integer.min(outdent, lastLine.length());
        }
        return outdent;
    }

    private static int indexOfNonWhitespace(String s) {
        int length = s.length();
        int left = 0;
        while (left < length) {
            int codepoint = s.codePointAt(left);
            if (codepoint != ' ' && codepoint != '\t' && !JdkChars.isWhitespace(codepoint)) {
                break;
            }
            left += Character.charCount(codepoint);
        }
        return left;
    }

    private static int lastIndexOfNonWhitespace(String s) {
        int right = s.length();
        while (0 < right) {
            int codepoint = s.codePointBefore(right);
            if (codepoint != ' ' && codepoint != '\t' && !JdkChars.isWhitespace(codepoint)) {
                break;
            }
            right -= Character.charCount(codepoint);
        }
        return right;
    }

    // String.lines(): lines end at "\n", "\r" or "\r\n"; no empty line after a final terminator.
    private static List<String> lines(String s) {
        List<String> lines = new ArrayList<>();
        int length = s.length();
        int index = 0;
        while (index < length) {
            int end = index;
            while (end < length && s.charAt(end) != '\n' && s.charAt(end) != '\r') {
                end++;
            }
            lines.add(s.substring(index, end));
            if (end < length) {
                if (s.charAt(end) == '\r' && end + 1 < length && s.charAt(end + 1) == '\n') {
                    end++;
                }
                end++;
            }
            index = end;
        }
        return lines;
    }

    public static String translateEscapes(String s) {
        if (s.isEmpty()) {
            return "";
        }
        char[] chars = s.toCharArray();
        int length = chars.length;
        int from = 0;
        int to = 0;
        while (from < length) {
            char ch = chars[from++];
            if (ch == '\\') {
                ch = from < length ? chars[from++] : '\0';
                switch (ch) {
                case 'b':
                    ch = '\b';
                    break;
                case 'f':
                    ch = '\f';
                    break;
                case 'n':
                    ch = '\n';
                    break;
                case 'r':
                    ch = '\r';
                    break;
                case 's':
                    ch = ' ';
                    break;
                case 't':
                    ch = '\t';
                    break;
                case '\'':
                case '\"':
                case '\\':
                    // as is
                    break;
                case '0': case '1': case '2': case '3':
                case '4': case '5': case '6': case '7':
                    int limit = Integer.min(from + (ch <= '3' ? 2 : 1), length);
                    int code = ch - '0';
                    while (from < limit) {
                        ch = chars[from];
                        if (ch < '0' || '7' < ch) {
                            break;
                        }
                        from++;
                        code = (code << 3) | (ch - '0');
                    }
                    ch = (char)code;
                    break;
                case '\n':
                    continue;
                case '\r':
                    if (from < length && chars[from] == '\n') {
                        from++;
                    }
                    continue;
                default:
                    // javac reports the bad escape itself and ignores this exception.
                    throw new IllegalArgumentException("Invalid escape sequence: \\" + ch);
                }
            }

            chars[to++] = ch;
        }

        return new String(chars, 0, to);
    }
}
