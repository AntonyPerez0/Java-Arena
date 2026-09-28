public class ThreadInterrupt {
    static final Object lock = new Object();

    public static void main(String[] args) throws InterruptedException {
        // InterruptedException from wait, sleep and join clears the thread's interrupt status.
        Thread waiter = new Thread(() -> {
            synchronized (lock) {
                try {
                    lock.wait();
                    System.out.println("waiter woke up");
                } catch (InterruptedException e) {
                    System.out.println(e + ", still interrupted: " + Thread.currentThread().isInterrupted());
                }
            }
        });
        waiter.start();
        Thread.sleep(20);
        waiter.interrupt();
        waiter.join();

        Thread sleeper = new Thread(() -> {
            try {
                Thread.sleep(60_000);
            } catch (InterruptedException e) {
                System.out.println(e + ", still interrupted: " + Thread.currentThread().isInterrupted());
            }
        });
        sleeper.start();
        Thread.sleep(20);
        sleeper.interrupt();
        sleeper.join();

        Thread.currentThread().interrupt();
        try {
            Thread.sleep(5);
        } catch (InterruptedException e) {
            System.out.println("interrupted before sleep, still interrupted: " + Thread.interrupted());
        }

        Thread slow = new Thread(() -> {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                System.out.println("slow thread interrupted");
            }
        });
        slow.start();
        Thread.currentThread().interrupt();
        try {
            slow.join();
        } catch (InterruptedException e) {
            System.out.println(e + " in join, still interrupted: " + Thread.currentThread().isInterrupted());
        }
        slow.join();
        System.out.println("done");
    }
}
