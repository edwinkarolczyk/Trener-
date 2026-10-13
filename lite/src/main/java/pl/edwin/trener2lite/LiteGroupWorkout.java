package pl.edwin.trener2lite;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import java.util.ArrayList;
import java.util.List;

/** Wspólny trening kilku profili na jednym tablecie – osobna historia każdej osoby. */
final class LiteGroupWorkout {
    static final class Member {
        final long profileId, sessionId; final int turn;
        final String name;
        Member(long profile,long session,int turn,String name){
            this.profileId=profile;this.sessionId=session;this.turn=turn;this.name=name;
        }
    }
    private final SQLiteDatabase sql;
    private final LiteDb db;
    private final LiteTrainingStore trainer;
    LiteGroupWorkout(LiteDb database,LiteTrainingStore store) {
        db=database;trainer=store;sql=db.getWritableDatabase();
        sql.execSQL("CREATE TABLE IF NOT EXISTS lite_group_meta(group_id TEXT PRIMARY KEY, plan_id INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1, last_turn INTEGER NOT NULL DEFAULT -1, started_at INTEGER NOT NULL)");
        sql.execSQL("CREATE TABLE IF NOT EXISTS lite_group_members(group_id TEXT NOT NULL, profile_id INTEGER NOT NULL, session_id INTEGER NOT NULL UNIQUE, turn INTEGER NOT NULL, PRIMARY KEY(group_id,profile_id))");
    }
    private static ContentValues values(Object...pairs){
        ContentValues c=new ContentValues();
        for(int i=0;i<pairs.length;i+=2){
            String k=(String)pairs[i];Object v=pairs[i+1];
            if(v instanceof Integer)c.put(k,(Integer)v);
            else if(v instanceof Long)c.put(k,(Long)v);
            else c.put(k,String.valueOf(v));
        }
        return c;
    }
    String create(long plan,List<Long> profiles) {
        if(profiles.size()<2||profiles.size()>8)throw new IllegalArgumentException("Wybierz od 2 do 8 osób");
        for(Long p:profiles) {
            if(db.openSession(p)!=-1)throw new IllegalStateException("Jedna z osób ma już niedokończony trening");
        }
        String id="fire:"+System.currentTimeMillis()+":"+java.util.UUID.randomUUID().toString();
        List<Member> added=new ArrayList<>();
        try {
            int turn=0;
            for(Long profile:profiles) {
                long session=db.startSession(profile,plan);
                trainer.snapshot(session,plan,db.name("plans",plan));
                added.add(new Member(profile,session,turn++,db.name("profiles",profile)));
            }
            sql.beginTransaction();
            try {
                sql.insertOrThrow("lite_group_meta",null,values("group_id",id,"plan_id",plan,"active",1,"last_turn",-1,"started_at",System.currentTimeMillis()));
                for(Member m:added)
                    sql.insertOrThrow("lite_group_members",null,values("group_id",id,"profile_id",m.profileId,
                        "session_id",m.sessionId,"turn",m.turn));
                sql.setTransactionSuccessful();
            } finally {sql.endTransaction();}
        } catch(Exception ex) {
            // Jeśli tworzenie się nie udało, wycofaj tylko nowo utworzone sesje.
            for(Member m:added)db.deleteSession(m.sessionId);
            throw ex;
        }
        return id;
    }
    String groupForSession(long session){
        try(Cursor c=sql.rawQuery("SELECT g.group_id FROM lite_group_meta g JOIN lite_group_members m ON m.group_id=g.group_id WHERE m.session_id=? AND g.active=1",
            new String[]{String.valueOf(session)})){
            return c.moveToFirst()?c.getString(0):null;
        }
    }
    ArrayList<Member> members(String group){
        ArrayList<Member> list=new ArrayList<>();
        try(Cursor c=sql.rawQuery("SELECT m.profile_id,m.session_id,m.turn,p.name FROM lite_group_members m JOIN profiles p ON p.id=m.profile_id WHERE m.group_id=? ORDER BY m.turn",
            new String[]{group})){
            while(c.moveToNext())list.add(new Member(c.getLong(0),c.getLong(1),c.getInt(2),c.getString(3)));
        }
        return list;
    }
    int lastTurn(String group){
        try(Cursor c=sql.rawQuery("SELECT last_turn FROM lite_group_meta WHERE group_id=?",new String[]{group})){
            return c.moveToFirst()?c.getInt(0):-1;
        }
    }
    void saveTurn(String group,int turn){
        sql.update("lite_group_meta",values("last_turn",turn),"group_id=?",new String[]{group});
    }
    Member nextPerson(String group,long exercise,int sets) {
        ArrayList<Member> all=members(group);
        if(all.isEmpty())return null;
        int last=lastTurn(group),size=all.size();
        Member candidate=null;long nearest=Long.MAX_VALUE,now=System.currentTimeMillis();
        for(int move=1;move<=size;move++){
            Member m=all.get((last+move+size)%size);
            if(trainer.done(m.sessionId,exercise)>=sets)continue;
            long wait=Math.max(0,trainer.rest(m.sessionId)-now);
            if(wait==0)return m;
            if(wait<nearest){nearest=wait;candidate=m;}
        }
        return candidate;
    }
    boolean finishedExercise(String group,long exercise,int sets) {
        for(Member m:members(group))
            if(trainer.done(m.sessionId,exercise)<sets)return false;
        return true;
    }
    void finish(String group) {
        ArrayList<Member> all=members(group);
        for(Member m:all)db.finish(m.sessionId);
        sql.update("lite_group_meta",values("active",0),"group_id=?",new String[]{group});
    }
    String historicalGroup(long session){
        try(Cursor c=sql.rawQuery("SELECT group_id FROM lite_group_members WHERE session_id=?",new String[]{String.valueOf(session)})){
            return c.moveToFirst()?c.getString(0):null;
        }
    }
}
