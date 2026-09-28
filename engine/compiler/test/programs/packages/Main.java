import shop.Cart;
import shop.model.Item;

public class Main {
    public static void main(String[] args) {
        Cart cart = new Cart();
        cart.add(new Item("milk", 129, 2));
        cart.add(new Item("bread", 249, 1));
        cart.add(new Item("cheese", 599, 1));
        System.out.println(cart);
        System.out.println("Total: " + Cart.format(cart.totalCents()));
    }
}
