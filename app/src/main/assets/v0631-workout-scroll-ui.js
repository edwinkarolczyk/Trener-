(function(){
  'use strict';
  // Stabilizacja 0.6.3.1: ekran startuje przy polach serii, ale pozostaje swobodnie przewijalny.

  function installCss(){
    if(document.getElementById('v0631-workout-scroll-style'))return;
    const s=document.createElement('style');
    s.id='v0631-workout-scroll-style';
    s.textContent=`
      html.v062Active,html.v062Active body{
        overflow-x:hidden!important;
        overflow-y:auto!important;
        overscroll-behavior-y:auto!important;
      }
      body.v062Active #training.trainingCard{
        position:relative!important;
        inset:auto!important;
        height:auto!important;
        max-height:none!important;
        min-height:100dvh!important;
        overflow:visible!important;
      }
      body.v062Active #training .v062Summary{
        grid-template-columns:1fr!important;
        gap:8px!important;
      }
      body.v062Active #training .v062Stat{
        min-height:58px!important;
        padding:10px 14px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        text-align:left!important;
      }
      body.v062Active #training .v062Stat span{
        font-size:10px!important;
      }
      body.v062Active #training .v062Stat b{
        margin:0!important;
        font-size:20px!important;
        text-align:right!important;
      }
      body.v062Active #training #v0631HowTo{
        order:4!important;
        display:block!important;
        width:100%!important;
        min-height:48px!important;
        margin:0 0 8px!important;
        border-radius:12px!important;
        font-size:13px!important;
        font-weight:950!important;
      }
      body.v062Active #training #v055Flow{order:5!important}
      body.v062Active #training .inputs{order:6!important}
      body.v062Active #training #saveSetBtn{order:7!important}
      body.v062Active #training #restBox{order:8!important}
      body.v062Active #training .controls{
        order:9!important;
        margin-top:0!important;
        margin-bottom:8px!important;
      }
    `;
    document.head.appendChild(s);
  }

  function ensureHowTo(){
    const training=document.getElementById('training');
    if(!training||document.getElementById('v0631HowTo'))return;
    const btn=document.createElement('button');
    btn.id='v0631HowTo';
    btn.type='button';
    btn.textContent='JAK WYKONAĆ';
    btn.addEventListener('click',function(){
      const original=document.querySelector('#v055Visual .v055VisualTop button, #v055Visual .v055VisualTop [role="button"]');
      if(original){original.click();return;}
      const top=document.querySelector('#v055Visual .v055VisualTop');
      if(top)top.click();
    });
    const summary=document.getElementById('v062Summary');
    if(summary)summary.insertAdjacentElement('afterend',btn);
    else document.getElementById('exercise')?.insertAdjacentElement('afterend',btn);
  }

  let lastExerciseKey='';
  let wasRunning=false;
  function update(){
    let isRunning=false;
    try{isRunning=!!running;}catch(e){}
    if(!isRunning){wasRunning=false;lastExerciseKey='';return;}
    installCss();
    ensureHowTo();

    let key='';
    try{key=String(exIdx)+'|'+String(currentPlan?.ex?.[exIdx]?.name||currentPlan?.ex?.[exIdx]?.title||'');}catch(e){}
    if(!wasRunning||key!==lastExerciseKey){
      wasRunning=true;
      lastExerciseKey=key;
      setTimeout(function(){
        const inputs=document.querySelector('#training .inputs');
        if(inputs)inputs.scrollIntoView({behavior:'auto',block:'center'});
      },180);
    }
  }

  function boot(){
    installCss();
    setInterval(update,250);
    window.addEventListener('resize',function(){
      // Celowo bez ponownego centrowania: klawiatura i obrót ekranu nie blokują ręcznego przewijania.
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
