public class Main {
    static class Book {
        String title = "Clean Code";
    }

    public static void main(String[] args) {
        Book book = new Book();
        System.out.println(book);
        System.out.println(new Object().hashCode() != 0);
        System.out.println(book.toString().startsWith("Main$Book@"));
    }
}
