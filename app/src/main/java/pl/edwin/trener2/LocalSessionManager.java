package pl.edwin.trener2;

import java.io.Closeable;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicInteger;

public final class LocalSessionManager {
    public static final int PORT = 48721;
    private static final int CONNECT_TIMEOUT_MS = 6000;
    private static final int MAX_MESSAGE_CHARS = 60000;

    public interface Listener {
        void onStatus(String status, String detail);
        void onMessage(String message);
    }

    private final Listener listener;
    private final ExecutorService io = Executors.newCachedThreadPool();
    private final Object writeLock = new Object();
    private final AtomicInteger generation = new AtomicInteger(0);

    private volatile ServerSocket serverSocket;
    private volatile Socket peerSocket;
    private volatile DataOutputStream peerOut;
    private volatile String sessionCode = "";
    private volatile boolean hosting = false;
    private volatile boolean shuttingDown = false;

    public LocalSessionManager(Listener listener) {
        this.listener = listener;
    }

    public void host(String code) {
        String normalized = normalizeCode(code);
        if (!isValidCode(normalized)) {
            emitStatus("error", "Kod sesji musi mieć 6 cyfr.");
            return;
        }
        if (shuttingDown) return;
        disconnectInternal(false);
        int gen = generation.incrementAndGet();
        hosting = true;
        sessionCode = normalized;

        try {
            io.execute(() -> {
                try {
                    ServerSocket server = new ServerSocket();
                    server.setReuseAddress(true);
                    server.bind(new InetSocketAddress(PORT));
                    if (gen != generation.get()) {
                        closeQuietly(server);
                        return;
                    }
                    serverSocket = server;
                    emitStatus("waiting", getLocalIp());

                    while (gen == generation.get() && !server.isClosed()) {
                        Socket candidate = server.accept();
                        candidate.setTcpNoDelay(true);
                        candidate.setKeepAlive(true);
                        if (!performHostHandshake(candidate, normalized)) {
                            closeQuietly(candidate);
                            continue;
                        }

                        synchronized (this) {
                            if (peerSocket != null && !peerSocket.isClosed()) {
                                closeQuietly(candidate);
                                continue;
                            }
                            attachPeer(candidate);
                        }
                        emitStatus("connected", "host");
                        readLoop(candidate, gen, true);
                    }
                } catch (SocketException e) {
                    if (gen == generation.get() && !shuttingDown) emitStatus("error", "Połączenie Wi‑Fi zostało przerwane.");
                } catch (IOException e) {
                    if (gen == generation.get() && !shuttingDown) emitStatus("error", safeMessage(e));
                } finally {
                    if (gen == generation.get()) {
                        closePeerOnly();
                        closeQuietly(serverSocket);
                        serverSocket = null;
                    }
                }
            });
        } catch (RejectedExecutionException ignored) {
        }
    }

    public void join(String hostIp, String code) {
        String normalized = normalizeCode(code);
        String ip = hostIp == null ? "" : hostIp.trim();
        if (ip.isEmpty()) {
            emitStatus("error", "Brak adresu IP gospodarza.");
            return;
        }
        if (!isValidCode(normalized)) {
            emitStatus("error", "Kod sesji musi mieć 6 cyfr.");
            return;
        }
        if (shuttingDown) return;

        disconnectInternal(false);
        int gen = generation.incrementAndGet();
        hosting = false;
        sessionCode = normalized;
        emitStatus("connecting", ip);

        try {
            io.execute(() -> {
                Socket socket = new Socket();
                try {
                    socket.connect(new InetSocketAddress(ip, PORT), CONNECT_TIMEOUT_MS);
                    socket.setTcpNoDelay(true);
                    socket.setKeepAlive(true);

                    DataOutputStream out = new DataOutputStream(socket.getOutputStream());
                    DataInputStream in = new DataInputStream(socket.getInputStream());
                    out.writeUTF("HELLO:" + normalized);
                    out.flush();

                    String reply = in.readUTF();
                    if (!"OK".equals(reply)) {
                        emitStatus("denied", "Błędny kod sesji.");
                        closeQuietly(socket);
                        return;
                    }

                    synchronized (this) {
                        if (gen != generation.get()) {
                            closeQuietly(socket);
                            return;
                        }
                        peerSocket = socket;
                        peerOut = out;
                    }
                    emitStatus("connected", "guest");
                    readLoopWithInput(socket, in, gen, false);
                } catch (IOException e) {
                    if (gen == generation.get() && !shuttingDown) emitStatus("error", safeMessage(e));
                    closeQuietly(socket);
                }
            });
        } catch (RejectedExecutionException ignored) {
        }
    }

    public boolean send(String message) {
        if (message == null || message.length() > MAX_MESSAGE_CHARS) return false;
        DataOutputStream out = peerOut;
        Socket socket = peerSocket;
        if (out == null || socket == null || socket.isClosed()) return false;

        synchronized (writeLock) {
            try {
                out.writeUTF(message);
                out.flush();
                return true;
            } catch (IOException e) {
                emitStatus("disconnected", "Kumpel z siłowni został rozłączony.");
                closePeerOnly();
                return false;
            }
        }
    }

    public void disconnect() {
        disconnectInternal(true);
    }

