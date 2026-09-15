package pl.edwin.trener2;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.common.BitMatrix;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;

public class MainActivity extends Activity {
    private static final int NOTIFICATION_PERMISSION_REQUEST = 101;

    private WebView webView;
    private LocalSessionManager localSession;
    private GmsBarcodeScanner qrScanner;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(9, 9, 9));
        getWindow().setNavigationBarColor(Color.rgb(9, 9, 9));
        createNotificationChannel();
        createQrScanner();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(9, 9, 9));
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(
                        "(function(){if(document.getElementById('trener-qr-addon'))return;"
                                + "var s=document.createElement('script');s.id='trener-qr-addon';"
                                + "s.src='qr-addon.js';document.body.appendChild(s);})();",
                        null
                );
            }
        });

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

    private void createQrScanner() {
        try {
            GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
                    .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                    .enableAutoZoom()
                    .build();
            qrScanner = GmsBarcodeScanning.getClient(this, options);
        } catch (Throwable e) {
            qrScanner = null;
        }
    }

    private void startQrScanner() {
        if (qrScanner == null) {
            Toast.makeText(this, "Skaner QR nie jest dostępny na tym telefonie.", Toast.LENGTH_LONG).show();
            return;
        }
        qrScanner.startScan()
                .addOnSuccessListener(barcode -> {
                    String raw = barcode.getRawValue();
                    if (raw == null || raw.trim().isEmpty()) {
                        Toast.makeText(this, "Kod QR jest pusty.", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    emitQrScan(raw);
                })
                .addOnCanceledListener(() -> {
                    // Użytkownik po prostu zamknął skaner.
                })
                .addOnFailureListener(e -> Toast.makeText(
                        this,
                        "Nie udało się uruchomić skanera QR. Sprawdź Usługi Google Play.",
                        Toast.LENGTH_LONG
                ).show());
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

    private void emitQrScan(String payload) {
        if (webView == null) return;
        final String js = "window.TrenerQr&&window.TrenerQr.nativeScan("
                + JSONObject.quote(payload == null ? "" : payload) + ");";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    @Override
    protected void onDestroy() {
        if (localSession != null) localSession.shutdown();
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

        @JavascriptInterface
        public String wifiQr(String payload) {
            if (payload == null || payload.length() > 512) return "";
            try {
                final int size = 320;
                BitMatrix matrix = new MultiFormatWriter().encode(payload, BarcodeFormat.QR_CODE, size, size);
                Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
                int[] pixels = new int[size * size];
                for (int y = 0; y < size; y++) {
                    int offset = y * size;
                    for (int x = 0; x < size; x++) {
                        pixels[offset + x] = matrix.get(x, y) ? Color.BLACK : Color.WHITE;
                    }
                }
                bitmap.setPixels(pixels, 0, size, 0, 0, size, size);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
                return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void scanWifiQr() {
            runOnUiThread(() -> startQrScanner());
        }
    }
}
