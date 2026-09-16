(function(){
  'use strict';
  const KEY='trainer3.weekPlan.v070';
  const $=id=>document.getElementById(id);
  const DAYS=[['1','Poniedziałek'],['2','Wtorek'],['3','Środa'],['4','Czwartek'],['5','Piątek'],['6','Sobota'],['0','Niedziela']];
  const PARTS={
    chest:{label:'Klatka',ids:['bench','incline','pushups']},
    back:{label:'Plecy',ids:['row','underrow']},
    biceps:{label:'Biceps',ids:['curl','seatedcurl','reversecurl','curl21','iso90']},
    triceps:{label:'Triceps',ids:['closebench']},
    shoulders:{label:'Barki',ids:['ohp']},
    legs:{label:'Nogi',ids:['squat','lunges']},
    core:{label:'Brzuch',ids:['plank']}
  };
  const state={day:String(new Date().getDay()),mode:'parts',cfg:null,baseGetPlan:null,baseRefresh:null};
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')||{days:{}};}catch(e){return {days:{}};}}
  function save(){localStorage.setItem(KEY,JSON.stringify(state.cfg));}
  function exById(id){try{return JSON.parse(JSON.stringify(exerciseLibrary.find(x=>x.id===id)));}catch(e){return null;}}
  function unique(a){return [...new Set(a.filter(Boolean))];}
  function planForDay(day){
    const d=state.cfg?.days?.[String(day)];if(!d)return null;
    let ids=[];
    if(d.mode==='parts')ids=unique((d.parts||[]).flatMap(k=>PARTS[k]?.ids||[]));
    else ids=unique(d.exerciseIds||[]);
    const ex=ids.map(exById).filter(Boolean);if(!ex.length)return null;
    const label=DAYS.find(x=>x[0]===String(day))?.[1]||'Dzień';
    const detail=d.mode==='parts'?(d.parts||[]).map(k=>PARTS[k]?.label).filter(Boolean).join(' + '):'wybrane ćwiczenia';
    return {title:`${label} — ${detail||'własny trening'}`,ex};
  }
  function today(){return String(new Date().getDay());}
  function installCss(){if($('v070PlannerStyle'))return;const s=document.createElement('style');s.id='v070PlannerStyle';s.textContent=`
    #v070Planner .v070Days{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin:8px 0 12px}#v070Planner .v070Days button{padding:8px 2px;min-height:38px;font-size:10px}#v070Planner .v070Days button.active{border-color:#b74447;color:#fff;background:#2a1112}
    .v070ModeRow{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}.v070ModeRow button.active{border-color:#b74447;background:#2a1112;color:#fff}.v070PickGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.v070Pick{display:flex;gap:8px;align-items:flex-start;border:1px solid #303030;border-radius:10px;padding:8px;background:#0d0d0d;font-size:11px}.v070Pick input{margin-top:2px}.v070Pick strong{display:block}.v070Pick span{display:block;color:#888;font-size:10px;margin-top:2px}.v070PlanSummary{margin:8px 0;padding:9px;border:1px solid #333;border-radius:10px;color:#aaa;font-size:11px;line-height:1.4}.v070Saved{color:#70df98}
    @media(max-width:520px){#v070Planner .v070Days{grid-template-columns:repeat(4,1fr)}.v070PickGrid{grid-template-columns:1fr}}
  `;document.head.appendChild(s);}
  function installUi(){
    installCss();const screen=$('plan');if(!screen||$('v070Planner'))return;
    const card=document.createElement('div');card.id='v070Planner';card.className='card';card.innerHTML=`
      <div class="eyebrow">0.7.0 BETA • PLAN TYGODNIA</div><h2>Ułóż każdy dzień po swojemu</h2>
      <p class="hint">Wybierz dzień, a potem układaj trening całymi partiami albo konkretnymi ćwiczeniami. Zapisane dni pojawią się na ekranie Start.</p>
      <div id="v070Days" class="v070Days"></div>
      <div class="v070ModeRow"><button id="v070ByParts" class="secondary">PARTIAMI</button><button id="v070ByExercises" class="secondary">ĆWICZENIAMI</button></div>
      <div id="v070Picks" class="v070PickGrid"></div><div id="v070PlanSummary" class="v070PlanSummary"></div>
      <button id="v070SaveDay" class="primary">ZAPISZ TEN DZIEŃ</button><button id="v070ClearDay" class="secondary">WYCZYŚĆ TEN DZIEŃ</button>`;
    screen.insertBefore(card,screen.firstChild);
    $('v070ByParts').onclick=()=>{state.mode='parts';renderEditor();};$('v070ByExercises').onclick=()=>{state.mode='exercises';renderEditor();};
    $('v070SaveDay').onclick=saveDay;$('v070ClearDay').onclick=clearDay;renderDays();selectDay(state.day);
  }
  function renderDays(){const host=$('v070Days');if(!host)return;host.innerHTML=DAYS.map(([k,n])=>`<button class="secondary ${k===state.day?'active':''}" data-day="${k}">${n.slice(0,3)}</button>`).join('');host.querySelectorAll('button').forEach(b=>b.onclick=()=>selectDay(b.dataset.day));}
  function selectDay(day){state.day=String(day);const d=state.cfg.days?.[state.day];state.mode=d?.mode==='exercises'?'exercises':'parts';renderDays();renderEditor();}
  function renderEditor(){
    const d=state.cfg.days?.[state.day]||{};$('v070ByParts')?.classList.toggle('active',state.mode==='parts');$('v070ByExercises')?.classList.toggle('active',state.mode==='exercises');const host=$('v070Picks');if(!host)return;
    if(state.mode==='parts'){
      const selected=new Set(d.mode==='parts'?(d.parts||[]):[]);host.innerHTML=Object.entries(PARTS).map(([k,p])=>`<label class="v070Pick"><input class="v070Part" type="checkbox" value="${k}" ${selected.has(k)?'checked':''}><div><strong>${p.label}</strong><span>${p.ids.map(id=>exerciseLibrary.find(x=>x.id===id)?.n).filter(Boolean).join(', ')}</span></div></label>`).join('');
    }else{
      const selected=new Set(d.mode==='exercises'?(d.exerciseIds||[]):[]);host.innerHTML=exerciseLibrary.map(ex=>`<label class="v070Pick"><input class="v070Exercise" type="checkbox" value="${ex.id}" ${selected.has(ex.id)?'checked':''}><div><strong>${escapeHtml(ex.n)}</strong><span>${ex.sets} serie • ${ex.min}${ex.min===ex.max?'':'–'+ex.max} ${ex.time?'sek.':'powt.'}</span></div></label>`).join('');
    }
    host.querySelectorAll('input').forEach(x=>x.onchange=renderSummary);renderSummary();
  }
  function currentIds(){if(state.mode==='parts'){const parts=[...document.querySelectorAll('.v070Part:checked')].map(x=>x.value);return {parts,ids:unique(parts.flatMap(k=>PARTS[k]?.ids||[]))};}return {parts:[],ids:[...document.querySelectorAll('.v070Exercise:checked')].map(x=>x.value)};}
  function renderSummary(){const s=$('v070PlanSummary');if(!s)return;const {parts,ids}=currentIds();const names=ids.map(id=>exerciseLibrary.find(x=>x.id===id)?.n).filter(Boolean);s.innerHTML=names.length?`<b>${names.length} ćwiczeń</b><br>${escapeHtml(names.join(' → '))}`:'Wybierz partie albo ćwiczenia dla tego dnia.';if(parts.length)s.innerHTML+=`<br><span class="v070Saved">Partie: ${escapeHtml(parts.map(k=>PARTS[k]?.label).filter(Boolean).join(' + '))}</span>`;}
  function saveDay(){const {parts,ids}=currentIds();if(!ids.length){toast('Wybierz przynajmniej jedną partię albo ćwiczenie.');return;}state.cfg.days[state.day]={mode:state.mode,parts,exerciseIds:ids};save();refreshStartOptions();renderSummary();toast('Plan dnia zapisany.');}
  function clearDay(){delete state.cfg.days[state.day];save();refreshStartOptions();renderEditor();toast('Plan tego dnia wyczyszczony.');}
  function refreshStartOptions(){
    const sel=$('planSelect');if(!sel)return;sel.querySelectorAll('option[data-v070-day]').forEach(o=>o.remove());
    const configured=DAYS.filter(([k])=>!!planForDay(k));configured.forEach(([k,name])=>{const p=planForDay(k),o=document.createElement('option');o.value='v070day:'+k;o.dataset.v070Day=k;o.textContent=(k===today()?'DZISIAJ • ':'')+p.title;sel.appendChild(o);});
    const t=planForDay(today());if(t&&!sel.value.startsWith('v070day:')){const settings=JSON.parse(localStorage.getItem('trainer3.settings')||'{}');if(settings.planKey&&settings.planKey.startsWith('v070day:'))sel.value='v070day:'+today();}
  }
  function wrapPlans(){
    if(!state.baseGetPlan&&typeof getPlan==='function'){state.baseGetPlan=getPlan;getPlan=function(key){if(String(key).startsWith('v070day:'))return planForDay(String(key).split(':')[1]);return state.baseGetPlan.apply(this,arguments);};}
    if(!state.baseRefresh&&typeof refreshCustomOption==='function'){state.baseRefresh=refreshCustomOption;refreshCustomOption=function(){const out=state.baseRefresh.apply(this,arguments);refreshStartOptions();return out;};}
  }
  function boot(){state.cfg=load();installUi();wrapPlans();refreshStartOptions();setInterval(()=>{installUi();wrapPlans();refreshStartOptions();},1200);}
  window.TrenerBetaPlanner={load:()=>JSON.parse(JSON.stringify(state.cfg||load())),planForDay,parts:PARTS};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
