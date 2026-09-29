public class ThreadMainThrows {
    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                return;
            }
            System.out.println("worker finished after main threw");
        });
        worker.start();
        throw new IllegalStateException("main fails");
    }
}
