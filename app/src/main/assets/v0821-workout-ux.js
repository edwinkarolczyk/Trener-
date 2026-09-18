(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  let lastNativeState='';
  let booted=false;

  function group(){try{return window.TrenerGroup||null;}catch(e){return null;}}
  function queue(){try{return window.TrenerBeta070||null;}catch(e){return null;}}
  function ownAthlete(){try{return net?.active?Number(net.localAthlete)||0:Number(athleteIdx)||0;}catch(e){return 0;}}
  function isRunning(){try{return !!running;}catch(e){return false;}}
  function isPaused(){try{return !!paused;}catch(e){return false;}}
  function isShared(){try{return !!(running&&net?.active&&group()?.groupSession);}catch(e){return false;}}

  function installCss(){
    if($('v0821WorkoutUxStyle'))return;
    const s=document.createElement('style');
    s.id='v0821WorkoutUxStyle';
    s.textContent=`
      body.v072Running #v072FixedTimers.v0821ProgressPinned{
        grid-template-columns:1fr 1fr auto!important;
        min-height:142px!important;
        align-content:end!important;
      }
      #v072FixedTimers #v082Progress{
        grid-column:1 / -1!important;
        width:100%!important;
        margin:0 0 4px!important;
        padding:0!important;
        gap:5px!important;
        background:transparent!important;
      }
      #v072FixedTimers #v082Progress .v082ProgressHead{
        margin-bottom:3px!important;
      }
      #v072FixedTimers #v082Progress .v082Track{
        height:8px!important;
      }
      #v072FixedTimers #v082PlanNote{
        display:none!important;
      }
      body.v072Running #training.trainingCard{
        padding-bottom:calc(166px + env(safe-area-inset-bottom))!important;
      }
      @media(max-width:380px){
        body.v072Running #v072FixedTimers.v0821ProgressPinned{
          grid-template-columns:1fr 1fr!important;
          min-height:176px!important;
        }
        body.v072Running #training.trainingCard{
          padding-bottom:calc(202px + env(safe-area-inset-bottom))!important;
        }
      }
    `;
    document.head.appendChild(s);
  }

  function pinProgress(){
    installCss();
    const bar=$('v072FixedTimers'),progress=$('v082Progress');
    if(!bar||!progress)return;
    if(progress.parentElement!==bar)bar.insertBefore(progress,bar.firstChild);
    bar.classList.add('v0821ProgressPinned');
  }

  function stateForScreen(){
    const active=isRunning();
    const me=ownAthlete();
    const shared=isShared();
    if(!active)return {active:false,keep:false,wakeAt:0,shared:false,athlete:me};
    if(isPaused())return {active:true,keep:false,wakeAt:0,shared,athlete:me};

    const now=Date.now();
    if(shared){
      const q=queue();
      if(q?.active){
        const left=!!q.left?.[me],done=!!net?.done?.[me];
        if(left||done)return {active:true,keep:false,wakeAt:0,shared:true,athlete:me};
        const mine=Number(q.turn)===me;
        if(!mine)return {active:true,keep:false,wakeAt:0,shared:true,athlete:me};
        const readyAt=Math.max(
          Number(q.waitUntil)||0,
          Number(q.readyAt?.[me])||0
        );
        if(readyAt>now+100){
          return {active:true,keep:false,wakeAt:readyAt,shared:true,athlete:me};
        }
        return {active:true,keep:true,wakeAt:0,shared:true,athlete:me};
      }
    }

    let restUntil=0;
    try{restUntil=Number(restEnd)||0;}catch(e){}
    if(restUntil>now+100){
      return {active:true,keep:false,wakeAt:restUntil,shared:false,athlete:me};
    }
    return {active:true,keep:true,wakeAt:0,shared:false,athlete:me};
  }

  function syncNative(force){
    const st=stateForScreen();
    const sig=[st.active?1:0,st.keep?1:0,Math.round(st.wakeAt/250),st.shared?1:0,st.athlete].join('|');
    if(!force&&sig===lastNativeState)return;
    lastNativeState=sig;
    try{
      if(window.Android&&typeof Android.setWorkoutScreenState==='function'){
        Android.setWorkoutScreenState(
          !!st.active,
          !!st.keep,
          Math.max(0,Math.round(st.wakeAt||0)),
          !!st.shared,
          Number(st.athlete)||0
        );
      }
    }catch(e){}
  }

  function maintain(){
    pinProgress();
    syncNative(false);
  }

  function boot(){
    if(booted)return;
    booted=true;
    installCss();
    maintain();
    setInterval(maintain,200);
    document.addEventListener('visibilitychange',()=>syncNative(true));
    window.addEventListener('pagehide',()=>{
      try{
        if(window.Android&&typeof Android.setWorkoutScreenState==='function'){
          Android.setWorkoutScreenState(false,false,0,false,0);
        }
      }catch(e){}
    });
  }

  window.TrenerWorkoutUx0821={
    screenState:stateForScreen,
    syncScreen:()=>syncNative(true),
    pinProgress
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();