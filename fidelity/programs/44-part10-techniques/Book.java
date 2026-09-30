public class Book implements Comparable<Book> {
    private final String title;
    private final String author;
    private final int year;
    private final int pages;

    public Book(String title, String author, int year, int pages) {
        this.title = title;
        this.author = author;
        this.year = year;
        this.pages = pages;
    }

    public static Book parse(String line) {
        String[] parts = line.split(";");
        return new Book(parts[0], parts[1], Integer.valueOf(parts[2]), Integer.valueOf(parts[3]));
    }

    public String getTitle() {
        return title;
    }

    public String getAuthor() {
        return author;
    }

    public int getYear() {
        return year;
    }

    public int getPages() {
        return pages;
    }

    @Override
    public int compareTo(Book other) {
        return this.title.compareTo(other.title);
    }

    @Override
    public String toString() {
        return title + " (" + author + ", " + year + ", " + pages + " p.)";
    }
}
