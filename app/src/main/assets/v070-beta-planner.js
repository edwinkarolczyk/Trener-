(function(){
  'use strict';

  const KEY='trainer3.weekPlan.v070';
  const $=id=>document.getElementById(id);
  const DAYS=[
    ['1','Poniedziałek','Pon'],['2','Wtorek','Wt'],['3','Środa','Śr'],['4','Czwartek','Czw'],
    ['5','Piątek','Pt'],['6','Sobota','Sob'],['0','Niedziela','Nd']
  ];
  const PARTS={
    chest:{label:'Klatka',ids:['bench','incline','pushups']},
    back:{label:'Plecy',ids:['row','underrow']},
    biceps:{label:'Biceps',ids:['curl','seatedcurl','reversecurl','curl21','iso90']},
    triceps:{label:'Triceps',ids:['closebench']},
    shoulders:{label:'Barki',ids:['ohp']},
    legs:{label:'Nogi',ids:['squat','lunges']},
    core:{label:'Brzuch',ids:['plank']}
  };
  const PRESETS={
    mon:{label:'Klatka + triceps'},
    wed:{label:'Plecy + biceps'},
    fri:{label:'Barki + nogi + brzuch'},
    biceps:{label:'Biceps'}
  };

  const state={
    cfg:null,view:'week',editDay:null,editKind:'off',editPreset:'mon',editParts:[],editExercises:[],
    exerciseQuery:'',baseGetPlan:null,baseRefresh:null,legacyCards:[],customCard:null,customEditorOpen:false,
    startOptionsInitialized:false
  };

  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function unique(a){return [...new Set((a||[]).filter(Boolean))];}
  function dayMeta(day){return DAYS.find(x=>x[0]===String(day))||['','Dzień','—'];}
  function today(){return String(new Date().getDay());}
  function exById(id){try{return clone(exerciseLibrary.find(x=>x.id===id)||null);}catch(e){return null;}}
  function read(){
    let cfg={days:{}};
    try{cfg=JSON.parse(localStorage.getItem(KEY)||'null')||cfg;}catch(e){}
    if(!cfg.days||typeof cfg.days!=='object')cfg.days={};
    let changed=false;
    for(const [day,d] of Object.entries(cfg.days)){
      if(!d||typeof d!=='object')continue;
      if(!d.kind){
        if(d.mode==='parts')d.kind='parts';
        else if(d.mode==='exercises')d.kind='exercises';
        else d.kind='off';
        changed=true;
      }
      if(d.kind==='parts'&&!Array.isArray(d.parts)){d.parts=[];changed=true;}
      if(d.kind==='exercises'&&!Array.isArray(d.exerciseIds)){d.exerciseIds=[];changed=true;}
    }
    if(changed){try{localStorage.setItem(KEY,JSON.stringify(cfg));}catch(e){}}
    return cfg;
  }
  function write(){try{localStorage.setItem(KEY,JSON.stringify(state.cfg));}catch(e){}}

  function rawBasePlan(key){
    try{
      if(state.baseGetPlan)return clone(state.baseGetPlan(key));
      if(key==='custom'&&typeof getCustomPlan==='function')return clone(getCustomPlan());
      if(typeof plans!=='undefined'&&plans[key])return clone(plans[key]);
    }catch(e){}
    return null;
  }

  function normalizeTitle(key,plan){
    if(PRESETS[key])return PRESETS[key].label;
    const title=String(plan?.title||'Mój trening').replace(/^\s*(Poniedziałek|Wtorek|Środa|Czwartek|Piątek|Sobota|Niedziela)\s*[—-]\s*/i,'');
    return title||'Mój trening';
  }

  function planForDay(day){
    const d=state.cfg?.days?.[String(day)];
    if(!d||d.kind==='off')return null;
    if(d.kind==='preset'){
      const p=rawBasePlan(d.presetKey);
      if(!p||!Array.isArray(p.ex)||!p.ex.length)return null;
      p.title=normalizeTitle(d.presetKey,p);
      return p;
    }
    let ids=[];
    if(d.kind==='parts')ids=unique((d.parts||[]).flatMap(k=>PARTS[k]?.ids||[]));
    else if(d.kind==='exercises')ids=unique(d.exerciseIds||[]);
    const ex=ids.map(exById).filter(Boolean);
    if(!ex.length)return null;
    const title=d.kind==='parts'
      ?(d.parts||[]).map(k=>PARTS[k]?.label).filter(Boolean).join(' + ')
      :(d.title||'Własny zestaw');
    return {title:title||'Własny trening',ex};
  }

  function assignmentLabel(day){
    const d=state.cfg?.days?.[String(day)];
    if(!d||d.kind==='off')return 'Wolne';
    const p=planForDay(day);
    return p?.title||'Nieukończony plan';
  }

  function installCss(){
    if($('v070PlannerStyle'))return;
    const s=document.createElement('style');s.id='v070PlannerStyle';s.textContent=`
      #v070Planner{padding:0!important;overflow:hidden}.v070Top{padding:18px 18px 12px}.v070Top h2{margin:4px 0 7px}.v070Tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:0 18px 16px}.v070Tabs button{min-height:43px;padding:7px 5px;font-size:10px}.v070Tabs button.active{background:#ef2f34;color:#fff;border-color:#ef2f34}
      .v070Pane{padding:0 18px 18px}.v070Week{display:grid;gap:8px}.v070DayRow{width:100%;display:grid;grid-template-columns:64px 1fr 24px;align-items:center;gap:10px;text-align:left;padding:14px 14px;border:1px solid #303030;border-radius:14px;background:#0d0d0d;color:#fff}.v070DayRow.today{border-color:#6c3436}.v070DayRow .day{font-weight:900;color:#ddd}.v070DayRow.today .day{color:#ff5a5f}.v070DayRow .plan{font-size:12px;font-weight:900}.v070DayRow .plan.off{color:#777;font-weight:700}.v070DayRow .arrow{font-size:20px;color:#777;text-align:right}
      .v070EditHead{display:flex;align-items:center;gap:10px;margin-bottom:12px}.v070EditHead button{width:auto;min-width:46px}.v070EditHead strong{font-size:16px}.v070ChoiceGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v070Choice{min-height:78px;text-align:left;padding:11px;border:1px solid #303030;border-radius:13px;background:#0d0d0d;color:#fff}.v070Choice.active{border-color:#ef3d42;background:#271112}.v070Choice strong{display:block;font-size:12px}.v070Choice span{display:block;color:#888;font-size:10px;margin-top:4px;line-height:1.35}
      .v070Detail{margin-top:12px;padding-top:12px;border-top:1px solid #292929}.v070RadioList{display:grid;gap:7px}.v070Radio,.v070Pick{display:flex;gap:10px;align-items:center;border:1px solid #303030;border-radius:12px;padding:11px;background:#0d0d0d}.v070Radio input,.v070Pick input{width:22px;height:22px;flex:0 0 auto}.v070Radio strong,.v070Pick strong{font-size:12px}.v070PartGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v070PartGrid .v070Pick{align-items:flex-start}.v070Pick span{display:block;color:#777;font-size:9px;margin-top:3px;line-height:1.35}
      .v070Search{margin:0 0 10px!important}.v070ExerciseList{display:grid;gap:7px;max-height:52vh;overflow:auto;padding-right:2px}.v070Actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.v070Summary{padding:10px 12px;border:1px solid #2d2d2d;border-radius:12px;background:#0a0a0a;color:#aaa;font-size:10px;line-height:1.45;margin-top:10px}.v070Summary b{color:#fff}
      .v070MineHeader{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px}.v070MineHeader button{width:auto}.v070PresetCards{display:grid;gap:8px;margin-bottom:12px}.v070PresetCard{border:1px solid #303030;border-radius:12px;padding:12px;background:#0d0d0d}.v070PresetCard b{display:block}.v070PresetCard span{display:block;color:#777;font-size:10px;margin-top:3px}.v070CustomHost>.card{margin:0!important}.v070LibraryGroup{margin:14px 0}.v070LibraryGroup h3{margin:0 0 7px;color:#ef4448;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.v070LibraryItem{padding:10px 12px;border:1px solid #2c2c2c;border-radius:11px;margin-bottom:6px;background:#0d0d0d}.v070LibraryItem b{display:block;font-size:11px}.v070LibraryItem span{font-size:9px;color:#777}
      #plan>.v070LegacyHidden{display:none!important}
      @media(max-width:520px){.v070ChoiceGrid,.v070PartGrid{grid-template-columns:1fr 1fr}.v070DayRow{grid-template-columns:54px 1fr 20px}.v070Tabs{gap:5px}.v070Tabs button{font-size:9px}}
    `;document.head.appendChild(s);
  }

  function captureLegacy(){
    const screen=$('plan');if(!screen)return;
    if(state.legacyCards.length)return;
    state.legacyCards=[...screen.children].filter(el=>el.classList?.contains('card')&&el.id!=='v070Planner');
    state.customCard=state.legacyCards.find(c=>c.querySelector('#exerciseBuilder'))||null;
    state.legacyCards.forEach(c=>c.classList.add('v070LegacyHidden'));
  }

  function installUi(){
    installCss();const screen=$('plan');if(!screen)return;
    captureLegacy();
    if($('v070Planner'))return;
    const root=document.createElement('div');root.id='v070Planner';root.className='card';root.innerHTML=`
      <div class="v070Top"><div class="eyebrow">0.7.0 BETA • PLAN</div><h2>Twój plan</h2><p class="hint">Najpierw wybierz dzień. Szczegóły edytujesz dopiero wtedy, gdy ich potrzebujesz.</p></div>
      <div class="v070Tabs"><button id="v070TabWeek" class="secondary">TYDZIEŃ</button><button id="v070TabMine" class="secondary">MOJE TRENINGI</button><button id="v070TabLibrary" class="secondary">ĆWICZENIA</button></div>
      <div id="v070Pane" class="v070Pane"></div>`;
    screen.insertBefore(root,screen.firstChild);
    $('v070TabWeek').onclick=()=>showView('week');$('v070TabMine').onclick=()=>showView('mine');$('v070TabLibrary').onclick=()=>showView('library');
    showView('week');
  }

  function setTabState(){
    $('v070TabWeek')?.classList.toggle('active',state.view==='week');
    $('v070TabMine')?.classList.toggle('active',state.view==='mine');
    $('v070TabLibrary')?.classList.toggle('active',state.view==='library');
  }
  function showView(view){state.view=view;state.editDay=null;setTabState();renderPane();}

  function renderPane(){
    const pane=$('v070Pane');if(!pane)return;
    if(state.view==='week'){renderWeek(pane);return;}
    if(state.view==='mine'){renderMine(pane);return;}
    renderLibrary(pane);
  }

  function renderWeek(pane){
    if(state.editDay!==null){renderDayEditor(pane);return;}
    pane.innerHTML=`<div class="v070Week">${DAYS.map(([k,name,short])=>{
      const label=assignmentLabel(k),off=label==='Wolne',isToday=k===today();
      return `<button class="v070DayRow ${isToday?'today':''}" data-day="${k}"><span class="day">${esc(short)}</span><span class="plan ${off?'off':''}">${esc(label)}</span><span class="arrow">›</span></button>`;
    }).join('')}</div>`;
    pane.querySelectorAll('.v070DayRow').forEach(b=>b.onclick=()=>openDay(b.dataset.day));
  }

  function openDay(day){
    state.editDay=String(day);const d=state.cfg.days?.[state.editDay]||{kind:'off'};
    state.editKind=['preset','parts','exercises'].includes(d.kind)?d.kind:'off';
    state.editPreset=d.presetKey||'mon';state.editParts=[...(d.parts||[])];state.editExercises=[...(d.exerciseIds||[])];state.exerciseQuery='';renderPane();
  }

  function renderDayEditor(pane){
    const [,name]=dayMeta(state.editDay);
    pane.innerHTML=`
      <div class="v070EditHead"><button id="v070Back" class="secondary">‹</button><strong>${esc(name)}</strong></div>
      <div class="v070ChoiceGrid">
        ${choice('off','Wolne','Bez zaplanowanego treningu')}
        ${choice('preset','Gotowy trening','A/B/C, biceps lub własny zapisany zestaw')}
        ${choice('parts','Partie','Wybierz np. klatkę + triceps')}
        ${choice('exercises','Ćwiczenia','Wybierz konkretne ćwiczenia')}
      </div>
      <div id="v070DayDetail" class="v070Detail"></div>
      <div id="v070DaySummary" class="v070Summary"></div>
      <div class="v070Actions"><button id="v070Cancel" class="secondary">ANULUJ</button><button id="v070Done" class="primary">GOTOWE</button></div>`;
    $('v070Back').onclick=$('v070Cancel').onclick=()=>{state.editDay=null;renderPane();};
    pane.querySelectorAll('.v070Choice').forEach(b=>b.onclick=()=>{state.editKind=b.dataset.kind;renderDayEditor(pane);});
    $('v070Done').onclick=saveEditedDay;renderDayDetail();renderDaySummary();
  }
  function choice(kind,title,desc){return `<button class="v070Choice ${state.editKind===kind?'active':''}" data-kind="${kind}"><strong>${esc(title)}</strong><span>${esc(desc)}</span></button>`;}

  function presetOptions(){
    const out=Object.entries(PRESETS).map(([key,v])=>({key,label:v.label,plan:rawBasePlan(key)})).filter(x=>x.plan);
    const custom=rawBasePlan('custom');if(custom)out.push({key:'custom',label:normalizeTitle('custom',custom),plan:custom});
    return out;
  }

  function renderDayDetail(){
    const host=$('v070DayDetail');if(!host)return;
    if(state.editKind==='off'){host.innerHTML='<p class="hint">Ten dzień pozostanie wolny. Niczego więcej nie musisz ustawiać.</p>';return;}
    if(state.editKind==='preset'){
      const opts=presetOptions();host.innerHTML=`<div class="v070RadioList">${opts.map(o=>`<label class="v070Radio"><input class="v070Preset" type="radio" name="v070Preset" value="${esc(o.key)}" ${o.key===state.editPreset?'checked':''}><strong>${esc(o.label)}</strong></label>`).join('')}</div>`;
      host.querySelectorAll('.v070Preset').forEach(x=>x.onchange=()=>{state.editPreset=x.value;renderDaySummary();});return;
    }
    if(state.editKind==='parts'){
      const selected=new Set(state.editParts);host.innerHTML=`<div class="v070PartGrid">${Object.entries(PARTS).map(([k,p])=>`<label class="v070Pick"><input class="v070Part" type="checkbox" value="${k}" ${selected.has(k)?'checked':''}><div><strong>${esc(p.label)}</strong><span>${esc(p.ids.map(id=>exerciseLibrary.find(x=>x.id===id)?.n).filter(Boolean).join(', '))}</span></div></label>`).join('')}</div>`;
      host.querySelectorAll('.v070Part').forEach(x=>x.onchange=()=>{state.editParts=[...host.querySelectorAll('.v070Part:checked')].map(i=>i.value);renderDaySummary();});return;
    }
    host.innerHTML=`<input id="v070ExerciseSearch" class="v070Search" placeholder="Szukaj ćwiczenia, np. klatka, sztanga, brzuch…" value="${esc(state.exerciseQuery)}"><div id="v070ExerciseList" class="v070ExerciseList"></div>`;
    $('v070ExerciseSearch').oninput=e=>{state.exerciseQuery=e.target.value;renderExerciseChoices();};renderExerciseChoices();
  }

  function exercisePartLabel(id){for(const p of Object.values(PARTS))if(p.ids.includes(id))return p.label;return 'Inne';}
  function renderExerciseChoices(){
    const host=$('v070ExerciseList');if(!host)return;const q=state.exerciseQuery.trim().toLowerCase();const selected=new Set(state.editExercises);
    const rows=(exerciseLibrary||[]).filter(ex=>!q||`${ex.n} ${exercisePartLabel(ex.id)}`.toLowerCase().includes(q));
    host.innerHTML=rows.map(ex=>`<label class="v070Pick"><input class="v070Exercise" type="checkbox" value="${ex.id}" ${selected.has(ex.id)?'checked':''}><div><strong>${esc(ex.n)}</strong><span>${esc(exercisePartLabel(ex.id))} • ${Number(ex.sets)||1} serie • ${ex.min}${ex.min===ex.max?'':'–'+ex.max} ${ex.time?'sek.':'powt.'}</span></div></label>`).join('')||'<p class="hint">Brak pasujących ćwiczeń.</p>';
    host.querySelectorAll('.v070Exercise').forEach(x=>x.onchange=()=>{if(x.checked&&!state.editExercises.includes(x.value))state.editExercises.push(x.value);if(!x.checked)state.editExercises=state.editExercises.filter(id=>id!==x.value);renderDaySummary();});
  }

  function draftPlan(){
    if(state.editKind==='off')return null;
    if(state.editKind==='preset'){const p=rawBasePlan(state.editPreset);if(p)p.title=normalizeTitle(state.editPreset,p);return p;}
    if(state.editKind==='parts'){
      const ids=unique(state.editParts.flatMap(k=>PARTS[k]?.ids||[]));const ex=ids.map(exById).filter(Boolean);return ex.length?{title:state.editParts.map(k=>PARTS[k]?.label).filter(Boolean).join(' + '),ex}:null;
    }
    const ex=unique(state.editExercises).map(exById).filter(Boolean);return ex.length?{title:'Własny zestaw',ex}:null;
  }

  function renderDaySummary(){
    const s=$('v070DaySummary');if(!s)return;const p=draftPlan();
    if(!p){s.innerHTML=state.editKind==='off'?'<b>Wolne</b><br>Brak treningu w tym dniu.':'Wybierz przynajmniej jedną pozycję.';return;}
    s.innerHTML=`<b>${esc(p.title)}</b><br>${p.ex.length} ćwiczeń • ${esc(p.ex.map(x=>x.n).join(' → '))}`;
  }

  function saveEditedDay(){
    if(state.editKind==='off')delete state.cfg.days[state.editDay];
    else if(state.editKind==='preset'){
      if(!rawBasePlan(state.editPreset)){toast('Ten trening nie jest dostępny.');return;}
      state.cfg.days[state.editDay]={kind:'preset',presetKey:state.editPreset};
    }else if(state.editKind==='parts'){
      if(!state.editParts.length){toast('Wybierz przynajmniej jedną partię.');return;}
      state.cfg.days[state.editDay]={kind:'parts',parts:unique(state.editParts)};
    }else{
      if(!state.editExercises.length){toast('Wybierz przynajmniej jedno ćwiczenie.');return;}
      state.cfg.days[state.editDay]={kind:'exercises',exerciseIds:unique(state.editExercises),title:'Własny zestaw'};
    }
    write();refreshStartOptions();state.editDay=null;renderPane();toast('Plan dnia zapisany.');
  }

  function renderMine(pane){
    const custom=rawBasePlan('custom');pane.innerHTML=`
      <div class="v070MineHeader"><div><b>Gotowe zestawy</b><div class="hint">Możesz przypisać je do dowolnego dnia.</div></div><button id="v070ToggleCustom" class="secondary">${state.customEditorOpen?'SCHOWAJ EDYTOR':'NOWY / EDYTUJ'}</button></div>
      <div class="v070PresetCards">${Object.entries(PRESETS).map(([k,v])=>{const p=rawBasePlan(k);return p?`<div class="v070PresetCard"><b>${esc(v.label)}</b><span>${p.ex.length} ćwiczeń • ${esc(p.ex.map(x=>x.n).join(', '))}</span></div>`:'';}).join('')}${custom?`<div class="v070PresetCard"><b>${esc(normalizeTitle('custom',custom))}</b><span>${custom.ex?.length||0} ćwiczeń • własny zestaw</span></div>`:''}</div>
      <div id="v070CustomHost" class="v070CustomHost"></div>`;
    $('v070ToggleCustom').onclick=()=>{state.customEditorOpen=!state.customEditorOpen;renderMine(pane);};
    const host=$('v070CustomHost');if(state.customCard&&host&&state.customEditorOpen){state.customCard.classList.remove('v070LegacyHidden');host.appendChild(state.customCard);}else if(state.customCard)state.customCard.classList.add('v070LegacyHidden');
  }

  function renderLibrary(pane){
    pane.innerHTML=`<input id="v070LibrarySearch" class="v070Search" placeholder="Szukaj w bibliotece ćwiczeń…"><div id="v070Library"></div>`;
    $('v070LibrarySearch').oninput=renderLibraryItems;renderLibraryItems();
  }
  function renderLibraryItems(){
    const host=$('v070Library');if(!host)return;const q=($('v070LibrarySearch')?.value||'').trim().toLowerCase();
    host.innerHTML=Object.entries(PARTS).map(([k,p])=>{
      const items=p.ids.map(id=>exerciseLibrary.find(x=>x.id===id)).filter(Boolean).filter(ex=>!q||`${ex.n} ${p.label}`.toLowerCase().includes(q));
      if(!items.length)return '';
      return `<div class="v070LibraryGroup"><h3>${esc(p.label)}</h3>${items.map(ex=>`<div class="v070LibraryItem"><b>${esc(ex.n)}</b><span>${Number(ex.sets)||1} serie • ${ex.min}${ex.min===ex.max?'':'–'+ex.max} ${ex.time?'sek.':'powt.'} • przerwa ${typeof formatRest==='function'?formatRest(ex.rest):ex.rest+' s'}</span></div>`).join('')}</div>`;
    }).join('')||'<p class="hint">Brak pasujących ćwiczeń.</p>';
  }

  function refreshStartOptions(){
    const sel=$('planSelect');if(!sel)return;
    const desired=[];
    for(const [k,,short] of DAYS){
      const p=planForDay(k);if(!p)continue;
      desired.push({value:'v070day:'+k,label:(k===today()?'DZISIAJ • ':short+' • ')+p.title,day:k});
    }
    const existing=[...sel.querySelectorAll('option[data-v070-day]')];
    // Android closes the native select popup if an <option> is removed even when
    // it is recreated with the same label. The old 1.5s maintenance did exactly that.
    const changed=existing.length!==desired.length||existing.some((option,i)=>
      option.value!==desired[i].value||option.textContent!==desired[i].label);
    if(!changed)return;
    // A user editing a native select always has priority over planner refreshes.
    if(document.activeElement===sel)return;
    const current=sel.value;
    const settings=(()=>{try{return JSON.parse(localStorage.getItem('trainer3.settings')||'{}');}catch(e){return {};}})();
    const requested=String(settings.planKey||'');
    existing.forEach(option=>option.remove());
    for(const item of desired){
      const option=document.createElement('option');
      option.value=item.value;option.dataset.v070Day=item.day;option.textContent=item.label;
      sel.appendChild(option);
    }
    const present=value=>[...sel.options].some(option=>option.value===value);
    const selected=!state.startOptionsInitialized&&present(requested)?requested:
      present(current)?current:present(requested)?requested:'';
    if(selected)sel.value=selected;
    state.startOptionsInitialized=true;
  }

  function wrapPlans(){
    if(!state.baseGetPlan&&typeof getPlan==='function'){
      state.baseGetPlan=getPlan;
      getPlan=function(key){if(String(key).startsWith('v070day:'))return planForDay(String(key).split(':')[1]);return state.baseGetPlan.apply(this,arguments);};
    }
    if(!state.baseRefresh&&typeof refreshCustomOption==='function'){
      state.baseRefresh=refreshCustomOption;
      refreshCustomOption=function(){const out=state.baseRefresh.apply(this,arguments);refreshStartOptions();if(state.view==='mine'&&$('v070Pane'))renderPane();return out;};
    }
  }

  function boot(){
    state.cfg=read();installUi();wrapPlans();refreshStartOptions();
    setInterval(()=>{installUi();wrapPlans();refreshStartOptions();},1500);
  }

  window.TrenerBetaPlanner={
    load:()=>clone(state.cfg||read()),
    planForDay,
    parts:clone(PARTS),
    openDay:day=>{showView('week');openDay(day);}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
