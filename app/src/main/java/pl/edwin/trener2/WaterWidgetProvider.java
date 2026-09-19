package pl.edwin.trener2;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class WaterWidgetProvider extends AppWidgetProvider {
    public static void updateAll(Context context){
        AppWidgetManager manager=AppWidgetManager.getInstance(context);
        int[] ids=manager.getAppWidgetIds(new ComponentName(context,WaterWidgetProvider.class));
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

    private static PendingIntent add(Context context,String action,int requestCode){
        Intent intent=new Intent(context,HydrationReceiver.class).setAction(action);
        return PendingIntent.getBroadcast(context,requestCode,intent,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }

    private static void update(Context context,AppWidgetManager manager,int[] ids){
        int water=HydrationStore.getTodayMl(context);
        int target=HydrationStore.getTargetMl(context);
        int progress=target<=0?0:Math.min(1000,Math.round(water*1000f/target));

        Intent open=new Intent(context,MainActivityV077.class);
        open.putExtra("open_diet",true);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|
            Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openDiet=PendingIntent.getActivity(context,881,open,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);

        PendingIntent add100=add(context,HydrationReceiver.ACTION_ADD_100,882);
        PendingIntent add250=add(context,HydrationReceiver.ACTION_ADD_250,883);
        PendingIntent add500=add(context,HydrationReceiver.ACTION_ADD_500,884);
        for(int id:ids){
            RemoteViews views=new RemoteViews(context.getPackageName(),R.layout.water_widget);
            views.setTextViewText(R.id.waterWidgetValue,water+" / "+target+" ml");
            views.setProgressBar(R.id.waterWidgetProgress,1000,progress,false);
            views.setOnClickPendingIntent(R.id.waterWidgetRoot,openDiet);
            views.setOnClickPendingIntent(R.id.waterWidget100,add100);
            views.setOnClickPendingIntent(R.id.waterWidget250,add250);
            views.setOnClickPendingIntent(R.id.waterWidget500,add500);
            manager.updateAppWidget(id,views);
        }
    }
}
