package library.domain;

public class Book {
    private final String title;
    private final int year;
    private final int id;
    // Subclasses, in any package, can use this; other classes only through isLent.
    protected boolean lent;

    public Book(String title, int year) {
        this.title = title;
        this.year = year;
        this.id = IdCounter.next();
    }

    public String getTitle() {
        return title;
    }

    public int getYear() {
        return year;
    }

    public boolean isLent() {
        return lent;
    }

    public void lend() {
        lent = true;
    }

    // Package-private: only the classes of library.domain can call it.
    int id() {
        return id;
    }

    protected String label() {
        return "#" + id + " " + title + " (" + year + ")";
    }

    @Override
    public String toString() {
        return label() + (lent ? ", lent" : "");
    }
}
