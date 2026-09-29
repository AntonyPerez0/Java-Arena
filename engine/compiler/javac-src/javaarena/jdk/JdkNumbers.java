/*
 * Copyright 2026 Java Arena contributors.
 * SPDX-License-Identifier: Apache-2.0
 */

package javaarena.jdk;

/**
 * The number parsing and printing of OpenJDK 21's java.lang.Float and Double,
 * for javac running on TeaVM, whose own Float/Double differ in edge cases.
 * The implementation classes in this package are copied from openjdk/jdk21u
 * (jdk.internal.math) by engine/compiler/build.sh.
 */
public final class JdkNumbers {
    private JdkNumbers() {
    }

    /** Same as JDK 21 Float.parseFloat. */
    public static float parseFloat(String s) {
        return FloatingDecimal.parseFloat(s);
    }

    /** Same as JDK 21 Double.parseDouble. */
    public static double parseDouble(String s) {
        return FloatingDecimal.parseDouble(s);
    }

    /** Same as JDK 21 Float.toString(float). */
    public static String toString(float f) {
        return FloatToDecimal.toString(f);
    }

    /** Same as JDK 21 Double.toString(double). */
    public static String toString(double d) {
        return DoubleToDecimal.toString(d);
    }

    /** Float and Double values as JDK 21 prints them; anything else via String.valueOf. */
    public static String valueToString(Object value) {
        if (value instanceof Float f) {
            return toString(f.floatValue());
        }
        if (value instanceof Double d) {
            return toString(d.doubleValue());
        }
        return String.valueOf(value);
    }
    /** -v with the sign bit flipped, so -(0.0) is -0.0 (TeaVM's Wasm output computes 0 - v). */
    public static float negate(float v) {
        return Float.intBitsToFloat(Float.floatToRawIntBits(v) ^ 0x80000000);
    }

    /** -v with the sign bit flipped, so -(0.0) is -0.0 (TeaVM's Wasm output computes 0 - v). */
    public static double negate(double v) {
        return Double.longBitsToDouble(Double.doubleToRawLongBits(v) ^ 0x8000000000000000L);
    }

    /** Java's float remainder x % y, exactly (TeaVM's Wasm output is inexact). */
    public static float remainder(float x, float y) {
        // The exact remainder of two floats is a float, so computing it in double is exact.
        return (float) remainder((double) x, (double) y);
    }

    /**
     * Java's double remainder x % y (C fmod: truncating division, result has the sign
     * of x), computed exactly with integer arithmetic on the significands.
     */
    public static double remainder(double x, double y) {
        long ux = Double.doubleToRawLongBits(x);
        long uy = Double.doubleToRawLongBits(y);
        long ax = ux & 0x7fffffffffffffffL;
        long ay = uy & 0x7fffffffffffffffL;
        long sign = ux & 0x8000000000000000L;
        if (ay == 0 || ay > 0x7ff0000000000000L || ax >= 0x7ff0000000000000L) {
            return Double.NaN;
        }
        if (ax <= ay) {
            return ax == ay ? Double.longBitsToDouble(sign) : x;
        }
        int ex = (int) (ax >>> 52);
        int ey = (int) (ay >>> 52);
        long mx;
        long my;
        if (ex == 0) {
            int shift = Long.numberOfLeadingZeros(ax) - 11;
            mx = ax << shift;
            ex = 1 - shift;
        } else {
            mx = (ax & 0xfffffffffffffL) | 0x10000000000000L;
        }
        if (ey == 0) {
            int shift = Long.numberOfLeadingZeros(ay) - 11;
            my = ay << shift;
            ey = 1 - shift;
        } else {
            my = (ay & 0xfffffffffffffL) | 0x10000000000000L;
        }
        for (; ex > ey; ex--) {
            long d = mx - my;
            if (d >= 0) {
                if (d == 0) {
                    return Double.longBitsToDouble(sign);
                }
                mx = d;
            }
            mx <<= 1;
        }
        long d = mx - my;
        if (d >= 0) {
            if (d == 0) {
                return Double.longBitsToDouble(sign);
            }
            mx = d;
        }
        int shift = Long.numberOfLeadingZeros(mx) - 11;
        mx <<= shift;
        ex -= shift;
        if (ex > 0) {
            mx = (mx - 0x10000000000000L) | ((long) ex << 52);
        } else {
            mx >>>= 1 - ex;
        }
        return Double.longBitsToDouble(mx | sign);
    }
}
