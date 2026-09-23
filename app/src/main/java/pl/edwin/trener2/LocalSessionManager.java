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
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import org.json.JSONArray;
import org.json.JSONObject;

public final class LocalSessionManager {
    public static final int PORT = 48721;
    private static final int CONNECT_TIMEOUT_MS = 6000;
    private static final int MAX_MESSAGE_CHARS = 60000;
    private static final int MAX_HOST_PEERS = 3; // gospodarz + maks. 3 osoby = 4 osoby

    public interface Listener {
        void onStatus(String status, String detail);
        void onMessage(String message);
    }

    private static final class HostPeer {
        final Socket socket;
        final DataOutputStream out;
        final String remote;
        volatile long lastRxAtMs;
        volatile long lastTxAtMs;
        volatile long rxCount;
        volatile long txCount;

        HostPeer(Socket socket) throws IOException {
            this.socket = socket;
            this.out = new DataOutputStream(socket.getOutputStream());
            this.remote = String.valueOf(socket.getRemoteSocketAddress());
        }
    }

    private final Listener listener;
    private final String appVersion;
    private final ExecutorService io = Executors.newCachedThreadPool();
    private final Object writeLock = new Object();
    private final Object hostPeersLock = new Object();
    private final AtomicInteger generation = new AtomicInteger(0);
    private final List<HostPeer> hostPeers = new ArrayList<>();

    private volatile ServerSocket serverSocket;
    private volatile Socket peerSocket;
    private volatile DataOutputStream peerOut;
    private volatile String sessionCode = "";
    private volatile boolean hosting = false;
    private volatile boolean shuttingDown = false;
    private volatile long connectedAtMs = 0L;
    private volatile long lastRxAtMs = 0L;
    private volatile long lastTxAtMs = 0L;
    private final AtomicLong rxCount = new AtomicLong(0L);
    private final AtomicLong txCount = new AtomicLong(0L);
    private volatile String lastRemote = "";
    private volatile String lastCloseType = "";
    private volatile String lastCloseReason = "";
    private volatile long lastCloseAtMs = 0L;

    public LocalSessionManager(Listener listener, String appVersion) {
        this.listener = listener;
        this.appVersion = appVersion == null ? "" : appVersion.trim();
    }

    public LocalSessionManager(Listener listener) {
        this(listener, "");
    }

    static boolean matchesHandshake(String hello, String code, String version) {
        return !version.isEmpty() && ("HELLO:" + code + ":" + version).equals(hello);
    }

