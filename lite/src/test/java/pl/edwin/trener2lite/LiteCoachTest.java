package pl.edwin.trener2lite;

import static org.junit.Assert.*;
import org.junit.Test;
import java.util.Arrays;
import java.util.List;

public class LiteCoachTest {
    private LiteCoach.SetResult row(double kg,int reps,int rir,String technique,String pain) {
        return new LiteCoach.SetResult(kg,reps,rir,technique,pain);
    }
    @Test public void addsWhenAllTargetAndGoodTechnique(){
        List<LiteCoach.SetResult> rows=Arrays.asList(
            row(20,12,2,"good","none"),row(20,12,2,"good","none"),row(20,13,2,"good","none"));
        LiteCoach.Advice a=LiteCoach.recommend(rows,3,8,12,2.5,false);
        assertEquals("ADD",a.decision);assertEquals(22.5,a.target,.001);
    }
    @Test public void twoFailedSetsReduceByFivePercentRounded(){
        List<LiteCoach.SetResult> rows=Arrays.asList(
            row(40,5,2,"good","none"),row(40,5,2,"good","none"),row(40,7,2,"good","none"));
        LiteCoach.Advice a=LiteCoach.recommend(rows,3,8,12,2.5,false);
        assertEquals("REDUCE",a.decision);assertEquals(37.5,a.target,.001);
    }
    @Test public void badTechniqueBlocksLoadIncrease(){
        List<LiteCoach.SetResult> rows=Arrays.asList(
            row(20,12,2,"good","none"),row(20,12,2,"bad","none"),row(20,12,2,"good","none"));
        assertEquals("KEEP",LiteCoach.recommend(rows,3,8,12,2.5,false).decision);
    }
    @Test public void painBlocksLoadIncrease(){
        List<LiteCoach.SetResult> rows=Arrays.asList(
            row(20,12,2,"good","none"),row(20,12,2,"good","mild"),row(20,12,2,"good","none"));
        assertEquals("KEEP",LiteCoach.recommend(rows,3,8,12,2.5,false).decision);
    }
    @Test public void holdsUntilAllPlannedSets(){
        List<LiteCoach.SetResult> rows=Arrays.asList(row(20,12,2,"good","none"),row(20,12,2,"good","none"));
        assertEquals("KEEP",LiteCoach.recommend(rows,3,8,12,2.5,false).decision);
    }
    @Test public void mostFrequentLoadWinsAndLatestBreaksTies() {
        List<LiteCoach.SetResult> rows=Arrays.asList(
            row(30,8,2,"good","none"),row(32.5,10,2,"good","none"),row(30,8,2,"good","none"),
            row(32.5,10,2,"good","none"));
        assertEquals(32.5,LiteCoach.primaryWeight(rows),.001);
    }
    @Test public void timedExercisesAreExcludedFromLoadRecommendations() {
        assertEquals("NONE",LiteCoach.recommend(Arrays.asList(row(0,60,2,"good","none")),1,30,60,2.5,true).decision);
    }
    @Test public void painWarningOverridesProgression() {
        String msg=LiteCoach.qualityMessage(12,8,12,3,"good","strong",2.5);
        assertTrue(msg.contains("Mocny ból"));
    }
}
