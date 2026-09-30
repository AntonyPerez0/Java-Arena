import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;

// Part 8 of the course: hash maps with keys of the program's own classes (equals and hashCode
// written by hand and with Objects.hash), counting and grouping, and the order a HashMap goes
// through its keys after it has grown, had keys removed and been filled again.
public class Main {
    public static void main(String[] args) {
        HashMap<Seat, String> seats = new HashMap<>();
        for (int row = 1; row <= 6; row++) {
            for (int number = 1; number <= 8; number++) {
                seats.put(new Seat(row, number), "guest " + (row * 10 + number));
            }
        }
        System.out.println(seats.size() + " " + seats.get(new Seat(3, 5)) + " " + seats.containsKey(new Seat(7, 1)));
        for (int number = 1; number <= 8; number += 2) {
            seats.remove(new Seat(2, number));
        }
        StringBuilder order = new StringBuilder();
        for (Seat seat : seats.keySet()) {
            order.append(seat).append(' ');
        }
        System.out.println(order.toString().trim());

        HashMap<Coin, Integer> counts = new HashMap<>();
        String[] found = {"FI 2002 50", "SE 1998 10", "FI 2002 50", "DE 2011 20", "fi 2002 50", "SE 1998 10", "EE 2019 5"};
        for (String line : found) {
            String[] parts = line.split(" ");
            Coin coin = new Coin(parts[0], Integer.valueOf(parts[1]), Integer.valueOf(parts[2]));
            counts.put(coin, counts.getOrDefault(coin, 0) + 1);
        }
        System.out.println(counts);
        System.out.println(new Coin("FI", 2002, 50).hashCode() + " " + new Coin("fi", 2002, 50).hashCode() + " " + Objects.hash("FI", 2002, 50));

        HashMap<String, ArrayList<String>> byLetter = new HashMap<>();
        String[] words = {"harbor", "anchor", "buoy", "hull", "bow", "stern", "keel", "mast", "sail", "boom", "rudder", "deck", "aft", "bilge"};
        for (String word : words) {
            String letter = word.substring(0, 1);
            if (!byLetter.containsKey(letter)) {
                byLetter.put(letter, new ArrayList<>());
            }
            byLetter.get(letter).add(word);
        }
        System.out.println(byLetter);
        byLetter.remove("b");
        byLetter.put("z", new ArrayList<>());
        System.out.println(byLetter.keySet() + " " + byLetter.values());

        HashMap<Integer, String> numbers = new HashMap<>();
        int[] keys = {-7, 0, 16, 33, 1024, -1, 65536, 17, 1, 2000000000};
        for (int key : keys) {
            numbers.put(key, "n" + key);
        }
        System.out.println(numbers);
        HashMap<Character, Integer> letters = new HashMap<>();
        for (char c : "mississippi river".toCharArray()) {
            letters.put(c, letters.getOrDefault(c, 0) + 1);
        }
        System.out.println(letters);
        System.out.println("abc".hashCode() + " " + "".hashCode() + " " + Integer.valueOf(-5).hashCode() + " " + Double.hashCode(2.5) + " " + Boolean.hashCode(true) + " " + Character.hashCode('A'));
        System.out.println(Arrays.hashCode(new int[] {1, 2, 3}) + " " + List.of("a", "b").hashCode() + " " + Objects.hash() + " " + Objects.hashCode(null) + " " + Objects.equals(null, null));
    }
}

class Seat {
    private final int row;
    private final int number;

    public Seat(int row, int number) {
        this.row = row;
        this.number = number;
    }

    public boolean equals(Object compared) {
        if (this == compared) {
            return true;
        }
        if (!(compared instanceof Seat)) {
            return false;
        }
        Seat other = (Seat) compared;
        return this.row == other.row && this.number == other.number;
    }

    public int hashCode() {
        return 31 * this.row + this.number;
    }

    public String toString() {
        return this.row + "-" + this.number;
    }
}

class Coin {
    private final String country;
    private final int year;
    private final int cents;

    public Coin(String country, int year, int cents) {
        this.country = country;
        this.year = year;
        this.cents = cents;
    }

    // Country codes compare without regard to capital letters, so the hash code uses the upper-case code.
    public boolean equals(Object compared) {
        if (this == compared) {
            return true;
        }
        if (!(compared instanceof Coin)) {
            return false;
        }
        Coin other = (Coin) compared;
        return this.country.equalsIgnoreCase(other.country) && this.year == other.year && this.cents == other.cents;
    }

    public int hashCode() {
        return Objects.hash(this.country.toUpperCase(), this.year, this.cents);
    }

    public String toString() {
        return this.country.toUpperCase() + " " + this.year + " " + this.cents + "c";
    }
}
