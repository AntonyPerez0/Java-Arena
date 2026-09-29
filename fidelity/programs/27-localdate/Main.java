import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Month;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

public class Main {
    public static void main(String[] args) {
        LocalDate date = LocalDate.of(2024, 2, 28);
        System.out.println(date + " " + date.plusDays(1) + " " + date.plusDays(2) + " " + date.isLeapYear());
        System.out.println(date.getDayOfWeek() + " " + date.getMonth() + " " + date.getDayOfYear());
        LocalDate born = LocalDate.of(1815, Month.DECEMBER, 10);
        Period age = Period.between(born, LocalDate.of(1852, 11, 27));
        System.out.println(age + " " + age.getYears());
        System.out.println(ChronoUnit.DAYS.between(LocalDate.of(2024, 1, 1), LocalDate.of(2025, 1, 1)));
        System.out.println(date.format(DateTimeFormatter.ofPattern("dd.MM.yyyy")) + " " + date.format(DateTimeFormatter.ISO_DATE));
        System.out.println(LocalDate.parse("2023-06-15").minusMonths(4).withDayOfMonth(1));
        System.out.println(date.isBefore(LocalDate.of(2024, 3, 1)) + " " + date.compareTo(born));
        System.out.println(LocalTime.of(9, 5).plusMinutes(70) + " " + DayOfWeek.MONDAY.plus(8));
        System.out.println(date.format(DateTimeFormatter.ofPattern("EEEE d MMMM yyyy")));
    }
}
