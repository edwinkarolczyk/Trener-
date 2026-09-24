package pl.edwin.trener2;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/** Native Android print destination: a printer or the system "Save as PDF" option. */
final class RecipePrintManager {
    private static final int MAX_HTML_CHARS = 250_000;
    private final Activity activity;
    private WebView activeView;

    RecipePrintManager(Activity activity) {
        this.activity = activity;
    }

    void print(String html, String title) {
        if (html == null || html.isEmpty() || html.length() > MAX_HTML_CHARS) {
            Toast.makeText(activity, "Nieprawidłowa karta przepisu.", Toast.LENGTH_SHORT).show();
            return;
        }
        if (activeView != null) {
            Toast.makeText(activity, "Zakończ poprzednie drukowanie.", Toast.LENGTH_SHORT).show();
            return;
        }
        final String safeTitle = (title == null ? "Przepis" : title)
                .replaceAll("[\\r\\n\\t]", " ").trim();
        final String jobName = "Trener 2 - "
                + (safeTitle.isEmpty() ? "Przepis" : safeTitle.substring(0, Math.min(70, safeTitle.length())));
        final WebView view = new WebView(activity);
        activeView = view;
        view.getSettings().setJavaScriptEnabled(false);
        view.setWebViewClient(new WebViewClient() {
            private boolean started;

            @Override
            public void onPageFinished(WebView ignored, String url) {
                if (started) return;
                started = true;
                view.post(() -> {
                    if (activeView != view || activity.isFinishing() || activity.isDestroyed()) {
                        finish(view);
                        return;
                    }
                    PrintManager manager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                    if (manager == null) {
                        Toast.makeText(activity, "Drukowanie niedostępne.", Toast.LENGTH_SHORT).show();
                        finish(view);
                        return;
                    }
                    PrintDocumentAdapter delegate = view.createPrintDocumentAdapter(jobName);
                    PrintDocumentAdapter adapter = new PrintDocumentAdapter() {
                        @Override
                        public void onStart() {
                            delegate.onStart();
                        }

                        @Override
                        public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                                CancellationSignal cancellationSignal, LayoutResultCallback callback, Bundle extras) {
                            delegate.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras);
                        }

                        @Override
                        public void onWrite(PageRange[] pages, ParcelFileDescriptor destination,
                                CancellationSignal cancellationSignal, WriteResultCallback callback) {
                            delegate.onWrite(pages, destination, cancellationSignal, callback);
                        }

                        @Override
                        public void onFinish() {
                            try {
                                delegate.onFinish();
                            } finally {
                                finish(view);
                            }
                        }
                    };
                    try {
                        manager.print(jobName, adapter, new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                    } catch (RuntimeException error) {
                        finish(view);
                        Toast.makeText(activity, "Nie udało się otworzyć drukowania.", Toast.LENGTH_SHORT).show();
                    }
                });
            }
        });
        view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    void close() {
        if (activeView != null) finish(activeView);
    }

    private void finish(WebView view) {
        if (activeView != view) return;
        activeView = null;
        view.stopLoading();
        view.destroy();
    }
}
