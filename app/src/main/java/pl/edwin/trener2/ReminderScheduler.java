package pl.edwin.trener2;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

public final class ReminderScheduler {
    private static final String PREFS = "trener2_reminders";
    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_DAYS = "days";
    private static final String KEY_HOUR = "hour";
    private static final String KEY_MINUTE = "minute";

    private ReminderScheduler() {}

    public static void saveAndSchedule(Context context, String daysCsv, int hour, int minute) {
        hour = Math.max(0, Math.min(hour, 23));
        minute = Math.max(0, Math.min(minute, 59));
        String days = daysCsv == null ? "" : daysCsv;
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean(KEY_ENABLED, true)
                .putString(KEY_DAYS, days)
                .putInt(KEY_HOUR, hour)
                .putInt(KEY_MINUTE, minute)
                .apply();
        scheduleInternal(context, days, hour, minute);
    }

    public static void disable(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_ENABLED, false).apply();
        cancelAll(context);
    }

    public static void rescheduleSaved(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_ENABLED, false)) return;
        scheduleInternal(
                context,
                prefs.getString(KEY_DAYS, ""),
                prefs.getInt(KEY_HOUR, 18),
                prefs.getInt(KEY_MINUTE, 0)
        );
    }

    public static String getConfigJson(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean(KEY_ENABLED, false);
        String days = prefs.getString(KEY_DAYS, "");
        int hour = prefs.getInt(KEY_HOUR, 18);
        int minute = prefs.getInt(KEY_MINUTE, 0);
        return "{\"enabled\":" + enabled + ",\"days\":\"" + days + "\",\"hour\":" + hour + ",\"minute\":" + minute + "}";
    }

    private static void scheduleInternal(Context context, String daysCsv, int hour, int minute) {
        cancelAll(context);
        Set<Integer> days = parseDays(daysCsv);
        if (days.isEmpty()) return;

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        for (int day : days) {
            Calendar when = Calendar.getInstance();
            when.set(Calendar.DAY_OF_WEEK, day);
            when.set(Calendar.HOUR_OF_DAY, hour);
            when.set(Calendar.MINUTE, minute);
            when.set(Calendar.SECOND, 0);
            when.set(Calendar.MILLISECOND, 0);
            if (when.getTimeInMillis() <= System.currentTimeMillis()) {
                when.add(Calendar.WEEK_OF_YEAR, 1);
            }

            Intent intent = new Intent(context, NotificationReceiver.class);
            intent.putExtra("day", day);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    1000 + day,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmManager.setInexactRepeating(
                    AlarmManager.RTC_WAKEUP,
                    when.getTimeInMillis(),
                    AlarmManager.INTERVAL_DAY * 7,
                    pendingIntent
            );
        }
    }

    private static void cancelAll(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        for (int day = Calendar.SUNDAY; day <= Calendar.SATURDAY; day++) {
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    1000 + day,
                    new Intent(context, NotificationReceiver.class),
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );
            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
            }
        }
    }

    private static Set<Integer> parseDays(String csv) {
        Set<Integer> result = new HashSet<>();
        if (csv == null || csv.trim().isEmpty()) return result;
        for (String part : csv.split(",")) {
            try {
                int day = Integer.parseInt(part.trim());
                if (day >= Calendar.SUNDAY && day <= Calendar.SATURDAY) result.add(day);
            } catch (NumberFormatException ignored) {}
        }
        return result;
    }
}
