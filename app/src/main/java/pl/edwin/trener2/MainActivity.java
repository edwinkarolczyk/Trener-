package pl.edwin.trener2;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final int NOTIFICATION_PERMISSION_REQUEST = 101;

    private WebView webView;
    private LocalSessionManager localSession;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(9, 9, 9));
        getWindow().setNavigationBarColor(Color.rgb(9, 9, 9));
        createNotificationChannel();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(9, 9, 9));
        webView.setWebViewClient(new WebViewClient());

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setDefaultTextEncodingName("UTF-8");

        localSession = new LocalSessionManager(new LocalSessionManager.Listener() {
            @Override
            public void onStatus(String status, String detail) {
                emitWifiStatus(status, detail);
            }

            @Override
            public void onMessage(String message) {
                emitWifiMessage(message);
            }
        });

        webView.addJavascriptInterface(new AndroidBridge(this), "Android");
        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            NotificationChannel channel = new NotificationChannel(
                    NotificationReceiver.CHANNEL_ID,
                    "Przypomnienia o treningu",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Przypomnienia o zaplanowanych treningach");
            manager.createNotificationChannel(channel);
        }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    private void emitWifiStatus(String status, String detail) {
        if (webView == null) return;
        final String js = "window.TrenerWifi&&window.TrenerWifi.nativeStatus("
                + JSONObject.quote(status == null ? "" : status) + ","
                + JSONObject.quote(detail == null ? "" : detail) + ");";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    private void emitWifiMessage(String message) {
        if (webView == null) return;
        final String js = "window.TrenerWifi&&window.TrenerWifi.nativeMessage("
                + JSONObject.quote(message == null ? "" : message) + ");";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    @Override
    protected void onDestroy() {
        if (localSession != null) localSession.disconnect();
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    public class AndroidBridge {
        private final Context context;

        AndroidBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void scheduleReminders(String daysCsv, int hour, int minute) {
            runOnUiThread(() -> requestNotificationPermissionIfNeeded());
            ReminderScheduler.saveAndSchedule(context, daysCsv, hour, minute);
        }

        @JavascriptInterface
        public void cancelReminders() {
            ReminderScheduler.disable(context);
        }

        @JavascriptInterface
        public String getReminderConfig() {
            return ReminderScheduler.getConfigJson(context);
        }

        @JavascriptInterface
        public void vibrate(int milliseconds) {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator == null || !vibrator.hasVibrator()) return;
            long duration = Math.max(20, Math.min(milliseconds, 1000));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(duration);
            }
        }

        @JavascriptInterface
        public void wifiHost(String code) {
            if (localSession != null) localSession.host(code);
        }

        @JavascriptInterface
        public void wifiJoin(String hostIp, String code) {
            if (localSession != null) localSession.join(hostIp, code);
        }

        @JavascriptInterface
        public boolean wifiSend(String payload) {
            return localSession != null && localSession.send(payload);
        }

        @JavascriptInterface
        public void wifiDisconnect() {
            if (localSession != null) localSession.disconnect();
        }

        @JavascriptInterface
        public String wifiLocalIp() {
            return localSession == null ? "—" : localSession.getLocalIp();
        }

        @JavascriptInterface
        public boolean wifiConnected() {
            return localSession != null && localSession.isConnected();
        }

        @JavascriptInterface
        public boolean wifiHosting() {
            return localSession != null && localSession.isHosting();
        }
    }
}
