sealed interface Payment permits Cash, Card {
}

record Cash(int cents) implements Payment {
}

class Card implements Payment {
}

record Voucher(String code) implements Payment {
}

sealed abstract class Vehicle permits Car, Bus {
}

final class Car extends Vehicle {
}

abstract class Bus extends Vehicle {
}

final class Bike extends Vehicle {
}

public class Main {
    public static void main(String[] args) {
        System.out.println(new Cash(100));
    }
}
