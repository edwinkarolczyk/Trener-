(function(){
  'use strict';

  const HISTORY_KEY='trainer3.history';
  const CHECKPOINT_KEY='trainer3.activeWorkout.v0643';
  const MAX_CHECKPOINT_AGE=72*60*60*1000;
  const RESYNC_MS=1500;
  const state={saveWrapped:false,timer:null,recoveryId:'',restoring:false};

  function group(){try{return window.TrenerGroup||null;}catch(e){return null;}}
  function clone(v,fallback){try{return JSON.parse(JSON.stringify(v));}catch(e){return fallback;}}
  function recoveryId(){
    if(state.recoveryId)return state.recoveryId;
    state.recoveryId='r'+Date.now().toString(36)+Math.random().toString(36).slice(2,9);
    return state.recoveryId;
  }
  function activeGroup(){const g=group();try{return !!(g&&g.groupSession&&net&&net.active&&net.sessionId);}catch(e){return false;}}
  function ownAthlete(){try{return Number(net.localAthlete)||0;}catch(e){return 0;}}
  function ownRecords(){const a=ownAthlete();try{return (records||[]).filter(r=>Number(r.athlete)===a);}catch(e){return [];}}
  function history(){try{if(typeof getHistory==='function')return getHistory();return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');}catch(e){return [];}}

  function sameSaved(item,sid,rid){
    const meta=item&&item.group||{};
    if(rid&&String(meta.recoveryId||'')===String(rid))return true;
    if(!sid||String(meta.sessionId||'')!==String(sid))return false;
    const g=group();
    return !g||!g.deviceId||!meta.deviceId||String(meta.deviceId)===String(g.deviceId);
  }
  function historyHas(sid,rid){return history().some(item=>sameSaved(item,sid,rid));}
  function annotateLatest(sid,rid){
    try{
      const list=history();if(!list.length)return;
      const g=group(),first=list[0];
      first.group=Object.assign({},first.group||{},
        {sessionId:String(sid||''),recoveryId:String(rid||''),deviceId:g&&g.deviceId?String(g.deviceId):''});
      localStorage.setItem(HISTORY_KEY,JSON.stringify(list.slice(0,100)));
    }catch(e){}
  }

  function readCheckpoint(){try{return JSON.parse(localStorage.getItem(CHECKPOINT_KEY)||'null');}catch(e){return null;}}
  function clearCheckpoint(){try{localStorage.removeItem(CHECKPOINT_KEY);}catch(e){}state.recoveryId='';}
  function checkpoint(){
    try{
      if(!running||!currentPlan)return false;
      const g=group();
      const cp={
        version:1,id:recoveryId(),savedAt:Date.now(),elapsed:typeof elapsedMs==='function'?Math.max(0,Number(elapsedMs())||0):0,
        planKey:typeof planKey==='undefined'?'shared':planKey,plan:clone(currentPlan,null),mode:Number(mode)||1,
        exIdx:Number(exIdx)||0,setIdx:Number(setIdx)||0,athleteIdx:Number(athleteIdx)||0,lastCompletedExercise:Number(lastCompletedExercise)||-1,
        records:clone(records||[],[]),weight:document.getElementById('weight')?.value||'',reps:document.getElementById('reps')?.value||'',
        paused:!!paused,netActive:!!net.active,netRole:net.role||null,sessionId:String(net.sessionId||''),localAthlete:Number(net.localAthlete)||0,
        names:clone(net.names||[],[]),done:clone(net.done||[],[]),hostCode:document.getElementById('hostCode')?.value||'',
        joinIp:document.getElementById('joinIp')?.value||'',joinCode:document.getElementById('joinCode')?.value||'',
        group:g&&g.groupSession?{deviceId:g.deviceId||'',participants:clone(g.participants||[],[]),sharedEquipment:!!g.sharedEquipment,
          sharedLoads:clone(g.sharedLoads||{},{}),extraSets:clone(g.extraSets||{},{}),positions:clone(g.positions||{},{}),readiness:clone(g.readiness||null,null)}:null
      };
      localStorage.setItem(CHECKPOINT_KEY,JSON.stringify(cp));
      return true;
    }catch(e){return false;}
  }

  function wrapSaveHistory(){
    if(state.saveWrapped||typeof saveHistory!=='function')return false;
    const base=saveHistory;
    saveHistory=function(){
      const cp=readCheckpoint();
      let sid='',rid=cp&&cp.id?String(cp.id):state.recoveryId;
      try{if(activeGroup())sid=String(net.sessionId||'');else if(cp&&cp.sessionId)sid=String(cp.sessionId);}catch(e){}
      if((sid||rid)&&historyHas(sid,rid)){if(!running)clearCheckpoint();return;}
      const out=base.apply(this,arguments);
      if(sid||rid)annotateLatest(sid,rid);
      if(!running)clearCheckpoint();
      return out;
    };
    state.saveWrapped=true;return true;
  }

  function persistOwnIfDone(){
    if(!activeGroup())return false;
    const a=ownAthlete();let done=false;try{done=!!net.done?.[a];}catch(e){}
    if(!done||!ownRecords().length)return false;
    const cp=readCheckpoint(),sid=String(net.sessionId||''),rid=cp&&cp.id?String(cp.id):recoveryId();
    if(historyHas(sid,rid))return false;
    const duration=typeof elapsedMs==='function'?Math.max(0,Number(elapsedMs())||0):0;
    saveHistory(false,duration);annotateLatest(sid,rid);
    try{if(typeof renderHistory==='function')renderHistory();}catch(e){}
    return true;
  }

  function guestResync(g){const a=ownAthlete();return {type:'GROUP_RESYNC',sessionId:String(net.sessionId||''),deviceId:String(g.deviceId||''),athlete:a,done:!!net.done?.[a],records:ownRecords(),extraSets:Object.assign({},g.extraSets?.[g.deviceId]||{}),position:g.positions?.[a]||null};}
  function hostSnapshot(g){return {type:'GROUP_SNAPSHOT',targetDeviceId:null,active:true,sessionId:String(net.sessionId||''),planKey:typeof planKey==='undefined'?'shared':planKey,plan:currentPlan,participants:[...(g.participants||[])],names:[...(net.names||[])],done:[...(net.done||[])],records:[...(records||[])],sharedEquipment:!!g.sharedEquipment,sharedLoads:Object.assign({},g.sharedLoads||{}),extraSets:clone(g.extraSets||{},{}),positions:clone(g.positions||{},{}),paused:!!paused,elapsed:typeof elapsedMs==='function'?Math.max(0,Number(elapsedMs())||0):0};}
  function resyncNow(){
    if(!activeGroup())return false;
    try{if(!net.connected||typeof wifiSend!=='function')return false;const g=group();if(!g)return false;if(net.role==='guest')return !!wifiSend(guestResync(g));if(net.role==='host')return !!wifiSend(hostSnapshot(g));}catch(e){}
    return false;
  }

  function resumeNetwork(cp){
    if(!cp.netActive||!cp.netRole)return;
    setTimeout(function(){
      try{
        if(typeof wifiNativeAvailable!=='function'||!wifiNativeAvailable()||!window.Android)return;
        if(cp.netRole==='host'&&/^\d{6}$/.test(cp.hostCode||'')){
          const el=document.getElementById('hostCode');if(el)el.value=cp.hostCode;
          net.role='host';net.status='starting';net.connected=false;Android.wifiHost(cp.hostCode);
        }else if(cp.netRole==='guest'&&/^(\d{1,3}\.){3}\d{1,3}$/.test(cp.joinIp||'')&&/^\d{6}$/.test(cp.joinCode||'')){
          const ip=document.getElementById('joinIp'),code=document.getElementById('joinCode');if(ip)ip.value=cp.joinIp;if(code)code.value=cp.joinCode;
          net.role='guest';net.status='connecting';net.connected=false;Android.wifiJoin(cp.joinIp,cp.joinCode);
        }
        try{updateWifiUi();}catch(e){}
      }catch(e){}
    },350);
  }

  function restoreCheckpoint(){
    if(state.restoring)return false;const cp=readCheckpoint();if(!cp)return false;
    if(!cp.savedAt||Date.now()-Number(cp.savedAt)>MAX_CHECKPOINT_AGE||!cp.plan||!Array.isArray(cp.plan.ex)){clearCheckpoint();return false;}
    if(cp.id&&historyHas(cp.sessionId||'',cp.id)&&!cp.netActive){clearCheckpoint();return false;}
    const count=Array.isArray(cp.records)?cp.records.length:0;
    if(!confirm('Znaleziono niedokończony trening ('+count+' zapisanych serii). Przywrócić go?')){clearCheckpoint();return false;}
    state.restoring=true;state.recoveryId=String(cp.id||recoveryId());
    try{
      if(typeof resetWorkoutState==='function')resetWorkoutState();
      currentPlan=clone(cp.plan,null);planKey=cp.planKey||'shared';mode=Number(cp.mode)===2?2:1;
      try{if(typeof setMode==='function')setMode(mode,false);}catch(e){}
      records=clone(cp.records||[],[]);exIdx=Math.max(0,Number(cp.exIdx)||0);setIdx=Math.max(0,Number(cp.setIdx)||0);athleteIdx=Math.max(0,Number(cp.athleteIdx)||0);lastCompletedExercise=Number(cp.lastCompletedExercise)||-1;
      net.active=!!cp.netActive;net.role=cp.netRole||null;net.connected=false;net.status='offline';net.sessionId=String(cp.sessionId||'');net.localAthlete=Math.max(0,Number(cp.localAthlete)||0);net.names=clone(cp.names||['Osoba 1','Osoba 2'],['Osoba 1','Osoba 2']);net.done=clone(cp.done||[false,false],[false,false]);
      const g=group();if(g&&cp.group){g.groupSession=true;g.deviceId=cp.group.deviceId||g.deviceId;g.participants=clone(cp.group.participants||[],[]);g.sharedEquipment=!!cp.group.sharedEquipment;g.sharedLoads=clone(cp.group.sharedLoads||{},{});g.extraSets=clone(cp.group.extraSets||{},{});g.positions=clone(cp.group.positions||{},{});g.readiness=clone(cp.group.readiness||null,null);}
      startedAt=Date.now()-Math.max(0,Number(cp.elapsed)||0);pausedTotal=0;pauseStarted=0;restEnd=0;restPaused=0;transitionRest=false;running=true;paused=false;
      openTrainingUi();showTab('start');
      if(document.getElementById('weight')&&cp.weight!=='')document.getElementById('weight').value=cp.weight;
      if(document.getElementById('reps')&&cp.reps!=='')document.getElementById('reps').value=cp.reps;
      try{updateView();renderLivePanel();}catch(e){}
      resumeNetwork(cp);toast('Trening odzyskany z zapisu awaryjnego.');checkpoint();return true;
    }catch(e){console.error(e);return false;}finally{state.restoring=false;}
  }

  function tick(){wrapSaveHistory();if(running)checkpoint();persistOwnIfDone();resyncNow();}
  function afterSeries(ev){const btn=ev.target&&ev.target.closest?ev.target.closest('#saveSetBtn'):null;if(!btn)return;setTimeout(function(){checkpoint();persistOwnIfDone();resyncNow();},80);}
  function onVisibility(){if(document.visibilityState==='hidden'){checkpoint();persistOwnIfDone();}else resyncNow();}
  function boot(){wrapSaveHistory();document.addEventListener('click',afterSeries,true);document.addEventListener('visibilitychange',onVisibility);window.addEventListener('pagehide',checkpoint);state.timer=setInterval(tick,RESYNC_MS);setTimeout(restoreCheckpoint,250);}

  window.TrenerSyncHistory={tick,checkpoint,restoreCheckpoint,persistOwnIfDone,resyncNow,historyHas};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
