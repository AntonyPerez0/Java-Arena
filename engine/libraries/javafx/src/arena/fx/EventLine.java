// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

/** One line of .arena/events.txt: an event, or why the line can't be used. */
final class EventLine {
    /** The line as written, without spaces at its ends (problems start with it). */
    final String text;
    /** click, type, set, enter or close; null when the line has a problem. */
    final String command;
    /** What the event acts on; null for close. */
    final Target target;
    /** The text to type or set. */
    final String argument;
    /** Why the line can't be used, in plain English, or null. */
    final String problem;

    private EventLine(String text, String command, Target target, String argument, String problem) {
        this.text = text;
        this.command = command;
        this.target = target;
        this.argument = argument;
        this.problem = problem;
    }

    static EventLine of(String text, String command, Target target, String argument) {
        return new EventLine(text, command, target, argument, null);
    }

    static EventLine problem(String text, String problem) {
        return new EventLine(text, null, null, null, problem);
    }
}
