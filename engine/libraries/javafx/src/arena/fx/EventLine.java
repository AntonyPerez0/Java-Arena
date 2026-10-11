// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

/** One line of .arena/events.txt: an event, or why the line can't be used. */
final class EventLine {
    /** The line as written, without spaces at its ends (problems start with it). */
    final String text;
    /** click, type, set, enter, close, press, drag or release; null when the line has a problem. */
    final String command;
    /** What the event acts on; null for close. */
    final Target target;
    /** The text to type or set. */
    final String argument;
    /** The number a slider is set to (set Slider 1 25), as written; null otherwise. */
    final String number;
    /** The point of a mouse event (press, drag, release, click ... at), as written; null otherwise. */
    final String x;
    final String y;
    /** Why the line can't be used, in plain English, or null. */
    final String problem;

    private EventLine(String text, String command, Target target, String argument, String number, String x, String y, String problem) {
        this.text = text;
        this.command = command;
        this.target = target;
        this.argument = argument;
        this.number = number;
        this.x = x;
        this.y = y;
        this.problem = problem;
    }

    static EventLine of(String text, String command, Target target, String argument) {
        return new EventLine(text, command, target, argument, null, null, null, null);
    }

    static EventLine number(String text, String command, Target target, String number) {
        return new EventLine(text, command, target, null, number, null, null, null);
    }

    static EventLine point(String text, String command, Target target, String x, String y) {
        return new EventLine(text, command, target, null, null, x, y, null);
    }

    static EventLine problem(String text, String problem) {
        return new EventLine(text, null, null, null, null, null, null, problem);
    }
}
