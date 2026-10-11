// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.input;

/**
 * The keys of a keyboard, every constant of JavaFX 21's KeyCode with its name, code and character
 * and the kinds of key it is (taken from OpenJFX 21.0.12 by running it, and checked by
 * scripts/javafx.test.mjs). Event lines name keys by their constant: press key LEFT.
 */
public enum KeyCode {
    ENTER("Enter", 10, 0x000a, Kinds.WHITESPACE),
    BACK_SPACE("Backspace", 8, 0x0008, 0),
    TAB("Tab", 9, 0x0009, Kinds.WHITESPACE),
    CANCEL("Cancel", 3, 0x0003, 0),
    CLEAR("Clear", 12, 0x000c, 0),
    SHIFT("Shift", 16, 0x0010, Kinds.MODIFIER),
    CONTROL("Ctrl", 17, 0x0011, Kinds.MODIFIER),
    ALT("Alt", 18, 0x0012, Kinds.MODIFIER),
    PAUSE("Pause", 19, 0x0013, 0),
    CAPS("Caps Lock", 20, 0x0014, 0),
    ESCAPE("Esc", 27, 0x001b, 0),
    SPACE("Space", 32, 0x0020, Kinds.WHITESPACE),
    PAGE_UP("Page Up", 33, 0x0021, Kinds.NAVIGATION),
    PAGE_DOWN("Page Down", 34, 0x0022, Kinds.NAVIGATION),
    END("End", 35, 0x0023, Kinds.NAVIGATION),
    HOME("Home", 36, 0x0024, Kinds.NAVIGATION),
    LEFT("Left", 37, 0x0025, Kinds.NAVIGATION | Kinds.ARROW),
    UP("Up", 38, 0x0026, Kinds.NAVIGATION | Kinds.ARROW),
    RIGHT("Right", 39, 0x0027, Kinds.NAVIGATION | Kinds.ARROW),
    DOWN("Down", 40, 0x0028, Kinds.NAVIGATION | Kinds.ARROW),
    COMMA("Comma", 44, 0x002c, 0),
    MINUS("Minus", 45, 0x002d, 0),
    PERIOD("Period", 46, 0x002e, 0),
    SLASH("Slash", 47, 0x002f, 0),
    DIGIT0("0", 48, 0x0030, Kinds.DIGIT),
    DIGIT1("1", 49, 0x0031, Kinds.DIGIT),
    DIGIT2("2", 50, 0x0032, Kinds.DIGIT),
    DIGIT3("3", 51, 0x0033, Kinds.DIGIT),
    DIGIT4("4", 52, 0x0034, Kinds.DIGIT),
    DIGIT5("5", 53, 0x0035, Kinds.DIGIT),
    DIGIT6("6", 54, 0x0036, Kinds.DIGIT),
    DIGIT7("7", 55, 0x0037, Kinds.DIGIT),
    DIGIT8("8", 56, 0x0038, Kinds.DIGIT),
    DIGIT9("9", 57, 0x0039, Kinds.DIGIT),
    SEMICOLON("Semicolon", 59, 0x003b, 0),
    EQUALS("Equals", 61, 0x003d, 0),
    A("A", 65, 0x0041, Kinds.LETTER),
    B("B", 66, 0x0042, Kinds.LETTER),
    C("C", 67, 0x0043, Kinds.LETTER),
    D("D", 68, 0x0044, Kinds.LETTER),
    E("E", 69, 0x0045, Kinds.LETTER),
    F("F", 70, 0x0046, Kinds.LETTER),
    G("G", 71, 0x0047, Kinds.LETTER),
    H("H", 72, 0x0048, Kinds.LETTER),
    I("I", 73, 0x0049, Kinds.LETTER),
    J("J", 74, 0x004a, Kinds.LETTER),
    K("K", 75, 0x004b, Kinds.LETTER),
    L("L", 76, 0x004c, Kinds.LETTER),
    M("M", 77, 0x004d, Kinds.LETTER),
    N("N", 78, 0x004e, Kinds.LETTER),
    O("O", 79, 0x004f, Kinds.LETTER),
    P("P", 80, 0x0050, Kinds.LETTER),
    Q("Q", 81, 0x0051, Kinds.LETTER),
    R("R", 82, 0x0052, Kinds.LETTER),
    S("S", 83, 0x0053, Kinds.LETTER),
    T("T", 84, 0x0054, Kinds.LETTER),
    U("U", 85, 0x0055, Kinds.LETTER),
    V("V", 86, 0x0056, Kinds.LETTER),
    W("W", 87, 0x0057, Kinds.LETTER),
    X("X", 88, 0x0058, Kinds.LETTER),
    Y("Y", 89, 0x0059, Kinds.LETTER),
    Z("Z", 90, 0x005a, Kinds.LETTER),
    OPEN_BRACKET("Open Bracket", 91, 0x005b, 0),
    BACK_SLASH("Back Slash", 92, 0x005c, 0),
    CLOSE_BRACKET("Close Bracket", 93, 0x005d, 0),
    NUMPAD0("Numpad 0", 96, 0x0060, Kinds.DIGIT | Kinds.KEYPAD),
    NUMPAD1("Numpad 1", 97, 0x0061, Kinds.DIGIT | Kinds.KEYPAD),
    NUMPAD2("Numpad 2", 98, 0x0062, Kinds.DIGIT | Kinds.KEYPAD),
    NUMPAD3("Numpad 3", 99, 0x0063, Kinds.DIGIT | Kinds.KEYPAD),
    NUMPAD4("Numpad 4", 100, 0x0064, Kinds.DIGIT | Kinds.KEYPAD),
    NUMPAD5("Numpad 5", 101, 0x0065, Kinds.DIGIT | Kinds.KEYPAD),
    NUMPAD6("Numpad 6", 102, 0x0066, Kinds.DIGIT | Kinds.KEYPAD),
    NUMPAD7("Numpad 7", 103, 0x0067, Kinds.DIGIT | Kinds.KEYPAD),
    NUMPAD8("Numpad 8", 104, 0x0068, Kinds.DIGIT | Kinds.KEYPAD),
    NUMPAD9("Numpad 9", 105, 0x0069, Kinds.DIGIT | Kinds.KEYPAD),
    MULTIPLY("Multiply", 106, 0x006a, 0),
    ADD("Add", 107, 0x006b, 0),
    SEPARATOR("Separator", 108, 0x006c, 0),
    SUBTRACT("Subtract", 109, 0x006d, 0),
    DECIMAL("Decimal", 110, 0x006e, 0),
    DIVIDE("Divide", 111, 0x006f, 0),
    DELETE("Delete", 127, 0x007f, 0),
    NUM_LOCK("Num Lock", 144, 0x0090, 0),
    SCROLL_LOCK("Scroll Lock", 145, 0x0091, 0),
    F1("F1", 112, 0x0070, Kinds.FUNCTION),
    F2("F2", 113, 0x0071, Kinds.FUNCTION),
    F3("F3", 114, 0x0072, Kinds.FUNCTION),
    F4("F4", 115, 0x0073, Kinds.FUNCTION),
    F5("F5", 116, 0x0074, Kinds.FUNCTION),
    F6("F6", 117, 0x0075, Kinds.FUNCTION),
    F7("F7", 118, 0x0076, Kinds.FUNCTION),
    F8("F8", 119, 0x0077, Kinds.FUNCTION),
    F9("F9", 120, 0x0078, Kinds.FUNCTION),
    F10("F10", 121, 0x0079, Kinds.FUNCTION),
    F11("F11", 122, 0x007a, Kinds.FUNCTION),
    F12("F12", 123, 0x007b, Kinds.FUNCTION),
    F13("F13", 61440, 0xf000, Kinds.FUNCTION),
    F14("F14", 61441, 0xf001, Kinds.FUNCTION),
    F15("F15", 61442, 0xf002, Kinds.FUNCTION),
    F16("F16", 61443, 0xf003, Kinds.FUNCTION),
    F17("F17", 61444, 0xf004, Kinds.FUNCTION),
    F18("F18", 61445, 0xf005, Kinds.FUNCTION),
    F19("F19", 61446, 0xf006, Kinds.FUNCTION),
    F20("F20", 61447, 0xf007, Kinds.FUNCTION),
    F21("F21", 61448, 0xf008, Kinds.FUNCTION),
    F22("F22", 61449, 0xf009, Kinds.FUNCTION),
    F23("F23", 61450, 0xf00a, Kinds.FUNCTION),
    F24("F24", 61451, 0xf00b, Kinds.FUNCTION),
    PRINTSCREEN("Print Screen", 154, 0x009a, 0),
    INSERT("Insert", 155, 0x009b, 0),
    HELP("Help", 156, 0x009c, 0),
    META("Meta", 157, 0x009d, Kinds.MODIFIER),
    BACK_QUOTE("Back Quote", 192, 0x00c0, 0),
    QUOTE("Quote", 222, 0x00de, 0),
    KP_UP("Numpad Up", 224, 0x00e0, Kinds.NAVIGATION | Kinds.ARROW | Kinds.KEYPAD),
    KP_DOWN("Numpad Down", 225, 0x00e1, Kinds.NAVIGATION | Kinds.ARROW | Kinds.KEYPAD),
    KP_LEFT("Numpad Left", 226, 0x00e2, Kinds.NAVIGATION | Kinds.ARROW | Kinds.KEYPAD),
    KP_RIGHT("Numpad Right", 227, 0x00e3, Kinds.NAVIGATION | Kinds.ARROW | Kinds.KEYPAD),
    DEAD_GRAVE("Dead Grave", 128, 0x0080, 0),
    DEAD_ACUTE("Dead Acute", 129, 0x0081, 0),
    DEAD_CIRCUMFLEX("Dead Circumflex", 130, 0x0082, 0),
    DEAD_TILDE("Dead Tilde", 131, 0x0083, 0),
    DEAD_MACRON("Dead Macron", 132, 0x0084, 0),
    DEAD_BREVE("Dead Breve", 133, 0x0085, 0),
    DEAD_ABOVEDOT("Dead Abovedot", 134, 0x0086, 0),
    DEAD_DIAERESIS("Dead Diaeresis", 135, 0x0087, 0),
    DEAD_ABOVERING("Dead Abovering", 136, 0x0088, 0),
    DEAD_DOUBLEACUTE("Dead Doubleacute", 137, 0x0089, 0),
    DEAD_CARON("Dead Caron", 138, 0x008a, 0),
    DEAD_CEDILLA("Dead Cedilla", 139, 0x008b, 0),
    DEAD_OGONEK("Dead Ogonek", 140, 0x008c, 0),
    DEAD_IOTA("Dead Iota", 141, 0x008d, 0),
    DEAD_VOICED_SOUND("Dead Voiced Sound", 142, 0x008e, 0),
    DEAD_SEMIVOICED_SOUND("Dead Semivoiced Sound", 143, 0x008f, 0),
    AMPERSAND("Ampersand", 150, 0x0096, 0),
    ASTERISK("Asterisk", 151, 0x0097, 0),
    QUOTEDBL("Double Quote", 152, 0x0098, 0),
    LESS("Less", 153, 0x0099, 0),
    GREATER("Greater", 160, 0x00a0, 0),
    BRACELEFT("Left Brace", 161, 0x00a1, 0),
    BRACERIGHT("Right Brace", 162, 0x00a2, 0),
    AT("At", 512, 0x0200, 0),
    COLON("Colon", 513, 0x0201, 0),
    CIRCUMFLEX("Circumflex", 514, 0x0202, 0),
    DOLLAR("Dollar", 515, 0x0203, 0),
    EURO_SIGN("Euro Sign", 516, 0x0204, 0),
    EXCLAMATION_MARK("Exclamation Mark", 517, 0x0205, 0),
    INVERTED_EXCLAMATION_MARK("Inverted Exclamation Mark", 518, 0x0206, 0),
    LEFT_PARENTHESIS("Left Parenthesis", 519, 0x0207, 0),
    NUMBER_SIGN("Number Sign", 520, 0x0208, 0),
    PLUS("Plus", 521, 0x0209, 0),
    RIGHT_PARENTHESIS("Right Parenthesis", 522, 0x020a, 0),
    UNDERSCORE("Underscore", 523, 0x020b, 0),
    WINDOWS("Windows", 524, 0x020c, Kinds.MODIFIER),
    CONTEXT_MENU("Context Menu", 525, 0x020d, 0),
    FINAL("Final", 24, 0x0018, 0),
    CONVERT("Convert", 28, 0x001c, 0),
    NONCONVERT("Nonconvert", 29, 0x001d, 0),
    ACCEPT("Accept", 30, 0x001e, 0),
    MODECHANGE("Mode Change", 31, 0x001f, 0),
    KANA("Kana", 21, 0x0015, 0),
    KANJI("Kanji", 25, 0x0019, 0),
    ALPHANUMERIC("Alphanumeric", 240, 0x00f0, 0),
    KATAKANA("Katakana", 241, 0x00f1, 0),
    HIRAGANA("Hiragana", 242, 0x00f2, 0),
    FULL_WIDTH("Full Width", 243, 0x00f3, 0),
    HALF_WIDTH("Half Width", 244, 0x00f4, 0),
    ROMAN_CHARACTERS("Roman Characters", 245, 0x00f5, 0),
    ALL_CANDIDATES("All Candidates", 256, 0x0100, 0),
    PREVIOUS_CANDIDATE("Previous Candidate", 257, 0x0101, 0),
    CODE_INPUT("Code Input", 258, 0x0102, 0),
    JAPANESE_KATAKANA("Japanese Katakana", 259, 0x0103, 0),
    JAPANESE_HIRAGANA("Japanese Hiragana", 260, 0x0104, 0),
    JAPANESE_ROMAN("Japanese Roman", 261, 0x0105, 0),
    KANA_LOCK("Kana Lock", 262, 0x0106, 0),
    INPUT_METHOD_ON_OFF("Input Method On/Off", 263, 0x0107, 0),
    CUT("Cut", 65489, 0xffd1, 0),
    COPY("Copy", 65485, 0xffcd, 0),
    PASTE("Paste", 65487, 0xffcf, 0),
    UNDO("Undo", 65483, 0xffcb, 0),
    AGAIN("Again", 65481, 0xffc9, 0),
    FIND("Find", 65488, 0xffd0, 0),
    PROPS("Properties", 65482, 0xffca, 0),
    STOP("Stop", 65480, 0xffc8, 0),
    COMPOSE("Compose", 65312, 0xff20, 0),
    ALT_GRAPH("Alt Graph", 65406, 0xff7e, Kinds.MODIFIER),
    BEGIN("Begin", 65368, 0xff58, 0),
    UNDEFINED("Undefined", 0, 0x0000, 0),
    SOFTKEY_0("Softkey 0", 4096, 0x1000, 0),
    SOFTKEY_1("Softkey 1", 4097, 0x1001, 0),
    SOFTKEY_2("Softkey 2", 4098, 0x1002, 0),
    SOFTKEY_3("Softkey 3", 4099, 0x1003, 0),
    SOFTKEY_4("Softkey 4", 4100, 0x1004, 0),
    SOFTKEY_5("Softkey 5", 4101, 0x1005, 0),
    SOFTKEY_6("Softkey 6", 4102, 0x1006, 0),
    SOFTKEY_7("Softkey 7", 4103, 0x1007, 0),
    SOFTKEY_8("Softkey 8", 4104, 0x1008, 0),
    SOFTKEY_9("Softkey 9", 4105, 0x1009, 0),
    GAME_A("Game A", 4106, 0x100a, 0),
    GAME_B("Game B", 4107, 0x100b, 0),
    GAME_C("Game C", 4108, 0x100c, 0),
    GAME_D("Game D", 4109, 0x100d, 0),
    STAR("Star", 4110, 0x100e, 0),
    POUND("Pound", 4111, 0x100f, 0),
    POWER("Power", 409, 0x0199, 0),
    INFO("Info", 457, 0x01c9, 0),
    COLORED_KEY_0("Colored Key 0", 403, 0x0193, 0),
    COLORED_KEY_1("Colored Key 1", 404, 0x0194, 0),
    COLORED_KEY_2("Colored Key 2", 405, 0x0195, 0),
    COLORED_KEY_3("Colored Key 3", 406, 0x0196, 0),
    EJECT_TOGGLE("Eject", 414, 0x019e, Kinds.MEDIA),
    PLAY("Play", 415, 0x019f, Kinds.MEDIA),
    RECORD("Record", 416, 0x01a0, Kinds.MEDIA),
    FAST_FWD("Fast Forward", 417, 0x01a1, Kinds.MEDIA),
    REWIND("Rewind", 412, 0x019c, Kinds.MEDIA),
    TRACK_PREV("Previous Track", 424, 0x01a8, Kinds.MEDIA),
    TRACK_NEXT("Next Track", 425, 0x01a9, Kinds.MEDIA),
    CHANNEL_UP("Channel Up", 427, 0x01ab, Kinds.MEDIA),
    CHANNEL_DOWN("Channel Down", 428, 0x01ac, Kinds.MEDIA),
    VOLUME_UP("Volume Up", 447, 0x01bf, Kinds.MEDIA),
    VOLUME_DOWN("Volume Down", 448, 0x01c0, Kinds.MEDIA),
    MUTE("Mute", 449, 0x01c1, Kinds.MEDIA),
    COMMAND("Command", 768, 0x0300, Kinds.MODIFIER),
    SHORTCUT("Shortcut", -1, 0xffff, 0);

