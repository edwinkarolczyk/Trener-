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

    private void openWidgetTargetIfRequested() {
        Intent intent = getIntent();
        if (betaWebView == null || intent == null) return;
        if (intent.getBooleanExtra("open_workout", false)) {
            intent.removeExtra("open_workout");
            betaWebView.postDelayed(() -> betaWebView.evaluateJavascript(
                    "(function(){if(typeof showTab==='function'){showTab('start');}else{var b=document.querySelector('.tab[data-tab=\"start\"]');if(b)b.click();}})();",
                    null
            ), 350);
            return;
        }
        if (intent.getBooleanExtra("open_diet", false)) {
            intent.removeExtra("open_diet");
            betaWebView.postDelayed(() -> betaWebView.evaluateJavascript(
                    "(function(){if(typeof showTab==='function'){showTab('diet');}else{var b=document.querySelector('.tab[data-tab=\"diet\"]');if(b)b.click();}})();",
                    null
            ), 350);
        }
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
