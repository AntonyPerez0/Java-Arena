package library.domain;

import java.util.ArrayList;
import java.util.List;

public class Shelf {
    private final List<Book> books = new ArrayList<>();

    public void add(Book book) {
        books.add(book);
    }

    public List<Book> books() {
        return books;
    }

    public Book find(String title) {
        for (Book book : books) {
            if (book.getTitle().equals(title)) {
                return book;
            }
        }
        return null;
    }

    // Uses Book's package-private id, from a class in the same package.
    public int newestId() {
        int newest = 0;
        for (Book book : books) {
            newest = Math.max(newest, book.id());
        }
        return newest;
    }
}
