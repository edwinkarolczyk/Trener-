package pl.edwin.trener2lite;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Vibrator;
import android.content.Context;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.util.Log;
import android.widget.Toast;
import android.view.WindowManager;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Trener 2 Lite 0.3: oryginalne HTML/CSS/JS z Trenera 2,
 * nie druga ręcznie napisana logika treningowa.
 * Stara wersja natywna (LiteActivity) nadal zachowuje swoją bazę SQLite.
 */
public final class LiteFullActivity extends Activity {
    private static final int EXPORT_BACKUP=210;
    private static final int IMPORT_BACKUP=211;
    private static final int CHOOSE_FILE=212;
    private static final int MAX_JSON_BYTES=12*1024*1024;
    private WebView browser;
    private LiteUpdater updater;
    private String exportJson;
    private ValueCallback<Uri[]> pendingFiles;
    private boolean tabletTrainingActive=false;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().setStatusBarColor(Color.rgb(9,9,9));
        getWindow().setNavigationBarColor(Color.rgb(9,9,9));
        browser=new WebView(this);
        browser.setBackgroundColor(Color.rgb(9,9,9));
        WebSettings cfg=browser.getSettings();
        cfg.setJavaScriptEnabled(true);
        cfg.setDomStorageEnabled(true);
        cfg.setAllowFileAccess(true);
        cfg.setAllowContentAccess(true);
        cfg.setDefaultTextEncodingName("UTF-8");
        cfg.setBuiltInZoomControls(false);
        cfg.setDisplayZoomControls(false);
        browser.addJavascriptInterface(new Bridge(),"Android");
        browser.addJavascriptInterface(new Bridge(),"LiteBridge");
        browser.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view,String url) {
                if(url!=null&&url.startsWith("file:///android_asset/"))return false;
                if(url!=null&&url.startsWith("about:blank"))return false;
                return true; // Nigdy nie otwieraj zewnętrznej strony z mostkiem Androida.
            }
            @Override public void onPageFinished(WebView view,String url) {
                super.onPageFinished(view,url);
                if(!"file:///android_asset/index.html".equals(url))return;
                view.evaluateJavascript(
                    "(function(){['progression-addon.js','backup-addon.js'].forEach(function(name){" +
                    "if(document.querySelector('script[data-lite-addon=\\\"'+name+'\\\"]'))return;" +
                    "var script=document.createElement('script');" +
                    "script.src=name;script.async=false;script.setAttribute('data-lite-addon',name);" +
                    "document.body.appendChild(script);});})()",null);
            }
        });
        browser.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                if(message!=null&&message.messageLevel()==ConsoleMessage.MessageLevel.ERROR)
                    Log.e("TrenerLite-JS",message.sourceId()+":"+message.lineNumber()+" "+message.message());
                return true;
            }
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,
                                                        FileChooserParams params) {
                if(pendingFiles!=null)pendingFiles.onReceiveValue(null);
                pendingFiles=callback;
                try {
                    Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    String mime="*/*";
                    if(params!=null&&params.getAcceptTypes()!=null&&params.getAcceptTypes().length>0){
                        String first=params.getAcceptTypes()[0];
                        if(first!=null&&first.startsWith("image/"))mime="image/*";
                        else if(first!=null&&first.contains("json"))mime="application/json";
                    }
                    intent.setType(mime);
                    startActivityForResult(intent,CHOOSE_FILE);
                    return true;
                }catch(Exception ex){
                    pendingFiles.onReceiveValue(null);pendingFiles=null;return false;
                }
            }
        });
        updater=new LiteUpdater(this);
        setContentView(browser);
        browser.loadUrl("file:///android_asset/index.html");
        updater.check(false);
    }

    private final class Bridge {
        @JavascriptInterface public String getAppVersion() { return BuildConfig.TRAINER_CORE_VERSION; }
        @JavascriptInterface public String getLiteVersion() { return BuildConfig.VERSION_NAME; }
        @JavascriptInterface public void setTabletTrainingActive(boolean active) {
            runOnUiThread(()->{
                tabletTrainingActive=active;
                if(active)getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }
        @JavascriptInterface public int getAppVersionCode() { return BuildConfig.VERSION_CODE; }
        @JavascriptInterface public void vibrate(int millis) {
            if(millis<1||millis>5000)return;
            Vibrator vib=(Vibrator)getSystemService(Context.VIBRATOR_SERVICE);
            if(vib!=null)vib.vibrate(millis);
        }
        @JavascriptInterface public String exportPreviousLite() {
            try { return LiteLegacyExport.read(LiteFullActivity.this).toString(); }
            catch(Exception e){
                Log.e("TrenerLite","Odczyt starej SQLite nieudany — plik pozostaje bez zmian",e);
                return "";
            }
        }
        @JavascriptInterface public void openPreviousLite(){
            runOnUiThread(()->startActivity(new Intent(LiteFullActivity.this,LiteActivity.class)));
        }
        @JavascriptInterface public void checkUpdates(){
            runOnUiThread(()->updater.check(true));
        }
        @JavascriptInterface public void exportBackup(String json,String name){
            if(json==null||json.length()>MAX_JSON_BYTES){
                runOnUiThread(()->Toast.makeText(LiteFullActivity.this,
                    "Kopia przekracza limit 12 MB",Toast.LENGTH_LONG).show());return;
            }
            runOnUiThread(()->{
                exportJson=json;
                try{
                    Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("application/json");
                    i.putExtra(Intent.EXTRA_TITLE,"Trener2Lite-pelna-kopia.json");
                    startActivityForResult(i,EXPORT_BACKUP);
                }catch(Exception ex){showError("Eksport: "+ex.getMessage());}
            });
        }
        @JavascriptInterface public void importBackup() {
            runOnUiThread(()->new AlertDialog.Builder(LiteFullActivity.this)
                .setTitle("Bezpieczny import Trenera 2 / Lite")
                .setMessage("Najpierw pokażemy podgląd. Dopiero po Twoim potwierdzeniu aplikacja doda brakujące sesje. Istniejące dane nie będą nadpisane. Zalecane: wykonaj wcześniej eksport kompletnej kopii.")
                .setNegativeButton("Anuluj",null)
                .setPositiveButton("WYBIERZ PLIK",(d,w)->{
                    try{
                        Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                        i.addCategory(Intent.CATEGORY_OPENABLE);
                        i.setType("*/*");
                        startActivityForResult(i,IMPORT_BACKUP);
                    }catch(Exception ex){showError("Import: "+ex.getMessage());}
                }).show());
        }
    }

    private void showError(String error) {
        Toast.makeText(this,error,Toast.LENGTH_LONG).show();
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==CHOOSE_FILE){
            if(pendingFiles!=null){
                pendingFiles.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null
                    ?new Uri[]{data.getData()}:null);
                pendingFiles=null;
            }
            return;
        }
        if(result!=RESULT_OK||data==null||data.getData()==null)return;
        if(request==EXPORT_BACKUP){
            try(OutputStream out=getContentResolver().openOutputStream(data.getData())){
                if(out==null||exportJson==null)throw new IllegalStateException("Nie można otworzyć pliku");
                JSONObject complete=new JSONObject(exportJson);
                if(!"trener2-backup".equals(complete.optString("format")))
                    throw new IllegalArgumentException("Nieprawidłowy format eksportu");
                JSONObject old=LiteLegacyExport.read(this);
                if("Trener2Lite".equals(old.optString("app")))complete.put("legacyLite",old);
                byte[] bytes=complete.toString(2).getBytes(StandardCharsets.UTF_8);
                if(bytes.length>MAX_JSON_BYTES)
                    throw new IllegalStateException("Kopia przekracza 12 MB. Nie zapisano niepełnego eksportu.");
                out.write(bytes);out.flush();
                showError("Kompletna kopia JSON zapisana (także stara baza Lite, jeśli istnieje)");
            }catch(Exception e){showError("Błąd eksportu: "+e.getMessage());}
            finally{exportJson=null;}
        }else if(request==IMPORT_BACKUP){
            try(InputStream in=getContentResolver().openInputStream(data.getData())){
                if(in==null)throw new IllegalStateException("Nie można otworzyć kopii");
                ByteArrayOutputStream out=new ByteArrayOutputStream();
                byte[] buf=new byte[16384];int n;
                while((n=in.read(buf))!=-1){
                    if(out.size()+n>MAX_JSON_BYTES)throw new IllegalStateException("Kopia za duża (max 12 MB)");
                    out.write(buf,0,n);
                }
                JSONObject root=new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8));
                if(!"trener2-backup".equals(root.optString("format")) &&
                    !"Trener2Lite".equals(root.optString("app")))
                    throw new IllegalArgumentException("Nieobsługiwana kopia Trenera 2 / Lite");
                if("trener2-backup".equals(root.optString("format")))
                    root.put("nativeHydration",JSONObject.NULL);
                JSONObject storage=root.optJSONObject("storage");
                if(storage!=null) {
                    java.util.ArrayList<String> excluded=new java.util.ArrayList<>();
                    java.util.Iterator<String> it=storage.keys();
                    while(it.hasNext()){
                        String key=it.next().toLowerCase(java.util.Locale.ROOT);
                        if(key.contains("diet")||key.contains("hydrat")||key.contains("water")||
                           key.contains("food")||key.contains("recipe")||key.contains("meal"))
                            excluded.add(key);
                    }
                    for(String key:excluded) storage.remove(key);
                }
                String js="(function(){"+
                    "if(!window.TrenerLiteData||!window.TrenerLiteData.previewImport)return false;"+
                    "window.TrenerLiteData.previewImport("+JSONObject.quote(root.toString())+");return true;})()";
                browser.evaluateJavascript(js,reply->{
                    if(!"true".equals(reply))
                        showError("Nie można wyświetlić bezpiecznego importu. Nie zmieniono danych.");
                });
            }catch(Exception e){showError("Błąd importu: "+e.getMessage());}
        }
    }
    @Override public void onBackPressed() {
        if(browser==null){super.onBackPressed();return;}
        browser.evaluateJavascript(
          "(function(){var x=document.querySelector('.tab[data-tab=\\\"start\\\"]');" +
          "if(x&&!x.classList.contains('active'))x.click();})()",null);
    }
    @Override protected void onPause(){
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.onPause();
    }
    @Override protected void onResume(){
        super.onResume();
        if(tabletTrainingActive)getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
    @Override protected void onDestroy(){
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if(browser!=null){browser.destroy();browser=null;}
        super.onDestroy();
    }
}
