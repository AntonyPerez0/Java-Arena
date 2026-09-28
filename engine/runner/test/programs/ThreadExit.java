public class ThreadExit {
    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            System.out.println("worker exits");
            System.exit(3);
        });
        worker.start();
        worker.join();
        System.out.println("main must not continue");
    }
}
