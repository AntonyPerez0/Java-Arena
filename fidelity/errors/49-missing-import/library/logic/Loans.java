package library.logic;

public class Loans {
    public void lend(String title) {
        Book book = new Book(title, 100);
        System.out.println("Lent " + book.getTitle());
    }
}
