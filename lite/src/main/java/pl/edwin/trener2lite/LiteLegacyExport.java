package pl.edwin.trener2lite;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

/** Odczyt starego Lite w trybie READONLY: żadnych migracji ani zapisów SQLite. */
final class LiteLegacyExport {
    static final String[] BASE={
        "profiles","exercises","plans","plan_exercises","sessions","workout_sets"
    };
    static final String[] EXTRA={
        "lite_catalog","lite_plan_targets","lite_set_quality","lite_rest",
        "lite_session_exercise","lite_session_names","lite_group_meta",
        "lite_group_members","lite_session_status","lite_presets_done"
    };
    private LiteLegacyExport(){}

    static JSONObject read(Context context) throws Exception {
        File file=context.getDatabasePath("trener_lite.db");
        if(!file.isFile())return new JSONObject();
        SQLiteDatabase db=SQLiteDatabase.openDatabase(file.getAbsolutePath(),null,SQLiteDatabase.OPEN_READONLY);
        try{
            JSONObject root=new JSONObject();
            root.put("app","Trener2Lite");
            root.put("schema",1);
            root.put("exportedAt",System.currentTimeMillis());
            Set<String> tables=new HashSet<>();
            try(Cursor c=db.rawQuery("SELECT name FROM sqlite_master WHERE type='table'",null)){
                while(c.moveToNext())tables.add(c.getString(0));
            }
            for(String name:BASE)root.put(name,rows(db,tables,name));
            JSONObject ext=new JSONObject();
            for(String name:EXTRA)ext.put(name,rows(db,tables,name));
            root.put("liteExtensions",ext);
            root.put("liteBackupSchema",3);
            return root;
        }finally{db.close();}
    }
    private static JSONArray rows(SQLiteDatabase db,Set<String> available,String table) throws Exception {
        JSONArray result=new JSONArray();
        if(!available.contains(table))return result;
        try(Cursor c=db.rawQuery("SELECT * FROM "+table,null)){
            while(c.moveToNext()){
                JSONObject row=new JSONObject();
                for(int i=0;i<c.getColumnCount();i++){
                    String name=c.getColumnName(i);
                    switch(c.getType(i)){
                        case Cursor.FIELD_TYPE_NULL:row.put(name,JSONObject.NULL);break;
                        case Cursor.FIELD_TYPE_INTEGER:row.put(name,c.getLong(i));break;
                        case Cursor.FIELD_TYPE_FLOAT:row.put(name,c.getDouble(i));break;
                        case Cursor.FIELD_TYPE_STRING:row.put(name,c.getString(i));break;
                        default:throw new IllegalStateException("Nieobsługiwane pole SQLite: "+name);
                    }
                }
                result.put(row);
            }
        }
        return result;
    }
}
