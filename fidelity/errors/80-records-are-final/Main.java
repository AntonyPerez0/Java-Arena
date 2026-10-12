public class Main {
    record Book(String title, boolean available) {
    }

    public static void main(String[] args) {
        Point p = new Point(1, 2);
        System.out.println(p.x);
        p.y = 4;
        System.out.println(p.getX());
        Book book = new Book("Dune", true);
        book.title = "Emma";
        System.out.println(book.isAvailable());
    }
}
