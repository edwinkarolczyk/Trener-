package pl.edwin.trener2lite;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.Spinner;
import android.widget.ArrayAdapter;
import android.os.Handler;
import android.os.Looper;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;

public final class LiteActivity extends Activity {
    private static final int EXPORT_JSON = 50;
    private static final int IMPORT_JSON = 51;
    private static final int BACKGROUND = 0xff101927;
    private static final int PANEL = 0xff223248;
    private static final int BLUE = 0xff266ee8;
    private static final int GREEN = 0xff16835a;
    private static final int RED = 0xffac3344;
    private static final int WHITE = 0xffffffff;
    private static final int MUTED = 0xffcbd5e1;
    private LiteDb db;
    private LiteTrainingStore trainer;
    private LiteGroupWorkout group;
    private String activeGroupId=null;
    private int activeGroupTurn=-1;
    private final Handler workoutUiHandler=new Handler(Looper.getMainLooper());
    private int workoutUiToken=0;
    private static final double DEFAULT_STEP=2.5;
    private LiteUpdater updater;
    private LinearLayout surface;
    private long profileId;
    private long selectedPlan = -1, sessionId = -1, exerciseId = -1;
    private String page = "home";

    private int dp(float n) { return (int)(getResources().getDisplayMetrics().density * n + .5f); }
    private LinearLayout.LayoutParams lp(int w, int h) { return new LinearLayout.LayoutParams(w < 0 ? w : dp(w), h < 0 ? h : dp(h)); }
    private LinearLayout vertical() { LinearLayout l = new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);return l; }
    private LinearLayout horizontal() { LinearLayout l = new LinearLayout(this);l.setOrientation(LinearLayout.HORIZONTAL);l.setGravity(Gravity.CENTER_VERTICAL);return l; }
    private GradientDrawable bg(int color, int radius) {
        GradientDrawable d = new GradientDrawable(); d.setColor(color);d.setCornerRadius(dp(radius));return d;
    }
    private TextView text(String value, int size, boolean bold) {
        TextView t=new TextView(this); t.setText(value);t.setTextColor(WHITE);t.setTextSize(size);
        if(bold)t.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        t.setPadding(dp(3),dp(6),dp(3),dp(6));return t;
    }
    private Button button(String name, int color, Runnable callback) {
        Button b=new Button(this);b.setText(name);b.setTextSize(19);b.setTextColor(WHITE);b.setAllCaps(false);
        b.setPadding(dp(8),dp(6),dp(8),dp(6));b.setMinHeight(dp(62));
        b.setBackground(bg(color,13));b.setOnClickListener(v->callback.run());return b;
    }
    private void addButton(LinearLayout to, String name, int color, Runnable task) {
        Button b=button(name,color,task);
        LinearLayout.LayoutParams p=lp(-1,-2);p.setMargins(0,dp(5),0,dp(5));to.addView(b,p);
    }
    private LinearLayout card(LinearLayout to) {
        LinearLayout l=vertical();l.setBackground(bg(PANEL,14));l.setPadding(dp(14),dp(12),dp(14),dp(12));
        LinearLayout.LayoutParams p=lp(-1,-2);p.setMargins(0,dp(7),0,dp(7));to.addView(l,p);return l;
    }
    private void divider(LinearLayout layout) {
        View v=new View(this);v.setBackgroundColor(0xff496075);
        LinearLayout.LayoutParams p=lp(-1,1);p.setMargins(0,dp(7),0,dp(7));layout.addView(v,p);
    }
    private void hint(LinearLayout to,String s) {
        TextView t=text(s,16,false);t.setTextColor(MUTED);to.addView(t);
    }
    private void title(LinearLayout to,String s) {to.addView(text(s,25,true));}
    private void twoButtons(LinearLayout to,String first,int color1,Runnable a,String second,int color2,Runnable b) {
        LinearLayout row=horizontal();to.addView(row,lp(-1,-2));
        Button l=button(first,color1,a),r=button(second,color2,b);
        LinearLayout.LayoutParams left = new LinearLayout.LayoutParams(0,dp(64),1);
        left.setMargins(0,dp(5),dp(5),dp(5));row.addView(l,left);
        LinearLayout.LayoutParams right = new LinearLayout.LayoutParams(0,dp(64),1);
        right.setMargins(dp(5),dp(5),0,dp(5));row.addView(r,right);
    }
    private String number(double n) {return n==Math.rint(n) ? String.format(Locale.US,"%.0f",n):String.format(Locale.US,"%.1f",n).replace('.',',');}
    private String date(long ms) {return new SimpleDateFormat("dd.MM.yyyy  HH:mm",new Locale("pl","PL")).format(new Date(ms));}
    private void msg(String s) {Toast.makeText(this,s,Toast.LENGTH_LONG).show();}

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        getWindow().setStatusBarColor(0xff0b1320);
        getWindow().setNavigationBarColor(0xff0b1320);
        db=new LiteDb(this);
        trainer=new LiteTrainingStore(this,db);
        group=new LiteGroupWorkout(db,trainer);
        updater=new LiteUpdater(this);
        profileId=getPreferences(0).getLong("profile",-1);
        boolean exists=false;
        try(Cursor c=db.profiles()) {while(c.moveToNext())if(c.getLong(0)==profileId)exists=true;}
        if(!exists)profileId=db.firstProfile();
        showHome();
        updater.check(false);
    }

    private void render(String pageTitle) {
        LinearLayout base=vertical();base.setBackgroundColor(BACKGROUND);
        setContentView(base);
        LinearLayout header=vertical();header.setPadding(dp(15),dp(7),dp(15),dp(8));base.addView(header,lp(-1,-2));
        LinearLayout row=horizontal();header.addView(row);
        TextView heading=text("TRENER 2 LITE",27,true);
        row.addView(heading,new LinearLayout.LayoutParams(0,-2,1));
        if(!page.equals("home")) {
            Button back=button("⌂",PANEL,()->showHome());back.setTextSize(26);row.addView(back,lp(72,58));
        }
        TextView sub=text(pageTitle,16,false);sub.setTextColor(MUTED);header.addView(sub);
        HorizontalScrollView scroller=new HorizontalScrollView(this);scroller.setHorizontalScrollBarEnabled(false);
        header.addView(scroller,lp(-1,61));
        LinearLayout profiles=horizontal();scroller.addView(profiles);
        try(Cursor c=db.profiles()) {
            while(c.moveToNext()){
                long id=c.getLong(0);String name=c.getString(1);
                Button b=button(name,id==profileId?BLUE:PANEL,()->{
                    profileId=id;getPreferences(0).edit().putLong("profile",id).apply();showHome();
                });
                b.setTextSize(16);b.setMinHeight(dp(52));
                LinearLayout.LayoutParams p=lp(-2,52);p.setMargins(0,0,dp(7),0);profiles.addView(b,p);
            }
        }
        Button add=button("+ Osoba",GREEN,()->prompt("Dodaj osobę","Nazwa profilu","",name->{
            db.addProfile(name);showHome();
        }));
        add.setTextSize(16);profiles.addView(add,lp(-2,52));

        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);base.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        surface=vertical();surface.setPadding(dp(15),dp(6),dp(15),dp(20));scroll.addView(surface);
    }

    private interface StringAction {void accept(String text);}
    private void prompt(String title,String label,String current,StringAction action){
        EditText input = new EditText(this);
        input.setSingleLine(true);input.setTextSize(23);input.setText(current);
        input.setSelectAllOnFocus(true);input.setHint(label);
        LinearLayout wrap=vertical();wrap.setPadding(dp(22),0,dp(22),0);
        wrap.addView(input,lp(-1,64));
        AlertDialog dlg=new AlertDialog.Builder(this).setTitle(title).setView(wrap)
            .setNegativeButton("Anuluj",null)
            .setPositiveButton("Zapisz",null).create();
        dlg.setOnShowListener(v->dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(w->{
            String value=input.getText().toString().trim();
            if(value.length()<2||value.length()>80){input.setError("Wpisz od 2 do 80 znaków");return;}
            try{action.accept(value);dlg.dismiss();}catch(Exception e){msg("Nie udało się zapisać: "+e.getMessage());}
        }));
        dlg.show();
    }
    private void confirm(String title,String desc,Runnable task) {
        new AlertDialog.Builder(this).setTitle(title).setMessage(desc)
            .setNegativeButton("Anuluj",null)
            .setPositiveButton("Potwierdź",(d,w)->task.run()).show();
    }
    private void safe(Runnable task) {
        try{task.run();}catch(Exception e){msg("Błąd: "+e.getMessage());}
    }

    private void showHome() {
        page="home";render("Wybierz profil i rozpocznij trening");
        long open=db.openSession(profileId);
        if(open!=-1) {
            LinearLayout live=card(surface);title(live,"Trening w toku");
            hint(live,"Zapisane serie pozostają w pamięci tabletu.");
            addButton(live,"▶ WZNÓW TRENING",GREEN,()->resume(open));
        }
        LinearLayout grid=vertical();surface.addView(grid,lp(-1,-2));
        twoButtons(grid,"▶ TRENING",GREEN,()->showPlans(true),"▤ PLANY",BLUE,()->showPlans(false));
        twoButtons(grid,"◷ HISTORIA",BLUE,()->showHistory(),"✚ ĆWICZENIA",BLUE,()->showExercises());
        addButton(grid,"▥ POSTĘPY I REKORDY",BLUE,()->showProgress());
        LinearLayout menu=card(surface);title(menu,"Dane treningowe");
        hint(menu,"Wszystkie serie zapisywane są lokalnie i osobno dla każdej osoby.");
        twoButtons(menu,"Eksport JSON",PANEL,()->exportBackup(),"Import JSON",PANEL,()->importBackup());
        hint(menu,"Kopia zawiera wszystkie profile, plany i historię. Import zastępuje bieżące dane.");
        LinearLayout updates=card(surface);
        title(updates,"Aktualizacje");
        hint(updates,"Trener 2 Lite "+BuildConfig.VERSION_NAME+" · Sprawdza nowe wersje przy uruchomieniu, jeśli jest internet.");
        addButton(updates,"↻ SPRAWDŹ AKTUALIZACJE",BLUE,()->updater.check(true));
        hint(updates,"Pobranie nastąpi po Twojej zgodzie. Instalację potwierdzasz w systemie. Dane zostaną zachowane.");
    }
    private void showPlans(boolean startMode) {
        page="plans";render(startMode?"Wybierz plan do treningu":"Moje plany treningowe");
        addButton(surface,"+ NOWY PLAN",GREEN,()->prompt("Nowy plan","Nazwa planu","",name->{
            long id=db.addPlan(profileId,name);showPlanEditor(id);
        }));
        try(Cursor c=db.plans(profileId)) {
            if(c.getCount()==0)hint(surface,"Nie ma planów. Utwórz pierwszy.");
            while(c.moveToNext()){
                long id=c.getLong(0);String name=c.getString(1);
                LinearLayout section=card(surface);title(section,name);
                twoButtons(section,"▶ Start",GREEN,()->start(id),"✎ Edytuj",BLUE,()->showPlanEditor(id));
                addButton(section,"▶ WSPÓLNY TRENING NA TABLECIE",PANEL,()->chooseGroupMembers(id));
            }
        }
    }
    private void showPlanEditor(long plan) {
        page="plan-edit";selectedPlan=plan;render("Edycja planu: "+db.name("plans",plan));
        addButton(surface,"✎ ZMIEŃ NAZWĘ",BLUE,()->prompt("Zmień nazwę planu","Nazwa",db.name("plans",plan),name->{
            db.renamePlan(plan,name);showPlanEditor(plan);
        }));
        addButton(surface,"+ DODAJ ĆWICZENIE DO PLANU",GREEN,()->chooseExercise(plan));
        title(surface,"Ćwiczenia w planie");
        try(Cursor c=trainer.planExercises(plan)) {
            if(c.getCount()==0)hint(surface,"Plan jest pusty. Dodaj przynajmniej jedno ćwiczenie.");
            while(c.moveToNext()){
                long rowId=c.getLong(0);String name=c.getString(2),part=c.getString(3);
                LinearLayout section=card(surface);title(section,name);
                hint(section,part+" • "+c.getInt(4)+" serii × "+c.getInt(5)+"–"+c.getInt(6)+
                    (c.getInt(8)!=0?" sekund":" powt.")+" • odpoczynek "+c.getInt(7)+" s");
                int sets=c.getInt(4), min=c.getInt(5), max=c.getInt(6), rest=c.getInt(7);
                addButton(section,"⚙ CELE / SERIE / PRZERWY",BLUE,()->editTargets(plan,rowId,sets,min,max,rest));
                addButton(section,"Usuń z planu",RED,()->{
                    db.removeFromPlan(rowId);showPlanEditor(plan);
                });
            }
        }
        addButton(surface,"▶ ROZPOCZNIJ TEN TRENING",GREEN,()->start(plan));
        addButton(surface,"USUŃ PLAN",RED,()->confirm("Usuń plan?",
            "Historia ukończonych treningów i zapisane ciężary zostaną zachowane.",()->{
                db.removePlan(plan);showPlans(false);
            }));
    }
    private void chooseExercise(long plan) {
        ArrayList<Long> ids=new ArrayList<>();ArrayList<String> names=new ArrayList<>();
        try(Cursor c=db.exercises()){
            while(c.moveToNext()){ids.add(c.getLong(0));names.add(c.getString(1)+" · "+c.getString(2));}
        }
        new AlertDialog.Builder(this).setTitle("Wybierz ćwiczenie")
            .setItems(names.toArray(new String[0]),(d,i)->{
                db.addToPlan(plan,ids.get(i));showPlanEditor(plan);
            }).setPositiveButton("+ NOWE", (d,w)->newExercise(id->{ db.addToPlan(plan,id); showPlanEditor(plan); }))
            .setNegativeButton("Anuluj",null).show();
    }
    private interface NewExerciseAction { void accept(long id); }
    private void newExercise(NewExerciseAction after) {
        prompt("Nowe ćwiczenie","Nazwa ćwiczenia","",name->{
            String[] parts={"Klatka","Plecy","Barki","Biceps","Triceps","Nogi","Brzuch","Całe ciało","Inne"};
            new AlertDialog.Builder(this).setTitle("Wybierz partię")
                .setItems(parts,(d,i)->safe(()->{long id=db.addExercise(name,parts[i]);after.accept(id);}))
                .setNegativeButton("Anuluj",null).show();
        });
    }
    private void showExercises() {
        page="exercises";render("Biblioteka ćwiczeń");
        addButton(surface,"+ DODAJ WŁASNE ĆWICZENIE",GREEN,()->newExercise(id->showExercises()));
        try(Cursor c=db.exercises()){
            while(c.moveToNext()){
                long id=c.getLong(0);String name=c.getString(1);
                LinearLayout sec=card(surface);title(sec,name);hint(sec,c.getString(2));
                if(!db.exerciseUsed(id))
                    addButton(sec,"Usuń ćwiczenie",RED,()->confirm("Usunąć ćwiczenie?",name,()->{
                        safe(()->{db.removeExercise(id);showExercises();});
                    }));
            }
        }
    }
    private void chooseGroupMembers(long plan) {
        ArrayList<Long> ids=new ArrayList<>();
        ArrayList<String> labels=new ArrayList<>();
        try(Cursor c=db.profiles()){
            while(c.moveToNext()){ids.add(c.getLong(0));labels.add(c.getString(1));}
        }
        if(ids.size()<2){msg("Dodaj co najmniej 2 profile osób.");return;}
        boolean[] selected=new boolean[ids.size()];
        java.util.Arrays.fill(selected,true);
        new AlertDialog.Builder(this)
            .setTitle("Wspólny trening: wybierz 2–8 osób")
            .setMultiChoiceItems(labels.toArray(new String[0]),selected,(d,i,checked)->selected[i]=checked)
            .setNegativeButton("Anuluj",null)
            .setPositiveButton("ROZPOCZNIJ",(d,w)->{
                ArrayList<Long> chosen=new ArrayList<>();
                for(int i=0;i<ids.size();i++)if(selected[i])chosen.add(ids.get(i));
                if(chosen.size()<2||chosen.size()>8){msg("Wybierz od 2 do 8 osób.");return;}
                try{
                    String id=group.create(plan,chosen);
                    LiteGroupWorkout.Member member=group.members(id).get(0);
                    resume(member.sessionId);
                }catch(Exception e){msg("Nie udało się rozpocząć: "+e.getMessage());}
            }).show();
    }

    private void start(long plan) {
        try(Cursor c=trainer.planExercises(plan)) {
            if(!c.moveToFirst()){msg("Dodaj najpierw ćwiczenie do planu");showPlanEditor(plan);return;}
        }
        long other=db.openSession(profileId);
        if(other!=-1){
            confirm("Trening jest już rozpoczęty",
                "Możesz wznowić obecny trening. Aby zacząć inny, najpierw zakończ obecny.",
                ()->resume(other));
            return;
        }
        activeGroupId=null;
        long started=db.startSession(profileId,plan);
        trainer.snapshot(started,plan,db.name("plans",plan));
        resume(started);
    }
    private void resume(long session) {
        sessionId=session;selectedPlan=db.sessionPlan(session);exerciseId=-1;
        activeGroupId=group.groupForSession(session);
        trainer.snapshot(session,selectedPlan,db.name("plans",selectedPlan));
        showWorkout();
    }

    private void editTargets(long plan,long rowId,int currentSets,int currentMin,int currentMax,int currentRest) {
        LinearLayout fields=vertical();fields.setPadding(dp(18),dp(10),dp(18),0);
        final String[] labels={"Serie","Minimum powtórzeń / sekund","Maksimum powtórzeń / sekund","Przerwa (sek.)"};
        final int[] values={currentSets,currentMin,currentMax,currentRest};
        EditText[] inputs=new EditText[4];
        for(int i=0;i<inputs.length;i++){
            fields.addView(text(labels[i],18,false));
            inputs[i]=inputNumber(String.valueOf(values[i]),false);
            fields.addView(inputs[i],lp(-1,61));
        }
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Parametry jak w Trenerze 2")
            .setView(fields).setNegativeButton("Anuluj",null).setPositiveButton("ZAPISZ",null).create();
        dialog.setOnShowListener(v->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(w->{
            try{
                int[] params=new int[4];
                for(int i=0;i<4;i++)params[i]=Integer.parseInt(inputs[i].getText().toString().trim());
                trainer.updateTargets(rowId,params[0],params[1],params[2],params[3]);
                dialog.dismiss();showPlanEditor(plan);
            }catch(Exception ex){msg("Nieprawidłowe dane: "+ex.getMessage());}
        }));
        dialog.show();
    }

    private static final class ExerciseSpec {
        long exerciseId;
        String name,tip;int sets,min,max,rest;boolean timed;
    }
    private ArrayList<ExerciseSpec> specs() {
        ArrayList<ExerciseSpec> list=new ArrayList<>();
        try(Cursor c=trainer.sessionExercises(sessionId,selectedPlan)){
            while(c.moveToNext()){
                ExerciseSpec ex=new ExerciseSpec();
                ex.exerciseId=c.getLong(1);ex.name=c.getString(2);ex.tip=c.getString(9);
                ex.sets=c.getInt(4);ex.min=c.getInt(5);ex.max=c.getInt(6);
                ex.rest=c.getInt(7);ex.timed=c.getInt(8)!=0;
                list.add(ex);
            }
        }
        return list;
    }
    private Spinner spinner(LinearLayout to,String header,String[] options,int selected) {
        title(to,header);
        Spinner spinner=new Spinner(this);
        ArrayAdapter<String> adapter=new ArrayAdapter<>(this,android.R.layout.simple_spinner_item,options);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);spinner.setSelection(selected);
        spinner.setBackground(bg(0xfff1f5f9,12));
        spinner.setMinimumHeight(dp(57));
        to.addView(spinner,lp(-1,61));
        return spinner;
    }

    private void showWorkout() {
        workoutUiToken++;
        final int screenToken=workoutUiToken;
        page="workout";
        ArrayList<ExerciseSpec> list=specs();
        if(list.isEmpty()) {
            hint(surface,"Brak ćwiczeń w tym treningu.");
            addButton(surface,"Zakończ",RED,()->finishWorkout());return;
        }
        int total=0,completed=0;
        ExerciseSpec firstPending=null;
        ArrayList<LiteGroupWorkout.Member> people=activeGroupId==null?null:group.members(activeGroupId);
        for(ExerciseSpec ex:list){
            if(people!=null){
                total+=ex.sets*people.size();
                int performed=0;
                for(LiteGroupWorkout.Member member:people)
                    performed+=Math.min(ex.sets,trainer.done(member.sessionId,ex.exerciseId));
                completed+=performed;
                if(firstPending==null&&performed<ex.sets*people.size())firstPending=ex;
            }else{
                total+=ex.sets;
                int count=trainer.done(sessionId,ex.exerciseId);
                completed+=Math.min(ex.sets,count);
                if(firstPending==null&&count<ex.sets)firstPending=ex;
            }
        }
        if(firstPending==null){
            if(activeGroupId!=null){group.finish(activeGroupId);activeGroupId=null;}
            else db.finish(sessionId);
            trainer.setRest(sessionId,0);sessionId=-1;showHistory();return;
        }
        if(people!=null){
            exerciseId=firstPending.exerciseId;
            LiteGroupWorkout.Member next=group.nextPerson(activeGroupId,exerciseId,firstPending.sets);
            if(next==null){msg("Nie znaleziono kolejnej osoby");showHome();return;}
            activeGroupTurn=next.turn;
            profileId=next.profileId;
            sessionId=next.sessionId;
        }else if(exerciseId<0||!containsExercise(list,exerciseId)||
            trainer.done(sessionId,exerciseId)>=specFor(list,exerciseId).sets)
            exerciseId=firstPending.exerciseId;
        render("Trening · "+trainer.historyName(sessionId,db.name("plans",selectedPlan)));

        LinearLayout progress=card(surface);
        title(progress,"Postęp: "+completed+"/"+total+" serii");
        hint(progress,(people==null?"Profil: ":"Teraz ćwiczy: ")+db.name("profiles",profileId)+" • zapis po każdej serii");
        if(people!=null){
            hint(progress,"Wspólny trening • "+people.size()+" osób na jednym tablecie");
            for(LiteGroupWorkout.Member member:people){
                int finished=0;
                for(ExerciseSpec ex:list)finished+=Math.min(ex.sets,trainer.done(member.sessionId,ex.exerciseId));
                hint(progress,member.name+": "+finished+" serii");
            }
        }
        addButton(progress,trainer.isPaused(sessionId)?"▶ WZNÓW TRENING":"Ⅱ PAUZA TRENINGU",BLUE,()->{
            boolean pause=!trainer.isPaused(sessionId);
            if(activeGroupId!=null)
                for(LiteGroupWorkout.Member member:group.members(activeGroupId))trainer.pause(member.sessionId,pause);
            else trainer.pause(sessionId,pause);
            showWorkout();
        });
        title(surface,people==null?"Ćwiczenia i kolejność":"Wspólna kolejność ćwiczeń");
        HorizontalScrollView sc=new HorizontalScrollView(this);sc.setHorizontalScrollBarEnabled(false);
        surface.addView(sc,lp(-1,70));LinearLayout row=horizontal();sc.addView(row);
        for(ExerciseSpec item:list){
            int done=trainer.done(sessionId,item.exerciseId);
            Button choice=button(item.name+"  "+done+"/"+item.sets,
                exerciseId==item.exerciseId?GREEN:done>=item.sets?PANEL:BLUE,
                ()->{if(activeGroupId==null){exerciseId=item.exerciseId;showWorkout();}});
            choice.setTextSize(17);
            LinearLayout.LayoutParams params=lp(-2,64);params.setMargins(0,0,dp(9),0);row.addView(choice,params);
        }
        ExerciseSpec ex=specFor(list,exerciseId);
        int already=trainer.done(sessionId,exerciseId);
        LinearLayout main=card(surface);
        title(main,ex.name);
        hint(main,"Seria "+(already+1)+"/"+ex.sets+" • Cel: "+ex.min+"–"+ex.max+
            (ex.timed?" sekund":" powt.")+" • przerwa "+ex.rest+" s");
        if(ex.tip!=null&&!ex.tip.isEmpty())hint(main,"Technika: "+ex.tip);

        java.util.List<LiteCoach.SetResult> previous=trainer.previous(profileId,exerciseId);
        LiteCoach.Advice advice=LiteCoach.recommend(previous,ex.sets,ex.min,ex.max,DEFAULT_STEP,ex.timed);
        if(!"NONE".equals(advice.decision)) {
            int adviceColor="ADD".equals(advice.decision)?GREEN:"REDUCE".equals(advice.decision)?RED:BLUE;
            LinearLayout helper=card(main);helper.setBackground(bg(adviceColor,11));
            helper.addView(text("Trener: "+advice.message,18,true));
            hint(helper,"Poprzednio "+number(advice.base)+" kg → sugerowane "+number(advice.target)+" kg");
        }

        double load=advice.target;
        int reps=ex.min;
        try(Cursor recent=trainer.sets(sessionId,exerciseId)) {
            while(recent.moveToNext()){load=recent.getDouble(0);reps=recent.getInt(1);}
        }
        if(load<=0) {
            try(Cursor last=db.lastSet(profileId,exerciseId)){
                if(last.moveToFirst())load=last.getDouble(0);
            }
        }
        title(main,"Obciążenie (kg)");
        EditText weight=inputNumber(number(load),true);
        rowNumber(main,weight,DEFAULT_STEP);
        title(main,ex.timed?"Czas trwania (sek.)":"Powtórzenia");
        EditText repetitions=inputNumber(String.valueOf(reps),false);
        rowNumber(main,repetitions,1);

        Spinner rir=spinner(main,"RIR – powtórzenia w zapasie",
            new String[]{"0 — brak zapasu","1","2","3","4 lub więcej"},2);
        Spinner technique=spinner(main,"Technika",new String[]{"Dobra","Średnia","Zła"},0);
        Spinner pain=spinner(main,"Ból / dyskomfort",new String[]{"Brak","Lekki","Mocny"},0);

        TextView restLabel=text("",22,true);
        main.addView(restLabel);
        final long activeSession=sessionId,currentEx=exerciseId;
        final String currentGroup=activeGroupId;
        final int currentTurn=activeGroupTurn;
        Button save=button("✓ ZAPISZ SERIĘ",GREEN,()->{
            try{
                if(trainer.isPaused(activeSession)){msg("Najpierw wznów trening.");return;}
                if(trainer.rest(activeSession)>System.currentTimeMillis()){
                    msg("Przerwa trwa — możesz ją pominąć.");return;
                }
                int count=trainer.done(activeSession,currentEx);
                if(count>=ex.sets) {
                    msg("Wszystkie zaplanowane serie wykonane");return;
                }
                double kg=Double.parseDouble(weight.getText().toString().trim().replace(',','.'));
                int n=Integer.parseInt(repetitions.getText().toString().trim());
                int r=rir.getSelectedItemPosition();
                String tech=new String[]{"good","medium","bad"}[technique.getSelectedItemPosition()];
                String discomfort=new String[]{"none","mild","strong"}[pain.getSelectedItemPosition()];
                db.saveSet(activeSession,currentEx,kg,n);
                trainer.recordQuality(activeSession,currentEx,r,tech,discomfort);
                trainer.setRest(activeSession,System.currentTimeMillis()+ex.rest*1000L);
                if(currentGroup!=null)group.saveTurn(currentGroup,currentTurn);
                msg(LiteCoach.qualityMessage(n,ex.min,ex.max,r,tech,discomfort,DEFAULT_STEP));
                showWorkout();
            }catch(Exception err){msg("Sprawdź wpisane wartości: "+err.getMessage());}
        });
        main.addView(save,lp(-1,74));
        Button skip=button("POMIŃ PRZERWĘ",BLUE,()->{
            trainer.setRest(activeSession,0);showWorkout();
        });
        main.addView(skip,lp(-1,65));
        Runnable tick=new Runnable() {
            @Override public void run(){
                if(!page.equals("workout")||screenToken!=workoutUiToken||activeSession!=sessionId)return;
                boolean paused=trainer.isPaused(activeSession);
                long seconds=Math.max(0,(trainer.rest(activeSession)-System.currentTimeMillis()+999)/1000);
                restLabel.setText(paused?"Trening wstrzymany":seconds>0?"Odpoczynek: "+seconds+" s":"Gotowy do następnej serii");
                save.setEnabled(!paused&&seconds==0);
                save.setAlpha(!paused&&seconds==0?1f:.5f);
                skip.setVisibility(!paused&&seconds>0?View.VISIBLE:View.GONE);
                if(seconds>0||paused)workoutUiHandler.postDelayed(this,1000);
            }
        };
        tick.run();
        LinearLayout done=card(surface);title(done,"Zapisane serie · "+ex.name);
        int number=0;
        try(Cursor c=trainer.sets(sessionId,exerciseId)){
            while(c.moveToNext()){
                number++;
                hint(done,number+".  "+number(c.getDouble(0))+" kg × "+c.getInt(1)+
                    (ex.timed?" sek.":" powt.")+" • RIR "+c.getInt(3)+
                    " • "+("good".equals(c.getString(4))?"dobra":c.getString(4))+" technika");
            }
        }
        if(number==0)hint(done,"Jeszcze bez zapisanych serii");
        addButton(surface,"■ ZAKOŃCZ WCZEŚNIEJ I ZAPISZ",RED,
            ()->confirm("Zakończyć przed czasem?",
                "Wykonane serie zostaną w historii jako przerwany trening.",()->finishWorkout()));
    }
    private ExerciseSpec specFor(ArrayList<ExerciseSpec> list,long id){
        for(ExerciseSpec x:list)if(x.exerciseId==id)return x;
        return list.get(0);
    }
    private boolean containsExercise(ArrayList<ExerciseSpec> list,long id){
        for(ExerciseSpec x:list)if(x.exerciseId==id)return true;
        return false;
    }

    private EditText inputNumber(String current,boolean decimals) {
        EditText e=new EditText(this);
        e.setSingleLine(true);e.setSelectAllOnFocus(true);
        e.setText(current);e.setTextSize(29);e.setTextColor(WHITE);
        e.setGravity(Gravity.CENTER);e.setBackground(bg(0xff344861,12));
        e.setInputType(InputType.TYPE_CLASS_NUMBER | (decimals?InputType.TYPE_NUMBER_FLAG_DECIMAL:0));
        return e;
    }
    private void rowNumber(LinearLayout area,EditText entry,double increment) {
        LinearLayout row=horizontal();area.addView(row,lp(-1,76));
        Button minus=button(increment==1?"−1":"−2,5",BLUE,()->adjust(entry,-increment,increment==1));
        Button plus=button(increment==1?"+1":"+2,5",BLUE,()->adjust(entry,increment,increment==1));
        row.addView(minus,lp(85,67));
        LinearLayout.LayoutParams center=new LinearLayout.LayoutParams(0,dp(70),1);
        center.setMargins(dp(8),0,dp(8),0);row.addView(entry,center);
        row.addView(plus,lp(85,67));
    }
    private void adjust(EditText input,double delta,boolean integer) {
        double old=0;
        try{old=Double.parseDouble(input.getText().toString().replace(',','.'));}catch(Exception ignored){}
        double result=Math.max(integer?1:0,Math.round((old+delta)*2)/2.0);
        input.setText(integer?String.valueOf((int)result):number(result));input.setSelection(input.length());
    }
    private void finishWorkout(){
        workoutUiToken++;
        if(activeGroupId!=null){
            for(LiteGroupWorkout.Member member:group.members(activeGroupId))trainer.markInterrupted(member.sessionId);
            group.finish(activeGroupId);activeGroupId=null;
        }else{
            trainer.markInterrupted(sessionId);db.finish(sessionId);
        }
        trainer.setRest(sessionId,0);sessionId=-1;showHistory();
    }
    private void showHistory() {
        page="history";render("Historia · "+db.name("profiles",profileId));
        try(Cursor c=db.sessions(profileId)) {
            if(c.getCount()==0)hint(surface,"Brak zapisanych treningów.");
            while(c.moveToNext()){
                long id=c.getLong(0);String name=c.isNull(1)?"Plan usunięty":c.getString(1);
                boolean finished=!c.isNull(3);
                name=trainer.historyName(id,name);
                LinearLayout sec=card(surface);title(sec,name);
                long dur=trainer.durationMillis(id,c.getLong(2),finished?c.getLong(3):0);
                long minutes=dur/60000;
                hint(sec,date(c.getLong(2))+" · "+(finished?(trainer.interrupted(id)?"Przerwany":"Zakończony"):"W toku")+
                    " • "+minutes+" min"+(group.historicalGroup(id)!=null?" • wspólny na tablecie":""));
                twoButtons(sec,"SZCZEGÓŁY",BLUE,()->showSessionDetails(id),
                    "USUŃ",RED,()->confirm("Usunąć zapis treningu?",
                       "Wszystkie serie tego treningu zostaną bezpowrotnie usunięte.",
                       ()->safe(()->{trainer.deleteSessionSafely(id);showHistory();})));
            }
        }
    }

    private void showProgress() {
        page="progress";render("Postępy · "+db.name("profiles",profileId));
        try(Cursor c=trainer.stats(profileId)){
            if(c.moveToFirst()){
                LinearLayout totals=card(surface);
                title(totals,"Treningów: "+c.getInt(0)+" • serii: "+c.getInt(1));
                hint(totals,"Łączna objętość: "+number(c.getDouble(2))+" kg × powt.");
            }
        }
        title(surface,"Największe obciążenia");
        int count=0;
        try(Cursor c=trainer.records(profileId)){
            while(c.moveToNext()) {
                LinearLayout row=card(surface);
                title(row,c.getString(0));
                hint(row,number(c.getDouble(1))+" kg");count++;
            }
        }
        if(count==0)hint(surface,"Po pierwszym treningu pojawią się rekordy.");
    }
    private void showSessionDetails(long id) {
        page="session-detail";render("Historia zapisanego treningu");
        int count=0;
        try(Cursor c=trainer.historyDetails(id)) {
            while(c.moveToNext()){
                LinearLayout line=card(surface);
                title(line,c.isNull(0)?"Ćwiczenie usunięte":c.getString(0));
                hint(line,number(c.getDouble(1))+" kg × "+c.getInt(2)+" powt. • RIR "+c.getInt(3)+" • technika "+c.getString(4)+" • ból "+c.getString(5));
                count++;
            }
        }
        if(count==0)hint(surface,"Ten trening nie ma zapisanych serii.");
        addButton(surface,"← HISTORIA",BLUE,()->showHistory());
    }
    private void exportBackup() {
        try{
            Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("application/json");
            i.putExtra(Intent.EXTRA_TITLE,"Trener2Lite-kopia.json");
            startActivityForResult(i,EXPORT_JSON);
        }catch(Exception e){msg("Brak systemowego wyboru plików na tym tablecie: "+e.getMessage());}
    }
    private void importBackup() {
        confirm("Przywrócić kopię?",
            "Import zastępuje wszystkie aktualne profile, plany i historię. Przed importem wyeksportuj własną kopię.",
            ()->{
                try{
                    Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");startActivityForResult(i,IMPORT_JSON);
                }catch(Exception e){msg("Brak obsługi wyboru pliku: "+e.getMessage());}
            });
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(result!=RESULT_OK||data==null||data.getData()==null)return;
        if(request==EXPORT_JSON){
            try(OutputStream stream=getContentResolver().openOutputStream(data.getData())) {
                if(stream==null)throw new IllegalStateException("Nie można otworzyć pliku");
                stream.write(db.exportJson().toString(2).getBytes(StandardCharsets.UTF_8));
                stream.flush();msg("Kopia zapisana.");
            }catch(Exception e){msg("Błąd eksportu: "+e.getMessage());}
        }else if(request==IMPORT_JSON){
            try(InputStream stream=getContentResolver().openInputStream(data.getData())) {
                if(stream==null)throw new IllegalStateException("Nie można odczytać pliku");
                ByteArrayOutputStream out=new ByteArrayOutputStream();
                byte[] buf=new byte[8192];int n,total=0;
                while((n=stream.read(buf))!=-1){total+=n;if(total>5*1024*1024)throw new IllegalArgumentException("Za duży plik (max 5 MB)");
                    out.write(buf,0,n);}
                db.importJson(new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8)));
                trainer=new LiteTrainingStore(this,db);
                group=new LiteGroupWorkout(db,trainer);
                activeGroupId=null;
                profileId=db.firstProfile();getPreferences(0).edit().putLong("profile",profileId).apply();
                showHome();msg("Odtworzono profile i historię.");
            }catch(Exception e){msg("Import nieudany. Sprawdź plik: "+e.getMessage());}
        }
    }
    @Override public void onBackPressed() {
        if(page.equals("home"))super.onBackPressed();
        else if(page.equals("session-detail"))showHistory();
        else showHome();
    }
}
