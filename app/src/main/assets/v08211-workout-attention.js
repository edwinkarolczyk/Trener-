(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const state={
    booted:false,
    wasRunning:false,
    lastExercise:null,
    lastSessionId:'',
    hideTimer:0,
    timer:0
  };

  function log(event,data,important){
    try{window.TrenerSharedBlackbox0825?.log?.(event,data||{},!!important);}catch(e){}
  }

  function group(){try{return window.TrenerGroup||null;}catch(e){return null}}
  function queue(){try{return window.TrenerBeta070||null;}catch(e){return null}}
  function runningNow(){try{return !!running}catch(e){return false}}
  function sharedNow(){
    try{return !!(running&&net?.active&&group()?.groupSession&&queue()?.active)}catch(e){return false}
  }
  function sessionId(){try{return String(net?.sessionId||queue()?.sessionId||'')}catch(e){return ''}}
  function exerciseIndex(){
    try{
      if(sharedNow())return Math.max(0,Number(queue()?.exercise)||0);
      return Math.max(0,Number(exIdx)||0);
    }catch(e){return 0}
  }
  function exerciseName(index){
    try{
      const ex=currentPlan?.ex?.[Number(index)||0];
      return String(ex?.n||ex?.name||ex?.title||('Ćwiczenie '+((Number(index)||0)+1))).trim();
    }catch(e){
      return 'Ćwiczenie '+((Number(index)||0)+1);
    }
  }

  function installCss(){
    if($('v08211AttentionStyle'))return;
    const s=document.createElement('style');
    s.id='v08211AttentionStyle';
    s.textContent=`
      #v08211ExerciseAlert{
        position:fixed;inset:0;z-index:90000;display:flex;align-items:center;justify-content:center;
        padding:20px;background:rgba(0,0,0,.94);backdrop-filter:blur(4px)
      }
      #v08211ExerciseAlert.hidden{display:none!important}
      .v08211AlertBox{
        width:min(520px,100%);padding:26px 20px 22px;border-radius:22px;
        border:2px solid #d33;background:radial-gradient(circle at 50% 35%,#351112 0%,#120909 56%,#090909 100%);
        box-shadow:0 0 0 2px rgba(255,70,70,.08) inset,0 28px 90px rgba(0,0,0,.85);
        text-align:center
      }
      .v08211Eyebrow{font-size:12px;font-weight:1000;letter-spacing:.16em;color:#ff6b6e}
      #v08211ExerciseName{margin:12px 0 8px;font-size:clamp(28px,8vw,44px);line-height:1.05;font-weight:1000;color:#fff}
      #v08211ExerciseMeta{font-size:13px;color:#bbb;font-weight:850}
      #v08211ExerciseOk{margin-top:20px!important;width:100%!important;min-height:58px!important;font-size:16px!important;font-weight:1000!important}
    `;
    document.head.appendChild(s);
  }

  function installUi(){
    installCss();
    if($('v08211ExerciseAlert'))return;
    const d=document.createElement('div');
    d.id='v08211ExerciseAlert';
    d.className='hidden';
    d.innerHTML='<div class="v08211AlertBox"><div class="v08211Eyebrow">NOWE ĆWICZENIE</div><div id="v08211ExerciseName">—</div><div id="v08211ExerciseMeta"></div><button id="v08211ExerciseOk" class="primary" type="button">OK — STARTUJ</button></div>';
    document.body.appendChild(d);
    $('v08211ExerciseOk')?.addEventListener('click',hideAlert);
    d.addEventListener('click',ev=>{if(ev.target===d)hideAlert();});
  }

  function hideAlert(){
    clearTimeout(state.hideTimer);
    state.hideTimer=0;
    $('v08211ExerciseAlert')?.classList.add('hidden');
  }

  function showExerciseAlert(index,previous){
    installUi();
    const name=exerciseName(index);
    const total=(()=>{try{return currentPlan?.ex?.length||0}catch(e){return 0}})();
    const role=(()=>{try{return String(net?.role||'')}catch(e){return ''}})();

    if($('v08211ExerciseName'))$('v08211ExerciseName').textContent=name;
    if($('v08211ExerciseMeta'))$('v08211ExerciseMeta').textContent=
      'Ćwiczenie '+(Number(index)+1)+(total?' z '+total:'')+(sharedNow()?' • WSPÓLNY TRENING':'');
    $('v08211ExerciseAlert')?.classList.remove('hidden');

    try{window.TrenerFeedback077?.feedback?.('exercise')}catch(e){}
    try{vibrate(360)}catch(e){}

    log('EXERCISE_ALERT_SHOWN',{
      previousExercise:Number(previous),
      exercise:Number(index),
      name,
      shared:sharedNow(),
      role,
      sessionId:sessionId(),
      documentHidden:!!document.hidden
    },true);

    if(document.hidden){
      try{
        if(window.Android&&typeof Android.showWorkoutAlert==='function'){
          Android.showWorkoutAlert('Trener 2 — NOWE ĆWICZENIE',name);
        }
      }catch(e){}
    }

    clearTimeout(state.hideTimer);
    state.hideTimer=setTimeout(hideAlert,4200);
  }

  function monitor(){
    installUi();
    const run=runningNow();
    const sid=sessionId();

    if(!run){
      state.wasRunning=false;
      state.lastExercise=null;
      state.lastSessionId='';
      hideAlert();
      return;
    }

    const idx=exerciseIndex();
    if(!state.wasRunning||state.lastSessionId!==sid||state.lastExercise===null){
      state.wasRunning=true;
      state.lastSessionId=sid;
      state.lastExercise=idx;
      return;
    }

    if(idx!==state.lastExercise){
      const previous=state.lastExercise;
      state.lastExercise=idx;
      showExerciseAlert(idx,previous);
    }
  }

  function boot(){
    if(state.booted)return;
    state.booted=true;
    installUi();
    state.timer=setInterval(monitor,180);
    document.addEventListener('visibilitychange',monitor);
    monitor();
  }

  window.TrenerAttention08211={
    showExerciseAlert,
    status:()=>({
      lastExercise:state.lastExercise,
      sessionId:state.lastSessionId,
      running:state.wasRunning
    })
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
