package pl.edwin.trener2;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.LocalDate;

public final class HydrationStore {
    private static final String PREFS = "trener2_hydration_v078";
    private static final String DAY_PREFIX = "water_";

    private HydrationStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static int getTodayMl(Context context) {
        return prefs(context).getInt(DAY_PREFIX + LocalDate.now(), 0);
    }

    public static int getTargetMl(Context context) {
        return prefs(context).getInt("target_ml", 2500);
    }

    public static int addWater(Context context, int amountMl) {
        int amount = Math.max(-2000, Math.min(amountMl, 2000));
        SharedPreferences p = prefs(context);
        String key = DAY_PREFIX + LocalDate.now();
        int next = Math.max(0, Math.min(15000, p.getInt(key, 0) + amount));
        p.edit().putInt(key, next).putLong("updated_at", System.currentTimeMillis()).apply();
        WaterWidgetProvider.updateAll(context);
        return next;
    }

    public static void saveConfig(
            Context context,
            int targetMl,
            boolean remindersEnabled,
            int intervalMinutes,
            int quietStartMinutes,
            int quietEndMinutes,
            boolean workoutEnabled,
            String workoutFrequency
    ) {
        int target = Math.max(500, Math.min(targetMl, 6000));
        int interval = intervalMinutes == 60 || intervalMinutes == 120 ? intervalMinutes : 90;
        int quietStart = Math.max(0, Math.min(quietStartMinutes, 1439));
        int quietEnd = Math.max(0, Math.min(quietEndMinutes, 1439));
        String freq = "rare".equals(workoutFrequency) || "often".equals(workoutFrequency)
                ? workoutFrequency : "normal";
        prefs(context).edit()
                .putBoolean("initialized", true)
                .putInt("target_ml", target)
                .putBoolean("reminders_enabled", remindersEnabled)
                .putInt("interval_minutes", interval)
                .putInt("quiet_start_minutes", quietStart)
                .putInt("quiet_end_minutes", quietEnd)
                .putBoolean("workout_enabled", workoutEnabled)
                .putString("workout_frequency", freq)
                .putLong("updated_at", System.currentTimeMillis())
                .apply();
        WaterWidgetProvider.updateAll(context);
    }

    public static boolean remindersEnabled(Context context) {
        return prefs(context).getBoolean("reminders_enabled", false);
    }

    public static int intervalMinutes(Context context) {
        return prefs(context).getInt("interval_minutes", 90);
    }

    public static boolean workoutEnabled(Context context) {
        return prefs(context).getBoolean("workout_enabled", true);
    }

    public static String workoutFrequency(Context context) {
        return prefs(context).getString("workout_frequency", "normal");
    }

    public static boolean isQuietNow(Context context) {
        SharedPreferences p = prefs(context);
        int start = p.getInt("quiet_start_minutes", 22 * 60);
        int end = p.getInt("quiet_end_minutes", 7 * 60);
        java.util.Calendar c = java.util.Calendar.getInstance();
        int now = c.get(java.util.Calendar.HOUR_OF_DAY) * 60 + c.get(java.util.Calendar.MINUTE);
        if (start == end) return false;
        if (start < end) return now >= start && now < end;
        return now >= start || now < end;
    }

    public static String stateJson(Context context) {
        try {
            SharedPreferences p = prefs(context);
            JSONObject root = new JSONObject();
            root.put("version", 1);
            root.put("today", LocalDate.now().toString());
            root.put("todayMl", getTodayMl(context));
            root.put("targetMl", getTargetMl(context));
            root.put("remindersEnabled", p.getBoolean("reminders_enabled", false));
            root.put("intervalMinutes", p.getInt("interval_minutes", 90));
            root.put("quietStartMinutes", p.getInt("quiet_start_minutes", 22 * 60));
            root.put("quietEndMinutes", p.getInt("quiet_end_minutes", 7 * 60));
            root.put("workoutEnabled", p.getBoolean("workout_enabled", true));
            root.put("workoutFrequency", p.getString("workout_frequency", "normal"));
            root.put("updatedAt", p.getLong("updated_at", 0L));

            JSONArray history = new JSONArray();
            LocalDate day = LocalDate.now();
            for (int i = 0; i < 7; i++) {
                JSONObject row = new JSONObject();
                row.put("date", day.toString());
                row.put("ml", p.getInt(DAY_PREFIX + day, 0));
                history.put(row);
                day = day.minusDays(1);
            }
            root.put("history", history);
            return root.toString();
        } catch (Exception e) {
            return "{}";
        }
    }
}
