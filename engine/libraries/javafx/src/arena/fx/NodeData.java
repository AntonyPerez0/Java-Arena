// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import javafx.scene.Node;

/**
 * What the library keeps about a node for itself: a count of the changes to what places or shapes
 * it (so its outline and bounds are worked out again only after a change), and what the frames
 * last recorded of it. Node keeps one in a field of its own, through Access.
 */
public final class NodeData {
    /** Node registers one of these when it is loaded. */
    public interface Access {
        Object get(Node node);

        void set(Node node, Object data);
    }

    private static Access access;

    public static synchronized void register(Access a) {
        if (access == null) {
            access = a;
        }
    }

    /** Changes so far to the node's place, turn, look or shape (Frames.touch counts them). */
    int version;
    /** Changes so far to the shape's own outline (Frames.reshaped), not its place or turn. */
    int shapeVersion;
    /** The angle getRotate() last had when the transform was worked out, and its sine and cosine (Math.sin is slow in the browser's interpreter). */
    double angle = Double.NaN;
    double sin;
    double cos;
    /** What changed since the frame last recorded it (Frames.touch's bits). */
    int changed;
    /** Changed since the frame last recorded it (only while frames are recorded). */
    boolean dirty;
    /** In a showing window at the frame recorded last. */
    boolean inScene;
    /** What the frames last recorded of the node, or null. */
    Object seen;
    /** The node's box in its own coordinates (null: empty), worked out at shape version boxVersion; -1 when none is kept. */
    float[] localBox;
    int boxVersion = -1;
    /** Its transform to its parent, at toParentVersion, and its box there, at placedVersion. */
    double[] toParent;
    int toParentVersion = -1;
    float[] parentBox;
    int placedVersion = -1;
    /** Whether a polygon's points are convex (1), or not (-1), at its points' change count convexChanges; 0 when not known. */
    int convexKnown;
    int convexChanges;
    /** The circle it is surely within in its parent (Overlap.reach), at reachVersion. */
    double[] reach;
    int reachVersion = -1;
    /** Its area for Shape.intersect, at piecesVersion. */
    Object pieces;
    int piecesVersion = -1;

    private NodeData() {
    }

    /** Set once, when Node is loaded (before any node exists), so read without a lock: locks are slow in the browser's interpreter. */
    private static Access access() {
        return access;
    }

    /** The node's data, or null when none was made yet. */
    static NodeData peek(Node node) {
        return (NodeData) access().get(node);
    }

    /** The node's data, made when first needed. */
    static NodeData of(Node node) {
        Access a = access();
        NodeData d = (NodeData) a.get(node);
        if (d == null) {
            d = new NodeData();
            a.set(node, d);
        }
        return d;
    }
}
