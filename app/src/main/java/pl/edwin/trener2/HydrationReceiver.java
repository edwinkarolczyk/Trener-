package pl.edwin.trener2;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class HydrationReceiver extends BroadcastReceiver {
    public static final String ACTION_REMIND = "pl.edwin.trener2.HYDRATION_REMIND";
    public static final String ACTION_ADD_100 = "pl.edwin.trener2.HYDRATION_ADD_100";
    public static final String ACTION_ADD_250 = "pl.edwin.trener2.HYDRATION_ADD_250";
    private static final String CHANNEL_ID = "hydration_reminders";
    private static final int NOTIFICATION_ID = 7802;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? "" : String.valueOf(intent.getAction());
        if (ACTION_ADD_100.equals(action) || ACTION_ADD_250.equals(action)) {
            int amount = ACTION_ADD_100.equals(action) ? 100 : 250;
            int total = HydrationStore.addWater(context, amount);
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) manager.cancel(NOTIFICATION_ID);
            android.widget.Toast.makeText(context, "Woda +" + amount + " ml • dziś " + total + " ml", android.widget.Toast.LENGTH_SHORT).show();
            return;
        }

        if (!ACTION_REMIND.equals(action)) return;
        if (!HydrationStore.remindersEnabled(context) || HydrationStore.isQuietNow(context)) return;
        if (HydrationStore.getTodayMl(context) >= HydrationStore.getTargetMl(context)) return;
        showReminder(context);
    }

    private void showReminder(Context context) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Nawodnienie",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Przypomnienia o piciu wody");
            manager.createNotificationChannel(channel);
        }

        Intent open = new Intent(context, MainActivityV077.class);
        open.putExtra("open_diet", true);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPending = PendingIntent.getActivity(
                context,
                7802,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent add = new Intent(context, HydrationReceiver.class).setAction(ACTION_ADD_250);
        PendingIntent addPending = PendingIntent.getBroadcast(
                context,
                7803,
                add,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int current = HydrationStore.getTodayMl(context);
        int target = HydrationStore.getTargetMl(context);
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, CHANNEL_ID)
                : new Notification.Builder(context);

        Notification notification = builder
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Trener 2 — czas na wodę")
                .setContentText("Dzisiaj " + current + " / " + target + " ml")
                .setContentIntent(openPending)
                .addAction(new Notification.Action.Builder(
                        android.R.drawable.ic_input_add,
                        "+250 ml",
                        addPending
                ).build())
                .setAutoCancel(true)
                .build();
        manager.notify(NOTIFICATION_ID, notification);
    }
}