    public void host(String code) {
        String normalized = normalizeCode(code);
        if (!isValidCode(normalized)) {
            emitStatus("error", "Kod sesji musi mieć 6 cyfr.");
            return;
        }
        if (shuttingDown) return;
        String localIp = getLocalIp();
        if ("—".equals(localIp)) {
            emitStatus("error", "Włącz Wi‑Fi albo hotspot. Wspólna sesja działa tylko w sieci lokalnej.");
            return;
        }
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

                        final HostPeer peer;
                        try {
                            peer = new HostPeer(candidate);
                        } catch (IOException e) {
                            closeQuietly(candidate);
                            continue;
                        }
                        synchronized (hostPeersLock) {
                            if (hostPeers.size() >= MAX_HOST_PEERS) {
                                closeHostPeer(peer);
                                continue;
                            }
                            hostPeers.add(peer);
                        }
                        connectedAtMs = System.currentTimeMillis();
                        lastRemote = peer.remote;
                        lastCloseType = "";
                        lastCloseReason = "";
                        emitStatus("connected", "host");
                        try {
                            io.execute(() -> readHostPeerLoop(peer, gen));
                        } catch (RejectedExecutionException e) {
                            removeHostPeer(peer);
                        }
                    }
                } catch (SocketException e) {
                    if (gen == generation.get() && !shuttingDown) {
                        emitStatus("error", "Połączenie Wi‑Fi zostało przerwane.");
                    }
                } catch (IOException e) {
                    if (gen == generation.get() && !shuttingDown) emitStatus("error", safeMessage(e));
                } finally {
                    if (gen == generation.get()) {
                        closeAllHostPeers();
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

        String localIp = getLocalIp();
        if ("—".equals(localIp)) {
            emitStatus("error", "Połącz ten telefon z tym samym Wi‑Fi co gospodarz albo z jego hotspotem.");
            return;
        }
        if (definitelyDifferentPrivateNetworks(localIp, ip)) {
            emitStatus("error", "Telefony są w różnych sieciach: ten telefon ma " + localIp + ", a gospodarz " + ip + ". Połącz oba z tym samym Wi‑Fi lub hotspotem.");
            return;
        }

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
                    out.writeUTF("HELLO:" + normalized + ":" + appVersion);
                    out.flush();

                    String reply = in.readUTF();
                    if (reply.startsWith("VERSION")) {
                        emitStatus("error", "Niezgodna wersja Trenera 2. Oba telefony muszą mieć tę samą wersję. Gospodarz: " +
                                (reply.startsWith("VERSION:") ? reply.substring(8) : "nieznana") + ", ten telefon: " + appVersion + ".");
                        closeQuietly(socket);
                        return;
                    }
                    if ("FULL".equals(reply)) {
                        emitStatus("error", "Sesja jest pełna. Maksymalnie mogą ćwiczyć 4 osoby razem z gospodarzem.");
                        closeQuietly(socket);
                        return;
                    }
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
                    connectedAtMs = System.currentTimeMillis();
                    lastRemote = String.valueOf(socket.getRemoteSocketAddress());
                    lastCloseType = "";
                    lastCloseReason = "";
                    emitStatus("connected", "guest");
                    readGuestLoop(socket, in, gen);
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
        if (hosting) return broadcastFromHost(message);

        DataOutputStream out = peerOut;
        Socket socket = peerSocket;
        if (out == null || socket == null || socket.isClosed()) return false;
        synchronized (writeLock) {
            try {
                out.writeUTF(message);
                out.flush();
                lastTxAtMs = System.currentTimeMillis();
                txCount.incrementAndGet();
                return true;
            } catch (IOException e) {
                rememberClose("WRITE_ERROR", safeMessage(e));
                closeGuestPeerOnly();
                return false;
            }
        }
    }

    private boolean broadcastFromHost(String message) {
        List<HostPeer> peers;
        synchronized (hostPeersLock) {
            peers = new ArrayList<>(hostPeers);
        }
        if (peers.isEmpty()) return false;

        boolean sent = false;
        synchronized (writeLock) {
            for (HostPeer peer : peers) {
                if (peer.socket.isClosed()) {
                    removeHostPeer(peer);
                    continue;
                }
                try {
                    peer.out.writeUTF(message);
                    peer.out.flush();
                    long now = System.currentTimeMillis();
                    peer.lastTxAtMs = now;
                    peer.txCount++;
                    lastTxAtMs = now;
                    txCount.incrementAndGet();
                    lastRemote = peer.remote;
                    sent = true;
                } catch (IOException e) {
                    removeHostPeer(peer);
                }
            }
        }
        return sent;
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
        if (hosting) {
            synchronized (hostPeersLock) {
                return !hostPeers.isEmpty();
            }
        }
        Socket socket = peerSocket;
        return socket != null && socket.isConnected() && !socket.isClosed();
    }

    public boolean isHosting() {
        return hosting;
    }

    static int maxHostPeers() {
        return MAX_HOST_PEERS;
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

    static boolean definitelyDifferentPrivateNetworks(String localIp, String hostIp) {
        int localFamily = privateNetworkFamily(localIp);
        int hostFamily = privateNetworkFamily(hostIp);
        return localFamily != 0 && hostFamily != 0 && localFamily != hostFamily;
    }

    static int privateNetworkFamily(String ip) {
        if (ip == null) return 0;
        String[] p = ip.trim().split("\\.");
        if (p.length != 4) return 0;
        try {
            int a = Integer.parseInt(p[0]);
            int b = Integer.parseInt(p[1]);
            if (a == 10) return 10;
            if (a == 192 && b == 168) return 192;
            if (a == 172 && b >= 16 && b <= 31) return 172;
        } catch (NumberFormatException ignored) {
        }
        return 0;
    }

    private boolean performHostHandshake(Socket socket, String expectedCode) {
        try {
            socket.setSoTimeout(CONNECT_TIMEOUT_MS);
            DataInputStream in = new DataInputStream(socket.getInputStream());
            DataOutputStream out = new DataOutputStream(socket.getOutputStream());
            String hello = in.readUTF();
            if (!matchesHandshake(hello, expectedCode, appVersion)) {
                out.writeUTF(hello != null && hello.startsWith("HELLO:" + expectedCode + ":") ?
                        "VERSION:" + appVersion : "DENY");
                out.flush();
                return false;
            }
            synchronized (hostPeersLock) {
                if (hostPeers.size() >= MAX_HOST_PEERS) {
                    out.writeUTF("FULL");
                    out.flush();
                    return false;
                }
            }
            out.writeUTF("OK");
            out.flush();
            socket.setSoTimeout(0);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private void readHostPeerLoop(HostPeer peer, int gen) {
        String closeType = "LOOP_END";
        String closeReason = "Połączenie uczestnika zostało zakończone.";
        try {
            DataInputStream in = new DataInputStream(peer.socket.getInputStream());
            while (gen == generation.get() && !peer.socket.isClosed()) {
                String message = in.readUTF();
                if (message != null && !message.isEmpty()) {
                    long now = System.currentTimeMillis();
                    peer.lastRxAtMs = now;
                    peer.rxCount++;
                    lastRxAtMs = now;
                    rxCount.incrementAndGet();
                    lastRemote = peer.remote;
                    emitMessage(message);
                }
            }
        } catch (EOFException e) {
            closeType = "EOF";
            closeReason = "Uczestnik zamknął strumień TCP.";
        } catch (SocketException e) {
            closeType = "SOCKET_EXCEPTION";
            closeReason = safeMessage(e);
        } catch (IOException e) {
            closeType = "IO_ERROR";
            closeReason = safeMessage(e);
        } finally {
            if (gen == generation.get() && !shuttingDown) {
                rememberClose(closeType, closeReason);
                emitStatus("disconnected_peer", closeType + ": " + closeReason);
            }
            removeHostPeer(peer);
            if (gen == generation.get() && !shuttingDown && hosting) {
                if (hostPeerCount() == 0) emitStatus("waiting", getLocalIp());
                else emitStatus("connected", "host");
            }
        }
    }

    private void readGuestLoop(Socket socket, DataInputStream in, int gen) {
        String closeType = "LOOP_END";
        String closeReason = "Połączenie z gospodarzem zostało zakończone.";
        try {
            while (gen == generation.get() && !socket.isClosed()) {
                String message = in.readUTF();
                if (message != null && !message.isEmpty()) {
                    long now = System.currentTimeMillis();
                    lastRxAtMs = now;
                    rxCount.incrementAndGet();
                    lastRemote = String.valueOf(socket.getRemoteSocketAddress());
                    emitMessage(message);
                }
            }
        } catch (EOFException e) {
            closeType = "EOF";
            closeReason = "Gospodarz zamknął strumień TCP.";
        } catch (SocketException e) {
            closeType = "SOCKET_EXCEPTION";
            closeReason = safeMessage(e);
        } catch (IOException e) {
            closeType = "IO_ERROR";
            closeReason = safeMessage(e);
        } finally {
            synchronized (this) {
                if (peerSocket == socket) closeGuestPeerOnly();
            }
            if (gen == generation.get() && !shuttingDown) {
                rememberClose(closeType, closeReason);
                emitStatus("disconnected", closeType + ": " + closeReason);
            }
        }
    }

    private int hostPeerCount() {
        synchronized (hostPeersLock) {
            return hostPeers.size();
        }
    }

    private void removeHostPeer(HostPeer peer) {
        boolean removed;
        synchronized (hostPeersLock) {
            removed = hostPeers.remove(peer);
        }
        if (removed) closeHostPeer(peer);
    }

    private void closeHostPeer(HostPeer peer) {
        if (peer == null) return;
        closeQuietly(peer.out);
        closeQuietly(peer.socket);
    }

    private void closeAllHostPeers() {
        List<HostPeer> peers;
        synchronized (hostPeersLock) {
            peers = new ArrayList<>(hostPeers);
            hostPeers.clear();
        }
        for (HostPeer peer : peers) closeHostPeer(peer);
    }

    private synchronized void closeGuestPeerOnly() {
        closeQuietly(peerOut);
        closeQuietly(peerSocket);
        peerOut = null;
        peerSocket = null;
    }

    private synchronized void disconnectInternal(boolean notify) {
        generation.incrementAndGet();
        closeGuestPeerOnly();
        closeAllHostPeers();
        closeQuietly(serverSocket);
        serverSocket = null;
        hosting = false;
        sessionCode = "";
        if (notify && !shuttingDown) {
            rememberClose("MANUAL", "Rozłączono ręcznie.");
            emitStatus("disconnected", "MANUAL: Rozłączono ręcznie.");
        }
    }

    private void rememberClose(String type, String reason) {
        lastCloseType = type == null ? "" : type;
        lastCloseReason = reason == null ? "" : reason;
        lastCloseAtMs = System.currentTimeMillis();
    }

    public String diagnosticsJson() {
        try {
            JSONObject root = new JSONObject();
            root.put("hosting", hosting);
            root.put("connected", isConnected());
            root.put("localIp", getLocalIp());
            root.put("remote", lastRemote);
            root.put("connectedAt", connectedAtMs);
            root.put("lastRx", lastRxAtMs);
            root.put("lastTx", lastTxAtMs);
            root.put("rxCount", rxCount.get());
            root.put("txCount", txCount.get());
            root.put("lastCloseType", lastCloseType);
            root.put("lastCloseReason", lastCloseReason);
            root.put("lastCloseAt", lastCloseAtMs);
            root.put("peerCount", hostPeerCount());
            JSONArray peers = new JSONArray();
            synchronized (hostPeersLock) {
                for (HostPeer peer : hostPeers) {
                    JSONObject p = new JSONObject();
                    p.put("remote", peer.remote);
                    p.put("closed", peer.socket.isClosed());
                    p.put("lastRx", peer.lastRxAtMs);
                    p.put("lastTx", peer.lastTxAtMs);
                    p.put("rxCount", peer.rxCount);
                    p.put("txCount", peer.txCount);
                    peers.put(p);
                }
            }
            root.put("peers", peers);
            return root.toString();
        } catch (Exception e) {
            return "{}";
        }
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
