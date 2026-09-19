package pl.edwin.trener2;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
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

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int NOTIFICATION_PERMISSION_REQUEST = 101;
    private static final int BACKUP_EXPORT_REQUEST = 201;
    private static final int BACKUP_IMPORT_REQUEST = 202;
    private static final int FILE_CHOOSER_REQUEST = 203;
    private static final int MAX_BACKUP_BYTES = 5 * 1024 * 1024;
    private static final String UPDATE_INFO_URL =
            "https://raw.githubusercontent.com/edwinkarolczyk/Trener-/main/update.json";

    private WebView webView;
    private LocalSessionManager localSession;
    private NearbyProfileManager nearbyProfiles;
    private GmsBarcodeScanner qrScanner;
    private GmsBarcodeScanner foodScanner;
    private UpdateInstaller updateInstaller;
    private String pendingBackupJson;
    private ValueCallback<Uri[]> fileChooserCallback;
    private PowerManager.WakeLock workoutCpuWakeLock;
    private PowerManager.WakeLock workoutScreenWakeLock;
    private PowerManager.WakeLock hostNetworkWakeLock;
    private WifiManager.WifiLock hostWifiLock;
    private final Handler workoutScreenHandler = new Handler(Looper.getMainLooper());
    private Runnable workoutWakeRunnable;
    private boolean workoutSessionActive = false;
    private boolean workoutScreenPinned = false;
    private boolean workoutSharedActive = false;
    private int workoutLocalAthlete = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(9, 9, 9));
        getWindow().setNavigationBarColor(Color.rgb(9, 9, 9));
        createNotificationChannel();
        createQrScanner();
        createFoodScanner();
        updateInstaller = new UpdateInstaller(this, this::emitUpdateDownloadStatus);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(9, 9, 9));
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(
                        "(function(){"
                                + "if(!document.getElementById('trener-qr-addon')){"
                                + "var s=document.createElement('script');s.id='trener-qr-addon';"
                                + "s.src='qr-addon.js';document.body.appendChild(s);}"
                                + "if(!document.getElementById('trener-update-addon')){"
                                + "var u=document.createElement('script');u.id='trener-update-addon';"
                                + "u.src='update-addon.js';document.body.appendChild(u);}"
                                + "if(!document.getElementById('trener-backup-addon')){"
                                + "var b=document.createElement('script');b.id='trener-backup-addon';"
                                + "b.src='backup-addon.js';document.body.appendChild(b);}"
                                + "})();",
                        null
                );
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }
                fileChooserCallback = filePathCallback;

                String mimeType = "*/*";
                try {
                    String[] acceptTypes = fileChooserParams == null ? null : fileChooserParams.getAcceptTypes();
                    if (acceptTypes != null) {
                        for (String accept : acceptTypes) {
                            if (accept != null && !accept.trim().isEmpty()) {
                                mimeType = accept.trim();
                                break;
                            }
                        }
                    }
                } catch (Throwable ignored) {
                    mimeType = "*/*";
                }

                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mimeType);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
                try {
                    startActivityForResult(
                            Intent.createChooser(intent, mimeType.startsWith("image/") ? "Wybierz zdjęcie" : "Wybierz plik"),
                            FILE_CHOOSER_REQUEST
                    );
                    return true;
                } catch (Exception e) {
                    if (fileChooserCallback != null) {
                        fileChooserCallback.onReceiveValue(null);
                        fileChooserCallback = null;
                    }
                    Toast.makeText(MainActivity.this, "Nie udało się otworzyć wyboru pliku.", Toast.LENGTH_LONG).show();
                    return false;
                }
            }
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
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

        nearbyProfiles = new NearbyProfileManager(this, this::emitNearbyEvent);
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


    private void createFoodScanner() {
        try {
            GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
                    .setBarcodeFormats(
                            Barcode.FORMAT_EAN_13,
                            Barcode.FORMAT_EAN_8,
                            Barcode.FORMAT_UPC_A,
                            Barcode.FORMAT_UPC_E
                    )
                    .enableAutoZoom()
                    .build();
            foodScanner = GmsBarcodeScanning.getClient(this, options);
        } catch (Throwable e) {
            foodScanner = null;
        }
    }

    private void startFoodScanner() {
        if (foodScanner == null) {
            Toast.makeText(this, "Skaner kodów produktów nie jest dostępny na tym telefonie.", Toast.LENGTH_LONG).show();
            return;
        }
        foodScanner.startScan()
                .addOnSuccessListener(barcode -> {
                    String raw = barcode.getRawValue();
                    if (raw == null || raw.trim().isEmpty()) {
                        Toast.makeText(this, "Kod produktu jest pusty.", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    emitFoodBarcode(raw);
                })
                .addOnCanceledListener(() -> {
                    // Użytkownik zamknął skaner.
                })
                .addOnFailureListener(e -> Toast.makeText(
                        this,
                        "Nie udało się uruchomić skanera produktu. Sprawdź Usługi Google Play.",
                        Toast.LENGTH_LONG
                ).show());
    }

    private String normalizeFoodBarcode(String raw) {
        if (raw == null) return "";
        return raw.replaceAll("[^0-9]", "");
    }

    private void lookupOpenFoodFactsNative(String rawBarcode) {
        final String barcode = normalizeFoodBarcode(rawBarcode);
        if (!barcode.matches("\\d{8,14}")) {
            emitFoodLookup("error", "Nieprawidłowy kod kreskowy.");
            return;
        }

        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                String endpoint = "https://world.openfoodfacts.org/api/v2/product/"
                        + barcode
                        + ".json?fields=code,product_name,product_name_pl,brands,quantity,serving_size,serving_quantity,nutriments";
                connection = (HttpURLConnection) new URL(endpoint).openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(10000);
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("Accept-Language", "pl,en;q=0.8");
                connection.setRequestProperty("User-Agent", "Trener2/0.8-beta.2 Android OpenFoodFacts");
                connection.setRequestProperty("Cache-Control", "no-cache");

                int code = connection.getResponseCode();
                if (code == HttpURLConnection.HTTP_NOT_FOUND) {
                    emitFoodLookup("not_found", barcode);
                    return;
                }
                if (code != HttpURLConnection.HTTP_OK) {
                    emitFoodLookup("error", "Open Food Facts: błąd " + code + ".");
                    return;
                }

                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                        connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (body.length() + line.length() > 524288) {
                            throw new IllegalStateException("Odpowiedź Open Food Facts jest zbyt duża.");
                        }
                        body.append(line);
                    }
                }
                emitFoodLookup("ok", body.toString());
            } catch (Exception e) {
                emitFoodLookup("error", "Nie udało się pobrać produktu. Sprawdź internet.");
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "Trener2-OpenFoodFacts").start();
    }


    private void searchFoodCatalogNative(String source, String query, String apiKey, int requestId) {
        final String provider = "usda".equals(source) ? "usda" : "off";
        final String text = query == null ? "" : query.trim();
        if (!"off".equals(source) && !"usda".equals(source)) {
            emitFoodCatalog(provider, "error", "Nieznane źródło.", requestId);
            return;
        }
        if (text.length() < 2 || text.length() > 90) {
            emitFoodCatalog(provider, "error", "Wpisz 2–90 znaków.", requestId);
            return;
        }
        final String key = apiKey == null ? "" : apiKey.trim();
        if ("usda".equals(provider) && !key.matches("[A-Za-z0-9_-]{8,128}")) {
            emitFoodCatalog(provider, "error", "Podaj poprawny klucz API USDA.", requestId);
            return;
        }
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                final String term = java.net.URLEncoder.encode(text, "UTF-8");
                final String endpoint = "off".equals(provider)
                        ? "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" + term
                            + "&search_simple=1&action=process&json=1&page_size=20"
                            + "&fields=code,product_name,product_name_pl,nutriments,serving_quantity,brands"
                        : "https://api.nal.usda.gov/fdc/v1/foods/search?query=" + term
                            + "&pageSize=15&dataType=Foundation,SR%20Legacy,Branded"
                            + "&api_key=" + java.net.URLEncoder.encode(key, "UTF-8");
                int status = -1;
                // OFF bywa tymczasowo niedostępne (502/503/504). Jedno ponowienie,
                // bez pętli agresywnych żądań i bez blokowania wyników USDA.
                final int maxAttempts = "off".equals(provider) ? 2 : 1;
                for (int attempt = 0; attempt < maxAttempts; attempt++) {
                    if (connection != null) {
                        connection.disconnect();
                        connection = null;
                    }
                    connection = (HttpURLConnection) new URL(endpoint).openConnection();
                    connection.setRequestMethod("GET");
                    connection.setConnectTimeout(8000);
                    connection.setReadTimeout(12000);
                    connection.setRequestProperty("Accept", "application/json");
                    connection.setRequestProperty("Accept-Language", "pl,en;q=0.8");
                    connection.setRequestProperty("User-Agent", "Trener2/0.8.4 Android food-search");
                    status = connection.getResponseCode();
                    if ("off".equals(provider) && attempt == 0
                            && (status == 502 || status == 503 || status == 504)) {
                        connection.disconnect();
                        connection = null;
                        Thread.sleep(1200L);
                        continue;
                    }
                    break;
                }
                if (status != HttpURLConnection.HTTP_OK) {
                    final String detail = status == 401 || status == 403
                            ? "Odmowa dostępu — sprawdź klucz API i limity."
                            : status == 429 ? "Limit zapytań — spróbuj później."
                            : status == 503 || status == 502 || status == 504
                            ? "Serwis chwilowo niedostępny (HTTP " + status + ")."
                            : "Błąd HTTP " + status + ".";
                    emitFoodCatalog(provider, "error", detail, requestId);
                    return;
                }
                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                        connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (body.length() + line.length() > 1250000) {
                            throw new IllegalStateException("Odpowiedź jest zbyt duża.");
                        }
                        body.append(line);
                    }
                }
                emitFoodCatalog(provider, "ok", body.toString(), requestId);
            } catch (Exception e) {
                emitFoodCatalog(provider, "error", "Błąd połączenia. Sprawdź internet.", requestId);
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "Trener2-food-" + provider).start();
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

    private static final String SHARED_ALERT_CHANNEL_ID = "shared_workout_alerts_v08211";

    private void showWorkoutAlertNative(String rawTitle, String rawText) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                    && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestNotificationPermissionIfNeeded();
                return;
            }

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        SHARED_ALERT_CHANNEL_ID,
                        "Wspólny trening — ważne",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Ważne komunikaty wspólnego treningu i zmiany ćwiczeń");
                channel.enableVibration(true);
                manager.createNotificationChannel(channel);
            }

            Intent openApp = new Intent(this, MainActivityV077.class);
            openApp.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent contentIntent = PendingIntent.getActivity(
                    this,
                    8211,
                    openApp,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            String title = rawTitle == null || rawTitle.trim().isEmpty() ? "Trener 2" : rawTitle.trim();
            String text = rawText == null ? "" : rawText.trim();

            Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? new Notification.Builder(this, SHARED_ALERT_CHANNEL_ID)
                    : new Notification.Builder(this);

            Notification notification = builder
                    .setSmallIcon(android.R.drawable.ic_dialog_alert)
                    .setContentTitle(title)
                    .setContentText(text)
                    .setStyle(new Notification.BigTextStyle().bigText(text))
                    .setContentIntent(contentIntent)
                    .setAutoCancel(true)
                    .setCategory(Notification.CATEGORY_EVENT)
                    .setPriority(Notification.PRIORITY_HIGH)
                    .setDefaults(Notification.DEFAULT_ALL)
                    .build();

            manager.notify(8211, notification);
        } catch (Exception ignored) {
        }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    private void checkForUpdateNative() {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                if ("beta".equals(BuildConfig.UPDATE_CHANNEL)) {
                    emitUpdateResult("ok", UpdateInstaller.fetchLatestBetaUpdateJson());
                    return;
                }

                URL url = new URL(UPDATE_INFO_URL);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(6000);
                connection.setReadTimeout(6000);
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("Cache-Control", "no-cache");

                int code = connection.getResponseCode();
                if (code != HttpURLConnection.HTTP_OK) {
                    emitUpdateResult("error", "Serwer aktualizacji zwrócił błąd " + code + ".");
                    return;
                }

                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                        connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null && body.length() < 65536) {
                        body.append(line);
                    }
                }
                emitUpdateResult("ok", body.toString());
            } catch (Exception e) {
                emitUpdateResult("error", "Nie udało się sprawdzić aktualizacji. Sprawdź połączenie z internetem.");
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "Trener2-UpdateCheck").start();
    }

    private void openUpdateUrlNative(String rawUrl) {
        try {
            Uri uri = Uri.parse(rawUrl == null ? "" : rawUrl.trim());
            String host = uri.getHost();
            String path = uri.getPath();
            boolean allowed = "https".equalsIgnoreCase(uri.getScheme())
                    && "github.com".equalsIgnoreCase(host)
                    && path != null
                    && path.startsWith("/edwinkarolczyk/Trener-/releases/");
            if (!allowed) {
                Toast.makeText(this, "Nieprawidłowy adres aktualizacji.", Toast.LENGTH_LONG).show();
                return;
            }
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Nie udało się otworzyć aktualizacji.", Toast.LENGTH_LONG).show();
        }
    }

    private void setWorkoutScreenStateNative(
            boolean workoutActive,
            boolean keepScreenOn,
            long wakeAtEpochMs,
            boolean shared,
            int localAthlete
    ) {
        runOnUiThread(() -> {
            workoutSessionActive = workoutActive;
            workoutSharedActive = shared;
            workoutLocalAthlete = Math.max(0, localAthlete);

            if (workoutWakeRunnable != null) {
                workoutScreenHandler.removeCallbacks(workoutWakeRunnable);
                workoutWakeRunnable = null;
            }

            if (workoutActive) {
                ensureWorkoutCpuWakeLock();
            } else {
                releaseWorkoutCpuWakeLock();
            }

            if (!workoutActive) {
                disableWorkoutScreenPin();
                return;
            }

            if (keepScreenOn) {
                enableWorkoutScreenPin(true);
                return;
            }

            disableWorkoutScreenPin();
            if (wakeAtEpochMs > System.currentTimeMillis()) {
                scheduleWorkoutWake(wakeAtEpochMs);
            }
        });
    }

    private void ensureWorkoutCpuWakeLock() {
        try {
            if (workoutCpuWakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    workoutCpuWakeLock = pm.newWakeLock(
                            PowerManager.PARTIAL_WAKE_LOCK,
                            getPackageName() + ":workout-cpu"
                    );
                    workoutCpuWakeLock.setReferenceCounted(false);
                }
            }
            if (workoutCpuWakeLock != null && !workoutCpuWakeLock.isHeld()) {
                workoutCpuWakeLock.acquire(4L * 60L * 60L * 1000L);
            }
        } catch (Exception ignored) {
        }
    }

    private void releaseWorkoutCpuWakeLock() {
        try {
            if (workoutCpuWakeLock != null && workoutCpuWakeLock.isHeld()) {
                workoutCpuWakeLock.release();
            }
        } catch (Exception ignored) {
        }
    }

    @SuppressWarnings("deprecation")
    private void ensureHostNetworkLocks() {
        try {
            if (hostNetworkWakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    hostNetworkWakeLock = pm.newWakeLock(
                            PowerManager.PARTIAL_WAKE_LOCK,
                            getPackageName() + ":shared-host-network"
                    );
                    hostNetworkWakeLock.setReferenceCounted(false);
                }
            }
            if (hostNetworkWakeLock != null && !hostNetworkWakeLock.isHeld()) {
                hostNetworkWakeLock.acquire();
            }
        } catch (Exception ignored) {
        }

        try {
            if (hostWifiLock == null) {
                WifiManager wifi = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wifi != null) {
                    hostWifiLock = wifi.createWifiLock(
                            WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                            getPackageName() + ":shared-host-wifi"
                    );
                    hostWifiLock.setReferenceCounted(false);
                }
            }
            if (hostWifiLock != null && !hostWifiLock.isHeld()) {
                hostWifiLock.acquire();
            }
        } catch (Exception ignored) {
        }
    }

    private void releaseHostNetworkLocks() {
        try {
            if (hostWifiLock != null && hostWifiLock.isHeld()) {
                hostWifiLock.release();
            }
        } catch (Exception ignored) {
        }
        try {
            if (hostNetworkWakeLock != null && hostNetworkWakeLock.isHeld()) {
                hostNetworkWakeLock.release();
            }
        } catch (Exception ignored) {
        }
    }

    private String hostNetworkLocksJson() {
        try {
            JSONObject json = new JSONObject();
            json.put("wifiLockHeld", hostWifiLock != null && hostWifiLock.isHeld());
            json.put("wakeLockHeld", hostNetworkWakeLock != null && hostNetworkWakeLock.isHeld());
            return json.toString();
        } catch (Exception ignored) {
            return "{}";
        }
    }

    private void scheduleWorkoutWake(long wakeAtEpochMs) {
        long delay = Math.max(0L, wakeAtEpochMs - System.currentTimeMillis());
        workoutWakeRunnable = () -> {
            workoutWakeRunnable = null;
            if (!workoutSessionActive) return;
            enableWorkoutScreenPin(true);
        };
        workoutScreenHandler.postDelayed(workoutWakeRunnable, delay);
    }

    @SuppressWarnings("deprecation")
    private void enableWorkoutScreenPin(boolean wakeNow) {
        try {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true);
                setTurnScreenOn(true);
            } else {
                getWindow().addFlags(
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                );
            }

            if (wakeNow && !workoutScreenPinned) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isInteractive()) {
                    workoutScreenWakeLock = pm.newWakeLock(
                            PowerManager.SCREEN_BRIGHT_WAKE_LOCK
                                    | PowerManager.ACQUIRE_CAUSES_WAKEUP
                                    | PowerManager.ON_AFTER_RELEASE,
                            getPackageName() + ":workout-screen"
                    );
                    workoutScreenWakeLock.setReferenceCounted(false);
                    workoutScreenWakeLock.acquire(5000L);
                }
            }
            workoutScreenPinned = true;
        } catch (Exception ignored) {
        }
    }

    @SuppressWarnings("deprecation")
    private void disableWorkoutScreenPin() {
        try {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setTurnScreenOn(false);
                setShowWhenLocked(false);
            } else {
                getWindow().clearFlags(
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                );
            }
        } catch (Exception ignored) {
        }
        workoutScreenPinned = false;
    }

    private void handleWorkoutNetworkWake(String message) {
        if (!workoutSessionActive || !workoutSharedActive || message == null) return;
        try {
            JSONObject obj = new JSONObject(message);
            if (!"BETA070_STATE".equals(obj.optString("type", ""))) return;
            if (obj.optInt("turn", -1) != workoutLocalAthlete) return;

            long wakeAt = obj.optLong("waitUntil", 0L);
            JSONObject readyAt = obj.optJSONObject("readyAt");
            if (readyAt != null) {
                wakeAt = Math.max(wakeAt, readyAt.optLong(String.valueOf(workoutLocalAthlete), 0L));
            }

            final long target = wakeAt;
            runOnUiThread(() -> {
                if (!workoutSessionActive || !workoutSharedActive) return;
                if (workoutWakeRunnable != null) {
                    workoutScreenHandler.removeCallbacks(workoutWakeRunnable);
                    workoutWakeRunnable = null;
                }
                if (target <= System.currentTimeMillis() + 250L) {
                    enableWorkoutScreenPin(true);
                } else {
                    disableWorkoutScreenPin();
                    scheduleWorkoutWake(target);
                }
            });
        } catch (Exception ignored) {
        }
    }

    private String appVersionName() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException e) {
            return "0.0.0";
        }
    }

    private void startBackupExport(String json, String suggestedName) {
        if (json == null || json.trim().isEmpty()) {
            Toast.makeText(this, "Brak danych do eksportu.", Toast.LENGTH_LONG).show();
            return;
        }
        if (json.getBytes(StandardCharsets.UTF_8).length > MAX_BACKUP_BYTES) {
            Toast.makeText(this, "Kopia danych jest zbyt duża.", Toast.LENGTH_LONG).show();
            return;
        }
        pendingBackupJson = json;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE,
                suggestedName == null || suggestedName.trim().isEmpty()
                        ? "Trener2-kopia.json"
                        : suggestedName.trim());
        startActivityForResult(intent, BACKUP_EXPORT_REQUEST);
    }

    private void startBackupImport() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        startActivityForResult(intent, BACKUP_IMPORT_REQUEST);
    }

    private String readBackup(Uri uri) throws Exception {
        try (InputStream in = getContentResolver().openInputStream(uri);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (in == null) throw new IllegalStateException("Brak dostępu do pliku");
            byte[] buffer = new byte[8192];
            int total = 0;
            int read;
            while ((read = in.read(buffer)) != -1) {
                total += read;
                if (total > MAX_BACKUP_BYTES) throw new IllegalArgumentException("Plik kopii jest zbyt duży");
                out.write(buffer, 0, read);
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    private void emitBackupImport(String payload) {
        if (webView == null) return;
        final String js = "window.TrenerBackup&&window.TrenerBackup.nativeImport("
                + JSONObject.quote(payload == null ? "" : payload) + ");";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getData() != null) {
                    result = new Uri[]{data.getData()};
                } else if (data.getClipData() != null && data.getClipData().getItemCount() > 0) {
                    result = new Uri[]{data.getClipData().getItemAt(0).getUri()};
                }
            }
            if (fileChooserCallback != null) {
                fileChooserCallback.onReceiveValue(result);
                fileChooserCallback = null;
            }
            return;
        }

        if (requestCode == BACKUP_EXPORT_REQUEST) {
            if (resultCode != RESULT_OK || data == null || data.getData() == null) {
                pendingBackupJson = null;
                return;
            }
            Uri uri = data.getData();
            try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
                if (out == null) throw new IllegalStateException("Brak dostępu do pliku");
                out.write(pendingBackupJson.getBytes(StandardCharsets.UTF_8));
                out.flush();
                Toast.makeText(this, "Kopia Trener 2 zapisana.", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, "Nie udało się zapisać kopii danych.", Toast.LENGTH_LONG).show();
            } finally {
                pendingBackupJson = null;
            }
            return;
        }

        if (requestCode == BACKUP_IMPORT_REQUEST) {
            if (resultCode != RESULT_OK || data == null || data.getData() == null) return;
            try {
                emitBackupImport(readBackup(data.getData()));
            } catch (Exception e) {
                Toast.makeText(this, "Nie udało się odczytać kopii danych.", Toast.LENGTH_LONG).show();
            }
        }
    }

    private void startSharedLogEmail(String json, String subject, String body, String suggestedName) {
        try {
            String payload = json == null ? "" : json;
            byte[] bytes = payload.getBytes(StandardCharsets.UTF_8);
            if (bytes.length == 0) {
                Toast.makeText(this, "Brak wspólnego logu do wysłania.", Toast.LENGTH_SHORT).show();
                return;
            }
            if (bytes.length > 4 * 1024 * 1024) {
                Toast.makeText(this, "Log jest zbyt duży do wysłania mailem.", Toast.LENGTH_LONG).show();
                return;
            }

            File dir = new File(getCacheDir(), "shared-logs");
            if (!dir.exists() && !dir.mkdirs()) {
                throw new IllegalStateException("Nie udało się utworzyć katalogu logów");
            }

            String safeName = suggestedName == null ? "" : suggestedName.trim();
            safeName = safeName.replaceAll("[^A-Za-z0-9._-]+", "-");
            if (safeName.isEmpty()) safeName = "Trener2-wspolny-log.json";
            if (!safeName.toLowerCase(java.util.Locale.ROOT).endsWith(".json")) safeName += ".json";

            File file = new File(dir, safeName);
            try (FileOutputStream out = new FileOutputStream(file, false)) {
                out.write(bytes);
                out.flush();
            }

            Uri uri = FileProvider.getUriForFile(
                    this,
                    BuildConfig.APPLICATION_ID + ".updateprovider",
                    file
            );

            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("application/json");
            send.putExtra(Intent.EXTRA_SUBJECT, subject == null ? "Trener 2 — wspólny log diagnostyczny" : subject);
            send.putExtra(Intent.EXTRA_TEXT, body == null ? "" : body);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            send.setClipData(ClipData.newRawUri("Trener 2 wspólny log", uri));

            startActivity(Intent.createChooser(send, "Wyślij wspólny log mailem"));
        } catch (Exception e) {
            Toast.makeText(
                    this,
                    "Nie udało się przygotować maila z logiem: " + (e.getMessage() == null ? "błąd" : e.getMessage()),
                    Toast.LENGTH_LONG
            ).show();
        }
    }

    private void emitNearbyEvent(String json) {
        if (webView == null) return;
        final String js = "window.TrenerNearby087&&window.TrenerNearby087.nativeEvent("
                + JSONObject.quote(json == null ? "{}" : json) + ");";
        runOnUiThread(() -> {
            if (webView != null) webView.evaluateJavascript(js, null);
        });
    }

    private void emitWifiStatus(String status, String detail) {
        if (webView == null) return;
        final String js = "window.TrenerWifi&&window.TrenerWifi.nativeStatus("
                + JSONObject.quote(status == null ? "" : status) + ","
                + JSONObject.quote(detail == null ? "" : detail) + ");";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    private void emitWifiMessage(String message) {
        handleWorkoutNetworkWake(message);
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


    private void emitFoodBarcode(String payload) {
        if (webView == null) return;
        final String js = "window.TrenerOpenFoodFacts&&window.TrenerOpenFoodFacts.nativeBarcode("
                + JSONObject.quote(payload == null ? "" : payload) + ");";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    private void emitFoodLookup(String status, String payload) {
        if (webView == null) return;
        final String js = "window.TrenerOpenFoodFacts&&window.TrenerOpenFoodFacts.nativeLookup("
                + JSONObject.quote(status == null ? "error" : status) + ","
                + JSONObject.quote(payload == null ? "" : payload) + ");";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }


    private void emitFoodCatalog(String provider, String status, String payload, int requestId) {
        if (webView == null) return;
        final String js = "window.TrenerFoodCatalog&&window.TrenerFoodCatalog.nativeResult("
                + JSONObject.quote(provider) + ","
                + JSONObject.quote(status) + ","
                + JSONObject.quote(payload == null ? "" : payload) + ","
                + requestId + ");";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    private void emitUpdateResult(String status, String payload) {
        if (webView == null) return;
        final String js = "window.TrenerUpdate&&window.TrenerUpdate.nativeResult("
                + JSONObject.quote(status == null ? "error" : status) + ","
                + JSONObject.quote(payload == null ? "" : payload) + ");";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    private void emitUpdateDownloadStatus(String status, String payload) {
        if (webView == null) return;
        final String js = "window.TrenerUpdate&&window.TrenerUpdate.nativeDownloadStatus("
                + JSONObject.quote(status == null ? "error" : status) + ","
                + JSONObject.quote(payload == null ? "" : payload) + ");";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (updateInstaller != null) updateInstaller.resumePendingInstall();
    }

    @Override
    protected void onDestroy() {
        releaseHostNetworkLocks();
        releaseWorkoutCpuWakeLock();
        if (workoutWakeRunnable != null) {
            workoutScreenHandler.removeCallbacks(workoutWakeRunnable);
            workoutWakeRunnable = null;
        }
        try {
            if (workoutScreenWakeLock != null && workoutScreenWakeLock.isHeld()) {
                workoutScreenWakeLock.release();
            }
        } catch (Exception ignored) {
        }
        if (fileChooserCallback != null) {
            fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = null;
        }
        if (nearbyProfiles != null) nearbyProfiles.shutdown();
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
        public boolean copyText(String text) {
            try {
                ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard == null) return false;
                clipboard.setPrimaryClip(ClipData.newPlainText("Trener 2 logi", text == null ? "" : text));
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public String getDeviceLabel() {
            String manufacturer = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.trim();
            String model = Build.MODEL == null ? "" : Build.MODEL.trim();
            if (manufacturer.isEmpty()) return model.isEmpty() ? "Android" : model;
            if (model.isEmpty()) return manufacturer;
            if (model.toLowerCase(java.util.Locale.ROOT).startsWith(manufacturer.toLowerCase(java.util.Locale.ROOT))) {
                return model;
            }
            return manufacturer + " " + model;
        }

        @JavascriptInterface
        public void emailSharedLog(String json, String subject, String body, String suggestedName) {
            runOnUiThread(() -> startSharedLogEmail(json, subject, body, suggestedName));
        }

        @JavascriptInterface
        public void showWorkoutAlert(String title, String text) {
            runOnUiThread(() -> showWorkoutAlertNative(title, text));
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
        public void nearbyStart(String profileId, String profileName) {
            if (nearbyProfiles != null) nearbyProfiles.start(profileId, profileName);
        }

        @JavascriptInterface
        public void nearbyStop() {
            if (nearbyProfiles != null) nearbyProfiles.stop();
        }

        @JavascriptInterface
        public String nearbyDiagnostics() {
            return nearbyProfiles == null ? "Wykrywanie LAN niedostępne." : nearbyProfiles.diagnostics();
        }

        @JavascriptInterface
        public String nearbyPairs() {
            return nearbyProfiles == null ? "[]" : nearbyProfiles.pairs();
        }

        @JavascriptInterface
        public void nearbyPair(String profileId, String localParticipantId) {
            if (nearbyProfiles != null) nearbyProfiles.pair(profileId, localParticipantId);
        }

        @JavascriptInterface
        public void nearbySend(String peerId, String json, String jobId) {
            if (nearbyProfiles != null) nearbyProfiles.send(peerId, json, jobId);
        }

        @JavascriptInterface
        public void nearbyAck(String jobId, boolean accepted) {
            if (nearbyProfiles != null) nearbyProfiles.ack(jobId, accepted);
        }

        @JavascriptInterface
        public void wifiHost(String code) {
            if (localSession != null) {
                if (!"—".equals(localSession.getLocalIp())) ensureHostNetworkLocks();
                localSession.host(code);
            }
        }

        @JavascriptInterface
        public void wifiJoin(String hostIp, String code) {
            releaseHostNetworkLocks();
            if (localSession != null) localSession.join(hostIp, code);
        }

        @JavascriptInterface
        public boolean wifiSend(String payload) {
            return localSession != null && localSession.send(payload);
        }

        @JavascriptInterface
        public void wifiDisconnect() {
            releaseHostNetworkLocks();
            if (localSession != null) localSession.disconnect();
        }

        @JavascriptInterface
        public String hostNetworkLocks() {
            return hostNetworkLocksJson();
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
        public String wifiDiagnostics() {
            return localSession == null ? "{}" : localSession.diagnosticsJson();
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

        @JavascriptInterface
        public void scanFoodBarcode() {
            runOnUiThread(() -> startFoodScanner());
        }

        @JavascriptInterface
        public void lookupOpenFoodFacts(String barcode) {
            lookupOpenFoodFactsNative(barcode);
        }

        @JavascriptInterface
        public void searchFoodCatalog(String source, String query, String apiKey, int requestId) {
            searchFoodCatalogNative(source, query, apiKey, requestId);
        }

        @JavascriptInterface
        public String getAppVersion() {
            return appVersionName();
        }

        @JavascriptInterface
        public void setWorkoutScreenState(
                boolean workoutActive,
                boolean keepScreenOn,
                long wakeAtEpochMs,
                boolean shared,
                int localAthlete
        ) {
            setWorkoutScreenStateNative(
                    workoutActive,
                    keepScreenOn,
                    wakeAtEpochMs,
                    shared,
                    localAthlete
            );
        }

        @JavascriptInterface
        public void checkForUpdate() {
            checkForUpdateNative();
        }

        @JavascriptInterface
        public boolean savePreUpdateBackup(String json, String targetVersion) {
            return PreUpdateBackupStore.save(
                    context,
                    json,
                    appVersionName(),
                    targetVersion == null ? "" : targetVersion
            );
        }

        @JavascriptInterface
        public boolean hasPreUpdateBackup() {
            return PreUpdateBackupStore.hasBackup(context);
        }

        @JavascriptInterface
        public void importLatestPreUpdateBackup() {
            String json = PreUpdateBackupStore.latestJson(context);
            if (json == null || json.trim().isEmpty()) {
                runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "Brak kopii sprzed aktualizacji.",
                        Toast.LENGTH_SHORT
                ).show());
                return;
            }
            emitBackupImport(json);
        }

        @JavascriptInterface
        public void exportLatestPreUpdateBackup() {
            String json = PreUpdateBackupStore.latestJson(context);
            if (json == null || json.trim().isEmpty()) {
                runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "Brak kopii sprzed aktualizacji.",
                        Toast.LENGTH_SHORT
                ).show());
                return;
            }
            String name = PreUpdateBackupStore.latestExportName(context);
            runOnUiThread(() -> startBackupExport(json, name));
        }

        @JavascriptInterface
        public void downloadAndInstallUpdate(String url, String sha256) {
            if (updateInstaller != null) updateInstaller.downloadAndInstall(url, sha256);
        }

        @JavascriptInterface
        public void openUpdateUrl(String url) {
            runOnUiThread(() -> openUpdateUrlNative(url));
        }

        @JavascriptInterface
        public void exportBackup(String json, String suggestedName) {
            runOnUiThread(() -> startBackupExport(json, suggestedName));
        }

        @JavascriptInterface
        public void importBackup() {
            runOnUiThread(() -> startBackupImport());
        }
    }
}
