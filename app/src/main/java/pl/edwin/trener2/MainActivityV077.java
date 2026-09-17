package pl.edwin.trener2;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

public class MainActivityV077 extends MainActivity {
    private WebView betaWebView;

    @Override
    public void setContentView(View view) {
        if (view instanceof WebView) {
            betaWebView = (WebView) view;
            betaWebView.addJavascriptInterface(new DietWidgetBridge(this), "TrenerWidget");
        }
        super.setContentView(view);
    }

    @Override
    protected void onResume() {
        super.onResume();
        openDietIfRequested();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openDietIfRequested();
    }

    private void openDietIfRequested() {
        Intent intent = getIntent();
        if (betaWebView == null || intent == null || !intent.getBooleanExtra("open_diet", false)) return;
        intent.removeExtra("open_diet");
        betaWebView.postDelayed(() -> betaWebView.evaluateJavascript(
                "(function(){if(typeof showTab==='function'){showTab('diet');}else{var b=document.querySelector('.tab[data-tab=\"diet\"]');if(b)b.click();}})();",
                null
        ), 350);
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
    }
}
