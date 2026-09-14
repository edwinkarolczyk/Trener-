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
}
