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
        sql.execSQL("CREATE TABLE IF NOT EXISTS lite_session_status(session_id INTEGER PRIMARY KEY, paused INTEGER NOT NULL DEFAULT 0, pause_start INTEGER NOT NULL DEFAULT 0, paused_total INTEGER NOT NULL DEFAULT 0, saved_rest INTEGER NOT NULL DEFAULT 0, interrupted INTEGER NOT NULL DEFAULT 0)");
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

    private static final String[] EXTRA_TABLES={
        "lite_catalog","lite_plan_targets","lite_set_quality","lite_rest","lite_session_exercise","lite_session_names","lite_group_meta","lite_group_members","lite_session_status"
    };
    /** Kopia jest kompletna: dane podstawowe i wszystkie rozszerzenia tej samej sesji. */
    static void addBackup(SQLiteDatabase database,JSONObject root) throws org.json.JSONException {
        JSONObject extensions=new JSONObject();
        for(String table:EXTRA_TABLES){
            JSONArray rows=new JSONArray();
            try(Cursor c=database.rawQuery("SELECT * FROM "+table,null)){
                while(c.moveToNext()){
                    JSONObject row=new JSONObject();
                    for(int i=0;i<c.getColumnCount();i++){
                        String key=c.getColumnName(i);
                        if(c.isNull(i))row.put(key,JSONObject.NULL);
                        else if(c.getType(i)==Cursor.FIELD_TYPE_INTEGER)row.put(key,c.getLong(i));
                        else if(c.getType(i)==Cursor.FIELD_TYPE_FLOAT)row.put(key,c.getDouble(i));
                        else row.put(key,c.getString(i));
                    }
                    rows.put(row);
                }
            }
            extensions.put(table,rows);
        }
        root.put("liteBackupSchema",2);
        root.put("liteExtensions",extensions);
    }
    /** Wykonuje się wewnątrz głównej transakcji importu; błąd cofa również serię i historię. */
    static void restoreBackup(SQLiteDatabase database,JSONObject root) throws org.json.JSONException{
        JSONObject extension=root.optJSONObject("liteExtensions");
        int schema=root.optInt("liteBackupSchema",1);
        if(schema>2)throw new org.json.JSONException("Kopia pochodzi z nowszego Trenera 2 Lite");
        if(extension!=null)for(String table:EXTRA_TABLES){
            JSONArray rows=extension.optJSONArray(table);
            if(rows==null&&schema<2)continue;
            if(rows==null||rows.length()>100000)throw new org.json.JSONException("Brak wymaganej tabeli: "+table);
            for(int i=0;i<rows.length();i++)if(!(rows.opt(i) instanceof JSONObject))
                throw new org.json.JSONException("Uszkodzony wiersz w "+table);
        }
        for(int t=EXTRA_TABLES.length-1;t>=0;t--)database.delete(EXTRA_TABLES[t],null,null);
        if(extension==null)return; // starsza kopia 0.1.1: katalog zostanie odtworzony
        for(String table:EXTRA_TABLES){
            JSONArray rows=extension.optJSONArray(table);
            if(rows==null)continue;
            for(int i=0;i<rows.length();i++){
                JSONObject item=rows.getJSONObject(i);
                ContentValues values=new ContentValues();
                java.util.Iterator<String> keys=item.keys();
                while(keys.hasNext()){
                    String key=keys.next();
                    if(!validField(table,key))throw new org.json.JSONException("Niedozwolone pole: "+key);
                    Object val=item.get(key);
                    if(val==JSONObject.NULL)values.putNull(key);
                    else if(val instanceof Integer)values.put(key,(Integer)val);
                    else if(val instanceof Long)values.put(key,(Long)val);
                    else if(val instanceof Double)values.put(key,(Double)val);
                    else if(val instanceof Number)values.put(key,((Number)val).doubleValue());
                    else values.put(key,String.valueOf(val));
                }
                database.insertOrThrow(table,null,values);
            }
        }
    }
    private static boolean validField(String table,String field){
        String allowed="";
        switch(table){
            case "lite_catalog":allowed="exercise_id original_id sets_target rep_min rep_max rest_sec timed tip";break;
            case "lite_plan_targets":allowed="plan_exercise_id sets_target rep_min rep_max rest_sec";break;
            case "lite_set_quality":allowed="set_id rir technique pain";break;
            case "lite_rest":allowed="session_id until_ms";break;
            case "lite_session_exercise":allowed="id session_id exercise_id ordinal name sets_target rep_min rep_max rest_sec timed tip";break;
            case "lite_session_names":allowed="session_id plan_name";break;
            case "lite_group_meta":allowed="group_id plan_id active last_turn started_at";break;
            case "lite_group_members":allowed="group_id profile_id session_id turn";break;
            case "lite_session_status":allowed="session_id paused pause_start paused_total saved_rest interrupted";break;
            default:return false;
        }
        return java.util.Arrays.asList(allowed.split(" ")).contains(field);
    }


    /** Bezpieczne kasowanie sesji i jej rozszerzeń, bez osieroconych RIR lub grup. */
    void deleteSessionSafely(long session) {
        String[] arg={String.valueOf(session)};
        try(Cursor c=sql.rawQuery("SELECT 1 FROM lite_group_members m JOIN lite_group_meta g ON g.group_id=m.group_id WHERE m.session_id=? AND g.active=1",arg)){
            if(c.moveToFirst())throw new IllegalStateException("Najpierw zakończ cały wspólny trening");
        }
        sql.beginTransaction();
        try {
            sql.delete("lite_set_quality","set_id IN (SELECT id FROM workout_sets WHERE session_id=?)",arg);
            sql.delete("lite_rest","session_id=?",arg);
            sql.delete("lite_session_exercise","session_id=?",arg);
            sql.delete("lite_session_names","session_id=?",arg);
            sql.delete("lite_session_status","session_id=?",arg);
            sql.delete("lite_group_members","session_id=?",arg);
            sql.delete("workout_sets","session_id=?",arg);
            sql.delete("sessions","id=?",arg);
            sql.setTransactionSuccessful();
        }finally {sql.endTransaction();}
    }


    boolean isPaused(long session){
        try(Cursor c=sql.rawQuery("SELECT paused FROM lite_session_status WHERE session_id=?",new String[]{String.valueOf(session)})){
            return c.moveToFirst()&&c.getInt(0)!=0;
        }
    }
    void pause(long session,boolean pause){
        String[] a={String.valueOf(session)};
        long now=System.currentTimeMillis();
        boolean was=isPaused(session);
        if(was==pause)return;
        long total=0,start=0,saved=0;
        int interrupted=0;
        try(Cursor c=sql.rawQuery("SELECT paused_total,pause_start,saved_rest,interrupted FROM lite_session_status WHERE session_id=?",a)){
            if(c.moveToFirst()){total=c.getLong(0);start=c.getLong(1);saved=c.getLong(2);interrupted=c.getInt(3);}
        }
        if(pause){
            saved=Math.max(0,rest(session)-now);
            setRest(session,0);
            start=now;
        } else{
            total+=Math.max(0,now-start);
            if(saved>0)setRest(session,now+saved);
            saved=0;start=0;
        }
        sql.insertWithOnConflict("lite_session_status",null,values(
            "session_id",session,"paused",pause?1:0,"pause_start",start,"paused_total",total,
            "saved_rest",saved,"interrupted",interrupted),SQLiteDatabase.CONFLICT_REPLACE);
    }
    void markInterrupted(long session) {
        String[] a={String.valueOf(session)};
        sql.execSQL("INSERT OR IGNORE INTO lite_session_status(session_id) VALUES(?)",new Object[]{session});
        sql.execSQL("UPDATE lite_session_status SET interrupted=1 WHERE session_id=?",new Object[]{session});
    }
    boolean interrupted(long session){
        try(Cursor c=sql.rawQuery("SELECT interrupted FROM lite_session_status WHERE session_id=?",new String[]{String.valueOf(session)})){
            return c.moveToFirst()&&c.getInt(0)!=0;
        }
    }
    long durationMillis(long session,long started,long finished){
        long total=0;
        try(Cursor c=sql.rawQuery("SELECT paused,paused_total,pause_start FROM lite_session_status WHERE session_id=?",new String[]{String.valueOf(session)})){
            if(c.moveToFirst()){
                total=c.getLong(1);
                if(c.getInt(0)!=0)total+=Math.max(0,(finished>0?finished:System.currentTimeMillis())-c.getLong(2));
            }
        }
        return Math.max(0,(finished>0?finished:System.currentTimeMillis())-started-total);
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

    Cursor sessionSummary(long session){
        return sql.rawQuery("SELECT COUNT(*),COALESCE(SUM(weight*reps),0),COALESCE(MAX(weight),0) FROM workout_sets WHERE session_id=?",
            new String[]{String.valueOf(session)});
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
