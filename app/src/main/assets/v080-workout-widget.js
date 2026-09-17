(function(){
  'use strict';

  let lastSignature='';
  let timer=null;

  function bridge(){try{return window.TrenerWidget&&typeof TrenerWidget.syncWorkoutWidget==='function';}catch(e){return false;}}
  function txt(id){try{return (document.getElementById(id)?.textContent||'').trim();}catch(e){return '';}}
  function val(id){try{return (document.getElementById(id)?.value||'').trim();}catch(e){return '';}}
  function runningNow(){try{return !!running;}catch(e){return false;}}
  function pausedNow(){try{return !!paused;}catch(e){return false;}}
  function elapsedNow(){try{return runningNow()&&typeof elapsedMs==='function'?Math.max(0,Number(elapsedMs())||0):0;}catch(e){return 0;}}
  function currentExercise(){try{return currentPlan?.ex?.[Number(exIdx)||0]||null;}catch(e){return null;}}
  function sharedNow(){try{return !!(net?.active&&window.TrenerGroup?.groupSession);}catch(e){return false;}}
  function ownAthlete(){try{return Number(net?.localAthlete)||0;}catch(e){return 0;}}

  function restUntil(){
    if(!runningNow()||pausedNow())return 0;
    try{
      const q=window.TrenerBeta070;
      if(q?.active&&sharedNow()){
        const a=ownAthlete();
        const ownReady=Math.max(0,Number(q.readyAt?.[a])||0);
        const ownTurn=Number(q.turn)===a;
        const turnWait=ownTurn?Math.max(0,Number(q.waitUntil)||0):0;
        return Math.max(ownReady,turnWait);
      }
    }catch(e){}
    try{return Math.max(0,Number(restEnd)||0);}catch(e){return 0;}
  }

  function planName(){
    try{return String(currentPlan?.title||currentPlan?.name||planKey||'Trening').trim()||'Trening';}catch(e){return 'Trening';}
  }

  function seriesText(ex){
    const dom=txt('series');
    if(dom)return dom;
    try{
      const total=Math.max(1,Number(ex?.sets)||1);
      const current=Math.min(total,Math.max(1,(Number(setIdx)||0)+1));
      return 'Seria '+current+'/'+total;
    }catch(e){return '';}
  }

  function detailText(ex){
    const kg=val('weight');
    let target='';
    try{target=String(ex?.r||ex?.reps||ex?.target||'').trim();}catch(e){}
    const parts=[];
    if(kg)parts.push(kg+' kg');
    if(target)parts.push('cel '+target+(target.toLowerCase().includes('sek')?'':' powt.'));
    return parts.join(' • ');
  }

  function statusText(until){
    if(pausedNow())return 'PAUZA';
    try{
      const q=window.TrenerBeta070;
      if(q?.active&&sharedNow()){
        const live=txt('v070Turn');
        if(live)return live;
      }
    }catch(e){}
    return until>Date.now()?'ODPOCZYNEK':'GOTOWY';
  }

  function snapshot(){
    const active=runningNow();
    const ex=active?currentExercise():null;
    const until=active?restUntil():0;
    const payload={
      active,
      paused:active&&pausedNow(),
      shared:active&&sharedNow(),
      plan:active?planName():'',
      exercise:active?String(ex?.n||ex?.name||'').trim():'',
      series:active?seriesText(ex):'',
      detail:active?detailText(ex):'',
      status:active?statusText(until):'',
      elapsedMs:active?elapsedNow():0,
      restMs:active&&until>Date.now()?Math.max(0,until-Date.now()):0
    };
    const signature=JSON.stringify({
      active:payload.active,paused:payload.paused,shared:payload.shared,
      plan:payload.plan,exercise:payload.exercise,series:payload.series,
      detail:payload.detail,status:payload.status,restUntil:until
    });
    return {payload,signature};
  }

  function sync(force){
    if(!bridge())return false;
    const s=snapshot();
    if(!force&&s.signature===lastSignature)return false;
    try{
      TrenerWidget.syncWorkoutWidget(JSON.stringify(s.payload));
      lastSignature=s.signature;
      return true;
    }catch(e){return false;}
  }

  function boot(){
    sync(true);
    timer=setInterval(()=>sync(false),750);
    document.addEventListener('visibilitychange',()=>sync(true));
    document.addEventListener('click',ev=>{
      if(ev.target?.closest?.('#saveSetBtn,#skipRestBtn,#pauseBtn,#resumeBtn,#stopBtn,#v072Skip'))setTimeout(()=>sync(true),120);
    },true);
    window.addEventListener('pagehide',()=>sync(true));
  }

  window.TrenerWorkoutWidget080={sync:()=>sync(true),snapshot:()=>snapshot().payload};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
