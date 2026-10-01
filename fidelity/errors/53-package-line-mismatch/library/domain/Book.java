package library;

public class Book {
    private String title;
    int pages;

    public Book(String title, int pages) {
        this.title = title;
        this.pages = pages;
    }

    public String getTitle() {
        return title;
    }

    String shelfLabel() {
        return title.substring(0, 1);
    }

    protected String describe() {
        return title + ", " + pages + " pages";
    }
}
