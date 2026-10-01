import library.domain.Book;
import library.logic.RareBook;

public class Main {
    public static void main(String[] args) {
        Book book = new Book("Dune", 412);
        System.out.println(book.describe());
        RareBook rare = new RareBook("Codex", 90, 1500);
        System.out.println(rare.label(book));
    }
}
