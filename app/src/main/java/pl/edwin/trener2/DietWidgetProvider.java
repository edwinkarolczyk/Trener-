package pl.edwin.trener2;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class DietWidgetProvider extends AppWidgetProvider {
    private static final String PREFS = "trener2_diet_widget_v077";

    public static void sync(Context context, String json) {
        if (context == null) return;
        try {
            JSONObject data = new JSONObject(json == null ? "{}" : json);
            SharedPreferences.Editor e = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
            e.putInt("kcal", Math.max(0, data.optInt("kcal", 0)));
            e.putInt("targetKcal", Math.max(0, data.optInt("targetKcal", 0)));
            e.putFloat("protein", (float) Math.max(0, data.optDouble("protein", 0)));
            e.putFloat("targetProtein", (float) Math.max(0, data.optDouble("targetProtein", 0)));
            e.putLong("updatedAt", data.optLong("updatedAt", System.currentTimeMillis()));
            e.apply();
        } catch (Exception ignored) {
            return;
        }
        updateAll(context);
    }

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, DietWidgetProvider.class));
        if (ids != null && ids.length > 0) update(context, manager, ids);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        update(context, appWidgetManager, appWidgetIds);
    }

    private static void update(Context context, AppWidgetManager manager, int[] ids) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int kcal = p.getInt("kcal", 0);
        int targetKcal = p.getInt("targetKcal", 0);
        float protein = p.getFloat("protein", 0f);
        float targetProtein = p.getFloat("targetProtein", 0f);
        int water = HydrationStore.getTodayMl(context);
        int targetWater = HydrationStore.getTargetMl(context);

        Intent open = new Intent(context, MainActivityV077.class);
        open.putExtra("open_diet", true);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(
                context,
                770,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent addWater = new Intent(context, HydrationReceiver.class).setAction(HydrationReceiver.ACTION_ADD_250);
        PendingIntent addWaterPending = PendingIntent.getBroadcast(
                context,
                771,
                addWater,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int kcalMax = targetKcal > 0 ? targetKcal : Math.max(1, kcal);
        int proteinMax = targetProtein > 0 ? Math.max(1, Math.round(targetProtein)) : Math.max(1, Math.round(protein));
        int waterMax = targetWater > 0 ? targetWater : Math.max(1, water);

        for (int id : ids) {
            RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.diet_widget);
            v.setTextViewText(R.id.widgetKcal, kcal + " / " + (targetKcal > 0 ? targetKcal : "—") + " kcal");
            v.setTextViewText(R.id.widgetProtein, "Białko " + formatProtein(protein) + " / " + (targetProtein > 0 ? formatProtein(targetProtein) : "—") + " g");
            v.setTextViewText(R.id.widgetWater, "Woda " + water + " / " + targetWater + " ml");
            v.setProgressBar(R.id.widgetKcalProgress, kcalMax, Math.min(kcal, kcalMax), false);
            v.setProgressBar(R.id.widgetProteinProgress, proteinMax, Math.min(Math.round(protein), proteinMax), false);
            v.setProgressBar(R.id.widgetWaterProgress, waterMax, Math.min(water, waterMax), false);
            v.setOnClickPendingIntent(R.id.widgetRoot, pending);
            v.setOnClickPendingIntent(R.id.widgetOpen, pending);
            v.setOnClickPendingIntent(R.id.widgetWaterAdd, addWaterPending);
            manager.updateAppWidget(id, v);
        }
    }

    private static String formatProtein(float value) {
        if (Math.abs(value - Math.round(value)) < 0.05f) return String.valueOf(Math.round(value));
        return String.format(java.util.Locale.forLanguageTag("pl-PL"), "%.1f", value);
    }
}
