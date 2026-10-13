package pl.edwin.trener2lite;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import java.io.File;
import java.io.FileNotFoundException;

/** Wydaje wyłącznie pobrany instalator APK; nie udostępnia bazy profili ani historii. */
public final class LiteApkProvider extends ContentProvider {
    private static final String ALLOWED_URI = "content://pl.edwin.trener2lite.updates/latest.apk";

    @Override public boolean onCreate() { return true; }
    @Override public String getType(Uri uri) {
        return ALLOWED_URI.equals(uri.toString()) ? "application/vnd.android.package-archive" : null;
    }
    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (!ALLOWED_URI.equals(uri.toString()) || !"r".equals(mode))
            throw new FileNotFoundException("Niedozwolony plik aktualizacji");
        File f = new File(getContext().getCacheDir(), "updates/latest.apk");
        if (!f.isFile()) throw new FileNotFoundException("Instalator nie istnieje");
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
    }
    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] args, String sort) {
        if (!ALLOWED_URI.equals(uri.toString())) return null;
        String[] cols = projection == null ? new String[]{"_display_name", "_size"} : projection;
        android.database.MatrixCursor cursor = new android.database.MatrixCursor(cols);
        Object[] row = new Object[cols.length];
        File f = new File(getContext().getCacheDir(), "updates/latest.apk");
        for (int i=0; i<cols.length; i++) {
            if ("_display_name".equals(cols[i])) row[i] = "Trener2-Lite-aktualizacja.apk";
            else if ("_size".equals(cols[i])) row[i] = f.length();
            else row[i] = null;
        }
        cursor.addRow(row); return cursor;
    }
    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
    @Override public int delete(Uri uri, String selection, String[] args) { throw new UnsupportedOperationException(); }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] args) { throw new UnsupportedOperationException(); }
}
