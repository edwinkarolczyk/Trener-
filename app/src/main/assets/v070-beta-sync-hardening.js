(function(){
  'use strict';

  const WARN_MS=3500;
  const STALE_MS=8000;
  const RESYNC_EVERY_MS=2500;
  const PENDING_RETRY_MS=5000;
  const state={wrapped:false,statusWrapped:false,lastResyncAt:0,lastPendingRetryAt:0,lastOfflineToastAt:0,finishWrapped:false};

  function q(){try{return window.TrenerBeta070||null;}catch(e){return null;}}
  function group(){try{return window.TrenerGroup||null;}catch(e){return null;}}
  function clone(v,f){try{return JSON.parse(JSON.stringify(v));}catch(e){return f;}}
  function active(){const s=q();try{return !!(s&&s.active&&running&&net?.active&&net.sessionId);}catch(e){return false;}}
  function ownDeviceId(){try{return String(group()?.deviceId||localStorage.getItem('trainer3.participantId')||'');}catch(e){return '';}}
  function connected(){try{return !!net?.connected;}catch(e){return false;}}
  function age(){const s=q();if(!s||!s.lastStateAt)return Number.POSITIVE_INFINITY;return Math.max(0,Date.now()-Number(s.lastStateAt||0));}

  function participants(){
    try{
      const list=group()?.participants;
      if(Array.isArray(list)&&list.length)return clone(list,[]);
      return (net?.names||[]).map((name,index)=>({index,name:name||('Osoba '+(index+1)),deviceId:''}));
    }catch(e){return [];}
  }

  function snapshot(){
    const s=q();if(!s)return null;
    return {
      type:'BETA070_STATE',sessionId:String(s.sessionId||net?.sessionId||''),rev:Number(s.rev)||0,
      exercise:Number(s.exercise)||0,turn:Number(s.turn)||0,waitUntil:Number(s.waitUntil)||0,
      readyAt:clone(s.readyAt||{},{}),left:clone(s.left||{},{}),records:clone(typeof records!=='undefined'?records:[],[]),
      done:clone(net?.done||[],[]),extraSets:clone(group()?.extraSets||{},{}),participants:participants(),
      elapsed:typeof elapsedMs==='function'?elapsedMs():0
    };
  }

  function sendSnapshot(){
    if(!active()||net.role!=='host')return false;
    const m=snapshot();if(!m)return false;
    try{const ok=wifiSend(m);q().lastStateAt=Date.now();return ok!==false;}catch(e){return false;}
  }

  function requestResync(reason){
    if(!active()||net.role!=='guest'||!connected())return false;
    const now=Date.now();if(now-state.lastResyncAt<RESYNC_EVERY_MS)return false;
    state.lastResyncAt=now;
    const s=q();
    try{
      return wifiSend({
        type:'BETA070_RESYNC_REQUEST',sessionId:String(s.sessionId||net.sessionId||''),deviceId:ownDeviceId(),
        knownRev:Number(s.rev)||0,pendingUid:String(s.pending?.uid||''),reason:String(reason||'stale')
      })!==false;
    }catch(e){return false;}
  }

  function installCss(){
    if(document.getElementById('v070SyncHardeningStyle'))return;
    const css=document.createElement('style');css.id='v070SyncHardeningStyle';css.textContent=`
      #v070Sync.sync-ok{color:#72e69c!important}#v070Sync.sync-warn{color:#ffd269!important}#v070Sync.sync-bad{color:#ff676b!important;font-weight:900}
    `;document.head.appendChild(css);
  }

  function paintHealth(){
    const el=document.getElementById('v070Sync');if(!el||!active())return;
    installCss();el.classList.remove('sync-ok','sync-warn','sync-bad');
    if(net.role==='host'){
      if(connected()){el.textContent='HOST • SYNC';el.classList.add('sync-ok');}
      else{el.textContent='HOST • BRAK POŁĄCZENIA';el.classList.add('sync-bad');}
      return;
    }
    const ms=age();
    if(!connected()){el.textContent='OFFLINE';el.classList.add('sync-bad');return;}
    if(ms>STALE_MS){el.textContent='BRAK SYNC '+Math.round(ms/1000)+' s';el.classList.add('sync-bad');return;}
    if(ms>WARN_MS){el.textContent='SYNC OPÓŹNIONY '+Math.round(ms/1000)+' s';el.classList.add('sync-warn');return;}
    el.textContent='SYNC OK '+Math.round(ms/1000)+' s';el.classList.add('sync-ok');
  }

  function wrapWifi(){
    if(state.wrapped||!window.TrenerWifi?.nativeMessage)return false;
    const base=window.TrenerWifi.nativeMessage.bind(window.TrenerWifi);
    window.TrenerWifi.nativeMessage=function(raw){
      let m=null;try{m=JSON.parse(raw);}catch(e){}
      const s=q();
      if(m&&m.type==='BETA070_RESYNC_REQUEST'&&active()&&net.role==='host'&&String(m.sessionId||'')===String(s?.sessionId||'')){
        sendSnapshot();return;
      }
      if(m&&m.type==='BETA070_STATE'&&active()&&net.role==='guest'&&String(m.sessionId||'')===String(s?.sessionId||'')){
        // Host jest źródłem prawdy. Po restarcie host może mieć niższy licznik rev niż odzyskany gość.
        if(Number(m.rev||0)<Number(s.rev||0))s.rev=Number(m.rev)||0;
      }
      return base(raw);
    };
    state.wrapped=true;return true;
  }

  function wrapStatus(){
    if(state.statusWrapped||!window.TrenerWifi?.nativeStatus)return false;
    const base=window.TrenerWifi.nativeStatus.bind(window.TrenerWifi);
    window.TrenerWifi.nativeStatus=function(status,detail){
      const out=base(status,detail);
      if(status==='connected'){
        state.lastResyncAt=0;
        setTimeout(()=>requestResync('connected'),120);
        setTimeout(()=>requestResync('connected-confirm'),900);
      }
      paintHealth();return out;
    };
    state.statusWrapped=true;return true;
  }

  function robustStop(ev){
    const target=ev.target&&ev.target.closest?ev.target.closest('#stopBtn'):null;
    if(!target)return;
    let isRunning=false;try{isRunning=!!running;}catch(e){}
    if(!isRunning)return;
    ev.preventDefault();ev.stopImmediatePropagation();

    if(net?.active&&net.role==='guest'){
      if(!confirm('Zakończyć swój trening? Wykonane serie zostaną zapisane na tym telefonie.'))return;
      try{window.TrenerSyncHistory?.checkpoint?.();}catch(e){}
      const own=(typeof records!=='undefined'?records:[]).filter(r=>Number(r.athlete)===Number(net.localAthlete));
      try{net.done[net.localAthlete]=true;}catch(e){}
      try{wifiSend({type:'DONE',sessionId:net.sessionId,athlete:net.localAthlete,records:clone(own,[]),deviceId:ownDeviceId()});}catch(e){}
      try{const s=q();if(s)s.active=false;}catch(e){}
      try{finishWorkout(false,true);}catch(e){try{finishWorkout(false);}catch(ignore){}}
      return;
    }

    if(net?.active&&net.role==='host'){
      if(!confirm('Zakończyć wspólny trening? Wykonane serie zostaną zapisane na wszystkich dostępnych telefonach.'))return;
      try{window.TrenerSyncHistory?.checkpoint?.();}catch(e){}
      try{wifiSend({type:'BETA070_FINISH',sessionId:String(q()?.sessionId||net.sessionId||''),interrupted:false,records:clone(typeof records!=='undefined'?records:[],[])});}catch(e){}
      try{const s=q();if(s)s.active=false;}catch(e){}
      try{finishWorkout(false,true);}catch(e){try{finishWorkout(false);}catch(ignore){}}
      return;
    }

    if(!confirm('Zakończyć trening? Wykonane serie zostaną zapisane.'))return;
    try{window.TrenerSyncHistory?.checkpoint?.();}catch(e){}
    try{finishWorkout(false);}catch(e){}
  }

  function wrapFinish(){
    if(state.finishWrapped||typeof finishSharedForAll!=='function')return false;
    const base=finishSharedForAll;
    finishSharedForAll=function(interrupted){
      try{return base.apply(this,arguments);}catch(e){
        const s=q();
        if(s&&s.active&&net?.active&&net.role==='host'){
          try{window.TrenerSyncHistory?.checkpoint?.();}catch(ignore){}
          s.active=false;
          try{finishWorkout(!!interrupted,true);}catch(ignore){try{finishWorkout(!!interrupted);}catch(ignore2){}}
          return;
        }
        throw e;
      }
    };
    state.finishWrapped=true;return true;
  }

  function guardSave(ev){
    const target=ev.target&&ev.target.closest?ev.target.closest('#saveSetBtn'):null;
    if(!target||!active()||net.role!=='guest')return;
    const blocked=!connected()||age()>STALE_MS;
    if(!blocked)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    const now=Date.now();
    if(now-state.lastOfflineToastAt>1800){
      state.lastOfflineToastAt=now;
      try{toast('Brak synchronizacji z gospodarzem. Poczekaj na połączenie — trening jest zapisany lokalnie.');}catch(e){}
    }
    requestResync('save-blocked');
  }

  function recoverPending(){
    const s=q();if(!active()||net.role!=='guest'||!s?.pending||!connected())return;
    const now=Date.now();
    if(Number(s.pending.tries||0)>=4&&now-state.lastPendingRetryAt>PENDING_RETRY_MS){
      state.lastPendingRetryAt=now;
      s.pending.tries=3;
      s.pending.sentAt=now-2000;
      requestResync('pending-ack');
    }
  }

  function maintain(){
    wrapWifi();wrapStatus();wrapFinish();installCss();
    if(active()){
      try{window.TrenerBeta070Recovery?.restore?.();}catch(e){}
      if(net.role==='guest'){
        const ms=age();
        if(connected()&&ms>WARN_MS)requestResync(ms>STALE_MS?'stale':'slow');
        recoverPending();
      }
    }
    paintHealth();
  }

  window.addEventListener('click',robustStop,true);
  window.addEventListener('click',guardSave,true);
  const timer=setInterval(maintain,200);
  window.TrenerBeta070Sync={requestResync,sendSnapshot,health:()=>({active:active(),connected:connected(),ageMs:age(),pending:clone(q()?.pending||null,null)}),timer};
  maintain();
})();
