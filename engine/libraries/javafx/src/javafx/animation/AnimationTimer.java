// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.animation;

import arena.fx.Frames;

/**
 * A game loop: once started, handle(now) is called once per frame, about 60 times a second in
 * JavaFX. In Java Arena frames run only when an event line says so (frames 30): in each frame
 * every started timer's handle runs, in the order the timers were started. now is a made-up clock
 * here (real JavaFX's comes from the computer's clock), so don't print it or depend on its value.
 */
public abstract class AnimationTimer {
    public AnimationTimer() {
    }

    /** Called once per frame while the timer is started. */
    public abstract void handle(long now);

    /** Starts the timer (a started timer stays where it is in the order). */
    public void start() {
        Frames.start(this);
    }

    /** Stops the timer; started again, it runs after the timers started before. */
    public void stop() {
        Frames.stop(this);
    }
}
