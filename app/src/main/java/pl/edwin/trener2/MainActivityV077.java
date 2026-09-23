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
        final String meal = incoming.getStringExtra("open_food_action");
        final String action = "SCAN".equals(meal) || "WRITE".equals(meal) || "SET".equals(meal)
                ? meal : "";
        if (!workout && !diet && action.isEmpty()) return;
        final String destination = workout ? "start" : "diet";
        final int request = ++widgetNavigationGeneration;
        betaWebView.postDelayed(new Runnable() {
            private int retries = 0;
            @Override
            public void run() {
                if (request != widgetNavigationGeneration || betaWebView == null) return;
                if (betaWebView.getProgress() < 100) {
                    if (retries++ < 50) betaWebView.postDelayed(this, 150);
                    return;
                }
                final String js;
                if (!action.isEmpty()) {
                    // Feature loader injects the meal entry module after the document loads.
                    js = "(function(){var n=0;function open(){"
                        + "if(window.TrenerMealEntry0886&&window.TrenerMealEntry0886.open){"
                        + "window.TrenerMealEntry0886.open('" + action + "');}"
                        + "else if(n++<40){setTimeout(open,150);}"
                        + "else if(typeof showTab==='function'){showTab('diet');}}open();})();";
                } else {
                    js = "(function(){if(typeof showTab==='function'){showTab('" + destination
                        + "');}else{var bs=document.querySelectorAll('.tab');"
                        + "for(var i=0;i<bs.length;i++){if(bs[i].dataset.tab==='" + destination
                        + "'){bs[i].click();break;}}}})();";
                }
                betaWebView.evaluateJavascript(js, null);
                Intent pending = getIntent();
                if (pending != null) {
                    pending.removeExtra("open_workout");
                    pending.removeExtra("open_diet");
                    pending.removeExtra("open_food_action");
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
        public int getDayMl(String date) {
            return HydrationStore.getDayMl(getApplicationContext(), date);
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
