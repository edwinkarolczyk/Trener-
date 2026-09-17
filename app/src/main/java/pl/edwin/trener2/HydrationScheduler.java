package pl.edwin.trener2;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

public final class HydrationScheduler {
    private static final int REQUEST_CODE = 7801;

    private HydrationScheduler() {}

    public static void apply(Context context) {
        cancel(context);
        if (!HydrationStore.remindersEnabled(context)) return;

        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;

        long interval = HydrationStore.intervalMinutes(context) * 60_000L;
        long first = System.currentTimeMillis() + interval;
        PendingIntent pending = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                reminderIntent(context),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        manager.setInexactRepeating(AlarmManager.RTC_WAKEUP, first, interval, pending);
    }

    public static void rescheduleSaved(Context context) {
        if (HydrationStore.remindersEnabled(context)) apply(context);
    }

    public static void cancel(Context context) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        PendingIntent pending = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                reminderIntent(context),
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        if (pending != null) {
            manager.cancel(pending);
            pending.cancel();
        }
    }

    private static Intent reminderIntent(Context context) {
        return new Intent(context, HydrationReceiver.class).setAction(HydrationReceiver.ACTION_REMIND);
    }
}
