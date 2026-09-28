public class ThreadNoJoin {
    public static void main(String[] args) {
        Thread spinner = new Thread(() -> {
            while (true) {
                Thread.onSpinWait();
            }
        });
        spinner.setDaemon(true);
        spinner.start();
        Thread worker = new Thread(() -> {
            long sum = 0;
            for (int i = 0; i < 200_000; i++) {
                sum += i;
            }
            System.out.println("worker done " + sum);
        });
        worker.start();
        System.out.println("main done");
    }
}