    /** The kinds of key, as bits. */
    private static final class Kinds {
        static final int FUNCTION = 1;
        static final int NAVIGATION = 2;
        static final int ARROW = 4;
        static final int MODIFIER = 8;
        static final int LETTER = 16;
        static final int DIGIT = 32;
        static final int KEYPAD = 64;
        static final int WHITESPACE = 128;
        static final int MEDIA = 256;
    }

    private final String name;
    private final int code;
    private final String ch;
    private final int kinds;

    KeyCode(String name, int code, int ch, int kinds) {
        this.name = name;
        this.code = code;
        this.ch = String.valueOf((char) ch);
        this.kinds = kinds;
    }

    /** The key's name for people, such as "Left", "Space" or "A". */
    public final String getName() {
        return name;
    }

    /** The key's code, a number. */
    public final int getCode() {
        return code;
    }

    /** The key's character, such as "A" or "\t" (one character). */
    public final String getChar() {
        return ch;
    }

    public final boolean isFunctionKey() {
        return (kinds & Kinds.FUNCTION) != 0;
    }

    public final boolean isNavigationKey() {
        return (kinds & Kinds.NAVIGATION) != 0;
    }

    /** LEFT, RIGHT, UP, DOWN and the keypad's arrows. */
    public final boolean isArrowKey() {
        return (kinds & Kinds.ARROW) != 0;
    }

    public final boolean isModifierKey() {
        return (kinds & Kinds.MODIFIER) != 0;
    }

    /** A to Z. */
    public final boolean isLetterKey() {
        return (kinds & Kinds.LETTER) != 0;
    }

    /** DIGIT0 to DIGIT9 and NUMPAD0 to NUMPAD9. */
    public final boolean isDigitKey() {
        return (kinds & Kinds.DIGIT) != 0;
    }

    public final boolean isKeypadKey() {
        return (kinds & Kinds.KEYPAD) != 0;
    }

    /** ENTER, TAB and SPACE. */
    public final boolean isWhitespaceKey() {
        return (kinds & Kinds.WHITESPACE) != 0;
    }

    public final boolean isMediaKey() {
        return (kinds & Kinds.MEDIA) != 0;
    }

    /** The key whose getName() is this name (as written: "Left", not "LEFT"), or null. */
    public static KeyCode getKeyCode(String name) {
        for (KeyCode k : values()) {
            if (k.name.equals(name)) {
                return k;
            }
        }
        return null;
    }
}
