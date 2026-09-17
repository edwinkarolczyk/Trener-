(function(){
  'use strict';

  const state={baseFinish:null,nextTab:'start',finishing:false,booted:false};
  const $=id=>document.getElementById(id);
  const clone=(v,f=null)=>{try{return JSON.parse(JSON.stringify(v));}catch(e){return f;}};

  function isRunning(){try{return !!running;}catch(e){return false;}}
  function ownAthlete(){try{return Number(net?.localAthlete)||0;}catch(e){return 0;}}
  function ownRecords(){const a=ownAthlete();try{return clone((records||[]).filter(r=>Number(r.athlete)===a),[])||[];}catch(e){return [];}}
  function currentName(){try{return typeof athleteName==='function'?athleteName(ownAthlete()):(net?.names?.[ownAthlete()]||'Użytkownik');}catch(e){return 'Użytkownik';}}
  function safeTab(id){return ['start','plan','history','progress','diet','settings'].includes(id)?id:'start';}
  function fmt(ms){const sec=Math.max(0,Math.ceil((Number(ms)||0)/1000));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}

  function installCss(){
    if($('v074Style'))return;
    const s=document.createElement('style');s.id='v074Style';s.textContent=`
      #v074ExitBtn{display:none}
      body.v072Running #v074ExitBtn{display:block;min-width:72px;height:48px;margin:0!important;padding:6px 9px!important;border-radius:11px!important;font-size:9px!important;font-weight:950!important;white-space:nowrap}
      body.v072Running #v072FixedTimers{grid-template-columns:1fr 1fr auto auto!important}
      #v074Confirm{position:fixed;inset:0;z-index:60000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.78)}
      #v074Confirm.hidden{display:none!important}
      .v074Dialog{width:min(430px,100%);border:1px solid #563234;border-radius:18px;background:#111;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.65)}
      .v074Dialog h3{margin:0 0 8px;font-size:22px}.v074Dialog p{margin:0;color:#b3b3b3;font-size:12px;line-height:1.5}
      .v074Actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.v074Actions button{height:50px;margin:0!important}
      @media(max-width:430px){body.v072Running #v072FixedTimers{grid-template-columns:1fr 1fr!important}#v074ExitBtn,#v072Skip{grid-column:auto!important;width:100%!important;height:38px!important}.v074Actions{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function ensureExit(){
    installCss();
    const bar=$('v072FixedTimers');if(!bar||$('v074ExitBtn'))return;
    const b=document.createElement('button');b.id='v074ExitBtn';b.type='button';b.className='secondary';b.textContent='PLAN / WYJDŹ';
    const skip=$('v072Skip');if(skip)bar.insertBefore(b,skip);else bar.appendChild(b);
  }

  function ensureDialog(){
    if($('v074Confirm'))return;
    const d=document.createElement('div');d.id='v074Confirm';d.className='hidden';
    d.innerHTML='<div class="v074Dialog"><h3 id="v074Title">Zakończyć trening?</h3><p id="v074Text"></p><div class="v074Actions"><button id="v074Cancel" class="secondary" type="button">ANULUJ</button><button id="v074Ok" class="danger" type="button">ZAKOŃCZ I ZAPISZ</button></div></div>';
    document.body.appendChild(d);
    $('v074Cancel').onclick=()=>d.classList.add('hidden');
    d.addEventListener('click',ev=>{if(ev.target===d)d.classList.add('hidden');});
  }

  function fallbackHistory(snapshot){
    try{
      const list=typeof getHistory==='function'?getHistory():JSON.parse(localStorage.getItem('trainer3.history')||'[]');
      const pid=window.TrenerData070?.participantId?.()||'';
      list.unshift({
        id:'w'+Date.now(),iso:new Date().toISOString(),date:new Date().toLocaleString('pl-PL'),
        plan:snapshot.planTitle||'Trening',planKey:snapshot.planKey||'shared',mode:snapshot.mode||1,
        shared:!!snapshot.shared,sessionId:snapshot.sessionId||null,localAthlete:snapshot.localAthlete||0,
        names:snapshot.names||[currentName()],duration:Math.round((snapshot.duration||0)/1000),interrupted:!!snapshot.interrupted,
        records:snapshot.records||[],schemaVersion:2,participantId:pid
      });
      localStorage.setItem('trainer3.history',JSON.stringify(list.slice(0,100)));
      return true;
    }catch(e){console.error('0.7.4 fallback history failed',e);return false;}
  }

  function afterFinish(tab){
    const dest=safeTab(tab||'start');
    try{document.body?.classList.remove('v072Running','v071Group');}catch(e){}
    try{$('training')?.classList.add('hidden');$('setup')?.classList.remove('hidden');$('wifiLive')?.classList.add('hidden');}catch(e){}
    try{if($('clock'))$('clock').textContent='00:00';}catch(e){}
    try{if(typeof showTab==='function')showTab(dest);}catch(e){}
    try{window.scrollTo({top:0,left:0,behavior:'auto'});}catch(e){try{window.scrollTo(0,0);}catch(_){} }
  }

  function emergencyClose(tab){
    try{running=false;paused=false;restEnd=0;restPaused=0;if(tickHandle){clearInterval(tickHandle);tickHandle=null;}}catch(e){}
    try{if(net?.active){net.active=false;net.done=[false,false];net.sessionId='';}}catch(e){}
    try{if(window.TrenerBeta070){window.TrenerBeta070.active=false;window.TrenerBeta070.pending=null;}}catch(e){}
    afterFinish(tab);
  }

  function wrapFinish(){
    if(state.baseFinish||typeof finishWorkout!=='function')return false;
    state.baseFinish=finishWorkout;
    finishWorkout=function(interrupted,fromNetwork){
      if(!isRunning())return state.baseFinish.apply(this,arguments);
      const beforeFirst=(()=>{try{return (typeof getHistory==='function'?getHistory():[])[0]?.id||'';}catch(e){return '';}})();
      const snapshot={
        interrupted:!!interrupted,duration:(()=>{try{return typeof elapsedMs==='function'?elapsedMs():0;}catch(e){return 0;}})(),
        planTitle:(()=>{try{return currentPlan?.title||'Trening';}catch(e){return 'Trening';}})(),
        planKey:(()=>{try{return window.planKey||planKey||'shared';}catch(e){return 'shared';}})(),mode:(()=>{try{return Number(mode)||1;}catch(e){return 1;}})(),
        shared:(()=>{try{return !!net?.active;}catch(e){return false;}})(),sessionId:(()=>{try{return String(net?.sessionId||'');}catch(e){return '';}})(),
        localAthlete:ownAthlete(),names:(()=>{try{return clone(net?.names||[currentName()],[])||[];}catch(e){return [currentName()];}})(),records:ownRecords()
      };
      let out,err=null;
      try{out=state.baseFinish.apply(this,arguments);}catch(e){err=e;console.error('0.7.4 finish failed',e);}
      try{
        const afterFirst=(typeof getHistory==='function'?getHistory():[])[0]?.id||'';
        if(snapshot.records.length&&afterFirst===beforeFirst)fallbackHistory(snapshot);
      }catch(e){}
      if(isRunning()||err)emergencyClose(state.nextTab);else afterFinish(state.nextTab);
      const dest=state.nextTab;state.nextTab='start';
      try{window.TrenerSyncHistory?.checkpoint?.();}catch(e){}
      if(err)try{toast('Trening zapisany awaryjnie i zakończony.');}catch(e){}
      return out;
    };
    return true;
  }

  function notifyPeers(){
    try{
      if(!net?.active||!net.sessionId||!net.connected||typeof wifiSend!=='function')return;
      const sid=String(net.sessionId),mine=ownRecords();
      if(net.role==='host'){
        if(window.TrenerBeta070?.active)wifiSend({type:'BETA070_FINISH',sessionId:sid,interrupted:true,records:clone(records||[],[])});
        else wifiSend({type:'FINISH',sessionId:sid,interrupted:true,records:clone(records||[],[])});
      }else if(net.role==='guest'){
        wifiSend({type:'DONE',sessionId:sid,athlete:ownAthlete(),records:mine,interrupted:true});
      }
    }catch(e){console.warn('0.7.4 network finish ignored',e);}
  }

  function finishNow(tab){
    if(state.finishing)return;state.finishing=true;
    const dest=safeTab(tab||'start');state.nextTab=dest;
    try{$('v074Confirm')?.classList.add('hidden');}catch(e){}
    try{window.TrenerSyncHistory?.checkpoint?.();}catch(e){}
    notifyPeers();
    try{if(window.TrenerBeta070)window.TrenerBeta070.active=false;}catch(e){}
    try{
      if(typeof finishWorkout==='function')finishWorkout(true,true);
      else emergencyClose(dest);
    }catch(e){console.error(e);emergencyClose(dest);}
    state.finishing=false;
  }

  function askFinish(tab){
    if(!isRunning()){try{if(typeof showTab==='function')showTab(safeTab(tab));}catch(e){}return;}
    ensureDialog();
    const shared=(()=>{try{return !!net?.active;}catch(e){return false;}})();
    const role=(()=>{try{return net?.role||'';}catch(e){return '';}})();
    const dest=safeTab(tab||'start');
    $('v074Title').textContent=dest==='plan'?'Zakończyć trening i przejść do Planu?':'Zakończyć trening?';
    $('v074Text').textContent=shared
      ?(role==='host'?'Twoje wykonane serie zostaną zapisane. Aplikacja spróbuje też zakończyć wspólną sesję na pozostałych telefonach, ale brak Wi‑Fi nie zablokuje wyjścia.':'Twoje wykonane serie zostaną zapisane na tym telefonie. Host zostanie poinformowany, jeśli połączenie Wi‑Fi działa.')
      :'Wykonane serie zostaną zapisane jako trening zakończony wcześniej.';
    $('v074Ok').onclick=()=>finishNow(dest);
    $('v074Confirm').classList.remove('hidden');
  }

  function patchStatusText(){
    try{
      const a=$('athlete');if(a&&isRunning()){
        const text=String(a.textContent||'');
        let m=text.match(/^ODPOCZYWA:\s*(.+)$/i);if(m)a.textContent=m[1]+' — odpoczywa';
        m=String(a.textContent||'').match(/^ĆWICZY:\s*(.+)$/i);if(m)a.textContent=m[1]+' — ćwiczy';
      }
      const small=document.querySelector('#restBox .small');
      if(small&&/^PRZERWA\s*[—-]\s*/i.test(small.textContent||'')){
        const name=String(small.textContent||'').replace(/^PRZERWA\s*[—-]\s*/i,'').trim();if(name)small.textContent=name+' — odpoczywa';
      }
      const save=$('saveSetBtn');
      if(save&&/^ODPOCZYNEK\s*[—-]\s*/i.test(save.textContent||'')){
        const name=String(save.textContent||'').replace(/^ODPOCZYNEK\s*[—-]\s*/i,'').trim();if(name)save.textContent=name+' — ODPOCZYWA';
      }
    }catch(e){}
  }

  function captureNavigation(ev){
    const stop=ev.target?.closest?.('#stopBtn');
    if(stop&&isRunning()){
      ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();askFinish('start');return;
    }
    const exit=ev.target?.closest?.('#v074ExitBtn');
    if(exit&&isRunning()){
      ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();askFinish('plan');return;
    }
    const tab=ev.target?.closest?.('.tab');
    if(tab&&isRunning()){
      ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();askFinish(tab.dataset.tab||'start');
    }
  }

  function maintain(){installCss();ensureExit();ensureDialog();wrapFinish();patchStatusText();}
  function boot(){
    if(state.booted)return;state.booted=true;
    window.addEventListener('click',captureNavigation,true);
    maintain();setInterval(maintain,120);
  }

  window.Trener074={handleStop:()=>askFinish('start'),finishNow,askFinish,afterFinish};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
