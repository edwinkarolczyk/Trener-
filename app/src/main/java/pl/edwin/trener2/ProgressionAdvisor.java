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

    public static double suggestWeight(double currentWeight, int[] reps, int min, int max, double stepKg) {
        if (currentWeight <= 0) return 0;
        double step = stepKg > 0 ? stepKg : 2.5;
        Decision decision = decide(reps, min, max);
        if (decision == Decision.ADD) {
            return round2(currentWeight + step);
        }
        if (decision == Decision.REDUCE) {
            double target = Math.round((currentWeight * 0.95) / step) * step;
            if (target >= currentWeight) target = currentWeight - step;
            return round2(Math.max(0, target));
        }
        return round2(currentWeight);
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
