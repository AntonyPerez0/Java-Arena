// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javafx.application.Application;

/**
 * The arguments of launch, split as JavaFX splits them: an argument that starts with "--", then a
 * key that starts with a letter or "_", then "=" is named (--key=value: the key is up to the first
 * "=", and a key's last value wins); every other one is unnamed. Null arguments are left out of all
 * three lists, as JavaFX leaves them out.
 */
final class Params extends Application.Parameters {
    private final List<String> raw;
    private final List<String> unnamed;
    private final Map<String, String> named;

    Params(String[] args) {
        List<String> all = new ArrayList<String>();
        List<String> plain = new ArrayList<String>();
        Map<String, String> keyed = new HashMap<String, String>();
        for (String arg : args) {
            if (arg == null) {
                continue;
            }
            all.add(arg);
            int eq = arg.indexOf('=');
            if (arg.startsWith("--") && eq > 2 && (Character.isLetter(arg.charAt(2)) || arg.charAt(2) == '_')) {
                keyed.put(arg.substring(2, eq), arg.substring(eq + 1));
            } else {
                plain.add(arg);
            }
        }
        raw = Collections.unmodifiableList(all);
        unnamed = Collections.unmodifiableList(plain);
        named = Collections.unmodifiableMap(keyed);
    }

    @Override
    public List<String> getRaw() {
        return raw;
    }

    @Override
    public List<String> getUnnamed() {
        return unnamed;
    }

    @Override
    public Map<String, String> getNamed() {
        return named;
    }
}
