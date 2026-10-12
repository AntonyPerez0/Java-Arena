// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

/**
 * Text being written into an array of characters: what the frames' record is built with. In the
 * browser's interpreter StringBuilder.append costs several microseconds a call (its checks and
 * copies run as interpreted bytecode), which the many short pieces of a frame add up to; storing
 * characters into an array is far quicker there. The JDK gives the same text either way.
 */
final class JsonText {
    private char[] buf = new char[1024];
    private int length;

    int length() {
        return length;
    }

    void setLength(int n) {
        length = n;
    }

    private void room(int more) {
        if (length + more > buf.length) {
            char[] bigger = new char[Math.max(buf.length * 2, length + more)];
            System.arraycopy(buf, 0, bigger, 0, length);
            buf = bigger;
        }
    }

    JsonText append(char c) {
        if (length == buf.length) {
            room(1);
        }
        buf[length++] = c;
        return this;
    }

    JsonText append(char[] chars) {
        int n = chars.length;
        room(n);
        char[] b = buf;
        int at = length;
        for (int i = 0; i < n; i++) {
            b[at + i] = chars[i];
        }
        length = at + n;
        return this;
    }

    JsonText append(String s) {
        int n = s.length();
        room(n);
        s.getChars(0, n, buf, length);
        length += n;
        return this;
    }

    JsonText append(JsonText other) {
        room(other.length);
        System.arraycopy(other.buf, 0, buf, length, other.length);
        length += other.length;
        return this;
    }

    /** A whole number, from its digits. */
    JsonText append(long v) {
        if (v < 0) {
            if (v == Long.MIN_VALUE) {
                return append(Long.toString(v));
            }
            append('-');
            v = -v;
        }
        room(20);
        if (v < 10) {
            buf[length++] = (char) ('0' + v);
            return this;
        }
        if (v < 1000000000) {
            // In int arithmetic, quicker than long in the browser's interpreter.
            int n = (int) v;
            int digits = n < 100 ? 2 : n < 1000 ? 3 : n < 10000 ? 4 : n < 100000 ? 5 : n < 1000000 ? 6 : n < 10000000 ? 7 : n < 100000000 ? 8 : 9;
            int end = length + digits;
            for (int i = end - 1; i >= length; i--) {
                int q = n / 10;
                buf[i] = (char) ('0' + (n - q * 10));
                n = q;
            }
            length = end;
            return this;
        }
        int digits = 0;
        for (long t = v; t > 0; t /= 10) {
            digits++;
        }
        int end = length + digits;
        for (int i = end - 1; i >= length; i--) {
            buf[i] = (char) ('0' + (int) (v % 10));
            v /= 10;
        }
        length = end;
        return this;
    }

    @Override
    public String toString() {
        return new String(buf, 0, length);
    }
}
