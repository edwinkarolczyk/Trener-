package pl.edwin.trener2;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.content.SharedPreferences;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class WorkoutWidgetProvider extends AppWidgetProvider {
    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager,
                                          int appWidgetId, Bundle newOptions) {
        super.onAppWidgetOptionsChanged(context, manager, appWidgetId, newOptions);
        updateAll(context);
    }

    private static final String PREFS = "trener2_workout_widget_v080";

    public static void sync(Context context, String json) {
        if (context == null) return;
        try {
            JSONObject data = new JSONObject(json == null ? "{}" : json);
            SharedPreferences.Editor e = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
            e.putBoolean("active", data.optBoolean("active", false));
            e.putBoolean("paused", data.optBoolean("paused", false));
            e.putBoolean("shared", data.optBoolean("shared", false));
            e.putString("plan", clean(data.optString("plan", "Trening"), 60));
            e.putString("exercise", clean(data.optString("exercise", ""), 80));
            e.putString("series", clean(data.optString("series", ""), 60));
            e.putString("detail", clean(data.optString("detail", ""), 80));
            e.putString("status", clean(data.optString("status", ""), 90));
            e.putLong("elapsedMs", Math.max(0L, data.optLong("elapsedMs", 0L)));
            e.putLong("restMs", Math.max(0L, data.optLong("restMs", 0L)));
            e.putLong("updatedAt", System.currentTimeMillis());
            e.apply();
        } catch (Exception ignored) {
            return;
        }
        updateAll(context);
    }

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, WorkoutWidgetProvider.class));
        if (ids != null && ids.length > 0) update(context, manager, ids);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        update(context, appWidgetManager, appWidgetIds);
    }

    private static void update(Context context, AppWidgetManager manager, int[] ids) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        boolean active = p.getBoolean("active", false);
        boolean paused = p.getBoolean("paused", false);
        boolean shared = p.getBoolean("shared", false);
        String plan = p.getString("plan", "Trening");
        String exercise = p.getString("exercise", "");
        String series = p.getString("series", "");
        String detail = p.getString("detail", "");
        String status = p.getString("status", "");
        long elapsedMs = Math.max(0L, p.getLong("elapsedMs", 0L));
        long restMs = Math.max(0L, p.getLong("restMs", 0L));

        Intent open = new Intent(context, MainActivityV077.class);
        open.putExtra("open_workout", true);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(
                context,
                800,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        long now = SystemClock.elapsedRealtime();
        for (int id : ids) {
            RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.workout_widget);
            v.setOnClickPendingIntent(R.id.workoutWidgetRoot, pending);
            v.setOnClickPendingIntent(R.id.workoutWidgetOpen, pending);

            if (!active) {
                v.setTextViewText(R.id.workoutWidgetPlan, "Brak aktywnego treningu");
                v.setTextViewText(R.id.workoutWidgetExercise, "Otwórz Trener 2, aby rozpocząć trening.");
                v.setTextViewText(R.id.workoutWidgetSeries, "");
                v.setTextViewText(R.id.workoutWidgetDetail, "");
                v.setTextViewText(R.id.workoutWidgetStatus, "GOTOWY");
                v.setTextViewText(R.id.workoutWidgetMode, "SOLO / WSPÓLNY");
                v.setChronometer(R.id.workoutWidgetTime, now, "%s", false);
                v.setTextViewText(R.id.workoutWidgetTime, "00:00");
                v.setChronometerCountDown(R.id.workoutWidgetRest, false);
                v.setChronometer(R.id.workoutWidgetRest, now, "%s", false);
                v.setTextViewText(R.id.workoutWidgetRest, "GOTOWY");
                v.setViewVisibility(R.id.workoutWidgetRestLabel, View.VISIBLE);
            } else {
                v.setTextViewText(R.id.workoutWidgetPlan, empty(plan) ? "Trening" : plan);
                v.setTextViewText(R.id.workoutWidgetExercise, empty(exercise) ? "Ćwiczenie" : exercise);
                v.setTextViewText(R.id.workoutWidgetSeries, series);
                v.setTextViewText(R.id.workoutWidgetDetail, detail);
                v.setTextViewText(R.id.workoutWidgetStatus, empty(status) ? (paused ? "PAUZA" : "GOTOWY") : status);
                v.setTextViewText(R.id.workoutWidgetMode, shared ? "WSPÓLNY" : "SOLO");

                long workoutBase = now - elapsedMs;
                v.setChronometerCountDown(R.id.workoutWidgetTime, false);
                v.setChronometer(R.id.workoutWidgetTime, workoutBase, "%s", !paused);
                if (paused) {
                    v.setChronometer(R.id.workoutWidgetTime, workoutBase, "%s", false);
                }

                if (paused) {
                    v.setChronometerCountDown(R.id.workoutWidgetRest, false);
                    v.setChronometer(R.id.workoutWidgetRest, now, "%s", false);
                    v.setTextViewText(R.id.workoutWidgetRest, "PAUZA");
                } else if (restMs > 0L) {
                    v.setChronometerCountDown(R.id.workoutWidgetRest, true);
                    v.setChronometer(R.id.workoutWidgetRest, now + restMs, "%s", true);
                } else {
                    v.setChronometerCountDown(R.id.workoutWidgetRest, false);
                    v.setChronometer(R.id.workoutWidgetRest, now, "%s", false);
                    v.setTextViewText(R.id.workoutWidgetRest, "GOTOWY");
                }
            }
            manager.updateAppWidget(id, v);
        }
    }

    private static boolean empty(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String clean(String s, int max) {
        String out = s == null ? "" : s.replace('\n', ' ').replace('\r', ' ').trim();
        if (out.length() <= max) return out;
        return out.substring(0, Math.max(0, max - 1)) + "…";
    }
}
