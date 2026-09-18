(function(){
  'use strict';

  const KEY='trainer3.sharedBlackbox.v0825';
  const MAX_SESSIONS=10;
  const MAX_EVENTS=1500;
  const MAX_BYTES=2500000;
  const HEARTBEAT_MS=3000;
  const HEARTBEAT_TIMEOUT_MS=9000;
  const RETRY_DELAYS=[1000,2000,5000,10000];
  const MAX_INITIAL_RETRIES=4;
  const $=id=>document.getElementById(id);

  const runtime={
    currentId:'',
    flushTimer:0,
    lastRxAt:0,
    lastTxAt:0,
    lastPongAt:0,
    lastHeartbeatSentAt:0,
    lastHeartbeatLogAt:0,
    lastRtt:null,
    seq:0,
    reconnectAttempt:0,
    reconnectTimer:0,
    reconnecting:false,
    reconnectReason:'',
    manualDisconnect:false,
    everConnected:false,
    initialJoinArmed:false,
    creds:{role:'',hostIp:'',code:''},
    wrappedStatus:false,
    wrappedMessage:false,
    wrappedSend:false,
    prevRunning:false,
    prevShared:false,
    prevQueueKey:'',
    messageKeys:{},
    prevConnectionKey:'',
    hostPeerBeats:{},
    stalePeers:{},
    networkAvailable:null,
    lastLocalIp:'',
    networkLostAt:0,
    networkRestoredAt:0,
    hostRestartPending:false,
    hostRestartInFlight:false,
    lastHostRestartAt:0,
    booted:false
  };

  function safe(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
  function clone(v,fallback){try{return JSON.parse(JSON.stringify(v))}catch(e){return fallback}}
  function appVersion(){try{return window.Android&&Android.getAppVersion?String(Android.getAppVersion()):'web'}catch(e){return 'unknown'}}
  function now(){return Date.now()}
  function iso(t){return new Date(Number(t)||Date.now()).toISOString()}
  function group(){try{return window.TrenerGroup||null}catch(e){return null}}
  function queue(){try{return window.TrenerBeta070||null}catch(e){return null}}
  function localDeviceId(){try{return String(group()?.deviceId||localStorage.getItem('trainer3.participantId')||'')}catch(e){return ''}}
  function nativeDiag(){
    try{
      if(window.Android&&typeof Android.wifiDiagnostics==='function'){
        const x=safe(Android.wifiDiagnostics(),{});
        return x&&typeof x==='object'?x:{};
      }
    }catch(e){}
    return {};
  }
  function sharedActive(){
    try{return !!(running&&net?.active&&group()?.groupSession)}catch(e){return false}
  }
  function runningNow(){try{return !!running}catch(e){return false}}
  function connectedNow(){try{return !!net?.connected}catch(e){return false}}
  function validLocalIp(ip){
    const s=String(ip||'').trim();
    if(!/^(\d{1,3}\.){3}\d{1,3}$/.test(s))return false;
    return s.split('.').every(x=>{const n=Number(x);return Number.isInteger(n)&&n>=0&&n<=255});
  }
  function roleNow(){try{return String(net?.role||'')}catch(e){return ''}}
  function sessionId(){try{return String(net?.sessionId||queue()?.sessionId||'')}catch(e){return ''}}
  function revNow(){try{return Number(queue()?.rev)||0}catch(e){return 0}}
  function participantVersions(){
    try{
      return (group()?.participants||[]).map(p=>({
        index:Number(p?.index)||0,
        name:String(p?.name||''),
        deviceId:String(p?.deviceId||''),
        version:String(p?.version||'')
      }));
    }catch(e){return []}
  }
  function hashText(s){
    let h=5381;
    for(let i=0;i<s.length;i++)h=((h<<5)+h)^s.charCodeAt(i);
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function planSnapshot(){
    try{
      const plan=clone(currentPlan,null);
      const json=JSON.stringify(plan||{});
      return {
        planKey:String(typeof planKey!=='undefined'?planKey:''),
        title:String(plan?.title||''),
        hash:hashText(json),
        plan
      };
    }catch(e){return {planKey:'',title:'',hash:'',plan:null}}
  }
  function maskCode(code){
    const s=String(code||'');
    return /^\d{6}$/.test(s)?'******':'';
  }

  function loadDb(){
    const db=safe(localStorage.getItem(KEY),null);
    if(!db||!Array.isArray(db.sessions))return {schemaVersion:1,sessions:[]};
    return db;
  }
  let db=loadDb();

  function currentSession(){
    if(!runtime.currentId)return null;
    return db.sessions.find(s=>s.id===runtime.currentId)||null;
  }
  function commonState(){
    let ex=0,set=0,athlete=0,turn=null,status='';
    try{ex=Number(exIdx)||0;set=Number(setIdx)||0}catch(e){}
    try{athlete=Number(net?.localAthlete)||0;status=String(net?.status||'')}catch(e){}
    try{turn=queue()?.turn===undefined?null:Number(queue().turn)}catch(e){}
    const t=now();
    return {
      role:roleNow(),
      status,
      connected:connectedNow(),
      shared:sharedActive(),
      running:runningNow(),
      sessionId:sessionId(),
      rev:revNow(),
      exercise:ex,
      set,
      athlete,
      turn,
      lastRxAge:runtime.lastRxAt?Math.max(0,t-runtime.lastRxAt):null,
      lastTxAge:runtime.lastTxAt?Math.max(0,t-runtime.lastTxAt):null,
      heartbeatAge:runtime.lastPongAt?Math.max(0,t-runtime.lastPongAt):null
    };
  }

  function ensureSession(reason){
    let s=currentSession();
    if(s)return s;
    const t=now();
    s={
      id:'bb-'+t.toString(36)+'-'+Math.random().toString(36).slice(2,7),
      schemaVersion:1,
      startedAt:t,
      startedIso:iso(t),
      appVersion:appVersion(),
      initialRole:roleNow(),
      startReason:String(reason||'connection'),
      deviceId:localDeviceId(),
      hostIp:String(runtime.creds.hostIp||''),
      codeMasked:maskCode(runtime.creds.code),
      events:[]
    };
    db.sessions.push(s);
    db.sessions=db.sessions.slice(-MAX_SESSIONS);
    runtime.currentId=s.id;
    return s;
  }

  function trimDb(){
    db.sessions=db.sessions.slice(-MAX_SESSIONS);
    db.sessions.forEach(s=>{
      if(!Array.isArray(s.events))s.events=[];
      if(s.events.length>MAX_EVENTS)s.events=s.events.slice(-MAX_EVENTS);
    });
    let raw='';
    try{raw=JSON.stringify(db)}catch(e){raw=''}
    let guard=0;
    while(raw.length>MAX_BYTES&&db.sessions.length&&guard++<100){
      let target=db.sessions[0];
      if(target.events&&target.events.length>120){
        target.events.splice(0,Math.min(120,target.events.length-120));
      }else if(db.sessions.length>1){
        const removed=db.sessions.shift();
        if(removed?.id===runtime.currentId)runtime.currentId='';
      }else if(target.events&&target.events.length>20){
        target.events.splice(0,Math.min(50,target.events.length-20));
      }else break;
      try{raw=JSON.stringify(db)}catch(e){break}
    }
    return raw||JSON.stringify({schemaVersion:1,sessions:[]});
  }

  function flush(immediate){
    const doFlush=()=>{
      runtime.flushTimer=0;
      try{localStorage.setItem(KEY,trimDb())}catch(e){}
      updateUi();
    };
    if(immediate){clearTimeout(runtime.flushTimer);doFlush();return}
    if(runtime.flushTimer)return;
    runtime.flushTimer=setTimeout(doFlush,700);
  }

  function log(event,data,important){
    const s=ensureSession(event);
    const t=now();
    s.events.push({
      at:t,
      iso:iso(t),
      event:String(event||'EVENT'),
      state:commonState(),
      data:data||{}
    });
    if(s.events.length>MAX_EVENTS)s.events=s.events.slice(-MAX_EVENTS);
    s.updatedAt=t;
    flush(!!important);
    if(important||/ERROR|TIMEOUT|RECONNECT|CONNECTED|DISCONNECT|WORKOUT_(START|END)|SESSION_CLOSE/.test(String(event||''))){
      try{window.TrenerDiagnostics?.log?.('SHARED',String(event||''),data||{})}catch(e){}
    }
  }

  function closeSession(reason){
    const s=currentSession();
    if(!s)return;
    log('SESSION_CLOSE',{reason:String(reason||'closed'),native:nativeDiag()},true);
    s.endedAt=now();
    s.endedIso=iso(s.endedAt);
    s.endReason=String(reason||'closed');
    flush(true);
    runtime.currentId='';
  }

  function captureCreds(){
    const role=roleNow();
    if(role==='guest'){
      const ip=String($('joinIp')?.value||runtime.creds.hostIp||'').trim();
      const code=String($('joinCode')?.value||runtime.creds.code||'').trim();
      if(/^(\d{1,3}\.){3}\d{1,3}$/.test(ip))runtime.creds.hostIp=ip;
      if(/^\d{6}$/.test(code))runtime.creds.code=code;
      runtime.creds.role='guest';
    }else if(role==='host'){
      const code=String($('hostCode')?.value||runtime.creds.code||'').trim();
      if(/^\d{6}$/.test(code))runtime.creds.code=code;
      runtime.creds.role='host';
    }
  }

  function fatalReason(detail){
    const s=String(detail||'')+' '+String(net?.lastError||'');
    return /Niezgodna wersja|Błędny kod|Sesja jest pełna|Kod sesji musi mieć 6 cyfr|różnych sieciach|Połącz ten telefon z tym samym Wi-Fi|Włącz Wi-Fi albo hotspot|DENY|FULL/i.test(s);
  }
  function canReconnectGuest(){
    return roleNow()==='guest'&&(runtime.everConnected||runtime.initialJoinArmed)&&
      !runtime.manualDisconnect&&!fatalReason(runtime.reconnectReason)&&
      runtime.networkAvailable!==false&&
      /^(\d{1,3}\.){3}\d{1,3}$/.test(runtime.creds.hostIp)&&/^\d{6}$/.test(runtime.creds.code);
  }
  function canRestartHost(){
    return roleNow()==='host'&&!runtime.manualDisconnect&&/^\d{6}$/.test(runtime.creds.code)&&
      (sharedActive()||runningNow()||runtime.everConnected);
  }
  function retryDelay(){
    const i=Math.max(0,runtime.reconnectAttempt-1);
    return RETRY_DELAYS[Math.min(i,RETRY_DELAYS.length-1)];
  }
  function cancelReconnect(){
    if(runtime.reconnectTimer){clearTimeout(runtime.reconnectTimer);runtime.reconnectTimer=0}
    runtime.reconnecting=false;
    runtime.reconnectReason='';
    runtime.reconnectAttempt=0;
  }
  function paintReconnect(){
    const b=$('v0825ReconnectBanner');
    if(!b)return;
    if(runtime.networkAvailable===false&&roleNow()==='host'){
      b.classList.remove('hidden');
      b.textContent='HOST — BRAK SIECI WI‑FI. CZEKAM NA POWRÓT POŁĄCZENIA';
    }else if(runtime.hostRestartInFlight&&roleNow()==='host'){
      b.classList.remove('hidden');
      b.textContent='HOST — SIEĆ WRÓCIŁA. PRZYWRACAM SESJĘ…';
    }else if(runtime.reconnecting&&roleNow()==='guest'){
      b.classList.remove('hidden');
      b.textContent=(runningNow()?'WSPÓLNY TRENING WSTRZYMANY — ':'')+'RECONNECT… próba '+runtime.reconnectAttempt;
    }else if(runtime.everConnected&&roleNow()==='host'&&!connectedNow()){
      b.classList.remove('hidden');
      b.textContent='PARTNER ROZŁĄCZONY — CZEKAM NA PONOWNE POŁĄCZENIE';
    }else{
      b.classList.add('hidden');
      b.textContent='';
    }
  }
  function setReconnectUi(){
    try{
      if(runtime.reconnecting){
        net.connected=false;
        net.status='reconnecting';
        if(typeof updateWifiUi==='function')updateWifiUi();
      }
    }catch(e){}
    paintReconnect();
  }

  function setLocalIpUi(ip){
    const el=$('localIp');
    if(el)el.textContent=validLocalIp(ip)?String(ip):'—';
  }

  function restartHostAfterNetworkReturn(reason){
    captureCreds();
    if(roleNow()!=='host'||runtime.manualDisconnect||connectedNow())return false;
    if(!/^\d{6}$/.test(runtime.creds.code))return false;
    const diag=nativeDiag();
    if(!validLocalIp(diag.localIp))return false;
    const t=now();
    if(runtime.hostRestartInFlight||t-runtime.lastHostRestartAt<1200)return false;
    runtime.hostRestartPending=false;
    runtime.hostRestartInFlight=true;
    runtime.lastHostRestartAt=t;
    try{
      net.connected=false;
      net.status='restoring';
      net.detail=String(diag.localIp||'');
      if(typeof updateWifiUi==='function')updateWifiUi();
    }catch(e){}
    log('HOST_RESTART_AFTER_NETWORK',{
      reason:String(reason||'network-restored'),
      localIp:String(diag.localIp||''),
      native:diag
    },true);
    try{
      if(window.Android&&Android.wifiHost){
        Android.wifiHost(runtime.creds.code);
        paintReconnect();
        return true;
      }
    }catch(e){
      runtime.hostRestartInFlight=false;
      log('HOST_RESTART_CALL_ERROR',{message:String(e?.message||e),native:nativeDiag()},true);
    }
    return false;
  }

  function monitorNetwork(diag){
    diag=diag&&typeof diag==='object'?diag:nativeDiag();
    const ip=String(diag.localIp||'').trim();
    const available=validLocalIp(ip);
    if(runtime.networkAvailable===null){
      runtime.networkAvailable=available;
      if(available)runtime.lastLocalIp=ip;
      setLocalIpUi(ip);
      return;
    }

    if(!available&&runtime.networkAvailable!==false){
      const previousIp=runtime.lastLocalIp;
      runtime.networkAvailable=false;
      runtime.networkLostAt=now();
      runtime.hostRestartPending=roleNow()==='host'&&!runtime.manualDisconnect&&/^\d{6}$/.test(runtime.creds.code);
      setLocalIpUi('—');
      try{
        if(net?.role){
          net.connected=false;
          net.status='network_lost';
          net.detail='Brak aktywnego adresu Wi‑Fi';
          if(typeof updateWifiUi==='function')updateWifiUi();
        }
      }catch(e){}
      log('NETWORK_LOST',{previousIp,native:diag},true);
      paintReconnect();
      return;
    }

    if(!available&&runtime.networkAvailable===false){
      setLocalIpUi('—');
      try{
        if(roleNow()==='host'&&net.status!=='network_lost'){
          net.connected=false;
          net.status='network_lost';
          net.detail='Brak aktywnego adresu Wi‑Fi';
          if(typeof updateWifiUi==='function')updateWifiUi();
        }
      }catch(e){}
      paintReconnect();
      return;
    }

    if(available&&runtime.networkAvailable===false){
      const lostAt=runtime.networkLostAt||0;
      runtime.networkAvailable=true;
      runtime.networkRestoredAt=now();
      runtime.lastLocalIp=ip;
      setLocalIpUi(ip);
      log('NETWORK_RESTORED',{
        localIp:ip,
        downtimeMs:lostAt?Math.max(0,runtime.networkRestoredAt-lostAt):null,
        native:diag
      },true);

      if(roleNow()==='host'&&runtime.hostRestartPending&&!connectedNow()){
        setTimeout(()=>restartHostAfterNetworkReturn('network-restored'),250);
      }else if(roleNow()==='guest'&&(runtime.everConnected||runtime.initialJoinArmed)&&!connectedNow()&&!runtime.manualDisconnect){
        beginReconnect('network-restored',false);
      }
      paintReconnect();
      return;
    }

    if(available){
      if(runtime.lastLocalIp&&runtime.lastLocalIp!==ip){
        const previousIp=runtime.lastLocalIp;
        runtime.lastLocalIp=ip;
        setLocalIpUi(ip);
        log('NETWORK_IP_CHANGED',{previousIp,localIp:ip,native:diag},true);
        if(roleNow()==='host'&&runtime.everConnected&&!connectedNow()&&!runtime.manualDisconnect){
          runtime.hostRestartPending=true;
          setTimeout(()=>restartHostAfterNetworkReturn('ip-changed'),250);
        }
      }else{
        runtime.lastLocalIp=ip;
        setLocalIpUi(ip);
      }
    }
  }

  function beginReconnect(reason,forceClose){
    runtime.reconnectReason=String(reason||'connection-lost');
    captureCreds();
    if(roleNow()==='guest'&&!canReconnectGuest()){
      log('RECONNECT_NOT_STARTED',{reason:runtime.reconnectReason,fatal:fatalReason(reason),initialJoinArmed:runtime.initialJoinArmed,native:nativeDiag()},true);
      return;
    }
    if(roleNow()==='guest'&&!runtime.everConnected&&runtime.initialJoinArmed&&runtime.reconnectAttempt>=MAX_INITIAL_RETRIES){
      runtime.reconnecting=false;
      runtime.reconnectTimer=0;
      const message='HOST niedostępny po kilku próbach. Sprawdź IP, Wi‑Fi i czy gospodarz nadal czeka na partnera.';
      try{
        net.connected=false;
        net.status='error';
        net.detail=message;
        net.lastError=message;
        if(typeof updateWifiUi==='function')updateWifiUi();
      }catch(e){}
      log('INITIAL_JOIN_RETRIES_EXHAUSTED',{
        attempts:runtime.reconnectAttempt,
        reason:runtime.reconnectReason,
        hostIp:runtime.creds.hostIp,
        native:nativeDiag()
      },true);
      paintReconnect();
      return;
    }
    if(roleNow()==='host'&&!canRestartHost()){
      log('HOST_RESTART_NOT_STARTED',{reason:runtime.reconnectReason,native:nativeDiag()},true);
      return;
    }
    if(!runtime.reconnecting){
      runtime.reconnecting=true;
      runtime.reconnectAttempt=0;
      const initialGuest=roleNow()==='guest'&&!runtime.everConnected&&runtime.initialJoinArmed;
      log(roleNow()==='host'?'HOST_RESTART_BEGIN':(initialGuest?'INITIAL_JOIN_RETRY_BEGIN':'RECONNECT_BEGIN'),{
        reason:runtime.reconnectReason,
        hostIp:initialGuest?runtime.creds.hostIp:'',
        native:nativeDiag()
      },true);
    }
    setReconnectUi();
    if(forceClose){
      try{if(window.Android&&Android.wifiDisconnect)Android.wifiDisconnect()}catch(e){}
    }
    if(runtime.reconnectTimer)return;
    runtime.reconnectAttempt++;
    const delay=retryDelay();
    log(runtime.everConnected?'RECONNECT_SCHEDULED':'INITIAL_JOIN_RETRY_SCHEDULED',{
      attempt:runtime.reconnectAttempt,
      delayMs:delay,
      reason:runtime.reconnectReason,
      hostIp:roleNow()==='guest'?runtime.creds.hostIp:''
    },true);
    runtime.reconnectTimer=setTimeout(()=>{
      runtime.reconnectTimer=0;
      attemptReconnect();
    },delay);
  }

  function attemptReconnect(){
    captureCreds();
    const role=roleNow();
    if(role==='guest'&&!canReconnectGuest()){runtime.reconnecting=false;paintReconnect();return}
    if(role==='host'&&!canRestartHost()){runtime.reconnecting=false;paintReconnect();return}
    setReconnectUi();
    log(role==='host'?'HOST_RESTART_ATTEMPT':'RECONNECT_ATTEMPT',{
      attempt:runtime.reconnectAttempt,
      hostIp:role==='guest'?runtime.creds.hostIp:'',
      native:nativeDiag()
    },true);
    try{
      if(role==='guest'&&window.Android&&Android.wifiJoin){
        Android.wifiJoin(runtime.creds.hostIp,runtime.creds.code);
      }else if(role==='host'&&window.Android&&Android.wifiHost){
        Android.wifiHost(runtime.creds.code);
      }
    }catch(e){
      log('RECONNECT_CALL_ERROR',{message:String(e?.message||e)},true);
      beginReconnect('bridge-error',false);
    }
  }

  function afterConnected(){
    const wasReconnect=runtime.reconnecting;
    cancelReconnect();
    runtime.everConnected=true;
    runtime.initialJoinArmed=false;
    runtime.lastRxAt=now();
    runtime.lastPongAt=runtime.lastRxAt;
    runtime.manualDisconnect=false;
    runtime.hostRestartPending=false;
    runtime.hostRestartInFlight=false;
    const diag=nativeDiag();
    if(validLocalIp(diag.localIp)){
      runtime.networkAvailable=true;
      runtime.lastLocalIp=String(diag.localIp);
      setLocalIpUi(diag.localIp);
    }
    paintReconnect();
    log(wasReconnect?'RECONNECTED':'CONNECTED',{native:nativeDiag(),participants:participantVersions()},true);
    if(wasReconnect){
      setTimeout(()=>{
        try{window.TrenerSyncHistory?.resyncNow?.()}catch(e){}
        try{window.TrenerBeta070Sync?.requestResync?.('v0825-reconnected')}catch(e){}
        log('RESYNC_AFTER_RECONNECT',{native:nativeDiag()},true);
      },300);
      setTimeout(()=>{
        try{window.TrenerBeta070Sync?.requestResync?.('v0825-reconnected-confirm')}catch(e){}
      },1200);
    }
  }

  function summarizeMessage(m){
    if(!m||typeof m!=='object')return {};
    const d={type:String(m.type||'')};
    ['sessionId','rev','exercise','turn','waitUntil','athlete','ex','set','done','uid','knownRev','reason','targetDeviceId','deviceId'].forEach(k=>{
      if(m[k]!==undefined)d[k]=m[k];
    });
    if(Array.isArray(m.participants))d.participants=m.participants.map(p=>({index:p?.index,name:p?.name,deviceId:p?.deviceId,version:p?.version}));
    if(m.record)d.record={athlete:m.record.athlete,ex:m.record.ex,set:m.record.set,kg:m.record.kg,reps:m.record.reps,uid:m.record.uid};
    return d;
  }
  function messageKey(m){
    if(!m)return '';
    if(m.type==='BETA070_STATE'){
      return [m.type,m.rev,m.exercise,m.turn,m.waitUntil,JSON.stringify(m.readyAt||{}),Array.isArray(m.records)?m.records.length:0,JSON.stringify(m.done||[])].join('|');
    }
    if(m.type==='GROUP_STATE'){
      return [m.type,JSON.stringify(m.participants||[]),!!m.sharedEquipment].join('|');
    }
    if(m.type==='GROUP_RESYNC'){
      return [m.type,m.sessionId,m.athlete,!!m.done,Array.isArray(m.records)?m.records.length:0,JSON.stringify(m.position||{}),JSON.stringify(m.extraSets||{})].join('|');
    }
    if(m.type==='GROUP_SNAPSHOT'){
      return [m.type,!!m.active,m.sessionId,Array.isArray(m.records)?m.records.length:0,JSON.stringify(m.done||[]),JSON.stringify(m.positions||{}),!!m.paused].join('|');
    }
    return '';
  }
  function logMessage(direction,m){
    if(!m||!m.type)return;
    if(m.type==='V0825_PING'||m.type==='V0825_PONG')return;
    const key=messageKey(m);
    const slot=String(direction)+'|'+String(m.type);
    if(key&&key===runtime.messageKeys[slot])return;
    if(key)runtime.messageKeys[slot]=key;
    log(direction+'_'+String(m.type),summarizeMessage(m),false);
  }

  function wrapSend(){
    if(runtime.wrappedSend||typeof wifiSend!=='function')return;
    const base=wifiSend;
    const wrapped=function(obj){
      runtime.lastTxAt=now();
      let m=obj;
      try{if(typeof obj==='string')m=JSON.parse(obj)}catch(e){}
      logMessage('TX',m);
      const ok=base.apply(this,arguments);
      if(ok===false&&m?.type!=='V0825_PING'&&m?.type!=='V0825_PONG'){
        log('TX_FAILED',{message:summarizeMessage(m),native:nativeDiag()},true);
      }
      return ok;
    };
    wrapped.__v0825=true;
    wifiSend=wrapped;
    runtime.wrappedSend=true;
  }

  function sendHeartbeat(){
    if(!connectedNow()||!roleNow()||typeof wifiSend!=='function')return;
    const t=now();
    runtime.lastHeartbeatSentAt=t;
    runtime.seq++;
    try{
      const ok=wifiSend({
        type:'V0825_PING',
        at:t,
        seq:runtime.seq,
        deviceId:localDeviceId(),
        sessionId:sessionId()
      });
      if(ok===false&&roleNow()==='guest'&&runtime.everConnected&&!runtime.reconnecting){
        log('HEARTBEAT_SEND_FAILED',{native:nativeDiag()},true);
        beginReconnect('heartbeat-send-failed',true);
      }
    }catch(e){
      if(roleNow()==='guest'&&runtime.everConnected&&!runtime.reconnecting){
        log('HEARTBEAT_SEND_ERROR',{message:String(e?.message||e),native:nativeDiag()},true);
        beginReconnect('heartbeat-send-error',true);
      }
    }
  }

  function wrapMessage(){
    if(runtime.wrappedMessage)return;
    const api=window.TrenerWifi;
    if(!api||typeof api.nativeMessage!=='function')return;
    const base=api.nativeMessage.bind(api);
    const wrapped=function(raw){
      const t=now();
      runtime.lastRxAt=t;
      let m=null;
      try{m=JSON.parse(String(raw||''))}catch(e){}
      if(m?.type==='V0825_PING'){
        const remoteId=String(m.deviceId||'');
        runtime.hostPeerBeats[remoteId]={lastRxAt:t,seq:Number(m.seq)||0};
        try{
          wifiSend({
            type:'V0825_PONG',
            at:t,
            echoAt:Number(m.at)||0,
            seq:Number(m.seq)||0,
            deviceId:localDeviceId(),
            targetDeviceId:remoteId,
            sessionId:sessionId()
          });
        }catch(e){}
        return;
      }
      if(m?.type==='V0825_PONG'){
        const target=String(m.targetDeviceId||'');
        if(!target||target===localDeviceId()){
          runtime.lastPongAt=t;
          const echo=Number(m.echoAt)||0;
          runtime.lastRtt=echo?Math.max(0,t-echo):null;
          if(runtime.lastRtt!==null&&runtime.lastRtt>1200){
            log('HEARTBEAT_SLOW',{rttMs:runtime.lastRtt,from:String(m.deviceId||'')},false);
          }
        }
        return;
      }
      logMessage('RX',m);
      return base(raw);
    };
    wrapped.__v0825=true;
    api.nativeMessage=wrapped;
    runtime.wrappedMessage=true;
  }

  function wrapStatus(){
    if(runtime.wrappedStatus)return;
    const api=window.TrenerWifi;
    if(!api||typeof api.nativeStatus!=='function')return;
    const base=api.nativeStatus.bind(api);
    const wrapped=function(status,detail){
      const out=base(status,detail);
      captureCreds();
      ensureSession('wifi-status');
      log('WIFI_STATUS',{status:String(status||''),detail:String(detail||''),native:nativeDiag()},true);
      if(status==='connecting'&&roleNow()==='guest'&&!runtime.manualDisconnect){
        runtime.initialJoinArmed=true;
        runtime.creds.role='guest';
        if(/^(\d{1,3}\.){3}\d{1,3}$/.test(String(detail||'').trim()))runtime.creds.hostIp=String(detail).trim();
        log('INITIAL_JOIN_ARMED',{
          source:'native-connecting',
          hostIp:runtime.creds.hostIp,
          native:nativeDiag()
        },true);
      }
      if(status==='connected'){
        afterConnected();
      }else if(status==='waiting'){
        if(roleNow()==='host'){
          runtime.reconnecting=false;
          runtime.reconnectAttempt=0;
          runtime.hostRestartInFlight=false;
          const diag=nativeDiag();
          if(validLocalIp(diag.localIp)){
            runtime.networkAvailable=true;
            runtime.lastLocalIp=String(diag.localIp);
            setLocalIpUi(diag.localIp);
          }else{
            runtime.networkAvailable=false;
            runtime.hostRestartPending=!runtime.manualDisconnect&&/^\d{6}$/.test(runtime.creds.code);
            setLocalIpUi('—');
            try{
              net.connected=false;
              net.status='network_lost';
              net.detail='Brak aktywnego adresu Wi‑Fi';
              if(typeof updateWifiUi==='function')updateWifiUi();
            }catch(e){}
          }
          paintReconnect();
          if(runtime.everConnected)log('HOST_WAITING_FOR_PEER',{native:diag},true);
        }
      }else if(status==='disconnected_peer'){
        if(roleNow()==='host'){
          const diag=nativeDiag();
          monitorNetwork(diag);
          if(!validLocalIp(diag.localIp))runtime.hostRestartPending=true;
          paintReconnect();
        }
      }else if(status==='disconnected'||status==='error'){
        if(!runtime.manualDisconnect&&!fatalReason(detail)){
          beginReconnect(String(detail||status),false);
        }
      }else if(status==='denied'){
        runtime.initialJoinArmed=false;
        cancelReconnect();
        paintReconnect();
      }
      return out;
    };
    wrapped.__v0825=true;
    api.nativeStatus=wrapped;
    runtime.wrappedStatus=true;
  }

  function installUi(){
    if(!$('v0825ReconnectStyle')){
      const s=document.createElement('style');s.id='v0825ReconnectStyle';s.textContent=`
        #v0825ReconnectBanner{margin:6px 0 8px;padding:8px 10px;border:1px solid #7a5424;border-radius:11px;background:#21170b;color:#ffd269;font-size:10px;font-weight:900;text-align:center}
        #v0825ReconnectBanner.hidden{display:none!important}
      `;document.head.appendChild(s);
    }
    const training=$('training');
    if(training&&!$('v0825ReconnectBanner')){
      const b=document.createElement('div');b.id='v0825ReconnectBanner';b.className='hidden';
      const top=training.querySelector('.topline');
      if(top)top.insertAdjacentElement('afterend',b);else training.prepend(b);
    }
    const card=$('v0823DiagCard');
    const oldCopy=$('v0825CopyShared');
    if(oldCopy)oldCopy.remove();
    if(card&&!$('v0828EmailShared')){
      const buttons=card.querySelector('.v0823DiagButtons');
      if(buttons){
        const b=document.createElement('button');
        b.id='v0828EmailShared';
        b.className='primary';
        b.type='button';
        b.textContent='WYŚLIJ WSPÓLNY LOG MAILEM';
        buttons.insertBefore(b,buttons.firstChild);
        b.addEventListener('click',emailLatest);
      }
    }
  }

  function latestSession(){
    const current=currentSession();
    if(current)return current;
    return db.sessions.length?db.sessions[db.sessions.length-1]:null;
  }
  function exportLatest(){
    const s=latestSession();
    if(!s)return '';
    return JSON.stringify(s,null,2);
  }
  function localPhoneMeta(){
    const dev=localDeviceId();
    const participants=participantVersions();
    let participant=participants.find(p=>p.deviceId&&p.deviceId===dev)||null;
    let athlete=0;
    try{athlete=Number(net?.localAthlete)||0}catch(e){}
    if(participant&&Number.isFinite(Number(participant.index)))athlete=Number(participant.index);

    let name='';
    if(participant?.name)name=String(participant.name);
    if(!name){
      try{name=String($('nameA')?.value||'').trim()}catch(e){}
    }
    if(!name)name='Użytkownik';

    const role=roleNow()==='host'?'HOST':(roleNow()==='guest'?'GOŚĆ':'NIEUSTALONA');
    const diag=nativeDiag();
    let deviceModel='Android';
    try{
      if(window.Android&&typeof Android.getDeviceLabel==='function'){
        deviceModel=String(Android.getDeviceLabel()||'Android');
      }
    }catch(e){}

    return {
      phoneNumber:athlete+1,
      role,
      name,
      deviceModel,
      deviceId:dev,
      localIp:String(diag.localIp||runtime.lastLocalIp||'—'),
      appVersion:appVersion(),
      sessionId:sessionId(),
      exportedAt:iso(now())
    };
  }

  function exportLatestForEmail(){
    const s=latestSession();
    if(!s)return null;
    const payload=clone(s,{});
    payload.exportedFrom=localPhoneMeta();
    return payload;
  }

  function emailLatest(){
    flush(true);
    const payload=exportLatestForEmail();
    if(!payload){
      try{toast('Brak wspólnego logu do wysłania.')}catch(e){}
      return;
    }
    const meta=payload.exportedFrom||localPhoneMeta();
    const subject='Trener 2 '+meta.appVersion+' — Telefon '+meta.phoneNumber+' — '+meta.role+' — '+meta.name;
    const body=[
      'Wspólny log diagnostyczny Trener 2',
      '',
      'Telefon: '+meta.phoneNumber,
      'Rola: '+meta.role,
      'Użytkownik: '+meta.name,
      'Urządzenie: '+meta.deviceModel,
      'Wersja aplikacji: '+meta.appVersion,
      'IP lokalne: '+meta.localIp,
      'Device ID: '+meta.deviceId,
      'Session ID: '+(meta.sessionId||'—'),
      'Eksport: '+meta.exportedAt,
      '',
      'Pełny black box znajduje się w załączniku JSON.'
    ].join('\n');

    const stamp=String(meta.exportedAt||'').replace(/[:.]/g,'-');
    const fileName='Trener2-'+meta.appVersion+'-Telefon-'+meta.phoneNumber+'-'+meta.role+'-'+stamp+'.json';

    if(!(window.Android&&typeof Android.emailSharedLog==='function')){
      try{toast('Ta wersja Androida nie ma jeszcze wysyłki logu mailem.')}catch(e){}
      return;
    }

    log('SHARED_LOG_EMAIL_OPENED',{
      phoneNumber:meta.phoneNumber,
      role:meta.role,
      name:meta.name,
      deviceModel:meta.deviceModel,
      localIp:meta.localIp
    },true);

    try{
      Android.emailSharedLog(JSON.stringify(payload,null,2),subject,body,fileName);
    }catch(e){
      log('SHARED_LOG_EMAIL_ERROR',{message:String(e?.message||e)},true);
      try{toast('Nie udało się przygotować maila z logiem.')}catch(x){}
    }
  }

  async function copyLatest(){
    flush(true);
    const txt=exportLatest();
    if(!txt){try{toast('Brak logu wspólnej sesji.')}catch(e){}return}
    let ok=false;
    try{if(window.Android&&typeof Android.copyText==='function')ok=!!Android.copyText(txt)}catch(e){}
    if(!ok){try{await navigator.clipboard.writeText(txt);ok=true}catch(e){}}
    try{toast(ok?'Log wspólnej sesji skopiowany.':'Nie udało się skopiować logu.')}catch(e){}
  }
  function clear(){
    db={schemaVersion:1,sessions:[]};
    runtime.currentId='';
    try{localStorage.removeItem(KEY)}catch(e){}
    updateUi();
  }
  function updateUi(){
    const c=$('v0823DiagCount');
    if(c){
      const s=latestSession(),n=s?.events?.length||0;
      c.textContent=(window.TrenerDiagnostics?.rows?.().length||0)+' wpisów • black box '+n;
    }
  }

  function queueKey(){
    try{
      return [
        revNow(),
        Number(queue()?.exercise)||0,
        Number(queue()?.turn)||0,
        Number(queue()?.waitUntil)||0,
        String(queue()?.pending?.uid||''),
        JSON.stringify(net?.done||[])
      ].join('|');
    }catch(e){return ''}
  }

  function heartbeatTick(){
    wrapSend();wrapMessage();wrapStatus();installUi();captureCreds();
    const t=now();
    const diag=nativeDiag();
    monitorNetwork(diag);
    const conn=connectedNow();

    const connectionKey=[roleNow(),String(net?.status||''),conn,sharedActive(),runningNow(),sessionId()].join('|');
    if(connectionKey!==runtime.prevConnectionKey){
      runtime.prevConnectionKey=connectionKey;
      log('STATE_CHANGE',{connection:commonState(),native:nativeDiag()},true);
    }

    if(conn&&t-runtime.lastHeartbeatSentAt>=HEARTBEAT_MS)sendHeartbeat();

    if(roleNow()==='host'&&sharedActive()){
      const mine=localDeviceId();
      participantVersions().filter(p=>p.deviceId&&p.deviceId!==mine).forEach(p=>{
        const beat=runtime.hostPeerBeats[p.deviceId];
        if(!beat)return;
        const age=Math.max(0,t-Number(beat.lastRxAt||0));
        if(age>HEARTBEAT_TIMEOUT_MS&&!runtime.stalePeers[p.deviceId]){
          runtime.stalePeers[p.deviceId]=true;
          log('PEER_HEARTBEAT_STALE',{deviceId:p.deviceId,name:p.name,version:p.version,ageMs:age,native:nativeDiag()},true);
        }else if(age<=HEARTBEAT_TIMEOUT_MS&&runtime.stalePeers[p.deviceId]){
          delete runtime.stalePeers[p.deviceId];
          log('PEER_HEARTBEAT_RECOVERED',{deviceId:p.deviceId,name:p.name,ageMs:age},true);
        }
      });
    }

    if(conn&&t-runtime.lastHeartbeatLogAt>=15000){
      runtime.lastHeartbeatLogAt=t;
      log('HEARTBEAT_SUMMARY',{
        rttMs:runtime.lastRtt,
        rxAgeMs:runtime.lastRxAt?Math.max(0,t-runtime.lastRxAt):null,
        txAgeMs:runtime.lastTxAt?Math.max(0,t-runtime.lastTxAt):null,
        native:nativeDiag()
      },false);
    }

    if(roleNow()==='guest'&&conn&&runtime.everConnected){
      const age=t-Math.max(runtime.lastRxAt||0,runtime.lastPongAt||0);
      if(age>HEARTBEAT_TIMEOUT_MS&&!runtime.reconnecting){
        log('HEARTBEAT_TIMEOUT',{ageMs:age,native:nativeDiag()},true);
        beginReconnect('heartbeat-timeout '+age+'ms',true);
      }
    }

    const run=runningNow(),shared=sharedActive();
    if(shared&&!runtime.prevShared){
      ensureSession('workout-start');
      log('WORKOUT_START',{
        plan:planSnapshot(),
        participants:participantVersions(),
        native:nativeDiag()
      },true);
    }
    if(shared){
      const k=queueKey();
      if(k&&k!==runtime.prevQueueKey){
        runtime.prevQueueKey=k;
        log('QUEUE_STATE',{
          rev:revNow(),
          exercise:Number(queue()?.exercise)||0,
          turn:Number(queue()?.turn)||0,
          waitUntil:Number(queue()?.waitUntil)||0,
          readyAt:clone(queue()?.readyAt||{},{}),
          pending:clone(queue()?.pending||null,null),
          participants:participantVersions()
        },false);
      }
    }
    if(runtime.prevShared&&!shared&&runtime.prevRunning&&!run){
      log('WORKOUT_END',{native:nativeDiag()},true);
      closeSession('workout-ended');
      cancelReconnect();
    }
    runtime.prevRunning=run;
    runtime.prevShared=shared;
    paintReconnect();
  }

  function installEvents(){
    document.addEventListener('click',ev=>{
      const btn=ev.target?.closest?.('button');
      const id=btn?.id||'';
      if(id==='disconnectWifiBtn'){
        runtime.manualDisconnect=true;
        runtime.initialJoinArmed=false;
        cancelReconnect();
        log('USER_DISCONNECT',{native:nativeDiag()},true);
      }else if(id==='joinBtn'||id==='hostBtn'){
        runtime.manualDisconnect=false;
        runtime.everConnected=false;
        runtime.initialJoinArmed=id==='joinBtn';
        cancelReconnect();
        setTimeout(()=>{
          captureCreds();
          ensureSession(id==='hostBtn'?'host-create':'guest-join');
          log(id==='hostBtn'?'HOST_CREATE':'JOIN_START',{
            hostIp:runtime.creds.hostIp,
            codeMasked:maskCode(runtime.creds.code),
            native:nativeDiag()
          },true);
        },60);
      }else if(id==='saveSetBtn'&&sharedActive()){
        log('USER_SAVE_SET',{
          weight:String($('weight')?.value||''),
          reps:String($('reps')?.value||'')
        },false);
      }else if(id==='stopBtn'&&sharedActive()){
        log('USER_STOP',{},true);
      }
    },true);

    document.addEventListener('visibilitychange',()=>{
      if(currentSession())log(document.hidden?'APP_BACKGROUND':'APP_FOREGROUND',{native:nativeDiag()},true);
      if(document.hidden)flush(true);
    });
    window.addEventListener('pagehide',()=>flush(true));
  }

  function boot(){
    if(runtime.booted)return;runtime.booted=true;
    installEvents();
    installUi();
    wrapSend();wrapMessage();wrapStatus();
    captureCreds();
    setInterval(heartbeatTick,1000);
    heartbeatTick();
  }

  window.TrenerSharedBlackbox0825={
    log,
    exportLatest,
    emailLatest,
    latest:()=>clone(latestSession(),null),
    sessions:()=>clone(db.sessions,[]),
    clear,
    status:()=>({
      reconnecting:runtime.reconnecting,
      attempt:runtime.reconnectAttempt,
      initialJoinArmed:runtime.initialJoinArmed,
      lastRxAt:runtime.lastRxAt,
      lastTxAt:runtime.lastTxAt,
      lastPongAt:runtime.lastPongAt,
      rttMs:runtime.lastRtt,
      networkAvailable:runtime.networkAvailable,
      localIp:runtime.lastLocalIp,
      hostRestartPending:runtime.hostRestartPending,
      hostRestartInFlight:runtime.hostRestartInFlight
    })
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
