import java.util.ArrayList;

class Account {
    private int balance = 100;
    private void audit() { }
}

public class Main {
    public static void main(String[] args) {
        Account a = new Account();
        a.balance = 5;
        a.audit();
        ArrayList<String> list = new ArrayList<>();
        System.out.println(list.size);
        String s = "abc";
        System.out.println(s.value);
    }
}
