(function(){
  'use strict';

  const KEY='trainer3.adaptiveVolume.v0642';
  const REQUIRED_SESSIONS=3;
  const MAX_LEARNED_EXTRA=3;
  const $=id=>document.getElementById(id);

  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'null')||{};
      return {
        learned:Object.assign({},raw.learned||{}),
        dismissed:Object.assign({},raw.dismissed||{}),
        acceptedAt:Object.assign({},raw.acceptedAt||{})
      };
    }catch(e){return {learned:{},dismissed:{},acceptedAt:{}};}
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(cfg));}catch(e){}}
  const cfg=load();
  let sessionToken='';
  let soloCloned=false;
  const touchedExercises=new Set();

  function group(){return window.TrenerGroup||null;}
  function participantId(){
    try{if(window.TrenerData070?.participantId)return String(window.TrenerData070.participantId()||'');}catch(e){}
    try{return String(group()?.deviceId||localStorage.getItem('trainer3.participantId.v070')||localStorage.getItem('trainer3.deviceId.v064')||'');}catch(e){return '';}
  }
  function originalBaseSets(ex){
    const id=String(ex?.id||'');
    try{const base=(exerciseLibrary||[]).find(x=>String(x.id)===id);if(base)return Math.max(1,Number(base.sets)||1);}catch(e){}
    return Math.max(1,Number(ex?.baseSets||ex?.sets)||1);
  }
  function learnedExtra(exId){return Math.max(0,Math.min(MAX_LEARNED_EXTRA,Number(cfg.learned[exId]||0)));}
  function ownAthlete(h){return Number(h?.localAthlete??0)||0;}
  function ownRecords(h,exId){
    const local=ownAthlete(h);
    const pid=String(h?.participantId||h?.group?.deviceId||participantId()||'');
    return (h?.records||[]).filter(r=>{
      if(String(r?.id||'')!==String(exId))return false;
      if(r?.participantId&&pid)return String(r.participantId)===pid;
      return Number(r?.athlete||0)===local;
    });
  }
  function historyExtra(h,ex){
    const base=originalBaseSets(ex),rows=ownRecords(h,ex.id);
    const inferred=Math.max(0,Math.min(MAX_LEARNED_EXTRA,rows.length-base));
    const pid=String(h?.participantId||h?.group?.deviceId||participantId()||'');
    const stored=Math.max(0,Math.min(MAX_LEARNED_EXTRA,Number(h?.group?.extraSets?.[pid]?.[ex.id]||0)));
    return Math.max(inferred,stored);
  }
  function readinessOk(h){
    const r=h?.group?.readiness||h?.readiness||null;
    if(!r)return true;
    if(Number.isFinite(Number(r.score))&&Number(r.score)<3)return false;
    if(Number(r.soreness)>=5)return false;
    return true;
  }
  function qualityOk(h,ex,requiredExtra){
    if(!h||h.interrupted)return false;
    const rows=ownRecords(h,ex.id),required=originalBaseSets(ex)+Math.max(0,Number(requiredExtra)||0);
    if(rows.length<required||!readinessOk(h))return false;
    const used=rows.slice(0,required);
    for(const r of used){
      if(r.pain&&r.pain!=='none')return false;
      if(r.technique&&r.technique!=='good')return false;
      if(Number(r.reps||0)<Math.max(1,Number(ex.min)||1))return false;
    }
    const rirs=used.map(r=>Number(r.rir)).filter(Number.isFinite);
    if(rirs.length){
      const avg=rirs.reduce((a,b)=>a+b,0)/rirs.length;
      const first=rirs[0],last=rirs[rirs.length-1];
      if(avg<1.5||Math.min(...rirs)<1||last<Math.max(1,first-1))return false;
    }
    return true;
  }
  function historyTime(h){const t=Date.parse(String(h?.iso||''));return Number.isFinite(t)?t:0;}
  function recentFor(ex){
    let history=[];try{history=typeof getHistory==='function'?getHistory():[];}catch(e){}
    const accepted=Math.max(0,Number(cfg.acceptedAt[ex.id]||0));
    const level=learnedExtra(ex.id),rows=[];
    for(const h of history){
      if(accepted&&historyTime(h)<=accepted)continue;
      if(!ownRecords(h,ex.id).length)continue;
      if(!qualityOk(h,ex,level))break;
      rows.push(h);
      if(rows.length>=REQUIRED_SESSIONS)break;
    }
    return rows;
  }
  function candidateFor(ex){
    const current=learnedExtra(ex.id);
    if(current>=MAX_LEARNED_EXTRA)return null;
    const recent=recentFor(ex);
    if(recent.length<REQUIRED_SESSIONS)return null;
    const targetExtra=current+1;
    const signature=recent.map(h=>h.id||h.iso||h.date||'x').join('|')+':'+targetExtra;
    if(cfg.dismissed[ex.id]===signature)return null;
    return {ex,targetExtra,total:originalBaseSets(ex)+targetExtra,recent,signature};
  }
  function candidates(){
    let lib=[];try{lib=exerciseLibrary||[];}catch(e){}
    return lib.map(candidateFor).filter(Boolean);
  }

  function installCss(){
    if($('v0642Style'))return;
    const s=document.createElement('style');s.id='v0642Style';s.textContent=`
      #v0642Card{margin:10px 0 12px;border:1px solid #31513d;border-radius:14px;background:#0b130e;padding:11px}
      #v0642Card.hidden{display:none!important}.v0642Head{font-size:10px;font-weight:900;letter-spacing:.08em;color:#67dc93}.v0642Title{font-size:14px;font-weight:900;color:#fff;margin-top:5px}.v0642Text{font-size:11px;line-height:1.45;color:#bbb;margin-top:5px}.v0642Actions{display:flex;gap:8px;margin-top:9px}.v0642Actions button{flex:1;min-height:42px}.v0642Meta{font-size:10px;color:#789183;margin-top:7px}
      .v0642Learned{font-size:10px;color:#67dc93;margin-top:5px}
      @media(max-width:520px){.v0642Actions{flex-direction:column}}
    `;document.head.appendChild(s);
  }
  function ensureUi(){
    installCss();
    const start=$('startBtn');if(!start||$('v0642Card'))return;
    const card=document.createElement('div');card.id='v0642Card';card.className='hidden';
    card.innerHTML='<div class="v0642Head">TRENER UCZY OBJĘTOŚCI</div><div id="v0642Title" class="v0642Title"></div><div id="v0642Text" class="v0642Text"></div><div class="v0642Actions"><button id="v0642Accept" class="primary"></button><button id="v0642Later" class="secondary">NIE TERAZ</button></div><div class="v0642Meta">Baza jest Twoja i obowiązuje w SOLO oraz treningu wspólnym. Druga osoba ma własną bazę. Jednorazowe +1 pozostaje tylko na bieżący trening.</div>';
    start.insertAdjacentElement('beforebegin',card);
    $('v0642Accept').addEventListener('click',acceptCurrent);
    $('v0642Later').addEventListener('click',dismissCurrent);
  }
  let shown=null;
  function renderSuggestion(){
    ensureUi();const card=$('v0642Card');if(!card)return;
    let isRunning=false;try{isRunning=!!running;}catch(e){}
    if(isRunning){card.classList.add('hidden');shown=null;return;}
    const list=candidates();shown=list[0]||null;
    if(!shown){card.classList.add('hidden');return;}
    card.classList.remove('hidden');
    const b=originalBaseSets(shown.ex)+learnedExtra(shown.ex.id),newTotal=shown.total;
    $('v0642Title').textContent=shown.ex.n;
    $('v0642Text').textContent=`W ${REQUIRED_SESSIONS} kolejnych treningach — SOLO lub wspólnych — wykonałeś ${b} serii z dobrą jakością i bez sygnałów przeciążenia. Ustawić ${newTotal} serii jako Twoją nową bazę?`;
    $('v0642Accept').textContent=`USTAW ${newTotal} SERII`;
  }
  function acceptCurrent(){
    if(!shown)return;
    cfg.learned[shown.ex.id]=shown.targetExtra;
    cfg.acceptedAt[shown.ex.id]=Date.now();
    delete cfg.dismissed[shown.ex.id];
    save();
    try{toast(`Nowa baza: ${shown.total} serii — ${shown.ex.n}. Obowiązuje w SOLO i wspólnym.`);}catch(e){}
    shown=null;renderSuggestion();
  }
  function dismissCurrent(){
    if(!shown)return;
    cfg.dismissed[shown.ex.id]=shown.signature;save();
    try{toast('Zostawiam obecną bazę. Zapytam ponownie po kolejnych treningach.');}catch(e){}
    shown=null;renderSuggestion();
  }

  function activeShared(){try{return !!(group()?.groupSession&&net?.active&&running&&net.sessionId);}catch(e){return false;}}
  function currentToken(){try{return activeShared()?('g:'+String(net.sessionId||'')):running?('s:'+String(startedAt||0)):'';}catch(e){return '';}}
  function resetSessionTrackingIfNeeded(){
    const token=currentToken();
    if(token===sessionToken)return;
    sessionToken=token;touchedExercises.clear();soloCloned=false;
    if(!token)return;
    if(!activeShared()){
      try{currentPlan=clone(currentPlan);soloCloned=true;}catch(e){}
    }
  }
  function markManual(){
    try{const ex=currentPlan?.ex?.[exIdx];if(ex)touchedExercises.add(String(ex.id||''));}catch(e){}
  }
  function hydrateLearnedVolume(){
    resetSessionTrackingIfNeeded();
    let isRunning=false;try{isRunning=!!running;}catch(e){}
    if(!isRunning)return;
    if(activeShared()){
      const g=group(),id=String(g?.deviceId||'');if(!g||!id)return;
      if(!g.extraSets[id])g.extraSets[id]={};
      let changed=false;
      for(const [exId,val] of Object.entries(cfg.learned)){
        if(touchedExercises.has(String(exId)))continue;
        const extra=Math.max(0,Math.min(MAX_LEARNED_EXTRA,Number(val)||0));
        const current=Math.max(0,Math.min(MAX_LEARNED_EXTRA,Number(g.extraSets[id][exId]||0)));
        if(current<extra){
          g.extraSets[id][exId]=extra;changed=true;
          try{wifiSend({type:'GROUP_EXTRA',sessionId:net.sessionId,deviceId:id,athlete:net.localAthlete,exId,extra});}catch(e){}
        }
      }
      if(changed){try{updateView();renderLivePanel();}catch(e){}}
      return;
    }
    try{
      if(!soloCloned&&currentPlan){currentPlan=clone(currentPlan);soloCloned=true;}
      for(const ex of currentPlan?.ex||[]){
        if(touchedExercises.has(String(ex.id||'')))continue;
        ex.sets=originalBaseSets(ex)+learnedExtra(ex.id);
      }
      updateView();
    }catch(e){}
  }
  function annotateWorkout(){
    let isRunning=false;try{isRunning=!!running;}catch(e){}if(!isRunning)return;
    const ex=currentPlan?.ex?.[exIdx];if(!ex)return;
    if(activeShared()){
      const g=group(),info=$('v064SetInfo');if(!g||!info)return;
      const id=String(g.deviceId||''),learned=learnedExtra(ex.id),actual=Math.max(0,Math.min(MAX_LEARNED_EXTRA,Number(g.extraSets?.[id]?.[ex.id]||0)));
      const total=originalBaseSets(ex)+actual;
      info.textContent=`Twoje serie: ${setIdx+1}/${total} • baza ${originalBaseSets(ex)+learned}${actual>learned?' • +'+(actual-learned)+' na dziś':''}`;
    }
  }
  function bindManualButtons(){
    const plus=$('v064PlusSet'),minus=$('v064MinusSet');
    for(const b of [plus,minus]){
      if(b&&!b.dataset.v0642){b.dataset.v0642='1';b.addEventListener('click',markManual,true);}
    }
  }
  function migrateAcceptedMarkers(){
    let changed=false;
    for(const [exId,val] of Object.entries(cfg.learned)){
      if(Number(val)>0&&!Number(cfg.acceptedAt[exId])){cfg.acceptedAt[exId]=Date.now();changed=true;}
    }
    if(changed)save();
  }
  function boot(){
    migrateAcceptedMarkers();ensureUi();bindManualButtons();renderSuggestion();
    setInterval(()=>{ensureUi();bindManualButtons();hydrateLearnedVolume();annotateWorkout();renderSuggestion();},300);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

  window.TrenerAdaptiveVolume={
    learnedExtra,candidates,qualityOk,historyExtra,
    requiredSessions:REQUIRED_SESSIONS,maxLearnedExtra:MAX_LEARNED_EXTRA,
    config:()=>clone(cfg)
  };
})();
