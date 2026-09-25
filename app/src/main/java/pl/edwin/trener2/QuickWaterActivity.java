package pl.edwin.trener2;

import android.app.Activity;
import android.os.Bundle;
import android.widget.Toast;

public class QuickWaterActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int total = HydrationStore.addWater(getApplicationContext(), 250);
        Toast.makeText(
                getApplicationContext(),
                "Woda +250 ml • dziś " + total + " ml",
                Toast.LENGTH_SHORT
        ).show();
        finishAndRemoveTask();
    }
}
