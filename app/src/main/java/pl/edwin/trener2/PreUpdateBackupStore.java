package pl.edwin.trener2;

import android.content.Context;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Comparator;

final class PreUpdateBackupStore {
    private static final int MAX_BYTES = 32 * 1024 * 1024; // Photos may be stored as base64 in legacy trainer3.photos.
    private static final int MAX_FILES = 5;
    private static final String DIR_NAME = "pre-update-backups";

    private PreUpdateBackupStore() {}

    static boolean save(Context context, String json, String fromVersion, String targetVersion) {
        if (context == null || json == null || json.trim().isEmpty()) return false;
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_BYTES) return false;

        try {
            JSONObject root = new JSONObject(json);
            if (!"trener2-backup".equals(root.optString("format", ""))) return false;
            if (!(root.opt("storage") instanceof JSONObject)) return false;

            File dir = dir(context);
            if (!dir.exists() && !dir.mkdirs()) return false;

            String from = safeVersion(fromVersion);
            String to = safeVersion(targetVersion);
            long now = System.currentTimeMillis();
            File tmp = new File(dir, ".pending-" + now + ".json");
            File target = new File(
                    dir,
                    "Trener2-przed-aktualizacja-" + from + "-do-" + to + "-" + now + ".json"
            );

            try (FileOutputStream out = new FileOutputStream(tmp)) {
                out.write(bytes);
                out.flush();
                out.getFD().sync();
            }

            if (!tmp.renameTo(target)) {
                try (FileInputStream in = new FileInputStream(tmp);
                     FileOutputStream out = new FileOutputStream(target)) {
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
                    out.flush();
                    out.getFD().sync();
                }
                //noinspection ResultOfMethodCallIgnored
                tmp.delete();
            }

            prune(dir);
            return target.exists() && target.length() == bytes.length;
        } catch (Exception e) {
            return false;
        }
    }

    static boolean hasBackup(Context context) {
        return latest(context) != null;
    }

    static String latestJson(Context context) {
        File file = latest(context);
        if (file == null || file.length() <= 0 || file.length() > MAX_BYTES) return "";
        try (FileInputStream in = new FileInputStream(file)) {
            byte[] data = new byte[(int) file.length()];
            int offset = 0;
            while (offset < data.length) {
                int read = in.read(data, offset, data.length - offset);
                if (read < 0) break;
                offset += read;
            }
            if (offset != data.length) return "";
            return new String(data, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    static String latestExportName(Context context) {
        File file = latest(context);
        return file == null ? "Trener2-kopia-przed-aktualizacja.json" : file.getName();
    }

    private static File dir(Context context) {
        return new File(context.getFilesDir(), DIR_NAME);
    }

    private static File latest(Context context) {
        if (context == null) return null;
        File[] files = dir(context).listFiles((d, name) -> name.endsWith(".json") && !name.startsWith(".pending-"));
        if (files == null || files.length == 0) return null;
        Arrays.sort(files, Comparator.comparingLong(File::lastModified).reversed());
        return files[0];
    }

    private static void prune(File dir) {
        File[] files = dir.listFiles((d, name) -> name.endsWith(".json") && !name.startsWith(".pending-"));
        if (files == null || files.length <= MAX_FILES) return;
        Arrays.sort(files, Comparator.comparingLong(File::lastModified).reversed());
        for (int i = MAX_FILES; i < files.length; i++) {
            //noinspection ResultOfMethodCallIgnored
            files[i].delete();
        }
    }

    private static String safeVersion(String raw) {
        String value = raw == null ? "" : raw.trim().replaceAll("[^0-9A-Za-z._-]", "_");
        return value.isEmpty() ? "unknown" : value;
    }
}
