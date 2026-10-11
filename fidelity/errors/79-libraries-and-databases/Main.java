import com.google.gson.Gson;
import org.apache.commons.lang3.StringUtils;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<String> tasks = new ArrayList<>();
        tasks.add(StringUtils.capitalize("repair the bike"));
        System.out.println(new Gson().toJson(tasks));
        JdbcDataSource source = new JdbcDataSource();
    }

    @Test
    public void addsTask() {
    }
}
