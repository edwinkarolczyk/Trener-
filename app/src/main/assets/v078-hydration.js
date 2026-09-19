(function(){
  'use strict';

  const KEY='trainer3.hydration.v078';
  const $=id=>document.getElementById(id);
  let promptTimer=null;
  let wasRunning=false;
  let lastRecordCount=0;
  let lastPromptCount=0;
  let lastPromptElapsed=0;

  function safe(raw,fallback){try{return JSON.parse(raw||'')||fallback}catch(e){return fallback}}
  function clamp(v,min,max){const n=parseInt(v,10);return Number.isFinite(n)?Math.max(min,Math.min(n,max)):min;}
  function defaultState(){return {version:1,todayMl:0,targetMl:2500,remindersEnabled:false,intervalMinutes:90,quietStartMinutes:1320,quietEndMinutes:420,workoutEnabled:true,workoutFrequency:'normal',history:[],updatedAt:0};}
  function nativeAvailable(){try{return !!(window.TrenerHydration&&TrenerHydration.getState)}catch(e){return false}}
  function readState(){
    let state=null;
    try{if(nativeAvailable())state=safe(TrenerHydration.getState(),null);}catch(e){}
    if(!state)state=safe(localStorage.getItem(KEY),defaultState());
    state=Object.assign(defaultState(),state||{});
    if(!Array.isArray(state.history))state.history=[];
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}
    return state;
  }
  function mirror(state){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
  function minToTime(v){v=clamp(v,0,1439);return String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0');}
  function timeToMin(v,fallback){const m=String(v||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return fallback;return clamp(Number(m[1])*60+Number(m[2]),0,1439);}
  function dayLabel(date){
    const d=new Date(String(date||'')+'T12:00:00');if(Number.isNaN(d.getTime()))return String(date||'');
    const today=new Date();const t=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    if(date===t)return 'Dzisiaj';
    const y=new Date(today);y.setDate(y.getDate()-1);const yk=y.getFullYear()+'-'+String(y.getMonth()+1).padStart(2,'0')+'-'+String(y.getDate()).padStart(2,'0');
    if(date===yk)return 'Wczoraj';
    return d.toLocaleDateString('pl-PL',{weekday:'short',day:'2-digit',month:'2-digit'});
  }

  function installCss(){
    if($('v078HydrationStyle'))return;
    const s=document.createElement('style');s.id='v078HydrationStyle';s.textContent=`
      #diet .v078WaterTop{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end}
      #diet .v078WaterValue{font-size:28px;font-weight:950;line-height:1}.v078WaterValue small{font-size:12px;color:#999;font-weight:800}
      #diet .v078WaterBar{height:9px;background:#242424;border-radius:999px;overflow:hidden;margin:10px 0 12px}.v078WaterBar i{display:block;height:100%;background:#4fc3f7;border-radius:999px}
      #diet .v078QuickWater{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.v078QuickWater button{margin:0!important;padding:12px 4px!important;font-size:12px!important;min-width:0!important}
      #diet .v078HydrationGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.v078HydrationGrid .wide{grid-column:1/-1}
      #diet .v078History{margin-top:12px}.v078WaterHistoryRow{display:grid;grid-template-columns:78px 1fr auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #292929}.v078WaterHistoryRow:first-child{border-top:0}.v078WaterHistoryRow span{font-size:10px;color:#aaa}.v078WaterHistoryRow b{font-size:12px}.v078WaterHistoryRow small{font-size:9px;color:#777}
      #diet .v078HydrationNote{font-size:10px;color:#8f8f8f;line-height:1.45;margin-top:9px}
      #v078WaterPrompt{position:fixed;left:12px;right:12px;bottom:96px;z-index:130;background:#0d1b21;border:1px solid #4fc3f7;border-radius:16px;padding:12px;box-shadow:0 10px 34px rgba(0,0,0,.45);display:none}
      #v078WaterPrompt.show{display:block}#v078WaterPrompt strong{display:block;font-size:15px}#v078WaterPrompt span{display:block;color:#a8cbd8;font-size:10px;margin-top:3px}
      #v078WaterPrompt .v078PromptButtons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:7px;margin-top:9px}#v078WaterPrompt button{margin:0!important;padding:9px!important}
      @media(max-width:390px){#diet .v078HydrationGrid{grid-template-columns:1fr}.v078HydrationGrid .wide{grid-column:auto}}
    `;document.head.appendChild(s);
  }

  function installDietUi(){
    if($('v078HydrationCard'))return true;
    const root=$('v076DietRoot');if(!root)return false;
    const card=document.createElement('div');card.id='v078HydrationCard';card.className='card';
    card.innerHTML=`
      <div class="eyebrow">NAWODNIENIE</div>
      <div class="v078WaterTop"><div><h2 style="margin-bottom:5px">Woda dzisiaj</h2><div id="v078WaterValue" class="v078WaterValue">0 <small>/ 2500 ml</small></div></div><button id="v078UndoWater" class="secondary" type="button">−250</button></div>
      <div class="v078WaterBar"><i id="v078WaterProgress" style="width:0%"></i></div>
      <div class="v078QuickWater"><button type="button" class="primary" data-water-add="100">+100 ml</button><button type="button" class="primary" data-water-add="250">+250 ml</button><button type="button" class="primary" data-water-add="330">+330 ml</button><button type="button" class="primary" data-water-add="500">+500 ml</button></div>
      <div class="v078HydrationGrid">
        <div><label>Cel dzienny [ml]</label><input id="v078WaterTarget" type="number" min="500" max="6000" step="100" inputmode="numeric"></div>
        <div><label>Przypomnienie co</label><select id="v078WaterInterval"><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option></select></div>
        <label class="switchRow wide"><input id="v078WaterReminders" type="checkbox"><span>Przypominaj o wodzie poza treningiem</span></label>
        <div><label>Cisza od</label><input id="v078QuietStart" type="time"></div>
        <div><label>Cisza do</label><input id="v078QuietEnd" type="time"></div>
        <label class="switchRow wide"><input id="v078WorkoutWater" type="checkbox"><span>Przypominaj „ŁYK WODY” podczas treningu</span></label>
        <div class="wide"><label>Częstotliwość podczas treningu</label><select id="v078WorkoutFrequency"><option value="rare">Rzadko — ok. 4 serie / 20 min</option><option value="normal">Normalnie — ok. 3 serie / 15 min</option><option value="often">Często — ok. 2 serie / 10 min</option></select></div>
      </div>
      <button id="v078SaveHydration" class="secondary bigBtn" type="button">ZAPISZ USTAWIENIA WODY</button>
      <div class="v078HydrationNote">2500 ml to tylko edytowalny cel startowy aplikacji, a nie uniwersalne minimum medyczne. Zapotrzebowanie zależy m.in. od aktywności, temperatury i indywidualnych potrzeb.</div>
      <div class="eyebrow" style="margin-top:16px">OSTATNIE 7 DNI</div><div id="v078WaterHistory" class="v078History"></div>`;

    const hero=root.querySelector('.card');
    if(hero&&hero.nextSibling)root.insertBefore(card,hero.nextSibling);else root.appendChild(card);
    card.querySelectorAll('[data-water-add]').forEach(b=>b.addEventListener('click',()=>addWater(Number(b.dataset.waterAdd)||0)));
    $('v078UndoWater').addEventListener('click',()=>addWater(-250));
    $('v078SaveHydration').addEventListener('click',saveConfig);
    render();
    return true;
  }

  function installWorkoutPrompt(){
    if($('v078WaterPrompt'))return;
    const box=document.createElement('div');box.id='v078WaterPrompt';
    box.innerHTML=`<strong>💧 ŁYK WODY</strong><span>Krótka przerwa na nawodnienie. Możesz od razu dopisać ilość.</span><div class="v078PromptButtons"><button class="primary" type="button" data-prompt-water="100">+100 ml</button><button class="primary" type="button" data-prompt-water="150">+150 ml</button><button class="primary" type="button" data-prompt-water="250">+250 ml</button><button id="v078WaterPromptClose" class="secondary" type="button">×</button></div>`;
    document.body.appendChild(box);
    box.querySelectorAll('[data-prompt-water]').forEach(b=>b.addEventListener('click',()=>{addWater(Number(b.dataset.promptWater)||0);hidePrompt();}));
    $('v078WaterPromptClose').addEventListener('click',hidePrompt);
  }

  function render(){
    const s=readState();if(!$('v078WaterValue'))return;
    const target=Math.max(1,Number(s.targetMl)||2500),today=Math.max(0,Number(s.todayMl)||0),pct=Math.min(100,Math.round(today/target*100));
    $('v078WaterValue').innerHTML=`${today} <small>/ ${target} ml</small>`;
    $('v078WaterProgress').style.width=pct+'%';
    $('v078WaterTarget').value=target;
    $('v078WaterReminders').checked=!!s.remindersEnabled;
    $('v078WaterInterval').value=String(s.intervalMinutes||90);
    $('v078QuietStart').value=minToTime(s.quietStartMinutes);
    $('v078QuietEnd').value=minToTime(s.quietEndMinutes);
    $('v078WorkoutWater').checked=s.workoutEnabled!==false;
    $('v078WorkoutFrequency').value=s.workoutFrequency||'normal';
    $('v078UndoWater').disabled=today<=0;
    const history=Array.isArray(s.history)?s.history:[];
    $('v078WaterHistory').innerHTML=history.length?history.map(row=>{
      const ml=Math.max(0,Number(row.ml)||0),p=Math.min(100,Math.round(ml/target*100));
      return `<div class="v078WaterHistoryRow"><span>${dayLabel(row.date)}</span><div><b>${ml} ml</b><br><small>${p}% celu</small></div><small>${ml>=target?'CEL ✓':''}</small></div>`;
    }).join(''):'<div class="v078HydrationNote">Historia pojawi się po pierwszych wpisach.</div>';
    mirror(s);
  }

  function addWater(amount){
    let s=readState();
    try{
      if(nativeAvailable()&&TrenerHydration.addWater){TrenerHydration.addWater(Math.trunc(amount));s=readState();}
      else{s.todayMl=Math.max(0,(Number(s.todayMl)||0)+amount);s.updatedAt=Date.now();mirror(s);}
    }catch(e){}
    render();
    try{toast((amount>=0?'Woda +':'Woda ')+amount+' ml.');}catch(e){}
  }

  function saveConfig(){
    const old=readState(),target=clamp($('v078WaterTarget').value||2500,500,6000),enabled=$('v078WaterReminders').checked,interval=Number($('v078WaterInterval').value)||90;
    const quietStart=timeToMin($('v078QuietStart').value,1320),quietEnd=timeToMin($('v078QuietEnd').value,420),workout=$('v078WorkoutWater').checked,freq=$('v078WorkoutFrequency').value||'normal';
    try{
      if(nativeAvailable()&&TrenerHydration.saveConfig)TrenerHydration.saveConfig(target,enabled,interval,quietStart,quietEnd,workout,freq);
      else{Object.assign(old,{targetMl:target,remindersEnabled:enabled,intervalMinutes:interval,quietStartMinutes:quietStart,quietEndMinutes:quietEnd,workoutEnabled:workout,workoutFrequency:freq,updatedAt:Date.now()});mirror(old);}
    }catch(e){}
    setTimeout(render,80);try{toast('Ustawienia nawodnienia zapisane.');}catch(e){}
  }

  function readRunning(){try{return !!running}catch(e){return false}}
  function elapsed(){try{return typeof elapsedMs==='function'?Math.max(0,Number(elapsedMs())||0):0}catch(e){return 0}}
  function ownRecordCount(){
    try{
      if(!Array.isArray(records))return 0;
      if(typeof net!=='undefined'&&net&&net.active)return records.filter(r=>Number(r.athlete)===Number(net.localAthlete)).length;
      return records.length;
    }catch(e){return 0}
  }
  function thresholds(freq){return freq==='often'?{sets:2,ms:10*60000}:freq==='rare'?{sets:4,ms:20*60000}:{sets:3,ms:15*60000};}
  function showPrompt(){
    const box=$('v078WaterPrompt');if(!box)return;box.classList.add('show');clearTimeout(promptTimer);promptTimer=setTimeout(hidePrompt,9000);
    try{window.TrenerFeedback077?.feedback?.('water');}catch(e){}
  }
  function hidePrompt(){const box=$('v078WaterPrompt');if(box)box.classList.remove('show');clearTimeout(promptTimer);}

  function monitorWorkout(){
    const run=readRunning(),count=ownRecordCount(),ms=elapsed();
    if(run&&!wasRunning){lastRecordCount=count;lastPromptCount=count;lastPromptElapsed=ms;}
    if(!run&&wasRunning){hidePrompt();lastRecordCount=0;lastPromptCount=0;lastPromptElapsed=0;}
    if(run&&count>lastRecordCount){
      const s=readState(),th=thresholds(s.workoutFrequency);
      if(s.workoutEnabled!==false&&((count-lastPromptCount)>=th.sets||(ms-lastPromptElapsed)>=th.ms)){
        lastPromptCount=count;lastPromptElapsed=ms;showPrompt();
      }
    }
    wasRunning=run;lastRecordCount=count;
  }

  function boot(){
    installCss();installWorkoutPrompt();
    let tries=0;const t=setInterval(()=>{tries++;if(installDietUi()||tries>50)clearInterval(t);},100);
    setInterval(monitorWorkout,400);
    document.querySelectorAll('.tab[data-tab="diet"]').forEach(b=>b.addEventListener('click',()=>setTimeout(render,50)));
  }

  window.TrenerHydration078={render,addWater,state:readState};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
