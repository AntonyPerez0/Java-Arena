/*
 * Copyright 2026 Java Arena contributors.
 * SPDX-License-Identifier: Apache-2.0
 */

package javaarena.jdkmath;

/**
 * Math.multiplyHigh(long, long) (Java 9+), which TeaVM 0.13.1's class library
 * lacks. Same algorithm as the JDK's portable implementation (Hacker's Delight,
 * 2nd ed., section 8-2).
 */
final class MultiplyHigh {
    private MultiplyHigh() {
    }

    static long multiplyHigh(long x, long y) {
        long x1 = x >> 32;
        long x2 = x & 0xFFFFFFFFL;
        long y1 = y >> 32;
        long y2 = y & 0xFFFFFFFFL;

        long z2 = x2 * y2;
        long t = x1 * y2 + (z2 >>> 32);
        long z1 = t & 0xFFFFFFFFL;
        long z0 = t >> 32;
        z1 += x2 * y1;

        return x1 * y1 + z0 + (z1 >> 32);
    }
}
