import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

public class Dates {
    public static void main(String[] args) {
        LocalDate date = LocalDate.of(2024, 2, 28);
        System.out.println(date + " " + date.plusDays(1) + " " + date.plusDays(2) + " " + date.getDayOfWeek());
        System.out.println(date.isLeapYear() + " " + date.lengthOfMonth() + " " + date.getDayOfYear());
        System.out.println(ChronoUnit.DAYS.between(LocalDate.of(2000, 1, 1), date));
        System.out.println(Period.between(LocalDate.of(1990, 5, 17), date));
        System.out.println(date.format(DateTimeFormatter.ofPattern("dd.MM.yyyy")) + " " + date.format(DateTimeFormatter.ISO_DATE));
        System.out.println(LocalDate.parse("2023-12-31").plusMonths(2) + " " + date.withDayOfMonth(1).minusYears(1));
        System.out.println(LocalDateTime.of(2024, 6, 1, 13, 5, 9) + " " + LocalTime.of(23, 59).plusMinutes(2));
        System.out.println(Duration.ofMinutes(135) + " " + Year.of(2100).isLeap() + " " + Month.MARCH.plus(11));
        System.out.println(date.format(DateTimeFormatter.ofPattern("EEEE d MMMM uuuu")));
        System.out.println(ZonedDateTime.of(2024, 3, 10, 12, 0, 0, 0, ZoneOffset.UTC) + " " + ZoneId.systemDefault());
    }
}
