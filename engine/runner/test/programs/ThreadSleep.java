public class ThreadSleep {
    public static void main(String[] args) throws InterruptedException {
        // While main sleeps, the worker keeps running.
        Thread worker = new Thread(() -> System.out.println("worker runs while main sleeps"));
        worker.start();
        Thread.sleep(200);
        System.out.println("main woke up");
        worker.join();

        // Interrupting a sleeping thread ends its sleep with InterruptedException.
        Thread sleeper = new Thread(() -> {
            try {
                Thread.sleep(60_000);
                System.out.println("sleeper was not interrupted");
            } catch (InterruptedException e) {
                System.out.println("sleeper interrupted: " + e.getMessage());
            }
        });
        sleeper.start();
        Thread.sleep(50);
        sleeper.interrupt();
        sleeper.join();
        System.out.println("done");
    }
}
