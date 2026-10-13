package pl.edwin.trener2lite;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Wspólne zasady progresji Trenera 2 – progression-addon i smart-set. */
public final class LiteCoach {
    public static final class SetResult {
        public final double weight; public final int reps, rir;
        public final String technique, pain;
        public SetResult(double weight,int reps,int rir,String technique,String pain) {
            this.weight=weight;this.reps=reps;this.rir=rir;this.technique=technique;this.pain=pain;
        }
    }
    public static final class Advice {
        public final String decision, message;
        public final double base, target;
        Advice(String decision,double base,double target,String message) {
            this.decision=decision;this.base=base;this.target=target;this.message=message;
        }
    }
    private LiteCoach() {}
    public static double primaryWeight(List<SetResult> rows) {
        Map<String,Integer> counts=new LinkedHashMap<>();
        Map<String,Integer> last=new LinkedHashMap<>();
        Map<String,Double> values=new LinkedHashMap<>();
        for(int i=0;i<rows.size();i++){
            double weight=rows.get(i).weight;
            if(weight<=0)continue;
            String key=String.format(java.util.Locale.US,"%.3f",weight);
            counts.put(key,counts.containsKey(key)?counts.get(key)+1:1);
            last.put(key,i);
            values.put(key,weight);
        }
        String best=null;
        for(String key:counts.keySet())
            if(best==null||counts.get(key)>counts.get(best)||
                counts.get(key).equals(counts.get(best))&&last.get(key)>last.get(best))best=key;
        return best==null?0:values.get(best);
    }
    public static Advice recommend(List<SetResult> rows,int plannedSets,int minReps,int maxReps,double step,boolean timed){
        if(rows==null||rows.isEmpty()||timed)return new Advice("NONE",0,0,"Brak poprzedniego wyniku");
        double weight=primaryWeight(rows);
        if(weight<=0)return new Advice("NONE",0,0,"Brak poprzedniego ciężaru");
        List<SetResult> work=new ArrayList<>();
        for(SetResult s:rows)if(Math.abs(s.weight-weight)<0.001)work.add(s);
        int low=0;boolean allTop=!work.isEmpty(),qualityOk=true;
        for(SetResult s:work){
            if(s.reps<minReps)low++;
            if(s.reps<maxReps)allTop=false;
            if(!"none".equals(s.pain)||!"good".equals(s.technique)||s.rir<1)
                qualityOk=false;
        }
        step=step>0?step:2.5;
        if(low>=2) {
            double target=Math.round(weight*.95/step)*step;
            if(target>=weight)target=weight-step;
            target=Math.max(0,Math.round(target*100)/100.0);
            return new Advice("REDUCE",weight,target,"ODEJMIJ około 5% — przynajmniej 2 serie poniżej minimum");
        }
        if(work.size()>=Math.max(1,plannedSets)&&allTop&&qualityOk)
            return new Advice("ADD",weight,Math.round((weight+step)*100)/100.0,"DOŁÓŻ "+step+" kg, jeśli technika pozostaje dobra");
        return new Advice("KEEP",weight,weight,qualityOk?
            "ZOSTAW ciężar — pracuj w zakresie "+minReps+"–"+maxReps:
            "ZOSTAW ciężar — ból, słaba technika albo zbyt mały zapas hamują progresję");
    }
    public static String qualityMessage(int reps,int min,int max,int rir,String technique,String pain,double step) {
        if("strong".equals(pain))return "Mocny ból: przerwij bolesny ruch. Nie zwiększaj ciężaru.";
        if("mild".equals(pain))return "Dyskomfort: nie dokładaj ciężaru; przerwij jeśli ból narasta.";
        if("bad".equals(technique))return "Słaba technika: zmniejsz ciężar albo popraw ruch.";
        if(rir==0||reps<min)return "Ciężka seria — utrzymaj ciężar; jeśli znowu spadniesz poniżej celu, rozważ -5%.";
        if("good".equals(technique)&&rir>=2&&reps>=max)
            return "Dobra seria. Jeżeli wszystkie będą podobne, następny trening około +"+step+" kg.";
        if("good".equals(technique)&&rir>=3&&reps>=Math.max(min,max-1))
            return "Duży zapas — niewielki wzrost jest możliwy, jeśli technika pozostaje dobra.";
        return "Zostaw ciężar i pracuj nad zakresem z 1–2 RIR.";
    }
}
