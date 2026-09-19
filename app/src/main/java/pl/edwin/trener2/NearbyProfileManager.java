package pl.edwin.trener2;

import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.*;
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.*;
import javax.crypto.spec.*;

public final class NearbyProfileManager {
    public interface Listener { void onEvent(String json); }
    private static final String SERVICE="_trener2._tcp.", PREF="trener2_nearby_v087";
    private static final int MAX_LINE=2500000, MAX_DATA=1700000;
    private static final int B64=Base64.NO_WRAP;
    private final Context ctx;
    private final Listener listener;
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ExecutorService io=Executors.newCachedThreadPool();
    private final NsdManager nsd;
    private final Map<String,Peer> online=new HashMap<>();
    private final Map<String,CountDownLatch> waits=new HashMap<>();
    private final Map<String,Boolean> accepted=new HashMap<>();
    private ServerSocket server;
    private NsdManager.RegistrationListener registration;
    private NsdManager.DiscoveryListener discovery;
    private WifiManager.MulticastLock multicast;
    private volatile boolean active=false;
    private volatile String self="",name="";

    private static class Peer {
        final String id,name;
        final InetAddress host;
        final int port;
        final String instance;
        Peer(String id,String name,InetAddress host,int port,String instance){
            this.id=id;this.name=name;this.host=host;this.port=port;this.instance=instance;
        }
    }
    public NearbyProfileManager(Context c,Listener l){
        ctx=c;listener=l;nsd=(NsdManager)c.getSystemService(Context.NSD_SERVICE);
    }
    private SharedPreferences pref(){return ctx.getSharedPreferences(PREF,Context.MODE_PRIVATE);}
    private static boolean valid(String id){return id!=null&&id.matches("[A-Za-z0-9:_-]{5,128}");}
    private static String clip(String v,int n){
        v=v==null?"":v.trim();return v.length()>n?v.substring(0,n):v;
    }
    private static String b64(byte[] v){return Base64.encodeToString(v,B64);}
    private static byte[] un64(String v){return Base64.decode(v,B64);}
    private void event(JSONObject o){if(active)listener.onEvent(o.toString());}
    private void status(String msg){
        try{event(new JSONObject().put("type","status").put("text",msg));}catch(Exception ignored){}
    }
    private void onlineEvent(){
        JSONArray arr=new JSONArray();
        synchronized(online){
            for(Peer p:online.values()){
                try{arr.put(new JSONObject().put("id",p.id).put("name",p.name));}
                catch(Exception ignored){}
            }
        }
        try{event(new JSONObject().put("type","online").put("peers",arr));}catch(Exception ignored){}
    }
    public String pairs(){
        JSONArray arr=new JSONArray();SharedPreferences p=pref();
        for(String key:p.getAll().keySet()){
            if(!key.startsWith("secret."))continue;
            String id=key.substring(7);if(!valid(id))continue;
            try{arr.put(new JSONObject().put("id",id).put("name",p.getString("name."+id,""))
                .put("alias",p.getString("alias."+id,""))
                .put("outgoing",p.getBoolean("outgoing."+id,false)));}catch(Exception ignored){}
        }
        return arr.toString();
    }
    public synchronized void start(String id,String display){
        if(!valid(id)){status("Brak identyfikatora profilu.");return;}
        display=clip(display,40);
        if(display.isEmpty())display="Trener 2";
        if(active&&self.equals(id)&&name.equals(display)){onlineEvent();return;}
        if(active)stop();
        if(nsd==null){listener.onEvent("{\"type\":\"status\",\"text\":\"Brak wykrywania LAN.\"}");return;}
        self=id;name=display;active=true;
        try{
            server=new ServerSocket(0);
            WifiManager wifi=(WifiManager)ctx.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if(wifi!=null){
                multicast=wifi.createMulticastLock("Trener2-nearby");
                multicast.setReferenceCounted(false);multicast.acquire();
            }
            final ServerSocket socket=server;
            io.execute(()->{
                while(active&&!socket.isClosed()){
                    try{
                        Socket peer=socket.accept();peer.setSoTimeout(76000);
                        io.execute(()->serve(peer));
                    }catch(IOException e){break;}
                }
            });
            int port=server.getLocalPort();main.post(()->register(port));
        }catch(Exception e){status("Nie udało się włączyć sieci lokalnej.");stop();}
    }
    private void register(int port){
        if(!active)return;
        try{
            NsdServiceInfo info=new NsdServiceInfo();
            info.setServiceName("Trener2-"+self.replaceAll("[^A-Za-z0-9]","").substring(0,
                Math.min(12,self.replaceAll("[^A-Za-z0-9]","").length())));
            info.setServiceType(SERVICE);info.setPort(port);
            info.setAttribute("pid",self);info.setAttribute("name",name);
            registration=new NsdManager.RegistrationListener(){
                public void onRegistrationFailed(NsdServiceInfo i,int c){status("Nie można udostępnić profilu w sieci.");}
                public void onUnregistrationFailed(NsdServiceInfo i,int c){}
                public void onServiceRegistered(NsdServiceInfo i){status("Szukam Trenera 2 w sieci…");}
                public void onServiceUnregistered(NsdServiceInfo i){}
            };
            nsd.registerService(info,NsdManager.PROTOCOL_DNS_SD,registration);
            discovery=new NsdManager.DiscoveryListener(){
                public void onDiscoveryStarted(String t){}
                public void onStartDiscoveryFailed(String t,int c){status("Sieć blokuje wyszukiwanie.");}
                public void onStopDiscoveryFailed(String t,int c){}
                public void onDiscoveryStopped(String t){}
                public void onServiceFound(NsdServiceInfo found){
                    if(!active||!found.getServiceType().contains("_trener2._tcp"))return;
                    try{nsd.resolveService(found,new NsdManager.ResolveListener(){
                        public void onResolveFailed(NsdServiceInfo i,int c){}
                        public void onServiceResolved(NsdServiceInfo i){
                            try{
                                byte[] raw=i.getAttributes().get("pid");
                                if(raw==null)return;
                                String id=new String(raw,StandardCharsets.UTF_8);
                                if(!valid(id)||id.equals(self)||i.getHost()==null||i.getPort()<1)return;
                                byte[] label=i.getAttributes().get("name");
                                String text=label==null?"Trener 2":clip(new String(label,StandardCharsets.UTF_8),40);
                                synchronized(online){online.put(id,new Peer(id,text,i.getHost(),i.getPort(),i.getServiceName()));}
                                onlineEvent();
                            }catch(Exception ignored){}
                        }
                    });}catch(Exception ignored){}
                }
                public void onServiceLost(NsdServiceInfo info){
                    synchronized(online){online.values().removeIf(p->p.instance.equals(info.getServiceName()));}
                    onlineEvent();
                }
            };
            nsd.discoverServices(SERVICE,NsdManager.PROTOCOL_DNS_SD,discovery);
        }catch(Exception e){status("Nie udało się wyszukiwać telefonów.");}
    }
    public synchronized void stop(){
        active=false;try{if(server!=null)server.close();}catch(Exception ignored){}
        server=null;
        final NsdManager.DiscoveryListener d=discovery;
        final NsdManager.RegistrationListener r=registration;
        discovery=null;registration=null;
        main.post(()->{
            if(d!=null)try{nsd.stopServiceDiscovery(d);}catch(Exception ignored){}
            if(r!=null)try{nsd.unregisterService(r);}catch(Exception ignored){}
        });
        try{if(multicast!=null&&multicast.isHeld())multicast.release();}catch(Exception ignored){}
        multicast=null;
        synchronized(online){online.clear();}
        synchronized(waits){waits.values().forEach(CountDownLatch::countDown);waits.clear();accepted.clear();}
    }
    public void shutdown(){stop();io.shutdownNow();}
    private static String read(BufferedReader in)throws IOException{
        StringBuilder result=new StringBuilder();
        int c;
        while((c=in.read())!=-1){
            if(c=='\n')return result.toString();
            if(c!='\r')result.append((char)c);
            if(result.length()>MAX_LINE)throw new IOException("Za duża wiadomość.");
        }
        throw new IOException("Przerwano połączenie.");
    }
    private static void write(BufferedWriter out,JSONObject o)throws IOException{
        out.write(o.toString());out.write('\n');out.flush();
    }
    private static KeyPair pairKey()throws Exception{
        KeyPairGenerator g=KeyPairGenerator.getInstance("EC");
        g.initialize(new ECGenParameterSpec("secp256r1"));return g.generateKeyPair();
    }
    private static byte[] secret(KeyPair key,String publicKey,String a,String b)throws Exception{
        PublicKey remote=KeyFactory.getInstance("EC").generatePublic(
            new X509EncodedKeySpec(un64(publicKey)));
        KeyAgreement agreement=KeyAgreement.getInstance("ECDH");
        agreement.init(key.getPrivate());agreement.doPhase(remote,true);
        String ids=a.compareTo(b)<0?a+"|"+b:b+"|"+a;
        MessageDigest dig=MessageDigest.getInstance("SHA-256");
        dig.update(("Trener2-v087|"+ids).getBytes(StandardCharsets.UTF_8));
        return dig.digest(agreement.generateSecret());
    }
    private static String code(byte[] secret)throws Exception{
        byte[] d=MessageDigest.getInstance("SHA-256").digest(secret);
        int n=((d[0]&255)<<16)|((d[1]&255)<<8)|(d[2]&255);
        return String.format(java.util.Locale.ROOT,"%06d",n%1000000);
    }
    private static String proof(byte[] key,String purpose)throws Exception{
        Mac mac=Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key,"HmacSHA256"));
        return b64(mac.doFinal(purpose.getBytes(StandardCharsets.UTF_8)));
    }
    private boolean approve(String person,String pin){
        CountDownLatch latch=new CountDownLatch(1);
        final boolean[] yes={false};
        main.post(()->new AlertDialog.Builder(ctx)
            .setTitle("Powiąż profile Trenera 2")
            .setMessage("Profil: "+person+"\nKod: "+pin+
                "\n\nSprawdź, czy oba telefony pokazują ten sam kod. Nie wpisujesz go.")
            .setPositiveButton("KODY ZGODNE",(d,w)->{yes[0]=true;latch.countDown();})
            .setNegativeButton("ODRZUĆ",(d,w)->latch.countDown())
            .setOnCancelListener(d->latch.countDown()).show());
        try{return latch.await(65,TimeUnit.SECONDS)&&yes[0];}
        catch(InterruptedException e){Thread.currentThread().interrupt();return false;}
    }
    private byte[] savedSecret(String id){
        try{
            byte[] key=un64(pref().getString("secret."+id,""));
            return key.length==32?key:null;
        }catch(Exception e){return null;}
    }
    private void savePair(String id,String display,String alias,byte[] key,boolean outgoing){
        pref().edit().putString("secret."+id,b64(key))
            .putString("name."+id,display).putString("alias."+id,alias)
            .putBoolean("outgoing."+id,outgoing).apply();
        try{event(new JSONObject().put("type","paired").put("id",id)
            .put("name",display).put("alias",alias));}catch(Exception ignored){}
    }
    public void pair(String id,String alias){
        if(!valid(id)||!valid(alias))return;
        io.execute(()->{
            Peer p;synchronized(online){p=online.get(id);}
            if(p==null){status("Drugi telefon nie jest teraz dostępny.");return;}
            try(Socket socket=new Socket()){
                socket.connect(new InetSocketAddress(p.host,p.port),6000);
                socket.setSoTimeout(76000);
                BufferedReader in=new BufferedReader(new InputStreamReader(socket.getInputStream(),StandardCharsets.UTF_8));
                BufferedWriter out=new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(),StandardCharsets.UTF_8));
                KeyPair mine=pairKey();
                write(out,new JSONObject().put("kind","PAIR").put("id",self)
                    .put("name",name).put("alias",alias).put("pub",b64(mine.getPublic().getEncoded())));
                JSONObject reply=new JSONObject(read(in));
                if(!"CHALLENGE".equals(reply.optString("kind"))||!id.equals(reply.optString("id")))
                    throw new IOException("Niepasujący profil.");
                byte[] key=secret(mine,reply.getString("pub"),self,id);
                boolean ok=approve(p.name,code(key));
                write(out,new JSONObject().put("kind",ok?"CONFIRM":"DECLINE")
                    .put("proof",ok?proof(key,"initiator|"+self+"|"+id):""));
                if(!ok)return;
                JSONObject ack=new JSONObject(read(in));
                if(!"PAIRED".equals(ack.optString("kind"))||
                    !MessageDigest.isEqual(un64(ack.optString("proof")),
                      un64(proof(key,"responder|"+id+"|"+self))))
                    throw new IOException("Druga osoba nie potwierdziła powiązania.");
                savePair(id,clip(reply.optString("name"),40),alias,key,true);
            }catch(Exception e){status("Nie powiązano profili: "+clip(e.getMessage(),65));}
        });
    }
    private void serve(Socket socket){
        try(Socket s=socket){
            BufferedReader in=new BufferedReader(new InputStreamReader(s.getInputStream(),StandardCharsets.UTF_8));
            BufferedWriter out=new BufferedWriter(new OutputStreamWriter(s.getOutputStream(),StandardCharsets.UTF_8));
            JSONObject request=new JSONObject(read(in));
            if("PAIR".equals(request.optString("kind")))receivePair(request,in,out);
            if("TRANSFER".equals(request.optString("kind")))receiveTransfer(request,out);
        }catch(Exception ignored){}
    }
    private void receivePair(JSONObject req,BufferedReader in,BufferedWriter out)throws Exception{
        String sender=req.optString("id"),alias=req.optString("alias");
        if(!valid(sender)||!valid(alias)||sender.equals(self))return;
        KeyPair mine=pairKey();
        byte[] key=secret(mine,req.getString("pub"),sender,self);
        String display=clip(req.optString("name"),40);
        write(out,new JSONObject().put("kind","CHALLENGE").put("id",self)
            .put("name",name).put("pub",b64(mine.getPublic().getEncoded())));
        boolean ok=approve(display,code(key));
        JSONObject confirm=new JSONObject(read(in));
        if(!ok||!"CONFIRM".equals(confirm.optString("kind"))||
            !MessageDigest.isEqual(un64(confirm.optString("proof")),
              un64(proof(key,"initiator|"+sender+"|"+self))))return;
        write(out,new JSONObject().put("kind","PAIRED")
            .put("proof",proof(key,"responder|"+self+"|"+sender)));
        savePair(sender,display,alias,key,false);
    }
    private static String encrypt(byte[] key,String plain,String from,String to)throws Exception{
        byte[] iv=new byte[12];new SecureRandom().nextBytes(iv);
        Cipher c=Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,iv));
        c.updateAAD((from+"|"+to).getBytes(StandardCharsets.UTF_8));
        byte[] bytes=c.doFinal(plain.getBytes(StandardCharsets.UTF_8));
        byte[] out=new byte[iv.length+bytes.length];
        System.arraycopy(iv,0,out,0,12);System.arraycopy(bytes,0,out,12,bytes.length);
        return b64(out);
    }
    private static String decrypt(byte[] key,String raw,String from,String to)throws Exception{
        byte[] all=un64(raw);if(all.length<29||all.length>MAX_DATA+64)throw new IOException("Za duży wynik.");
        Cipher c=Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE,new SecretKeySpec(key,"AES"),
            new GCMParameterSpec(128,Arrays.copyOf(all,12)));
        c.updateAAD((from+"|"+to).getBytes(StandardCharsets.UTF_8));
        return new String(c.doFinal(all,12,all.length-12),StandardCharsets.UTF_8);
    }
    private void receiveTransfer(JSONObject req,BufferedWriter out)throws Exception{
        String from=req.optString("id"),to=req.optString("to"),job=req.optString("job");
        if(!valid(from)||!valid(job)||!self.equals(to))return;
        byte[] key=savedSecret(from);if(key==null)return;
        JSONObject bundle=new JSONObject(decrypt(key,req.optString("payload"),from,to));
        if(!pref().getString("alias."+from,"").equals(bundle.optString("originParticipantId")))return;
        // A phone that initiated pairing may hold an alias for another person.
        // It must not silently import that person's sets into its own progress.
        if(pref().getBoolean("outgoing."+from,false)
            && !self.equals(bundle.optString("originParticipantId")))return;
        CountDownLatch latch=new CountDownLatch(1);
        synchronized(waits){waits.put(job,latch);accepted.put(job,false);}
        try{
            event(new JSONObject().put("type","incoming").put("peerId",from)
                .put("jobId",job).put("bundle",bundle));
            boolean ok=latch.await(35,TimeUnit.SECONDS);
            synchronized(waits){ok=ok&&Boolean.TRUE.equals(accepted.get(job));}
            write(out,new JSONObject().put("kind","ACK").put("job",job).put("ok",ok)
                .put("proof",proof(key,(ok?"ok|":"no|")+job)));
        }finally{synchronized(waits){waits.remove(job);accepted.remove(job);}}
    }
    public void ack(String job,boolean ok){
        synchronized(waits){
            CountDownLatch latch=waits.get(job);
            if(latch!=null){accepted.put(job,ok);latch.countDown();}
        }
    }
    private void sent(String id,String job,boolean ok,String reason){
        try{event(new JSONObject().put("type","sent").put("peerId",id).put("jobId",job)
            .put("ok",ok).put("reason",reason));}catch(Exception ignored){}
    }
    public void send(String id,String payload,String job){
        if(!valid(id)||!valid(job)||payload==null||payload.length()>MAX_DATA)return;
        io.execute(()->{
            Peer p;synchronized(online){p=online.get(id);}
            if(p==null){sent(id,job,false,"Telefon poza siecią.");return;}
            byte[] key=savedSecret(id);if(key==null){sent(id,job,false,"Najpierw powiąż profile.");return;}
            try(Socket socket=new Socket()){
                socket.connect(new InetSocketAddress(p.host,p.port),6000);
                socket.setSoTimeout(49000);
                BufferedReader in=new BufferedReader(new InputStreamReader(socket.getInputStream(),StandardCharsets.UTF_8));
                BufferedWriter out=new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(),StandardCharsets.UTF_8));
                write(out,new JSONObject().put("kind","TRANSFER").put("id",self).put("to",id)
                    .put("job",job).put("payload",encrypt(key,payload,self,id)));
                JSONObject response=new JSONObject(read(in));
                boolean ok="ACK".equals(response.optString("kind"))&&job.equals(response.optString("job"))
                  &&MessageDigest.isEqual(un64(response.optString("proof")),
                    un64(proof(key,(response.optBoolean("ok")?"ok|":"no|")+job)))
                  &&response.optBoolean("ok");
                sent(id,job,ok,ok?"Wynik odebrany.":"Drugi telefon nie potwierdził zapisu.");
            }catch(Exception e){sent(id,job,false,"Wynik czeka na ponowne połączenie.");}
        });
    }
}
