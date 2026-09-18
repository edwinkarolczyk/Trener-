(function(){
  'use strict';

  const NEW_KEY='trainer3.weekPlan.v070';
  const OLD_KEY='trainer3.schedule.v050';
  const MIGRATION_KEY='trainer3.weekPlan.v072Migrated';
  const DEFAULT_OLD={'0':'','1':'mon','2':'','3':'wed','4':'','5':'fri','6':''};
  let lastWeekRaw='';
  let lastRunning=false;

  function safe(raw,fallback){try{return JSON.parse(raw||'')||fallback;}catch(e){return fallback;}}
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
  function isAssigned(d){return !!(d&&typeof d==='object'&&d.kind&&d.kind!=='off');}

  function legacyToNew(key){
    key=String(key||'');
    if(!key)return {kind:'off'};
    if(['mon','wed','fri','biceps','custom'].includes(key))return {kind:'preset',presetKey:key};
    if(key.startsWith('v070day:'))return null;
    return {kind:'off'};
  }

  // Jednorazowo przenosimy faktyczny dotychczasowy tydzień do nowego planera.
  // Jeżeli stary klucz nie był jeszcze fizycznie zapisany, v0.5 używał właśnie tego domyślnego układu.
  function migrateLegacySchedule(){
    if(localStorage.getItem(MIGRATION_KEY)==='1')return;
    const existing=safe(localStorage.getItem(NEW_KEY),{days:{}});
    if(!existing.days||typeof existing.days!=='object')existing.days={};
    const hasNew=Object.values(existing.days).some(isAssigned);
    if(!hasNew){
      const old=Object.assign({},DEFAULT_OLD,safe(localStorage.getItem(OLD_KEY),{}));
      const days={};
      for(const day of ['0','1','2','3','4','5','6']){
        const mapped=legacyToNew(old[day]);
        if(mapped)days[day]=mapped;
      }
      existing.days=days;
      try{localStorage.setItem(NEW_KEY,JSON.stringify(existing));}catch(e){}
    }
    try{localStorage.setItem(MIGRATION_KEY,'1');}catch(e){}
  }

  function mirrorNewToLegacy(){
    const raw=localStorage.getItem(NEW_KEY)||'';
    if(raw===lastWeekRaw)return false;
    lastWeekRaw=raw;
    const cfg=safe(raw,{days:{}}),out={};
    for(const day of ['0','1','2','3','4','5','6']){
      const d=cfg.days?.[day];
      out[day]=isAssigned(d)?('v070day:'+day):'';
    }
    try{localStorage.setItem(OLD_KEY,JSON.stringify(out));}catch(e){}
    return true;
  }

  function installCss(){
    if(document.getElementById('v072BetaStyle'))return;
    const s=document.createElement('style');s.id='v072BetaStyle';s.textContent=`
      /* 0.7.2: stary tygodniowy planner nie może już pojawiać się obok nowego. */
      #v050ScheduleCard{display:none!important}
      .appHeader #clock{display:none!important}
      #v072FixedTimers{display:none}
      body.v072Running #v072FixedTimers{
        display:grid;position:fixed;left:0;right:0;bottom:0;z-index:30000;
        grid-template-columns:1fr 1fr auto;align-items:center;gap:7px;
        min-height:68px;padding:8px max(10px,env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));
        box-sizing:border-box;background:rgba(7,7,7,.97);border-top:1px solid #3b292a;box-shadow:0 -8px 24px rgba(0,0,0,.45)
      }
      .v072TimerCell{min-width:0;border:1px solid #292929;background:#0d0d0d;border-radius:12px;padding:7px 10px}
      .v072TimerCell span{display:block;color:#868686;font-size:8px;font-weight:950;letter-spacing:.09em}
      .v072TimerCell b{display:block;margin-top:2px;font-size:22px;line-height:1;font-weight:1000;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #v072RestCell.resting{border-color:#6f3d28}#v072RestCell.resting b{color:#ffd269}
      #v072RestCell.ready b{color:#68e89c}#v072RestCell.paused b{color:#ff7779}
      #v072Skip{display:none;width:auto!important;min-width:62px!important;height:48px!important;padding:6px 8px!important;margin:0!important;font-size:9px!important;border-radius:11px!important}
      #v072FixedTimers.has-rest #v072Skip{display:block}
      #v072FixedTimers.v08210NoOwnRest #v072RestCell{display:none!important}
      body.v072Running #training.trainingCard{padding-bottom:calc(92px + env(safe-area-inset-bottom))!important}
      body.v072Running #training #restBox{display:none!important}
      @media(max-width:380px){
        body.v072Running #v072FixedTimers{grid-template-columns:1fr 1fr;min-height:64px}
        #v072Skip{grid-column:1 / span 2;width:100%!important;height:36px!important}
        .v072TimerCell b{font-size:19px}
      }
    `;document.head.appendChild(s);
  }

  function ensureTimers(){
    if(document.getElementById('v072FixedTimers'))return;
    const bar=document.createElement('div');bar.id='v072FixedTimers';
    bar.innerHTML=`
      <div class="v072TimerCell"><span>CZAS TRENINGU</span><b id="v072WorkoutTime">00:00</b></div>
      <div id="v072RestCell" class="v072TimerCell ready"><span>TWÓJ ODPOCZYNEK</span><b id="v072RestTime">GOTOWY</b></div>
      <button id="v072Skip" class="secondary" type="button">POMIŃ</button>`;
    document.body.appendChild(bar);
    document.getElementById('v072Skip')?.addEventListener('click',()=>{
      try{document.getElementById('skipRestBtn')?.click();}catch(e){}
    });
  }

  function fmt(ms){
    const sec=Math.max(0,Math.ceil((Number(ms)||0)/1000));
    return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
  }

  function updateTimers(){
    let isRunning=false;try{isRunning=!!running;}catch(e){}
    document.body?.classList.toggle('v072Running',isRunning);
    if(!isRunning){lastRunning=false;return;}
    lastRunning=true;ensureTimers();
    let elapsed=0;try{elapsed=typeof elapsedMs==='function'?elapsedMs():0;}catch(e){}
    const wt=document.getElementById('v072WorkoutTime');if(wt)wt.textContent=fmt(elapsed);
    const now=Date.now();let end=0,isPaused=false,sharedQueue=false;
    try{
      isPaused=!!paused;
      const q=window.TrenerBeta070;
      sharedQueue=!!(q?.active&&net?.active&&window.TrenerGroup?.groupSession);
      if(sharedQueue){
        const me=Number(net?.localAthlete)||0;
        end=Number(q?.readyAt?.[me]||0);
      }else{
        end=Number(restEnd)||0;
      }
    }catch(e){}
    const left=Math.max(0,end-now),cell=document.getElementById('v072RestCell'),rt=document.getElementById('v072RestTime'),bar=document.getElementById('v072FixedTimers');
    if(!cell||!rt||!bar)return;
    const hideSharedRest=sharedQueue&&!isPaused&&left<=0;
    bar.classList.toggle('v08210NoOwnRest',hideSharedRest);
    cell.classList.toggle('hidden',hideSharedRest);
    cell.classList.remove('ready','resting','paused');
    bar.classList.toggle('has-rest',left>0&&!isPaused);
    if(isPaused){cell.classList.remove('hidden');cell.classList.add('paused');rt.textContent='PAUZA';}
    else if(left>0){cell.classList.remove('hidden');cell.classList.add('resting');rt.textContent=fmt(left);}
    else if(sharedQueue){rt.textContent='';}
    else{cell.classList.add('ready');rt.textContent='GOTOWY';}
  }

  function syncTodayUi(force){
    if(!window.TrenerBetaPlanner)return;
    const day=String(new Date().getDay()),cfg=safe(localStorage.getItem(NEW_KEY),{days:{}}),assigned=isAssigned(cfg.days?.[day]);
    const sel=document.getElementById('planSelect'),hint=document.getElementById('v050TodayHint');
    if(!sel)return;
    const wanted='v070day:'+day;
    if(assigned&&window.TrenerBetaPlanner.planForDay(day)){
      const has=[...sel.options].some(o=>o.value===wanted);
      if(has&&(force||!String(sel.value||'').startsWith('v070day:'))){
        sel.value=wanted;
        const settings=safe(localStorage.getItem('trainer3.settings'),{});settings.planKey=wanted;
        try{localStorage.setItem('trainer3.settings',JSON.stringify(settings));}catch(e){}
      }
      if(hint){const p=window.TrenerBetaPlanner.planForDay(day);hint.innerHTML='<b>DZIŚ WG PLANU:</b> '+String(p?.title||'Trening');}
    }else if(hint){hint.innerHTML='<b>DZIŚ:</b> brak przypisanego treningu — możesz wybrać dowolny ręcznie.';}
  }

  function polishPlannerHeader(){
    const root=document.getElementById('v070Planner');if(!root)return;
    const eyebrow=root.querySelector('.v070Top .eyebrow');if(eyebrow)eyebrow.textContent='0.7.2 BETA • PLAN';
    const h=root.querySelector('.v070Top h2');if(h)h.textContent='Plan tygodnia';
  }

  function maintain(){
    installCss();ensureTimers();
    const changed=mirrorNewToLegacy();
    // Nawet jeśli stary moduł dołączy kartę później, pozostaje ona niewidoczna.
    const old=document.getElementById('v050ScheduleCard');if(old)old.setAttribute('aria-hidden','true');
    polishPlannerHeader();
    syncTodayUi(changed);
    updateTimers();
  }

  migrateLegacySchedule();
  installCss();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureTimers();maintain();},{once:true});
  else{ensureTimers();maintain();}
  setInterval(maintain,250);

  window.TrenerBeta072={
    migrateLegacySchedule,
    mirrorNewToLegacy,
    syncTodayUi,
    timers:()=>({running:document.body?.classList.contains('v072Running')||false})
  };
})();
