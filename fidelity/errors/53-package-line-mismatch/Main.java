import library.domain.Book;

public class Main {
    public static void main(String[] args) {
        Book book = new Book("Dune", 412);
        System.out.println(book.getTitle());
    }
}
