package pl.edwin.trener2lite;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * Aktualizacje Trenera Lite z podpisanych wydań GitHub.
 * Kontrola wykonywana w tle, instalacja wymaga zatwierdzenia przez użytkownika.
 */
final class LiteUpdater {
    private static final String INDEX_URL =
        "https://raw.githubusercontent.com/edwinkarolczyk/Trener-/feature/trener2-lite-fire5/lite/update.json";
    private static final String DOWNLOAD_PREFIX =
        "https://github.com/edwinkarolczyk/Trener-/releases/download/lite-v";
    private static final long CHECK_INTERVAL_MS = 12L * 60 * 60 * 1000;
    private static final long MAX_APK_BYTES = 50L * 1024 * 1024;

    private final Activity activity;
    private final Handler main = new Handler(Looper.getMainLooper());
    private volatile boolean busy;

    LiteUpdater(Activity activity) { this.activity = activity; }

    void check(boolean manual) {
        if (busy) return;
        if (!manual) {
            long previous = activity.getPreferences(0).getLong("lite_last_update_check", 0);
            if (System.currentTimeMillis() - previous < CHECK_INTERVAL_MS) return;
        }
        busy = true;
        new Thread(() -> {
            try {
                JSONObject data = readIndex();
                long code = data.getLong("versionCode");
                String name = data.getString("versionName");
                String url = data.getString("apkUrl");
                String sha256 = data.getString("sha256").toLowerCase(Locale.US);
                if (!url.startsWith(DOWNLOAD_PREFIX) || !url.endsWith(".apk")
                    || url.contains("?") || url.contains("#") || !sha256.matches("[0-9a-f]{64}"))
                    throw new SecurityException("Nieprawidłowy adres lub suma kontrolna aktualizacji");
                if (data.optInt("minSdk", 22) > Build.VERSION.SDK_INT)
                    throw new IllegalStateException("Nowa wersja nie obsługuje tego Androida");
                activity.getPreferences(0).edit().putLong("lite_last_update_check", System.currentTimeMillis()).apply();
                if (code > BuildConfig.VERSION_CODE) {
                    String notes = data.optString("notes", "Aktualizacja Trenera 2 Lite");
                    main.post(() -> {
                        if (activity.isFinishing()) return;
                        new AlertDialog.Builder(activity)
                            .setTitle("Nowy Trener 2 Lite " + name)
                            .setMessage(notes + "\n\nTwoje profile, obciążenia i historia pozostaną na tablecie.")
                            .setNegativeButton("Później", null)
                            .setPositiveButton("POBIERZ I ZAINSTALUJ", (dialog, button) -> download(url, sha256))
                            .show();
                    });
                } else if (manual) show("Masz aktualną wersję Trenera 2 Lite (" + BuildConfig.VERSION_NAME + ").");
            } catch (Exception ex) {
                if (manual) show("Nie udało się sprawdzić aktualizacji: " + ex.getMessage());
            } finally {
                busy = false;
            }
        }, "Lite-update-check").start();
    }

