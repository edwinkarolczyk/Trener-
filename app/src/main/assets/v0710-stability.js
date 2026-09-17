(function(){
  'use strict';

  const HISTORY_KEY='trainer3.history';
  const DRAFT_KEY='trainer3.workoutDraft.v079';
  // W aktywnej kolejce BETA070 blokujemy wyłącznie stare ścieżki,
  // które mogą samodzielnie zmienić rekordy/pozycję treningu.
  // GROUP_SNAPSHOT zostaje dozwolony: uruchamia i podtrzymuje warstwę sesji 2–4.
  const BLOCKED_LEGACY_TYPES=new Set(['SET','SNAPSHOT','RESYNC']);
  const state={
    baseWifiSend:null,
    baseSaveHistory:null,
    baseFinishWorkout:null,
    prevRunning:false,
    nativeMessageBase:null
  };

  function betaActive(){
    try{
      const q=window.TrenerBeta070;
      return !!(
        q?.active&&running&&net?.active&&net.sessionId&&q.sessionId&&
        String(q.sessionId)===String(net.sessionId)
      );
    }catch(e){return false;}
  }
  function isRunning(){try{return !!running;}catch(e){return false;}}
  function currentContext(){
    try{return [planKey,Number(exIdx)||0,Number(setIdx)||0,(net?.active?Number(net.localAthlete)||0:Number(athleteIdx)||0)].join('|');}
    catch(e){return '';}
  }
  function safeJson(raw,fallback){try{return JSON.parse(raw||'')||fallback;}catch(e){return fallback;}}
  function readHistory(){const h=safeJson(localStorage.getItem(HISTORY_KEY),[]);return Array.isArray(h)?h:[];}
  function itemKey(item,index){
    if(item&&item.id)return 'id:'+String(item.id);
    if(item&&item.iso)return 'iso:'+String(item.iso);
    try{return 'json:'+JSON.stringify(item);}catch(e){return 'idx:'+index;}
  }
  function mergeHistory(before,after){
    const out=Array.isArray(after)?after.slice():[];
    const seen=new Set(out.map(itemKey));
    (Array.isArray(before)?before:[]).forEach((item,index)=>{
      const key=itemKey(item,index);
      if(!seen.has(key)){seen.add(key);out.push(item);}
    });
    return out;
  }
  function restoreHistoryTail(before){
    try{
      const after=readHistory();
      const merged=mergeHistory(before,after);
      if(merged.length!==after.length)localStorage.setItem(HISTORY_KEY,JSON.stringify(merged));
    }catch(e){console.warn('0.7.10 history preservation failed',e);}
  }

  function wrapSaveHistory(){
    if(state.baseSaveHistory||typeof saveHistory!=='function')return false;
    state.baseSaveHistory=saveHistory;
    saveHistory=function(){
      const before=readHistory();
      let out;
      try{out=state.baseSaveHistory.apply(this,arguments);}
      finally{restoreHistoryTail(before);}
      return out;
    };
    return true;
  }

  function wrapFinishHistory(){
    if(state.baseFinishWorkout||typeof finishWorkout!=='function')return false;
    state.baseFinishWorkout=finishWorkout;
    finishWorkout=function(){
      const before=readHistory();
      let out;
      try{out=state.baseFinishWorkout.apply(this,arguments);}
      finally{restoreHistoryTail(before);}
      return out;
    };
    return true;
  }

  function messageType(payload){
    if(!payload)return '';
    if(typeof payload==='object')return String(payload.type||'');
    try{return String(JSON.parse(String(payload))?.type||'');}catch(e){return '';}
  }
  function shouldBlockLegacy(type){return BLOCKED_LEGACY_TYPES.has(String(type||''));}

  // GROUP_RESYNC jest nadal potrzebny jako impuls do odesłania GROUP_SNAPSHOT,
  // ale podczas BETA070 nie wolno mu wnosić rekordów/done/pozycji do hosta.
  function sanitizedGroupResync(payload){
    let obj=null;
    try{obj=typeof payload==='object'?Object.assign({},payload):JSON.parse(String(payload));}catch(e){return payload;}
    if(!obj||obj.type!=='GROUP_RESYNC')return payload;
    obj.records=[];
    obj.done=false;
    obj.position=null;
    delete obj.extraSets;
    return typeof payload==='object'?obj:JSON.stringify(obj);
  }

  function wrapWifiSend(){
    if(state.baseWifiSend||typeof wifiSend!=='function')return false;
    state.baseWifiSend=wifiSend;
    wifiSend=function(payload){
      const type=messageType(payload);
      if(betaActive()&&shouldBlockLegacy(type)){
        try{console.debug('0.7.10 blocked legacy outgoing',type);}catch(e){}
        return false;
      }
      if(betaActive()&&type==='GROUP_RESYNC'){
        const args=[...arguments];
        args[0]=sanitizedGroupResync(payload);
        return state.baseWifiSend.apply(this,args);
      }
      return state.baseWifiSend.apply(this,arguments);
    };
    return true;
  }

  function wrapNativeMessage(){
    const api=window.TrenerWifi;
    if(!api||typeof api.nativeMessage!=='function')return false;
    if(api.nativeMessage.__v0710Stability)return true;
    const base=api.nativeMessage.bind(api);
    const wrapped=function(raw){
      let type='';
      try{type=String(JSON.parse(String(raw||''))?.type||'');}catch(e){}
      if(betaActive()&&shouldBlockLegacy(type)){
        try{console.debug('0.7.10 blocked legacy incoming',type);}catch(e){}
        return;
      }
      if(betaActive()&&type==='GROUP_RESYNC')return base(sanitizedGroupResync(raw));
      return base(raw);
    };
    wrapped.__v0710Stability=true;
    wrapped.__v0710Base=base;
    api.nativeMessage=wrapped;
    state.nativeMessageBase=base;
    return true;
  }

  function stabilizeDraft(){
    const run=isRunning();
    try{
      if(!run){
        if(localStorage.getItem(DRAFT_KEY)!==null)localStorage.removeItem(DRAFT_KEY);
      }else{
        const draft=safeJson(localStorage.getItem(DRAFT_KEY),null);
        const ctx=currentContext();
        if(draft&&draft.context&&ctx&&String(draft.context)!==String(ctx)){
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    }catch(e){}
    state.prevRunning=run;
  }

  function safeStopFallback(ev){
    const stop=ev.target?.closest?.('#stopBtn');
    if(!stop||!isRunning())return;
    if(!window.Trener074?.askFinish)return;
    // v074 jest głównym kontrolerem i normalnie przechwytuje klik wcześniej na window.
    // Jeżeli zdarzenie dotarło aż tutaj, blokujemy starsze handlery document-level.
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    window.Trener074.askFinish('start');
  }

  function maintain(){
    wrapWifiSend();
    wrapNativeMessage();
    wrapSaveHistory();
    wrapFinishHistory();
    stabilizeDraft();
  }

  function boot(){
    window.addEventListener('click',safeStopFallback,true);
    maintain();
    setInterval(maintain,400);
  }

  window.TrenerStability0710={
    betaActive,
    maintain,
    status:()=>({
      betaActive:betaActive(),
      betaSession:String(window.TrenerBeta070?.sessionId||''),
      netSession:String(net?.sessionId||''),
      historyCount:readHistory().length,
      draftPresent:localStorage.getItem(DRAFT_KEY)!==null,
      safeFinish:!!window.Trener074?.askFinish
    })
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
