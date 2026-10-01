package library.ui;

import library.logic.Loans;

// Uses library.domain.Book by its full name, without an import.
public class TextUi {
    private final Loans loans;

    public TextUi(Loans loans) {
        this.loans = loans;
    }

    public void printAll() {
        System.out.println("Books (newest id " + loans.newestId() + "):");
        for (library.domain.Book book : loans.all()) {
            System.out.println("  " + book);
        }
    }

    public void printLent() {
        java.util.List<library.domain.Book> lent = loans.lent();
        System.out.println(lent.size() + " lent:");
        for (library.domain.Book book : lent) {
            System.out.println("  " + book.getTitle());
        }
    }
}
