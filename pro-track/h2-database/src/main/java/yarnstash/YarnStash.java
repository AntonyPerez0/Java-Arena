package yarnstash;

import java.util.List;
import java.util.Map;
import java.util.Scanner;
import java.util.TreeMap;

/**
 * The yarn stash's text user interface. It talks only to the YarnDao interface, so it works the
 * same with any DAO.
 *
 * <p>This class is ready: you don't need to change it.
 */
public class YarnStash {
    private final Scanner scanner;
    private final YarnDao yarns;

    public YarnStash(Scanner scanner, YarnDao yarns) {
        this.scanner = scanner;
        this.yarns = yarns;
    }

    public void start() {
        System.out.println("Yarn stash. Commands: add, list, search, change, remove, totals, quit");
        while (true) {
            System.out.print("Command: ");
            if (!this.scanner.hasNextLine()) {
                break;
            }
            String command = this.scanner.nextLine().trim();
            if (command.equals("quit")) {
                break;
            } else if (command.equals("add")) {
                add();
            } else if (command.equals("list")) {
                print(this.yarns.list());
            } else if (command.equals("search")) {
                print(this.yarns.search(ask("Name contains")));
            } else if (command.equals("change")) {
                change();
            } else if (command.equals("remove")) {
                remove();
            } else if (command.equals("totals")) {
                totals();
            } else if (!command.isEmpty()) {
                System.out.println("Unknown command: " + command);
            }
        }
        System.out.println("Bye!");
    }

    private void add() {
        String name = ask("Yarn");
        String shop = ask("Shop");
        int skeins = askNumber("Skeins");
        try {
            int id = this.yarns.add(name, shop, skeins);
            System.out.println("Added yarn " + id + ".");
        } catch (IllegalArgumentException e) {
            System.out.println("Not added: " + e.getMessage());
        }
    }

    private void change() {
        int id = askNumber("Id");
        Yarn old = this.yarns.findById(id);
        if (old == null) {
            System.out.println("There's no yarn " + id + ".");
            return;
        }
        System.out.println(old);
        String name = askOrKeep("Yarn", old.getName());
        String shop = askOrKeep("Shop", old.getShop());
        String skeinsText = askOrKeep("Skeins", String.valueOf(old.getSkeins())).trim();
        int skeins;
        try {
            skeins = Integer.valueOf(skeinsText);
        } catch (NumberFormatException e) {
            System.out.println("Not changed: " + skeinsText + " isn't a whole number");
            return;
        }
        try {
            this.yarns.update(new Yarn(id, name, shop, skeins));
            System.out.println("Changed: " + this.yarns.findById(id));
        } catch (IllegalArgumentException e) {
            System.out.println("Not changed: " + e.getMessage());
        }
    }

    private void remove() {
        int id = askNumber("Id");
        if (this.yarns.remove(id)) {
            System.out.println("Removed yarn " + id + ".");
        } else {
            System.out.println("There's no yarn " + id + ".");
        }
    }

    private void totals() {
        // A TreeMap keeps its keys in alphabetical order.
        Map<String, Integer> totals = new TreeMap<>(this.yarns.totalsByName());
        if (totals.isEmpty()) {
            System.out.println("No yarn yet.");
        }
        for (String name : totals.keySet()) {
            System.out.println(name + ": " + totals.get(name));
        }
    }

    private void print(List<Yarn> list) {
        if (list.isEmpty()) {
            System.out.println("No yarn.");
        }
        for (Yarn yarn : list) {
            System.out.println(yarn);
        }
    }

    private String ask(String question) {
        System.out.print(question + ": ");
        return this.scanner.hasNextLine() ? this.scanner.nextLine() : "";
    }

    private String askOrKeep(String question, String old) {
        String answer = ask(question + " (empty keeps " + old + ")");
        return answer.isBlank() ? old : answer;
    }

    private int askNumber(String question) {
        while (true) {
            String answer = ask(question).trim();
            try {
                return Integer.valueOf(answer);
            } catch (NumberFormatException e) {
                System.out.println("Please give a whole number.");
                if (!this.scanner.hasNextLine()) {
                    return 0;
                }
            }
        }
    }
}
