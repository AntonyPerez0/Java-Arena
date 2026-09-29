public class Main {
    public static void main(String[] args) {
        Account account = new Account();
        account.balance = 1000;
        System.out.println(account.balance);
    }
}

class Account {
    private int balance;
}
