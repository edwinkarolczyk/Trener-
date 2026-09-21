package pl.edwin.trener2;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

public class MainActivityV077 extends MainActivity {
    private static final int HYDRATION_NOTIFICATION_PERMISSION_REQUEST = 178;
    private WebView betaWebView;

    @Override
    public void setContentView(View view) {
        if (view instanceof WebView) {
            betaWebView = (WebView) view;
            betaWebView.addJavascriptInterface(new DietWidgetBridge(this), "TrenerWidget");
            betaWebView.addJavascriptInterface(new HydrationBridge(), "TrenerHydration");
        }
        super.setContentView(view);
    }

    @Override
    protected void onResume() {
        super.onResume();
        openWidgetTargetIfRequested();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openWidgetTargetIfRequested();
    }

    private int widgetNavigationGeneration = 0;

    private void openWidgetTargetIfRequested() {
        Intent incoming = getIntent();
        if (betaWebView == null || incoming == null) return;
        final boolean workout = incoming.getBooleanExtra("open_workout", false);
        final boolean diet = incoming.getBooleanExtra("open_diet", false);
        if (!workout && !diet) return;
        final String destination = workout ? "start" : "diet";
        final int request = ++widgetNavigationGeneration;
        // On a cold launch onResume may happen before index.html and app.js are ready.
        // Keep the widget intent pending until WebView has finished loading.
        betaWebView.postDelayed(new Runnable() {
            private int retries = 0;
            @Override
            public void run() {
                if (request != widgetNavigationGeneration || betaWebView == null) return;
                if (betaWebView.getProgress() < 100) {
                    if (retries++ < 50) betaWebView.postDelayed(this, 150);
                    return;
                }
                betaWebView.evaluateJavascript(
                    "(function(){if(typeof showTab==='function'){showTab('" + destination
                        + "');}else{var b=document.querySelector('.tab[data-tab=\\\"" + destination
                        + "\\"]');if(b)b.click();}})();", null
                );
                Intent pending = getIntent();
                if (pending != null) {
                    pending.removeExtra("open_workout");
                    pending.removeExtra("open_diet");
                }
            }
        }, 250);
    }

    private void requestHydrationNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    HYDRATION_NOTIFICATION_PERMISSION_REQUEST
            );
        }
    }

    public static class DietWidgetBridge {
        private final Context context;

        DietWidgetBridge(Context context) {
            this.context = context.getApplicationContext();
        }

        @JavascriptInterface
        public void syncDietWidget(String json) {
            DietWidgetProvider.sync(context, json);
        }

        @JavascriptInterface
        public void syncWorkoutWidget(String json) {
            WorkoutWidgetProvider.sync(context, json);
        }
    }

    public class HydrationBridge {
        @JavascriptInterface
        public String getState() {
            return HydrationStore.stateJson(getApplicationContext());
        }

        @JavascriptInterface
        public int addWater(int ml) {
            return HydrationStore.addWater(getApplicationContext(), ml);
        }

        @JavascriptInterface
        public void saveConfig(
                int targetMl,
                boolean remindersEnabled,
                int intervalMinutes,
                int quietStartMinutes,
                int quietEndMinutes,
                boolean workoutEnabled,
                String workoutFrequency
        ) {
            Context app = getApplicationContext();
            HydrationStore.saveConfig(
                    app,
                    targetMl,
                    remindersEnabled,
                    intervalMinutes,
                    quietStartMinutes,
                    quietEndMinutes,
                    workoutEnabled,
                    workoutFrequency
            );
            HydrationScheduler.apply(app);
            if (remindersEnabled) {
                runOnUiThread(MainActivityV077.this::requestHydrationNotificationPermissionIfNeeded);
            }
        }
    }
}
