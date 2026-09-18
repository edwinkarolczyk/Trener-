package pl.edwin.trener2;

import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class UpdateInstallerTest {
    @Test
    public void newerMajorMinorBeatsOlderPatchBeta() {
        assertTrue(UpdateInstaller.compareBetaVersions("0.8-beta", "0.7.10-beta.2") > 0);
    }

    @Test
    public void betaBuildIncrementsWithinSameCore() {
        assertTrue(UpdateInstaller.compareBetaVersions("0.8-beta.1", "0.8-beta") > 0);
        assertTrue(UpdateInstaller.compareBetaVersions("0.7.10-beta.2", "0.7.10-beta.1") > 0);
    }

    @Test
    public void nextPatchBeatsBetaBuildSuffix() {
        assertTrue(UpdateInstaller.compareBetaVersions("0.8.1", "0.8-beta.9") > 0);
    }

    @Test
    public void fourthSegmentIsARealHotfixIncrement() {
        assertTrue(UpdateInstaller.compareBetaVersions("0.8.1.1", "0.8.1") > 0);
        assertTrue(UpdateInstaller.compareBetaVersions("0.8.2", "0.8.1.9") > 0);
    }
    @Test
    public void secondHotfixSegmentAdvances0821() {
        assertTrue(UpdateInstaller.compareBetaVersions("0.8.2.2", "0.8.2.1") > 0);
    }

    @Test
    public void thirdHotfixSegmentAdvances0822() {
        assertTrue(UpdateInstaller.compareBetaVersions("0.8.2.3", "0.8.2.2") > 0);
    }

    @Test
    public void fourthHotfixSegmentAdvances0823() {
        assertTrue(UpdateInstaller.compareBetaVersions("0.8.2.4", "0.8.2.3") > 0);
    }

}
