package pl.edwin.trener2lite;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class LiteDb extends SQLiteOpenHelper {
    private static final String[] TABLES = {"profiles", "exercises", "plans", "plan_exercises", "sessions", "workout_sets"};

    LiteDb(Context context) { super(context, "trener_lite.db", null, 1); }

    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE profiles (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");
        db.execSQL("CREATE TABLE exercises (id INTEGER PRIMARY KEY, name TEXT NOT NULL, bodypart TEXT NOT NULL)");
        db.execSQL("CREATE TABLE plans (id INTEGER PRIMARY KEY, profile_id INTEGER NOT NULL, name TEXT NOT NULL)");
        db.execSQL("CREATE TABLE plan_exercises (id INTEGER PRIMARY KEY, plan_id INTEGER NOT NULL, exercise_id INTEGER NOT NULL, position INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE sessions (id INTEGER PRIMARY KEY, profile_id INTEGER NOT NULL, plan_id INTEGER NOT NULL, started_at INTEGER NOT NULL, finished_at INTEGER)");
        db.execSQL("CREATE TABLE workout_sets (id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL, exercise_id INTEGER NOT NULL, weight REAL NOT NULL, reps INTEGER NOT NULL, created_at INTEGER NOT NULL)");
        db.execSQL("CREATE INDEX sets_session ON workout_sets(session_id)");
        db.execSQL("CREATE INDEX sets_exercise ON workout_sets(exercise_id)");
        db.execSQL("CREATE INDEX sessions_profile ON sessions(profile_id)");
        ContentValues person = values("name", "Osoba 1");
        long profile = db.insertOrThrow("profiles", null, person);
        String[][] starter = {
            {"Wyciskanie hantli", "Klatka"}, {"Rozpiętki hantlami", "Klatka"},
            {"Wiosłowanie hantlą", "Plecy"}, {"Uginanie ramion", "Biceps"},
            {"Wyciskanie nad głowę", "Barki"}, {"Przysiady", "Nogi"},
            {"Martwy ciąg", "Nogi"}, {"Plank", "Brzuch"},
            {"Pompki", "Klatka"}, {"Wspięcia na palce", "Łydki"}
        };
        for (String[] item : starter) db.insertOrThrow("exercises", null, values("name", item[0], "bodypart", item[1]));
        ContentValues plan = values("profile_id", profile, "name", "Trening ogólny");
        long planId = db.insertOrThrow("plans", null, plan);
        for (int i = 1; i <= 4; i++) {
            db.insertOrThrow("plan_exercises", null,
                values("plan_id", planId, "exercise_id", i, "position", i));
        }
    }

    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // Nie usuwaj zapisanych treningów przy aktualizacji.
    }

    private static ContentValues values(Object... pairs) {
        ContentValues cv = new ContentValues();
        for (int i = 0; i < pairs.length; i += 2) {
            String key = (String) pairs[i]; Object value = pairs[i + 1];
            if (value == null) cv.putNull(key);
            else if (value instanceof Integer) cv.put(key, (Integer) value);
            else if (value instanceof Long) cv.put(key, (Long) value);
            else if (value instanceof Double) cv.put(key, (Double) value);
            else cv.put(key, String.valueOf(value));
        }
        return cv;
    }

    Cursor profiles() { return getReadableDatabase().rawQuery("SELECT id,name FROM profiles ORDER BY id", null); }
    Cursor plans(long profile) {
        return getReadableDatabase().rawQuery("SELECT id,name FROM plans WHERE profile_id=? ORDER BY id DESC", args(profile));
    }
    Cursor exercises() { return getReadableDatabase().rawQuery("SELECT id,name,bodypart FROM exercises ORDER BY bodypart,name", null); }
    Cursor planExercises(long plan) {
        return getReadableDatabase().rawQuery("SELECT pe.id, e.id, e.name, e.bodypart FROM plan_exercises pe JOIN exercises e ON e.id=pe.exercise_id WHERE pe.plan_id=? ORDER BY pe.position, pe.id", args(plan));
    }
    Cursor sessions(long profile) {
        return getReadableDatabase().rawQuery("SELECT s.id,p.name,s.started_at,s.finished_at FROM sessions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.profile_id=? ORDER BY s.started_at DESC,s.id DESC LIMIT 100", args(profile));
    }
    Cursor sets(long session, long exercise) {
        return getReadableDatabase().rawQuery("SELECT weight,reps,created_at FROM workout_sets WHERE session_id=? AND exercise_id=? ORDER BY id", new String[]{String.valueOf(session),String.valueOf(exercise)});
    }
    Cursor allSets(long session) {
        return getReadableDatabase().rawQuery("SELECT e.name,ws.weight,ws.reps FROM workout_sets ws LEFT JOIN exercises e ON e.id=ws.exercise_id WHERE ws.session_id=? ORDER BY ws.id", args(session));
    }
    Cursor lastSet(long profile, long exercise) {
        return getReadableDatabase().rawQuery(
            "SELECT ws.weight,ws.reps FROM workout_sets ws JOIN sessions s ON s.id=ws.session_id WHERE s.profile_id=? AND ws.exercise_id=? ORDER BY ws.id DESC LIMIT 1",
            new String[]{String.valueOf(profile),String.valueOf(exercise)});
    }
    private static String[] args(long value) { return new String[]{String.valueOf(value)}; }

    long firstProfile() {
        try (Cursor c = profiles()) { return c.moveToFirst() ? c.getLong(0) : -1; }
    }
    String name(String table, long id) {
        if (!("profiles".equals(table) || "plans".equals(table) || "exercises".equals(table))) return "";
        try (Cursor c = getReadableDatabase().rawQuery("SELECT name FROM "+table+" WHERE id=?", args(id))) {
            return c.moveToFirst() ? c.getString(0) : "(usunięty)";
        }
    }
    long addProfile(String name) { return getWritableDatabase().insertOrThrow("profiles", null, values("name", name)); }
    long addPlan(long profile, String name) {
        return getWritableDatabase().insertOrThrow("plans", null, values("profile_id", profile, "name", name));
    }
    void renamePlan(long plan, String name) {
        getWritableDatabase().update("plans", values("name",name), "id=?", args(plan));
    }
    long addExercise(String name, String part) {
        return getWritableDatabase().insertOrThrow("exercises", null, values("name",name,"bodypart",part));
    }
    void addToPlan(long plan, long exercise) {
        SQLiteDatabase db = getWritableDatabase();
        try (Cursor check = db.rawQuery("SELECT 1 FROM plan_exercises WHERE plan_id=? AND exercise_id=?",
                new String[]{String.valueOf(plan),String.valueOf(exercise)})) {
            if (check.moveToFirst()) return;
        }
        long next = 1;
        try (Cursor c = db.rawQuery("SELECT COALESCE(MAX(position),0)+1 FROM plan_exercises WHERE plan_id=?", args(plan))) {
            if (c.moveToFirst()) next = c.getLong(0);
        }
        db.insertOrThrow("plan_exercises", null, values("plan_id",plan,"exercise_id",exercise,"position",next));
    }
    void removeFromPlan(long rowId) { getWritableDatabase().delete("plan_exercises", "id=?", args(rowId)); }
    void removePlan(long plan) {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            db.delete("plan_exercises", "plan_id=?", args(plan));
            db.delete("plans", "id=?", args(plan));
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
    }
    long openSession(long profile) {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT id FROM sessions WHERE profile_id=? AND finished_at IS NULL ORDER BY id DESC LIMIT 1", args(profile))) {
            return c.moveToFirst() ? c.getLong(0) : -1;
        }
    }
    long sessionPlan(long session) {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT plan_id FROM sessions WHERE id=?", args(session))) {
            return c.moveToFirst() ? c.getLong(0) : -1;
        }
    }
    long startSession(long profile, long plan) {
        long unfinished = openSession(profile);
        if (unfinished != -1) return unfinished;
        return getWritableDatabase().insertOrThrow("sessions", null,
            values("profile_id",profile,"plan_id",plan,"started_at",System.currentTimeMillis()));
    }
    void saveSet(long session, long exercise, double weight, int reps) {
        if (weight < 0 || weight > 2000 || Double.isNaN(weight) || Double.isInfinite(weight) || reps < 1 || reps > 1000)
            throw new IllegalArgumentException("Nieprawidłowy ciężar lub liczba powtórzeń");
        getWritableDatabase().insertOrThrow("workout_sets", null,
            values("session_id",session,"exercise_id",exercise,"weight",weight,"reps",reps,"created_at",System.currentTimeMillis()));
    }
    void finish(long session) {
        getWritableDatabase().update("sessions", values("finished_at",System.currentTimeMillis()), "id=? AND finished_at IS NULL", args(session));
    }
    void deleteSession(long session) {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            db.delete("workout_sets", "session_id=?", args(session));
            db.delete("sessions", "id=?", args(session));
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
    }
    boolean exerciseUsed(long exerciseId) {
        for (String sql : new String[]{
                "SELECT 1 FROM plan_exercises WHERE exercise_id=? LIMIT 1",
                "SELECT 1 FROM workout_sets WHERE exercise_id=? LIMIT 1"}) {
            try (Cursor c = getReadableDatabase().rawQuery(sql,args(exerciseId))) {
                if (c.moveToFirst()) return true;
            }
        }
        return false;
    }
    void removeExercise(long id) {
        if (exerciseUsed(id)) throw new IllegalStateException("Ćwiczenie jest używane w planie lub historii");
        getWritableDatabase().delete("exercises","id=?",args(id));
    }

    JSONObject exportJson() throws JSONException {
        JSONObject root = new JSONObject();
        root.put("app","Trener2Lite");root.put("schema",1);
        root.put("exportedAt",System.currentTimeMillis());
        SQLiteDatabase db = getReadableDatabase();
        for (String table : TABLES) {
            JSONArray rows = new JSONArray();
            try (Cursor c = db.rawQuery("SELECT * FROM "+table+" ORDER BY id",null)) {
                while(c.moveToNext()) {
                    JSONObject row = new JSONObject();
                    for(int col=0; col<c.getColumnCount(); col++) {
                        String key=c.getColumnName(col);
                        if(c.isNull(col)) row.put(key,JSONObject.NULL);
                        else if(c.getType(col)==Cursor.FIELD_TYPE_INTEGER) row.put(key,c.getLong(col));
                        else if(c.getType(col)==Cursor.FIELD_TYPE_FLOAT) row.put(key,c.getDouble(col));
                        else row.put(key,c.getString(col));
                    }
                    rows.put(row);
                }
            }
            root.put(table,rows);
        }
        return root;
    }
    void importJson(JSONObject root) throws JSONException {
        if(!"Trener2Lite".equals(root.optString("app")) || root.optInt("schema",-1)!=1)
            throw new JSONException("To nie jest kopia Trener 2 Lite w wersji 1");
        // Zweryfikuj kompletny zestaw przed otwarciem transakcji.
        for(String table:TABLES) {
            JSONArray arr = root.optJSONArray(table);
            if(arr == null || arr.length() > 100000) throw new JSONException("Niepełne lub zbyt duże dane: "+table);
            for(int i=0; i<arr.length();i++) if(!(arr.opt(i) instanceof JSONObject))
                throw new JSONException("Nieprawidłowy rekord: "+table);
        }
        SQLiteDatabase db=getWritableDatabase();
        db.beginTransaction();
        try {
            for(int i=TABLES.length-1;i>=0;i--) db.delete(TABLES[i],null,null);
            for(String table:TABLES) {
                JSONArray rows = root.getJSONArray(table);
                for(int i=0;i<rows.length();i++) {
                    JSONObject entry = rows.getJSONObject(i);
                    ContentValues cv = new ContentValues();
                    java.util.Iterator<String> keys = entry.keys();
                    while(keys.hasNext()) {
                        String key=keys.next(); Object val=entry.get(key);
                        if(val==JSONObject.NULL) cv.putNull(key);
                        else if(val instanceof Integer) cv.put(key,(Integer)val);
                        else if(val instanceof Long) cv.put(key,(Long)val);
                        else if(val instanceof Double) cv.put(key,(Double)val);
                        else if(val instanceof Number) cv.put(key,((Number)val).doubleValue());
                        else cv.put(key,String.valueOf(val));
                    }
                    if(db.insertOrThrow(table,null,cv)<0) throw new JSONException("Nie udało się wgrać danych: "+table);
                }
            }
            // Co najmniej jeden profil wymagany do poprawnego startu.
            try(Cursor c=db.rawQuery("SELECT 1 FROM profiles LIMIT 1",null)) {
                if(!c.moveToFirst()) throw new JSONException("Kopia nie zawiera profilu");
            }
            db.setTransactionSuccessful();
        } finally {db.endTransaction();}
    }
}
