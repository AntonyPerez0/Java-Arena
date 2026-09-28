package shop;

import java.util.ArrayList;
import java.util.List;
import shop.model.Item;

public class Cart {
    private final List<Item> items = new ArrayList<>();

    public void add(Item item) {
        items.add(item);
    }

    public int totalCents() {
        int total = 0;
        for (Item item : items) {
            total += item.priceCents() * item.quantity();
        }
        return total;
    }

    public static String format(int cents) {
        return cents / 100 + "." + String.format("%02d", cents % 100) + " EUR";
    }

    @Override
    public String toString() {
        return "Cart" + items;
    }
}
