import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import library.domain.Book;
import library.logic.Loans;
import library.logic.RareBook;
import library.ui.TextUi;

// A three-tier program in packages: library.domain (the data), library.logic (what the program
// does with it) and library.ui (what it prints). Main stays in no package.
public class Main {
    public static void main(String[] args) throws IOException {
        Loans loans = new Loans();
        loans.readBooks("data/books.txt");
        loans.add(new RareBook("Codex", 1450, 1));
        TextUi ui = new TextUi(loans);
        ui.printAll();
        loans.lend("Dune");
        loans.lend("Codex");
        loans.lend("Codex");
        loans.lend("Neuromancer");
        ui.printLent();
        loans.save("data/lent.txt");
        System.out.print(Files.readString(Path.of("data/lent.txt")));
        List<Book> old = loans.olderThan(1900);
        System.out.println("Older than 1900: " + old);
        System.out.println(TextUi.class.getName() + " " + RareBook.class.getSimpleName());
        System.out.println(new RareBook("Atlas", 1570, 2) instanceof Book);
    }
}
