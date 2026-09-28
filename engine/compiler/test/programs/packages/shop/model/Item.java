package shop.model;

public class Item {
    private final String name;
    private final int priceCents;
    private final int quantity;

    public Item(String name, int priceCents, int quantity) {
        this.name = name;
        this.priceCents = priceCents;
        this.quantity = quantity;
    }

    public int priceCents() {
        return priceCents;
    }

    public int quantity() {
        return quantity;
    }

    @Override
    public String toString() {
        return quantity + " x " + name;
    }
}