    private JSONObject readIndex() throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(INDEX_URL).openConnection();
        conn.setConnectTimeout(9000);
        conn.setReadTimeout(9000);
        conn.setUseCaches(false);
        conn.setRequestProperty("Cache-Control", "no-cache");
        try {
            if (conn.getResponseCode() != 200) throw new IllegalStateException("Serwer: HTTP " + conn.getResponseCode());
            if (conn.getContentLength() > 32768) throw new IllegalStateException("Za duża informacja o aktualizacji");
            try (InputStream in = conn.getInputStream()) {
                byte[] buf = new byte[4096]; int n, size = 0;
                java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
                while ((n = in.read(buf)) != -1) {
                    size += n;
                    if (size > 32768) throw new IllegalStateException("Za duża informacja o aktualizacji");
                    out.write(buf, 0, n);
                }
                return new JSONObject(new String(out.toByteArray(), StandardCharsets.UTF_8));
            }
        } finally {
            conn.disconnect();
        }
    }

    private void download(String url, String expectedHash) {
        if (busy) return;
        busy = true;
        final AlertDialog loading = new AlertDialog.Builder(activity)
            .setTitle("Pobieranie aktualizacji")
            .setMessage("Trener 2 Lite sprawdza podpis i bezpieczeństwo APK. Nie odinstalowuj poprzedniej wersji.")
            .setCancelable(false).create();
        loading.show();
        new Thread(() -> {
            File temp = null;
            try {
                File dir = new File(activity.getCacheDir(), "updates");
                if (!dir.isDirectory() && !dir.mkdirs()) throw new IllegalStateException("Brak pamięci na aktualizację");
                temp = new File(dir, "downloading.apk");
                File target = new File(dir, "latest.apk");
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(20000);
                conn.setInstanceFollowRedirects(true);
                try {
                    if (conn.getResponseCode() != 200) throw new IllegalStateException("HTTP " + conn.getResponseCode());
                    long contentLength = conn.getContentLength();
                    if (contentLength > MAX_APK_BYTES) throw new IllegalStateException("APK jest za duży");
                    MessageDigest digest = MessageDigest.getInstance("SHA-256");
                    long length = 0;
                    try (InputStream input = conn.getInputStream(); FileOutputStream output = new FileOutputStream(temp)) {
                        byte[] buf = new byte[16384]; int n;
                        while ((n = input.read(buf)) != -1) {
                            length += n;
                            if (length > MAX_APK_BYTES) throw new IllegalStateException("APK przekracza limit 50 MB");
                            digest.update(buf, 0, n); output.write(buf, 0, n);
                        }
                        output.getFD().sync();
                    }
                    if (length == 0 || !hex(digest.digest()).equals(expectedHash))
                        throw new SecurityException("Suma SHA-256 pliku nie pasuje");
                    verifySignatureAndPackage(temp);
                    if (target.exists() && !target.delete()) throw new IllegalStateException("Nie można usunąć starego APK");
                    if (!temp.renameTo(target)) throw new IllegalStateException("Nie można zapisać nowego APK");
                    main.post(() -> {
                        loading.dismiss();
                        if (!activity.isFinishing()) install(target);
                    });
                } finally { conn.disconnect(); }
            } catch (Exception ex) {
                if (temp != null) temp.delete();
                final String error = ex.getMessage();
                main.post(() -> { loading.dismiss();show("Aktualizacja nieudana. Dane treningów nie zostały zmienione. " + error); });
            } finally { busy = false; }
        }, "Lite-update-download").start();
    }

    private void verifySignatureAndPackage(File file) throws Exception {
        PackageManager pm = activity.getPackageManager();
        @SuppressWarnings("deprecation")
        int flags = PackageManager.GET_SIGNATURES;
        PackageInfo candidate = pm.getPackageArchiveInfo(file.getAbsolutePath(), flags);
        PackageInfo current = pm.getPackageInfo(activity.getPackageName(), flags);
        if (candidate == null || !activity.getPackageName().equals(candidate.packageName))
            throw new SecurityException("APK ma błędny identyfikator aplikacji");
        if (candidate.versionCode <= BuildConfig.VERSION_CODE)
            throw new SecurityException("Odmowa instalacji starszej wersji");
        if (candidate.signatures == null || current.signatures == null
                || candidate.signatures.length != 1 || current.signatures.length != 1
                || !MessageDigest.isEqual(candidate.signatures[0].toByteArray(), current.signatures[0].toByteArray()))
            throw new SecurityException("Niezgodny podpis APK");
    }

    private void install(File apk) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            Uri uri;
            if (Build.VERSION.SDK_INT >= 24) {
                uri = Uri.parse("content://pl.edwin.trener2lite.updates/latest.apk");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                uri = Uri.fromFile(apk);
            }
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
        } catch (Exception ex) {
            show("Nie można otworzyć instalatora: " + ex.getMessage());
        }
    }

    private String hex(byte[] bytes) {
        StringBuilder out = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) out.append(String.format(Locale.US, "%02x", b & 0xff));
        return out.toString();
    }
    private void show(String text) {
        main.post(() -> {
            if (!activity.isFinishing())
                Toast.makeText(activity, text, Toast.LENGTH_LONG).show();
        });
    }
}
