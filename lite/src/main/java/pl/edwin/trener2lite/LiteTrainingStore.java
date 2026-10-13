package pl.edwin.trener2lite;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Rozszerzenie istniejącej bazy Lite bez naruszania schematu i danych 0.1.1. */
final class LiteTrainingStore {
    private final SQLiteDatabase sql;
    private final Context context;
    LiteTrainingStore(Context ctx, LiteDb db) {
        this.context=ctx.getApplicationContext();
        sql=db.getWritableDatabase();
        sql.execSQL("CREATE TABLE IF NOT EXISTS lite_catalog(exercise_id INTEGER PRIMARY KEY, original_id TEXT, sets_target INTEGER NOT NULL DEFAULT 3, rep_min INTEGER NOT NULL DEFAULT 8, rep_max INTEGER NOT NULL DEFAULT 12, rest_sec INTEGER NOT NULL DEFAULT 90, timed INTEGER NOT NULL DEFAULT 0, tip TEXT NOT NULL DEFAULT '')");
        sql.execSQL("CREATE TABLE IF NOT EXISTS lite_plan_targets(plan_exercise_id INTEGER PRIMARY KEY, sets_target INTEGER, rep_min INTEGER, rep_max INTEGER, rest_sec INTEGER)");
        sql.execSQL("CREATE TABLE IF NOT EXISTS lite_set_quality(set_id INTEGER PRIMARY KEY, rir INTEGER NOT NULL DEFAULT 2, technique TEXT NOT NULL DEFAULT 'good', pain TEXT NOT NULL DEFAULT 'none')");
        sql.execSQL("CREATE TABLE IF NOT EXISTS lite_rest(session_id INTEGER PRIMARY KEY, until_ms INTEGER NOT NULL DEFAULT 0)");
        sql.execSQL("CREATE TABLE IF NOT EXISTS lite_session_exercise(id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL, exercise_id INTEGER NOT NULL, ordinal INTEGER NOT NULL, name TEXT NOT NULL, sets_target INTEGER NOT NULL, rep_min INTEGER NOT NULL, rep_max INTEGER NOT NULL, rest_sec INTEGER NOT NULL, timed INTEGER NOT NULL, tip TEXT NOT NULL)");
        sql.execSQL("CREATE TABLE IF NOT EXISTS lite_session_names(session_id INTEGER PRIMARY KEY, plan_name TEXT NOT NULL)");
        sql.execSQL("CREATE INDEX IF NOT EXISTS lite_sess_ex_order ON lite_session_exercise(session_id,ordinal)");
        seedCatalog();
    }
    private static ContentValues values(Object... args){
        ContentValues c=new ContentValues();
        for(int i=0;i<args.length;i+=2) {
            String key=(String)args[i];Object value=args[i+1];
            if(value==null)c.putNull(key);
            else if(value instanceof Integer)c.put(key,(Integer)value);
            else if(value instanceof Long)c.put(key,(Long)value);
            else if(value instanceof Double)c.put(key,(Double)value);
            else c.put(key,String.valueOf(value));
        }
        return c;
    }
    private void seedCatalog() {
        try(InputStream input=context.getAssets().open("exercises.json")){
            byte[] buffer=new byte[4096];int n,total=0;
            java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();
            while((n=input.read(buffer))!=-1) {
                total+=n;if(total>256000)throw new IllegalStateException("Za duża biblioteka");
                out.write(buffer,0,n);
            }
            JSONArray rows=new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8)).getJSONArray("exercises");
            String[] parts={"Klatka","Klatka","Triceps","Klatka","Plecy","Plecy","Biceps","Biceps","Biceps","Biceps","Biceps","Barki","Nogi","Nogi","Brzuch"};
            sql.beginTransaction();
            try {
                for(int i=0;i<rows.length();i++) {
                    JSONObject e=rows.getJSONObject(i);
                    String name=e.getString("n"), original=e.getString("id");
                    long id=-1;
                    try(Cursor c=sql.rawQuery("SELECT exercise_id FROM lite_catalog WHERE original_id=? LIMIT 1",new String[]{original})){
                        if(c.moveToFirst())id=c.getLong(0);
                    }
                    if(id<0) {
                        try(Cursor c=sql.rawQuery("SELECT id FROM exercises WHERE name=? LIMIT 1",new String[]{name})){
                            if(c.moveToFirst())id=c.getLong(0);
                        }
                    }
                    if(id<0)id=sql.insertOrThrow("exercises",null,values(
                        "name",name,"bodypart",e.optString("group",i<parts.length?parts[i]:"Inne")));
                    sql.insertWithOnConflict("lite_catalog",null,values(
                        "exercise_id",id,"original_id",original,"sets_target",e.optInt("sets",3),
                        "rep_min",e.optInt("min",8),"rep_max",e.optInt("max",12),"rest_sec",e.optInt("rest",90),
                        "timed",e.optBoolean("time",false)?1:0,"tip",e.optString("tip","")),SQLiteDatabase.CONFLICT_REPLACE);
                }
                sql.setTransactionSuccessful();
            } finally {sql.endTransaction();}
        }catch(Exception e){throw new IllegalStateException("Nie udało się odczytać biblioteki ćwiczeń Trenera 2",e);}
    }
    Cursor planExercises(long plan) {
        return sql.rawQuery("SELECT pe.id,e.id,e.name,e.bodypart,COALESCE(pt.sets_target,c.sets_target,3),COALESCE(pt.rep_min,c.rep_min,8),COALESCE(pt.rep_max,c.rep_max,12),COALESCE(pt.rest_sec,c.rest_sec,90),COALESCE(c.timed,0),COALESCE(c.tip,'') FROM plan_exercises pe JOIN exercises e ON pe.exercise_id=e.id LEFT JOIN lite_catalog c ON c.exercise_id=e.id LEFT JOIN lite_plan_targets pt ON pt.plan_exercise_id=pe.id WHERE pe.plan_id=? ORDER BY pe.position,pe.id",new String[]{String.valueOf(plan)});
    }
    void updateTargets(long planRow,int sets,int min,int max,int rest) {
        if(sets<1||sets>15||min<1||max<min||max>999||rest<0||rest>1200)
            throw new IllegalArgumentException("Podaj prawidłową liczbę serii, powtórzeń i długość przerwy");
        sql.insertWithOnConflict("lite_plan_targets",null,values("plan_exercise_id",planRow,
            "sets_target",sets,"rep_min",min,"rep_max",max,"rest_sec",rest),SQLiteDatabase.CONFLICT_REPLACE);
    }
    Cursor sessionExercises(long session,long plan){
        Cursor c=sql.rawQuery("SELECT s.id,s.exercise_id,s.name,COALESCE(e.bodypart,'Inne'),s.sets_target,s.rep_min,s.rep_max,s.rest_sec,s.timed,s.tip FROM lite_session_exercise s LEFT JOIN exercises e ON e.id=s.exercise_id WHERE s.session_id=? ORDER BY s.ordinal,s.id",new String[]{String.valueOf(session)});
        if(c.getCount()>0)return c;
        c.close();return planExercises(plan);
    }
    void snapshot(long session,long plan,String planName){
        try(Cursor c=sql.rawQuery("SELECT COUNT(*) FROM lite_session_exercise WHERE session_id=?",new String[]{String.valueOf(session)})){
            if(c.moveToFirst()&&c.getInt(0)>0)return;
        }
        sql.beginTransaction();
        try(Cursor c=planExercises(plan)) {
            int ord=0;
            while(c.moveToNext())sql.insertOrThrow("lite_session_exercise",null,values(
                "session_id",session,"exercise_id",c.getLong(1),"ordinal",++ord,"name",c.getString(2),
                "sets_target",c.getInt(4),"rep_min",c.getInt(5),"rep_max",c.getInt(6),
                "rest_sec",c.getInt(7),"timed",c.getInt(8),"tip",c.getString(9)));
            sql.insertWithOnConflict("lite_session_names",null,values("session_id",session,"plan_name",planName),
                SQLiteDatabase.CONFLICT_IGNORE);
            sql.setTransactionSuccessful();
        }finally{sql.endTransaction();}
    }
    void recordQuality(long session,long ex,int rir,String technique,String pain) {
        try(Cursor c=sql.rawQuery("SELECT id FROM workout_sets WHERE session_id=? AND exercise_id=? ORDER BY id DESC LIMIT 1",
            new String[]{String.valueOf(session),String.valueOf(ex)})){
            if(c.moveToFirst())sql.insertWithOnConflict("lite_set_quality",null,values(
                "set_id",c.getLong(0),"rir",rir,"technique",technique,"pain",pain),SQLiteDatabase.CONFLICT_REPLACE);
        }
    }
    Cursor sets(long session,long exercise) {
        return sql.rawQuery("SELECT ws.weight,ws.reps,ws.created_at,COALESCE(q.rir,2),COALESCE(q.technique,'good'),COALESCE(q.pain,'none') FROM workout_sets ws LEFT JOIN lite_set_quality q ON q.set_id=ws.id WHERE ws.session_id=? AND ws.exercise_id=? ORDER BY ws.id",new String[]{String.valueOf(session),String.valueOf(exercise)});
    }
    Cursor historyDetails(long session) {
        return sql.rawQuery("SELECT COALESCE(se.name,e.name,'Ćwiczenie'),ws.weight,ws.reps,COALESCE(q.rir,2),COALESCE(q.technique,'good'),COALESCE(q.pain,'none') FROM workout_sets ws LEFT JOIN lite_set_quality q ON q.set_id=ws.id LEFT JOIN lite_session_exercise se ON se.session_id=ws.session_id AND se.exercise_id=ws.exercise_id LEFT JOIN exercises e ON e.id=ws.exercise_id WHERE ws.session_id=? ORDER BY ws.id",new String[]{String.valueOf(session)});
    }
    List<LiteCoach.SetResult> previous(long profile,long ex) {
        List<LiteCoach.SetResult> out=new ArrayList<>();
        long last=-1;
        try(Cursor c=sql.rawQuery("SELECT MAX(s.id) FROM sessions s JOIN workout_sets ws ON ws.session_id=s.id WHERE s.profile_id=? AND ws.exercise_id=? AND s.finished_at IS NOT NULL",new String[]{String.valueOf(profile),String.valueOf(ex)})){
            if(c.moveToFirst()&&!c.isNull(0))last=c.getLong(0);
        }
        if(last<0)return out;
        try(Cursor c=sql.rawQuery("SELECT ws.weight,ws.reps,COALESCE(q.rir,2),COALESCE(q.technique,'good'),COALESCE(q.pain,'none') FROM workout_sets ws LEFT JOIN lite_set_quality q ON q.set_id=ws.id WHERE ws.session_id=? AND ws.exercise_id=? ORDER BY ws.id",
            new String[]{String.valueOf(last),String.valueOf(ex)})){
            while(c.moveToNext())out.add(new LiteCoach.SetResult(c.getDouble(0),c.getInt(1),c.getInt(2),c.getString(3),c.getString(4)));
        }
        return out;
    }
    int done(long session,long ex) {
        try(Cursor c=sql.rawQuery("SELECT COUNT(*) FROM workout_sets WHERE session_id=? AND exercise_id=?",
            new String[]{String.valueOf(session),String.valueOf(ex)})){return c.moveToFirst()?c.getInt(0):0;}
    }
    long rest(long session) {
        try(Cursor c=sql.rawQuery("SELECT until_ms FROM lite_rest WHERE session_id=?",new String[]{String.valueOf(session)})){
            return c.moveToFirst()?c.getLong(0):0;
        }
    }
    void setRest(long session,long until) {
        sql.insertWithOnConflict("lite_rest",null,values("session_id",session,"until_ms",until),SQLiteDatabase.CONFLICT_REPLACE);
    }
    Cursor stats(long profile) {
        return sql.rawQuery("SELECT COUNT(DISTINCT s.id),COUNT(ws.id),COALESCE(SUM(ws.weight*ws.reps),0) FROM sessions s LEFT JOIN workout_sets ws ON ws.session_id=s.id WHERE s.profile_id=?",new String[]{String.valueOf(profile)});
    }
    Cursor records(long profile) {
        return sql.rawQuery("SELECT e.name,MAX(ws.weight) FROM workout_sets ws JOIN sessions s ON s.id=ws.session_id JOIN exercises e ON e.id=ws.exercise_id WHERE s.profile_id=? GROUP BY ws.exercise_id ORDER BY MAX(ws.weight) DESC",new String[]{String.valueOf(profile)});
    }
    String historyName(long session,String fallback) {
        try(Cursor c=sql.rawQuery("SELECT plan_name FROM lite_session_names WHERE session_id=?",new String[]{String.valueOf(session)})){
            return c.moveToFirst()?c.getString(0):fallback;
        }
    }
}
