package pl.edwin.trener2;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class MealEntryWidgetProvider extends AppWidgetProvider {
    private static PendingIntent action(Context context,String action,int code){
        Intent intent=new Intent(context,MainActivityV077.class);
        intent.setAction("pl.edwin.trener2.MEAL_WIDGET_"+action);
        intent.putExtra("open_diet",true);
        intent.putExtra("open_food_action",action);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context,code,intent,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    @Override
    public void onUpdate(Context context,AppWidgetManager manager,int[] ids){
        for(int id:ids){
            RemoteViews view=new RemoteViews(context.getPackageName(),R.layout.meal_entry_widget);
            view.setOnClickPendingIntent(R.id.mealWidgetRoot,action(context,"WRITE",920));
            view.setOnClickPendingIntent(R.id.mealWidgetScan,action(context,"SCAN",921));
            view.setOnClickPendingIntent(R.id.mealWidgetWrite,action(context,"WRITE",922));
            view.setOnClickPendingIntent(R.id.mealWidgetSet,action(context,"SET",923));
            manager.updateAppWidget(id,view);
        }
    }
}
