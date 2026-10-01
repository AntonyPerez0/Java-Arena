package library.domain;

// A package-private class: the other classes of library.domain use it, and nothing outside can.
class IdCounter {
    private static int last = 100;

    static int next() {
        last++;
        return last;
    }
}
