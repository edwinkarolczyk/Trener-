(function(){
  'use strict';

  const MODULE='0.8.2';
  const ERR_KEY='trainer3.sharedErrors.v082';
  const state={wrapped:false,incompatible:false,lastMismatch:'',lastErrorAt:0};

  function $(id){return document.getElementById(id)}
  function appVersion(){try{return window.Android&&Android.getAppVersion?String(Android.getAppVersion()):'0.0.0';}catch(e){return '0.0.0';}}
  function group(){try{return window.TrenerGroup||null;}catch(e){return null;}}
  function queue(){try{return window.TrenerBeta070||null;}catch(e){return null;}}
  function localDeviceId(){try{return String(group()?.deviceId||localStorage.getItem('trainer3.participantId')||'');}catch(e){return '';}}
  function ownAthlete(){try{return net?.active?Number(net.localAthlete)||0:Number(athleteIdx)||0;}catch(e){return 0;}}
  function sharedActive(){try{return !!(running&&net?.active&&group()?.groupSession);}catch(e){return false;}}
  function safeJson(raw,f){try{return raw?JSON.parse(raw):f;}catch(e){return f;}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function toastMsg(msg){try{if(typeof toast==='function')toast(msg);}catch(e){}}

  function saveError(err,where,raw){
    try{
      const list=safeJson(localStorage.getItem(ERR_KEY),[]);
      const rows=Array.isArray(list)?list:[];
      rows.unshift({
        at:new Date().toISOString(),
        where:String(where||'shared'),
        message:String(err?.message||err||'Błąd'),
        version:appVersion(),
        sessionId:String(net?.sessionId||''),
        role:String(net?.role||''),
        raw:String(raw||'').slice(0,1200)
      });
      localStorage.setItem(ERR_KEY,JSON.stringify(rows.slice(0,20)));
    }catch(e){}
  }

  function versionsCompatible(remote){
    const local=appVersion(),r=String(remote||'').trim();
    return !!r&&r===local;
  }

  function mismatchReason(remote){
    return 'Niezgodna wersja Trener 2. Gospodarz i uczestnicy muszą mieć dokładnie tę samą wersję. Ten telefon: '+appVersion()+', drugi telefon: '+String(remote||'brak')+'.';
  }

  function rejectRemote(deviceId,remote){
    state.incompatible=true;
    state.lastMismatch=String(remote||'');
    try{
      if(typeof wifiSend==='function')wifiSend({
        type:'GROUP_REJECT',
        targetDeviceId:String(deviceId||''),
        reason:mismatchReason(remote)
      });
    }catch(e){saveError(e,'rejectRemote');}
    toastMsg('Nie łączę wspólnego treningu — różne wersje aplikacji.');
  }

  function disconnectMismatch(remote){
    state.incompatible=true;
    state.lastMismatch=String(remote||'');
    const reason=mismatchReason(remote);
    toastMsg(reason);
    try{
      net.lastError=reason;net.detail=reason;net.status='error';net.connected=false;
      if(typeof updateWifiUi==='function')updateWifiUi();
    }catch(e){}
    setTimeout(()=>{
      try{
        if(typeof disconnectWifi==='function')disconnectWifi(true);
        else if(window.Android&&Android.wifiDisconnect)Android.wifiDisconnect();
      }catch(e){saveError(e,'disconnectMismatch');}
    },100);
  }

  function hostVersionFrom(m){
    try{
      const list=Array.isArray(m?.participants)?m.participants:[];
      const host=list.find(p=>Number(p?.index)===0)||list[0];
      return String(host?.version||'');
    }catch(e){return '';}
  }

  function guardMessage(m){
    if(!m||!m.type)return false;
    if(m.type==='GROUP_PROFILE'&&net?.role==='host'){
      const remote=String(m.version||'');
      if(!versionsCompatible(remote)){
        rejectRemote(m.deviceId,remote);
        return true;
      }
    }
    if(net?.role==='guest'&&(m.type==='GROUP_STATE'||m.type==='GROUP_SNAPSHOT')){
      const hv=hostVersionFrom(m);
      if(hv&&!versionsCompatible(hv)){
        disconnectMismatch(hv);
        return true;
      }
    }
    return false;
  }

  function wrapWifi(){
    const api=window.TrenerWifi;
    if(!api||typeof api.nativeMessage!=='function')return false;
    if(api.nativeMessage.__v082Guard)return true;
    const base=api.nativeMessage.bind(api);
    const wrapped=function(raw){
      let m=null;
      try{m=JSON.parse(String(raw||''));}catch(e){}
      try{
        if(m&&guardMessage(m))return;
        return base(raw);
      }catch(e){
        saveError(e,'nativeMessage',raw);
        const now=Date.now();
        if(now-state.lastErrorAt>4000){
          state.lastErrorAt=now;
          toastMsg('Błąd synchronizacji wspólnego treningu — zapis lokalny został zachowany.');
        }
        try{window.TrenerSyncHistory?.checkpoint?.();}catch(ignore){}
        return;
      }
    };
    wrapped.__v082Guard=true;
    wrapped.__v082Base=base;
    api.nativeMessage=wrapped;
    state.wrapped=true;
    return true;
  }

  function incompatibleParticipants(){
    const local=appVersion();
    try{return (group()?.participants||[]).filter(p=>String(p?.version||'')!==local);}catch(e){return [];}
  }

  function blockBadStart(ev){
    const btn=ev.target?.closest?.('#startBtn');
    if(!btn)return;
    try{
      if(Number(mode)!==2||net?.role!=='host'||!net?.connected)return;
      const bad=incompatibleParticipants();
      if(!bad.length)return;
      ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
      state.incompatible=true;
      const details=bad.map(p=>(p.name||'Uczestnik')+' '+(p.version||'brak wersji')).join(', ');
      toastMsg('Nie można rozpocząć: różne wersje aplikacji. '+details+'.');
    }catch(e){saveError(e,'blockBadStart');}
  }

  function participantTarget(a,ex){
    const base=Math.max(1,Number(ex?.sets)||1);
    if(!sharedActive())return base;
    try{
      const p=(group()?.participants||[]).find(x=>Number(x.index)===Number(a));
      const extra=Math.max(0,Math.min(3,Number(group()?.extraSets?.[p?.deviceId]?.[ex?.id]||0)));
      return base+extra;
    }catch(e){return base;}
  }

  function completedFor(a,exIndex){
    try{return (records||[]).filter(r=>Number(r.athlete||0)===Number(a)&&Number(r.ex)===Number(exIndex)).length;}catch(e){return 0;}
  }

  function totals(){
    const a=ownAthlete(),plan=currentPlan;
    if(!running||!plan||!Array.isArray(plan.ex)||!plan.ex.length)return null;
    const qi=sharedActive()&&queue()?.active?Math.max(0,Number(queue().exercise)||0):Math.max(0,Number(exIdx)||0);
    const ex=plan.ex[Math.min(qi,plan.ex.length-1)];
    const exTotal=participantTarget(a,ex);
    const exDone=Math.min(exTotal,completedFor(a,qi));
    let all=0,done=0;
    plan.ex.forEach((item,i)=>{
      const t=participantTarget(a,item);
      all+=t;
      done+=Math.min(t,completedFor(a,i));
    });
    return {a,qi,ex,exTotal,exDone,all,done};
  }

  function installCss(){
    if($('v082SharedStyle'))return;
    const s=document.createElement('style');s.id='v082SharedStyle';s.textContent=`
      body.v062Active #training.trainingCard{box-sizing:border-box!important;max-width:100%!important;overflow-x:hidden!important}
      body.v062Active #training.trainingCard>*{box-sizing:border-box;max-width:100%;min-width:0}
      #v082Progress{order:4;width:100%;display:grid;gap:7px;margin:0 0 8px}
      .v082ProgressRow{width:100%;min-width:0}
      .v082ProgressHead{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:4px;font-size:9px;font-weight:900;letter-spacing:.06em;color:#9a9a9a}
      .v082ProgressHead b{color:#eee;font-size:10px;white-space:nowrap}
      .v082Track{height:9px;width:100%;overflow:hidden;border-radius:999px;background:#222;border:1px solid #333}
      .v082Fill{height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,#ef2b2d,#ff6a6c);transition:width .18s ease}
      .v082ProgressRow.workout .v082Fill{background:linear-gradient(90deg,#2e9c63,#62e39a)}
      #v082PlanNote{font-size:10px;line-height:1.35;color:#9d9d9d;margin:-1px 0 7px;white-space:normal;overflow-wrap:anywhere}
      #v082VersionNote{font-size:9px;color:#777;margin-top:4px}
      body.v062Active #training #v0631HowTo{order:5!important}
      body.v062Active #training #v055Flow{order:6!important}
      body.v062Active #training .inputs{order:7!important}
      body.v062Active #training #saveSetBtn{order:8!important}
      body.v062Active #training #restBox{order:9!important}
      body.v062Active #training .controls{order:10!important}
      body.v071Group #v070Queue,body.v071Group #v055Flow,body.v071Group #v055People{max-width:100%!important;min-width:0!important;box-sizing:border-box!important;overflow-x:hidden}
    `;document.head.appendChild(s);
  }

  function ensureUi(){
    const training=$('training');if(!training)return;
    installCss();
    if(!$('v082Progress')){
      const box=document.createElement('div');box.id='v082Progress';
      box.innerHTML=
        '<div class="v082ProgressRow">'+
          '<div class="v082ProgressHead"><span>POSTĘP SERII</span><b id="v082SeriesText">0/0 • 0%</b></div>'+
          '<div class="v082Track"><div id="v082SeriesFill" class="v082Fill"></div></div>'+
        '</div>'+
        '<div class="v082ProgressRow workout">'+
          '<div class="v082ProgressHead"><span>POSTĘP TRENINGU</span><b id="v082WorkoutText">0/0 • 0%</b></div>'+
          '<div class="v082Track"><div id="v082WorkoutFill" class="v082Fill"></div></div>'+
        '</div>'+
        '<div id="v082PlanNote"></div>';
      const summary=$('v062Summary');
      if(summary)summary.insertAdjacentElement('afterend',box);
      else $('exercise')?.insertAdjacentElement('afterend',box);
    }
  }

  function pct(done,total){return total>0?Math.max(0,Math.min(100,Math.round(done*100/total))):0;}

  function renderProgress(){
    let run=false;try{run=!!running;}catch(e){}
    if(!run)return;
    ensureUi();
    const t=totals();if(!t)return;
    const ep=pct(t.exDone,t.exTotal),wp=pct(t.done,t.all);
    if($('v082SeriesText'))$('v082SeriesText').textContent=t.exDone+'/'+t.exTotal+' • '+ep+'%';
    if($('v082SeriesFill'))$('v082SeriesFill').style.width=ep+'%';
    if($('v082WorkoutText'))$('v082WorkoutText').textContent=t.done+'/'+t.all+' • '+wp+'%';
    if($('v082WorkoutFill'))$('v082WorkoutFill').style.width=wp+'%';
    const note=$('v082PlanNote');
    if(note){
      if(sharedActive()){
        const role=net?.role==='guest'?'Plan gospodarza':'Plan wspólny';
        note.textContent=role+': '+String(currentPlan?.title||'Trening')+' • używany w tej sesji; Twój lokalny plan pozostaje bez zmian.';
      }else note.textContent='';
    }
  }

  function annotateVersions(){
    const roster=$('v064Roster');if(!roster)return;
    const people=group()?.participants||[];
    [...roster.children].forEach((el,i)=>{
      const p=people[i];if(!p)return;
      let v=el.querySelector('.v082Version');
      if(!v){v=document.createElement('span');v.className='v082Version';v.style.cssText='display:block;margin-top:2px;font-size:9px;color:#777';el.appendChild(v);}
      const ok=versionsCompatible(p.version);
      v.textContent='wersja '+(p.version||'—')+(ok?' • zgodna':' • NIEZGODNA');
      v.style.color=ok?'#777':'#ff696b';
    });
  }

  function maintain(){
    wrapWifi();
    renderProgress();
    annotateVersions();
  }

  function boot(){
    installCss();
    window.addEventListener('click',blockBadStart,true);
    maintain();
    setInterval(maintain,250);
  }

  window.TrenerShared082={
    module:MODULE,
    version:appVersion,
    compatible:versionsCompatible,
    incompatibleParticipants,
    totals,
    status:()=>({version:appVersion(),incompatible:state.incompatible,lastMismatch:state.lastMismatch})
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();