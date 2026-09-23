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

    /** -1 = no recorded value for the requested date; never substitute today's intake. */
    public static int getDayMl(Context context, String isoDay) {
        if (isoDay == null || !isoDay.matches("\\d{4}-\\d{2}-\\d{2}")) return -1;
        try {
            LocalDate day = LocalDate.parse(isoDay);
            if (day.isAfter(LocalDate.now())) return -1;
            SharedPreferences p = prefs(context);
            String key = DAY_PREFIX + day;
            return p.contains(key) ? p.getInt(key, 0) : -1;
        } catch (Exception ignored) { return -1; }
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

    /** Full native hydration snapshot, including dates older than the 7-day UI history. */
    public static String backupJson(Context context) {
        try {
            JSONObject data = new JSONObject();
            for (java.util.Map.Entry<String, ?> entry : prefs(context).getAll().entrySet()) {
                Object v = entry.getValue();
                if (v instanceof Boolean || v instanceof Number || v instanceof String) {
                    data.put(entry.getKey(), v);
                }
            }
            return data.toString();
        } catch (Exception ignored) { return ""; }
    }

    /** Import only the existing hydration preference schema; do not clear unknown/new keys. */
    public static boolean restoreBackup(Context context, String raw) {
        if (raw == null || raw.isEmpty()) return false;
        try {
            JSONObject data = new JSONObject(raw);
            if (data.length() == 0) return true;
            SharedPreferences.Editor editor = prefs(context).edit();
            java.util.Iterator<String> keys = data.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                Object value = data.get(key);
                if (key.matches("water_\\d{4}-\\d{2}-\\d{2}") && value instanceof Number) {
                    editor.putInt(key, Math.max(0, Math.min(15000, ((Number) value).intValue())));
                } else if ("target_ml".equals(key) && value instanceof Number) {
                    editor.putInt(key, Math.max(500, Math.min(6000, ((Number) value).intValue())));
                } else if (("interval_minutes".equals(key) || "quiet_start_minutes".equals(key)
                        || "quiet_end_minutes".equals(key)) && value instanceof Number) {
                    editor.putInt(key, ((Number) value).intValue());
                } else if ("updated_at".equals(key) && value instanceof Number) {
                    editor.putLong(key, ((Number) value).longValue());
                } else if (("initialized".equals(key) || "reminders_enabled".equals(key)
                        || "workout_enabled".equals(key)) && value instanceof Boolean) {
                    editor.putBoolean(key, (Boolean) value);
                } else if ("workout_frequency".equals(key) && value instanceof String) {
                    editor.putString(key, (String) value);
                }
            }
            boolean ok = editor.commit();
            if (ok) WaterWidgetProvider.updateAll(context);
            return ok;
        } catch (Exception ignored) { return false; }
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
