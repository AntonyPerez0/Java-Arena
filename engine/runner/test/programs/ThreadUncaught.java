public class ThreadUncaught {
    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            throw new IllegalStateException("in worker");
        });
        worker.start();
        worker.join();
        System.out.println("main continues after the worker died");
    }
}
