package library.domain;

public class Books {
    private String title;
    int pages;

    public Books(String title, int pages) {
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
