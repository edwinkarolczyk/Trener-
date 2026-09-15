package pl.edwin.trener2;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class ProgressionAdvisorTest {
    @Test
    public void addsWhenEverySetHitsTopRange() {
        assertEquals(ProgressionAdvisor.Decision.ADD,
                ProgressionAdvisor.decide(new int[]{8, 8, 8, 8}, 6, 8));
    }

    @Test
    public void keepsWhenProgressIsIncomplete() {
        assertEquals(ProgressionAdvisor.Decision.KEEP,
                ProgressionAdvisor.decide(new int[]{8, 8, 7, 6}, 6, 8));
    }

    @Test
    public void reducesWhenAtLeastTwoSetsMissMinimum() {
        assertEquals(ProgressionAdvisor.Decision.REDUCE,
                ProgressionAdvisor.decide(new int[]{6, 5, 5, 4}, 6, 8));
    }

    @Test
    public void suggestsNextStepWhenAdding() {
        assertEquals(42.5,
                ProgressionAdvisor.suggestWeight(40.0, new int[]{8, 8, 8, 8}, 6, 8, 2.5),
                0.001);
    }

    @Test
    public void suggestsConcreteReducedWeight() {
        assertEquals(37.5,
                ProgressionAdvisor.suggestWeight(40.0, new int[]{6, 5, 5, 4}, 6, 8, 2.5),
                0.001);
    }

    @Test
    public void keepsSameWeightWhenMiddleOfRange() {
        assertEquals(40.0,
                ProgressionAdvisor.suggestWeight(40.0, new int[]{8, 8, 7, 6}, 6, 8, 2.5),
                0.001);
    }
}
