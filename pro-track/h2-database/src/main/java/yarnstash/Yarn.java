package yarnstash;

import java.util.Objects;

/**
 * One line of the yarn stash: a number of skeins of one yarn, from one shop. The id is the row's
 * id in the database, handed out by the database when the yarn is added.
 *
 * <p>This class is ready: you don't need to change it.
 */
public class Yarn {
    private final int id;
    private final String name;
    private final String shop;
    private final int skeins;

    public Yarn(int id, String name, String shop, int skeins) {
        this.id = id;
        this.name = name;
        this.shop = shop;
        this.skeins = skeins;
    }

    public int getId() {
        return this.id;
    }

    public String getName() {
        return this.name;
    }

    public String getShop() {
        return this.shop;
    }

    public int getSkeins() {
        return this.skeins;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof Yarn)) {
            return false;
        }
        Yarn that = (Yarn) other;
        return this.id == that.id
                && this.skeins == that.skeins
                && this.name.equals(that.name)
                && this.shop.equals(that.shop);
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.id, this.name, this.shop, this.skeins);
    }

    @Override
    public String toString() {
        return "#" + this.id + " " + this.name + " x" + this.skeins + " from " + this.shop;
    }
}
