package pl.edwin.trener2;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class LocalSessionManagerTest {
    @Test
    public void normalizesSixDigitCode() {
        assertEquals("123456", LocalSessionManager.normalizeCode("123-456"));
        assertTrue(LocalSessionManager.isValidCode("123456"));
    }

    @Test
    public void rejectsWrongLengthCode() {
        assertFalse(LocalSessionManager.isValidCode("12345"));
        assertFalse(LocalSessionManager.isValidCode("1234567"));
        assertFalse(LocalSessionManager.isValidCode("abcdef"));
    }

    @Test
    public void recognizesWifiAndCellularInterfaces() {
        assertTrue(LocalSessionManager.isWifiOrHotspotInterface("wlan0"));
        assertTrue(LocalSessionManager.isWifiOrHotspotInterface("ap0"));
        assertFalse(LocalSessionManager.isWifiOrHotspotInterface("rmnet_data0"));
        assertTrue(LocalSessionManager.isCellularInterface("rmnet_data0"));
    }

    @Test
    public void detectsClearlyDifferentPrivateNetworks() {
        assertTrue(LocalSessionManager.definitelyDifferentPrivateNetworks("10.0.89.78", "192.168.0.42"));
        assertFalse(LocalSessionManager.definitelyDifferentPrivateNetworks("192.168.0.18", "192.168.0.42"));
        assertFalse(LocalSessionManager.definitelyDifferentPrivateNetworks("172.20.10.3", "172.20.10.1"));
    }

    @Test
    public void handshakeAllowsOnlyIdenticalAppVersionAndCode() {
        assertTrue(LocalSessionManager.matchesHandshake("HELLO:123456:0.8.9.3", "123456", "0.8.9.3"));
        assertFalse(LocalSessionManager.matchesHandshake("HELLO:123456:0.8.9.2", "123456", "0.8.9.3"));
        assertFalse(LocalSessionManager.matchesHandshake("HELLO:123456", "123456", "0.8.9.3"));
        assertFalse(LocalSessionManager.matchesHandshake("HELLO:000000:0.8.9.3", "123456", "0.8.9.3"));
        assertFalse(LocalSessionManager.matchesHandshake("HELLO:123456:", "123456", ""));
    }

    @Test
    public void hostAllowsThreeGuestsForFourPersonSession() {
        assertEquals(3, LocalSessionManager.maxHostPeers());
    }
}
