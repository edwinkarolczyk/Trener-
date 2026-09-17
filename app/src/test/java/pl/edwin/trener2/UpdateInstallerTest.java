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
        assertTrue(UpdateInstaller.compareBetaVersions("0.8.1-beta", "0.8-beta.9") > 0);
    }
}
