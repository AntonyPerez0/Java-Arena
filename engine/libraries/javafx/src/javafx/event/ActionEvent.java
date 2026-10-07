// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.event;

/** The event of a button being pressed, or of Enter being pressed in a text field. getSource() is that control. */
public class ActionEvent extends Event {
    private static final long serialVersionUID = 20161L;

    static {
        arena.fx.Actions.register(new arena.fx.Actions.Factory() {
            @Override
            public ActionEvent create(Object source) {
                ActionEvent event = new ActionEvent();
                event.source = source;
                return event;
            }
        });
    }

    public ActionEvent() {
    }
}
