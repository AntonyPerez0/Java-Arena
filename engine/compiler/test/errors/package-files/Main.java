import shop.Item;

public class Main {
    public static void main(String[] args) {
        Item item = new Item("apple");
        System.out.println(item.name + item.price());
    }
}
