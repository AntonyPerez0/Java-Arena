import java.util.ArrayList;
import java.util.Scanner;

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        ArrayList<Book> books = new ArrayList<>();

        while (true) {
            System.out.print("Title: ");
            String title = scanner.nextLine();
            if (title.isEmpty()) {
                break;
            }
            System.out.print("Pages: ");
            int pages = Integer.valueOf(scanner.nextLine());
            System.out.print("Year: ");
            int year = Integer.valueOf(scanner.nextLine());
            books.add(new Book(title, pages, year));
        }

        System.out.println();
        System.out.print("What information will be printed? ");
        String what = scanner.nextLine();
        for (Book book : books) {
            if (what.equals("everything")) {
                System.out.println(book);
            } else if (what.equals("name")) {
                System.out.println(book.getTitle());
            }
        }
        System.out.println("Oldest: " + oldest(books));
        System.out.println("Average pages: " + averagePages(books));
    }

    public static Book oldest(ArrayList<Book> books) {
        Book oldest = books.get(0);
        for (Book b : books) {
            if (b.getYear() < oldest.getYear()) {
                oldest = b;
            }
        }
        return oldest;
    }

    public static double averagePages(ArrayList<Book> books) {
        int sum = 0;
        for (Book b : books) {
            sum += b.getPages();
        }
        return 1.0 * sum / books.size();
    }
}

class Book {
    private String title;
    private int pages;
    private int year;

    public Book(String title, int pages, int year) {
        this.title = title;
        this.pages = pages;
        this.year = year;
    }

    public String getTitle() { return title; }
    public int getPages() { return pages; }
    public int getYear() { return year; }

    @Override
    public String toString() {
        return this.title + ", " + this.pages + " pages, " + this.year;
    }
}
