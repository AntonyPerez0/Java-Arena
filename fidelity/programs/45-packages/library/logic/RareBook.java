package library.logic;

import library.domain.Book;

// A subclass in another package: it can use Book's protected members, through itself.
public class RareBook extends Book {
    private int copies;

    public RareBook(String title, int year, int copies) {
        super(title, year);
        this.copies = copies;
    }

    @Override
    protected String label() {
        return super.label() + " [rare, " + copies + " left]";
    }

    @Override
    public void lend() {
        if (copies > 0) {
            copies--;
            this.lent = copies == 0;
        }
    }
}
