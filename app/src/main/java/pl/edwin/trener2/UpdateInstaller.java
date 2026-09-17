package pl.edwin.trener2;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

public final class UpdateInstaller {
    public interface Listener {
        void onStatus(String status, String detail);
    }

    private static final String BETA_RELEASES_URL =
            "https://api.github.com/repos/edwinkarolczyk/Trener-/releases?per_page=30";
    private static final int MAX_APK_BYTES = 100 * 1024 * 1024;
    private static final int MAX_JSON_BYTES = 1024 * 1024;

    private final Activity activity;
    private final Listener listener;
    private File pendingApk;

    public UpdateInstaller(Activity activity, Listener listener) {
        this.activity = activity;
        this.listener = listener;
    }

    public static String fetchLatestBetaUpdateJson() throws Exception {
        HttpURLConnection connection = null;
        try {
            connection = openJson(BETA_RELEASES_URL);
            int code = connection.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                throw new IllegalStateException("GitHub API: " + code);
            }

            String raw;
            try (InputStream in = connection.getInputStream()) {
                raw = readUtf8(in, MAX_JSON_BYTES);
            }

            JSONArray releases = new JSONArray(raw);
            for (int i = 0; i < releases.length(); i++) {
                JSONObject release = releases.optJSONObject(i);
                if (release == null || release.optBoolean("draft") || !release.optBoolean("prerelease")) continue;

                String tag = release.optString("tag_name", "").trim();
                String version = tag.startsWith("v") ? tag.substring(1) : tag;
                if (!version.toLowerCase(Locale.ROOT).contains("beta")) continue;

                JSONArray assets = release.optJSONArray("assets");
                if (assets == null) continue;
                JSONObject apkAsset = null;
                for (int a = 0; a < assets.length(); a++) {
                    JSONObject asset = assets.optJSONObject(a);
                    if (asset == null) continue;
                    String name = asset.optString("name", "").toLowerCase(Locale.ROOT);
                    if (name.endsWith(".apk")) {
                        apkAsset = asset;
                        break;
                    }
                }
                if (apkAsset == null) continue;

                String apkUrl = apkAsset.optString("browser_download_url", "");
                if (!isAllowedReleaseUrl(apkUrl)) continue;

                JSONObject out = new JSONObject();
                out.put("version", version);
                out.put("apkUrl", apkUrl);
                out.put("pageUrl", release.optString("html_url", ""));
                out.put("channel", "beta");

                String digest = apkAsset.optString("digest", "");
                if (digest.toLowerCase(Locale.ROOT).startsWith("sha256:")) {
                    out.put("sha256", digest.substring("sha256:".length()));
                }

                JSONArray notes = new JSONArray();
                String body = release.optString("body", "");
                for (String line : body.split("\\r?\\n")) {
                    String s = line.trim();
                    if (s.startsWith("- ")) s = s.substring(2).trim();
                    if (s.startsWith("* ")) s = s.substring(2).trim();
                    if (s.isEmpty() || s.startsWith("#")) continue;
                    notes.put(s);
                    if (notes.length() >= 6) break;
                }
                out.put("notes", notes);
                return out.toString();
            }
            throw new IllegalStateException("Brak opublikowanej wersji beta.");
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    public void downloadAndInstall(String rawUrl, String expectedSha256) {
        new Thread(() -> {
            try {
                String url = rawUrl == null ? "" : rawUrl.trim();
                if (!isAllowedReleaseUrl(url)) {
                    throw new IllegalArgumentException("Nieprawidłowy adres aktualizacji.");
                }
                notifyStatus("downloading", "Pobieram aktualizację…");

                File dir = new File(activity.getCacheDir(), "updates");
                if (!dir.exists() && !dir.mkdirs()) {
                    throw new IllegalStateException("Nie udało się przygotować katalogu aktualizacji.");
                }
                File target = new File(dir, "Trener2-update.apk");
                if (target.exists() && !target.delete()) {
                    throw new IllegalStateException("Nie udało się zastąpić starego pliku aktualizacji.");
                }

                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                HttpURLConnection connection = null;
                int total = 0;
                try {
                    connection = (HttpURLConnection) new URL(url).openConnection();
                    connection.setInstanceFollowRedirects(true);
                    connection.setConnectTimeout(10000);
                    connection.setReadTimeout(20000);
                    connection.setRequestProperty("Accept", "application/vnd.android.package-archive,application/octet-stream,*/*");
                    connection.setRequestProperty("User-Agent", "Trener2-Android-Updater");
                    int code = connection.getResponseCode();
                    if (code < 200 || code >= 300) {
                        throw new IllegalStateException("Pobieranie APK: błąd " + code + ".");
                    }
                    int declared = connection.getContentLength();
                    if (declared > MAX_APK_BYTES) throw new IllegalStateException("Plik aktualizacji jest zbyt duży.");

                    try (InputStream in = new BufferedInputStream(connection.getInputStream());
                         FileOutputStream out = new FileOutputStream(target)) {
                        byte[] buffer = new byte[32768];
                        int read;
                        while ((read = in.read(buffer)) != -1) {
                            total += read;
                            if (total > MAX_APK_BYTES) throw new IllegalStateException("Plik aktualizacji jest zbyt duży.");
                            digest.update(buffer, 0, read);
                            out.write(buffer, 0, read);
                        }
                        out.flush();
                    }
                } finally {
                    if (connection != null) connection.disconnect();
                }

                if (total < 1024) throw new IllegalStateException("Pobrany plik APK jest nieprawidłowy.");

                String actual = toHex(digest.digest());
                String expected = normalizeSha(expectedSha256);
                if (!expected.isEmpty() && !actual.equalsIgnoreCase(expected)) {
                    target.delete();
                    throw new SecurityException("Suma SHA-256 aktualizacji nie zgadza się.");
                }

                pendingApk = target;
                notifyStatus("ready", "Aktualizacja pobrana. Otwieram instalator Androida.");
                activity.runOnUiThread(this::launchPendingInstall);
            } catch (Exception e) {
                notifyStatus("error", e.getMessage() == null ? "Nie udało się pobrać aktualizacji." : e.getMessage());
            }
        }, "Trener2-AutoUpdate").start();
    }

    public void resumePendingInstall() {
        File file = pendingApk;
        if (file == null || !file.exists()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !activity.getPackageManager().canRequestPackageInstalls()) return;
        launchPendingInstall();
    }

    private void launchPendingInstall() {
        File file = pendingApk;
        if (file == null || !file.exists()) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && !activity.getPackageManager().canRequestPackageInstalls()) {
                notifyStatus("permission", "Zezwól Trenerowi 2 na instalowanie aktualizacji, a następnie wróć do aplikacji.");
                Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + activity.getPackageName()));
                activity.startActivity(settings);
                return;
            }

            Uri uri = FileProvider.getUriForFile(
                    activity,
                    activity.getPackageName() + ".updateprovider",
                    file
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
            notifyStatus("installer", "Potwierdź instalację aktualizacji w oknie Androida.");
        } catch (Exception e) {
            notifyStatus("error", "Nie udało się otworzyć instalatora aktualizacji.");
            Toast.makeText(activity, "Nie udało się otworzyć instalatora aktualizacji.", Toast.LENGTH_LONG).show();
        }
    }

    private void notifyStatus(String status, String detail) {
        if (listener != null) listener.onStatus(status, detail == null ? "" : detail);
    }

    private static HttpURLConnection openJson(String url) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(8000);
        connection.setRequestProperty("Accept", "application/vnd.github+json");
        connection.setRequestProperty("X-GitHub-Api-Version", "2022-11-28");
        connection.setRequestProperty("User-Agent", "Trener2-Android-Updater");
        connection.setRequestProperty("Cache-Control", "no-cache");
        return connection;
    }

    private static String readUtf8(InputStream in, int maxBytes) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int total = 0;
        int read;
        while ((read = in.read(buffer)) != -1) {
            total += read;
            if (total > maxBytes) throw new IllegalStateException("Odpowiedź serwera aktualizacji jest zbyt duża.");
            out.write(buffer, 0, read);
        }
        return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }

    private static boolean isAllowedReleaseUrl(String rawUrl) {
        try {
            Uri uri = Uri.parse(rawUrl == null ? "" : rawUrl.trim());
            String host = uri.getHost();
            String path = uri.getPath();
            return "https".equalsIgnoreCase(uri.getScheme())
                    && "github.com".equalsIgnoreCase(host)
                    && path != null
                    && path.startsWith("/edwinkarolczyk/Trener-/releases/download/");
        } catch (Exception e) {
            return false;
        }
    }

    private static String normalizeSha(String sha) {
        return String.valueOf(sha == null ? "" : sha)
                .replace("sha256:", "")
                .replace(":", "")
                .replace(" ", "")
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private static String toHex(byte[] bytes) {
        StringBuilder out = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) out.append(String.format(Locale.ROOT, "%02x", b));
        return out.toString();
    }
}
