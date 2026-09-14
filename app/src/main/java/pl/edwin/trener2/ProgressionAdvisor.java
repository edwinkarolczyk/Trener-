package pl.edwin.trener2;

public final class ProgressionAdvisor {
    private ProgressionAdvisor() {}

    public enum Decision {
        ADD,
        KEEP,
        REDUCE
    }

    public static Decision decide(int[] reps, int min, int max) {
        if (reps == null || reps.length == 0) return Decision.KEEP;
        boolean allAtTop = true;
        int belowMinimum = 0;
        for (int rep : reps) {
            if (rep < max) allAtTop = false;
            if (rep < min) belowMinimum++;
        }
        if (allAtTop) return Decision.ADD;
        if (belowMinimum >= 2) return Decision.REDUCE;
        return Decision.KEEP;
    }
}
