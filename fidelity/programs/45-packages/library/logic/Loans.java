package library.logic;

import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import library.domain.Book;
import library.domain.Shelf;

public class Loans {
    private final Shelf shelf = new Shelf();

    public void readBooks(String file) throws IOException {
        for (String line : Files.readAllLines(Paths.get(file))) {
            String[] parts = line.split(";");
            shelf.add(new Book(parts[0], Integer.valueOf(parts[1])));
        }
    }

    public void add(Book book) {
        shelf.add(book);
    }

    public List<Book> all() {
        return shelf.books();
    }

    public boolean lend(String title) {
        Book book = shelf.find(title);
        if (book == null || book.isLent()) {
            System.out.println("Can't lend " + title);
            return false;
        }
        book.lend();
        System.out.println("Lent " + title);
        return true;
    }

    public List<Book> lent() {
        List<Book> lent = new ArrayList<>();
        for (Book book : shelf.books()) {
            if (book.isLent()) {
                lent.add(book);
            }
        }
        return lent;
    }

    public List<Book> olderThan(int year) {
        List<Book> old = new ArrayList<>();
        for (Book book : shelf.books()) {
            if (book.getYear() < year) {
                old.add(book);
            }
        }
        return old;
    }

    public int newestId() {
        return shelf.newestId();
    }

    public void save(String file) throws IOException {
        try (PrintWriter writer = new PrintWriter(file)) {
            for (Book book : lent()) {
                writer.println(book.getTitle() + ";" + book.getYear());
            }
        }
    }
}
