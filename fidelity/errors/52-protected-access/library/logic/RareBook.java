package library.logic;

import library.domain.Book;

public class RareBook extends Book {
    private int year;

    public RareBook(String title, int pages, int year) {
        super(title, pages);
        this.year = year;
    }

    public String label(Book other) {
        return describe() + " from " + year + ", " + pages + " pages, next to " + other.describe();
    }
}
