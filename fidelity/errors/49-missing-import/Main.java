import library.domain.*;

public class Main {
    public static void main(String[] args) {
        Book book = new Book("Dune", 412);
        Loans loans = new Loans();
        loans.lend(book.getTitle());
    }
}
