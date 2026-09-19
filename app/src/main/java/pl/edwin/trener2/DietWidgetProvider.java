package pl.edwin.trener2;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class DietWidgetProvider extends AppWidgetProvider {
    private static final String PREFS="trener2_diet_widget_v077";
    private static final Locale PL=Locale.forLanguageTag("pl-PL");

    public static void sync(Context context,String json){
        if(context==null)return;
        try{
            JSONObject data=new JSONObject(json==null?"{}":json);
            SharedPreferences.Editor e=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit();
            String day=data.optString("day","");
            if(!day.matches("\\d{4}-\\d{2}-\\d{2}"))return;
            e.putString("day",day);
            e.putString("mode",data.optString("mode","maintain"));
            e.putInt("kcal",Math.max(0,data.optInt("kcal",0)));
            e.putInt("targetKcal",Math.max(0,data.optInt("targetKcal",0)));
            for(String key:new String[]{"protein","carbs","fat","targetProtein","targetCarbs","targetFat"}){
                e.putFloat(key,(float)Math.max(0,data.optDouble(key,0)));
            }
            e.putLong("updatedAt",data.optLong("updatedAt",System.currentTimeMillis()));
            // Commit first so the widget refresh cannot read partly old values.
            e.commit();
        }catch(Exception ignored){return;}
        updateAll(context);
    }

    public static void updateAll(Context context){
        AppWidgetManager manager=AppWidgetManager.getInstance(context);
        int[] ids=manager.getAppWidgetIds(new ComponentName(context,DietWidgetProvider.class));
        if(ids!=null&&ids.length>0)update(context,manager,ids);
    }

    @Override
    public void onUpdate(Context context,AppWidgetManager manager,int[] ids){
        update(context,manager,ids);
    }

    @Override
    public void onReceive(Context context,Intent intent){
        super.onReceive(context,intent);
        if(intent!=null&&Intent.ACTION_DATE_CHANGED.equals(intent.getAction()))updateAll(context);
    }

    private static String format(float n){
        if(Math.abs(n-Math.round(n))<0.05f)return String.valueOf(Math.round(n));
        return String.format(PL,"%.1f",n);
    }

    private static String detail(float taken,float target,String unit){
        if(target<=0)return "Cel nieustawiony";
        float difference=target-taken;
        return "Cel "+format(target)+" "+unit+" • "+
            (difference>=0?"Zostało ":"Przekroczono o ")+format(Math.abs(difference))+" "+unit;
    }
    private static int progress(float taken,float target){
        if(target<=0)return 0;
        return Math.min(1000,Math.max(0,Math.round(taken*1000f/target)));
    }

    private static void fill(RemoteViews views,int valueId,int detailId,int progressId,
                              String unit,float taken,float target){
        views.setTextViewText(valueId,format(taken)+" "+unit);
        views.setTextViewText(detailId,detail(taken,target,unit));
        views.setProgressBar(progressId,1000,progress(taken,target),false);
    }

    private static void update(Context context,AppWidgetManager manager,int[] ids){
        SharedPreferences p=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
        String today=LocalDate.now().toString();
        boolean current=today.equals(p.getString("day",""));
        float kcal=current?p.getInt("kcal",0):0;
        float protein=current?p.getFloat("protein",0):0;
        float carbs=current?p.getFloat("carbs",0):0;
        float fat=current?p.getFloat("fat",0):0;
        float targetKcal=p.getInt("targetKcal",0);
        float targetProtein=p.getFloat("targetProtein",0);
        float targetCarbs=p.getFloat("targetCarbs",0);
        float targetFat=p.getFloat("targetFat",0);
        String mode=p.getString("mode","maintain");
        String label="reduce".equals(mode)?"Redukcja":"gain".equals(mode)?"Masa":"Utrzymanie";
        String dayLabel="Dzisiaj • "+LocalDate.now().format(
            DateTimeFormatter.ofPattern("dd.MM.yyyy",PL));

        Intent open=new Intent(context,MainActivityV077.class);
        open.putExtra("open_diet",true);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|
            Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent action=PendingIntent.getActivity(context,880,
            open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);

        for(int widgetId:ids){
            RemoteViews v=new RemoteViews(context.getPackageName(),R.layout.diet_widget);
            v.setTextViewText(R.id.widgetDay,dayLabel);
            v.setTextViewText(R.id.widgetMode,label);
            fill(v,R.id.widgetKcal,R.id.widgetKcalDetail,R.id.widgetKcalProgress,
                "kcal",kcal,targetKcal);
            fill(v,R.id.widgetProtein,R.id.widgetProteinDetail,R.id.widgetProteinProgress,
                "g",protein,targetProtein);
            fill(v,R.id.widgetCarbs,R.id.widgetCarbsDetail,R.id.widgetCarbsProgress,
                "g",carbs,targetCarbs);
            fill(v,R.id.widgetFat,R.id.widgetFatDetail,R.id.widgetFatProgress,
                "g",fat,targetFat);
            v.setOnClickPendingIntent(R.id.widgetRoot,action);
            manager.updateAppWidget(widgetId,v);
        }
    }
}
