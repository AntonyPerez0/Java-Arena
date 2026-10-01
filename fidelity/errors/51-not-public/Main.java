import library.domain.Book;
import library.domain.Shelf;

public class Main {
    public static void main(String[] args) {
        Book book = new Book("Dune", 412);
        System.out.println(book.pages);
        System.out.println(book.shelfLabel());
        Shelf shelf = new Shelf();
    }
}
