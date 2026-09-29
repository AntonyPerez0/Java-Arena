import java.util.ArrayList;
import java.util.List;

public class HeapExhaustion {
    public static void main(String[] args) {
        System.out.println("start");
        List<long[]> blocks = new ArrayList<>();
        for (int i = 0; ; i++) {
            blocks.add(new long[1_000_000]);
            if (i % 100 == 0) {
                System.out.println("blocks: " + i);
            }
        }
    }
}
