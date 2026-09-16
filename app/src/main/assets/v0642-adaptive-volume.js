(function(){
  'use strict';

  const KEY='trainer3.adaptiveVolume.v0642';
  const REQUIRED_SESSIONS=3;
  const MAX_LEARNED_EXTRA=3;
  const $=id=>document.getElementById(id);

  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'null')||{};
      return {learned:Object.assign({},raw.learned||{}),dismissed:Object.assign({},raw.dismissed||{})};
    }catch(e){return {learned:{},dismissed:{}};}
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(cfg));}catch(e){}}
  const cfg=load();
  let lastSessionId='';
  let sessionTouched=false;

  function group(){return window.TrenerGroup||null;}
  function deviceId(){return String(group()?.deviceId||'');}
  function baseSets(ex){return Math.max(1,Number(ex?.sets)||1);}
  function learnedExtra(exId){return Math.max(0,Math.min(MAX_LEARNED_EXTRA,Number(cfg.learned[exId]||0)));}
  function ownAthlete(h){return Number(h?.localAthlete??0)||0;}

  function historyExtra(h,exId){
    const g=h?.group;
    if(!g||!g.extraSets)return 0;
    const id=String(g.deviceId||'');
    if(!id)return 0;
    return Math.max(0,Math.min(MAX_LEARNED_EXTRA,Number(g.extraSets?.[id]?.[exId]||0)));
  }

  function ownRecords(h,exId){
    const a=ownAthlete(h);
    return (h?.records||[]).filter(r=>(r.id===exId)&&Number(r.athlete||0)===a);
  }

  function readinessOk(h){
    const r=h?.group?.readiness||h?.readiness||null;
    if(!r)return true;
    if(Number.isFinite(Number(r.score))&&Number(r.score)<3)return false;
    if(Number(r.soreness)>=5)return false;
    return true;
  }

  function qualityOk(h,ex,extra){
    if(!h||h.interrupted)return false;
    const rows=ownRecords(h,ex.id);
    if(rows.length<baseSets(ex)+extra)return false;
    if(!readinessOk(h))return false;
    for(const r of rows){
      if(r.pain&&r.pain!=='none')return false;
      if(r.technique&&r.technique!=='good')return false;
    }
    const rirs=rows.map(r=>Number(r.rir)).filter(Number.isFinite);
    if(rirs.length){
      const avg=rirs.reduce((a,b)=>a+b,0)/rirs.length;
      const first=rirs[0],last=rirs[rirs.length-1];
      if(avg<1.5||Math.min(...rirs)<1||last<Math.max(1,first-1))return false;
    }
    return true;
  }

  function recentFor(ex){
    let history=[];try{history=typeof getHistory==='function'?getHistory():[];}catch(e){}
    const id=deviceId();
    const rows=[];
    for(const h of history){
      if(!h?.group)continue;
      if(id&&h.group.deviceId&&String(h.group.deviceId)!==id)continue;
      if(!ownRecords(h,ex.id).length)continue;
      rows.push(h);
      if(rows.length>=REQUIRED_SESSIONS)break;
    }
    return rows;
  }

  function candidateFor(ex){
    const recent=recentFor(ex);
    if(recent.length<REQUIRED_SESSIONS)return null;
    const extras=recent.map(h=>historyExtra(h,ex.id));
    const targetExtra=Math.min(MAX_LEARNED_EXTRA,...extras);
    if(targetExtra<=learnedExtra(ex.id))return null;
    if(!recent.every((h,i)=>qualityOk(h,ex,extras[i])))return null;
    const signature=recent.map(h=>h.id||h.iso||h.date||'x').join('|')+':'+targetExtra;
    if(cfg.dismissed[ex.id]===signature)return null;
    return {ex,targetExtra,total:baseSets(ex)+targetExtra,recent,signature};
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
    card.innerHTML='<div class="v0642Head">TRENER UCZY OBJĘTOŚCI</div><div id="v0642Title" class="v0642Title"></div><div id="v0642Text" class="v0642Text"></div><div class="v0642Actions"><button id="v0642Accept" class="primary"></button><button id="v0642Later" class="secondary">NIE TERAZ</button></div><div class="v0642Meta">Zmiana dotyczy tylko Twojego telefonu. Jednorazowe dodatkowe serie nadal pozostają tylko na dany trening.</div>';
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
    const b=baseSets(shown.ex),newTotal=shown.total;
    $('v0642Title').textContent=shown.ex.n;
    $('v0642Text').textContent=`Od ${REQUIRED_SESSIONS} kolejnych wspólnych treningów robisz co najmniej ${newTotal} serii zamiast ${b}. Technika, RIR i regeneracja nie wskazują przeciążenia. Ustawić ${newTotal} jako Twoją nową bazę?`;
    $('v0642Accept').textContent=`USTAW ${newTotal} SERII`;
  }

  function acceptCurrent(){
    if(!shown)return;
    cfg.learned[shown.ex.id]=shown.targetExtra;
    delete cfg.dismissed[shown.ex.id];
    save();
    try{toast(`Nowa baza: ${shown.total} serii — ${shown.ex.n}.`);}catch(e){}
    shown=null;renderSuggestion();
  }

  function dismissCurrent(){
    if(!shown)return;
    cfg.dismissed[shown.ex.id]=shown.signature;save();
    try{toast('Zostawiam obecną bazę. Zapytam ponownie po kolejnych treningach.');}catch(e){}
    shown=null;renderSuggestion();
  }

  function markManual(){sessionTouched=true;}

  function hydrateLearnedVolume(){
    const g=group();
    let active=false;try{active=!!(g&&g.groupSession&&net?.active&&running&&net.sessionId);}catch(e){}
    if(!active){lastSessionId='';sessionTouched=false;return;}
    const sid=String(net.sessionId||'');
    if(sid!==lastSessionId){lastSessionId=sid;sessionTouched=false;}
    if(sessionTouched)return;
    const id=deviceId();if(!id)return;
    if(!g.extraSets[id])g.extraSets[id]={};
    let changed=false;
    for(const [exId,val] of Object.entries(cfg.learned)){
      const extra=Math.max(0,Math.min(MAX_LEARNED_EXTRA,Number(val)||0));
      if(extra<=0)continue;
      const current=Math.max(0,Math.min(MAX_LEARNED_EXTRA,Number(g.extraSets[id][exId]||0)));
      if(current<extra){
        g.extraSets[id][exId]=extra;changed=true;
        try{wifiSend({type:'GROUP_EXTRA',sessionId:net.sessionId,deviceId:id,athlete:net.localAthlete,exId,extra});}catch(e){}
      }
    }
    if(changed){try{updateView();renderLivePanel();}catch(e){}}
  }

  function annotateWorkout(){
    const g=group();let active=false;try{active=!!(g&&g.groupSession&&net?.active&&running);}catch(e){}
    if(!active)return;
    const info=$('v064SetInfo');if(!info)return;
    const ex=currentPlan?.ex?.[exIdx];if(!ex)return;
    const id=deviceId();const learned=learnedExtra(ex.id);const actual=Math.max(0,Math.min(MAX_LEARNED_EXTRA,Number(g.extraSets?.[id]?.[ex.id]||0)));
    const total=baseSets(ex)+actual;
    if(learned>0){
      const today=Math.max(0,actual-learned);
      info.textContent=`Twoje serie: ${setIdx+1}/${total} • baza ${baseSets(ex)+learned}${today?' • +'+today+' na dziś':''}`;
    }
  }

  function bindManualButtons(){
    const plus=$('v064PlusSet'),minus=$('v064MinusSet');
    for(const b of [plus,minus]){
      if(b&&!b.dataset.v0642){b.dataset.v0642='1';b.addEventListener('click',markManual,true);}
    }
  }

  function boot(){
    ensureUi();bindManualButtons();renderSuggestion();
    setInterval(()=>{ensureUi();bindManualButtons();hydrateLearnedVolume();annotateWorkout();renderSuggestion();},900);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

  window.TrenerAdaptiveVolume={
    learnedExtra,
    candidates,
    qualityOk,
    requiredSessions:REQUIRED_SESSIONS,
    maxLearnedExtra:MAX_LEARNED_EXTRA,
    config:()=>clone(cfg)
  };
})();