    public void shutdown() {
        shuttingDown = true;
        disconnectInternal(false);
        io.shutdownNow();
    }

    public boolean isConnected() {
        Socket socket = peerSocket;
        return socket != null && socket.isConnected() && !socket.isClosed();
    }

    public boolean isHosting() {
        return hosting;
    }

    public String getLocalIp() {
        String fallback = null;
        try {
            for (NetworkInterface nif : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!nif.isUp() || nif.isLoopback()) continue;
                String interfaceName = nif.getName() == null ? "" : nif.getName().toLowerCase(Locale.ROOT);
                Enumeration<InetAddress> addresses = nif.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress address = addresses.nextElement();
                    if (!(address instanceof Inet4Address) || address.isLoopbackAddress() || !address.isSiteLocalAddress()) continue;
                    String ip = address.getHostAddress();
                    if (isWifiOrHotspotInterface(interfaceName)) return ip;
                    if (!isCellularInterface(interfaceName) && fallback == null) fallback = ip;
                }
            }
        } catch (Exception ignored) {
        }
        return fallback == null ? "—" : fallback;
    }

    static String normalizeCode(String code) {
        if (code == null) return "";
        return code.replaceAll("[^0-9]", "");
    }

    static boolean isValidCode(String code) {
        return code != null && code.matches("\\d{6}");
    }

    static boolean isWifiOrHotspotInterface(String name) {
        if (name == null) return false;
        String n = name.toLowerCase(Locale.ROOT);
        return n.startsWith("wlan") || n.startsWith("wifi") || n.startsWith("swlan")
                || n.startsWith("ap") || n.contains("softap") || n.startsWith("eth");
    }

    static boolean isCellularInterface(String name) {
        if (name == null) return false;
        String n = name.toLowerCase(Locale.ROOT);
        return n.startsWith("rmnet") || n.startsWith("ccmni") || n.startsWith("pdp")
                || n.startsWith("wwan") || n.contains("cell");
    }

    private boolean performHostHandshake(Socket socket, String expectedCode) {
        try {
            socket.setSoTimeout(CONNECT_TIMEOUT_MS);
            DataInputStream in = new DataInputStream(socket.getInputStream());
            DataOutputStream out = new DataOutputStream(socket.getOutputStream());
            String hello = in.readUTF();
            boolean ok = ("HELLO:" + expectedCode).equals(hello);
            out.writeUTF(ok ? "OK" : "DENY");
            out.flush();
            socket.setSoTimeout(0);
            return ok;
        } catch (IOException e) {
            return false;
        }
    }

    private synchronized void attachPeer(Socket socket) throws IOException {
        peerSocket = socket;
        peerOut = new DataOutputStream(socket.getOutputStream());
    }

    private void readLoop(Socket socket, int gen, boolean hostSide) {
        try {
            DataInputStream in = new DataInputStream(socket.getInputStream());
            readLoopWithInput(socket, in, gen, hostSide);
        } catch (IOException e) {
            handlePeerEnd(socket, gen, hostSide);
        }
    }

    private void readLoopWithInput(Socket socket, DataInputStream in, int gen, boolean hostSide) {
        try {
            while (gen == generation.get() && !socket.isClosed()) {
                String message = in.readUTF();
                if (message != null && !message.isEmpty()) emitMessage(message);
            }
        } catch (EOFException | SocketException ignored) {
        } catch (IOException e) {
            if (gen == generation.get() && !shuttingDown) emitStatus("disconnected", safeMessage(e));
        } finally {
            handlePeerEnd(socket, gen, hostSide);
        }
    }

    private void handlePeerEnd(Socket socket, int gen, boolean hostSide) {
        synchronized (this) {
            if (peerSocket == socket) closePeerOnly();
        }
        if (gen != generation.get() || shuttingDown) return;
        if (hostSide && hosting && serverSocket != null && !serverSocket.isClosed()) {
            emitStatus("waiting", getLocalIp());
        } else {
            emitStatus("disconnected", "Kumpel z siłowni został rozłączony.");
        }
    }

    private synchronized void closePeerOnly() {
        closeQuietly(peerOut);
        closeQuietly(peerSocket);
        peerOut = null;
        peerSocket = null;
    }

    private synchronized void disconnectInternal(boolean notify) {
        generation.incrementAndGet();
        closePeerOnly();
        closeQuietly(serverSocket);
        serverSocket = null;
        hosting = false;
        sessionCode = "";
        if (notify && !shuttingDown) emitStatus("disconnected", "Rozłączono.");
    }

    private void emitStatus(String status, String detail) {
        if (listener != null) listener.onStatus(status, detail == null ? "" : detail);
    }

    private void emitMessage(String message) {
        if (listener != null) listener.onMessage(message);
    }

    private static void closeQuietly(Object closeable) {
        if (closeable == null) return;
        try {
            if (closeable instanceof Closeable) {
                ((Closeable) closeable).close();
            } else if (closeable instanceof ServerSocket) {
                ((ServerSocket) closeable).close();
            } else if (closeable instanceof Socket) {
                ((Socket) closeable).close();
            }
        } catch (IOException ignored) {
        }
    }

    private static String safeMessage(Exception e) {
        String m = e.getMessage();
        return (m == null || m.trim().isEmpty()) ? "Błąd połączenia lokalnego." : m;
    }
}
