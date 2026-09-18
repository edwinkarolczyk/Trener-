(function(){
  'use strict';

  const REPORTS_KEY='trainer3.testSessions.v079';
  const ACTIVE_KEY='trainer3.testSession.active.v079';
  const DRAFT_KEY='trainer3.workoutDraft.v079';
  const TABS=['start','plan','history','progress','diet','settings'];
  const $=id=>document.getElementById(id);
  let active=null;
  let prev={running:false,paused:false,rest:false,records:0,context:'',net:'',water:null};
  let touch=null;
  let deckIndex=0;
  let draftContext='';
  let lastRestSkipAt=0;

  function safe(raw,fallback){try{return JSON.parse(raw||'')||fallback}catch(e){return fallback}}
  function nowIso(){return new Date().toISOString()}
  function appVersion(){try{return window.Android&&Android.getAppVersion?String(Android.getAppVersion()):'0.7.9-beta'}catch(e){return '0.7.9-beta'}}
  function readRunning(){try{return !!running}catch(e){return false}}
  function readPaused(){try{return !!paused}catch(e){return false}}
  function readRecords(){try{return Array.isArray(records)?records:[]}catch(e){return []}}
  function readContext(){
    try{return [planKey,Number(exIdx)||0,Number(setIdx)||0,(typeof net!=='undefined'&&net&&net.active)?Number(net.localAthlete)||0:Number(athleteIdx)||0].join('|')}catch(e){return ''}
  }
  function currentSnapshot(){
    let exName='',series='',rest=0,network='';
    try{if(currentPlan&&currentPlan.ex&&currentPlan.ex[exIdx])exName=currentPlan.ex[exIdx].n||''}catch(e){}
    try{series=(Number(setIdx)+1)+'/'+(currentPlan?.ex?.[exIdx]?.sets||'?')}catch(e){}
    try{rest=Math.max(0,Number(restEnd||0)-Date.now())}catch(e){}
    try{network=(typeof net!=='undefined'&&net)?String(net.status||((net.connected)?'connected':'offline')):''}catch(e){}
    return {screen:document.querySelector('.screen.show')?.id||'',exercise:exName,series,context:readContext(),weight:$('weight')?.value||'',reps:$('reps')?.value||'',restMs:rest,network,visible:document.visibilityState,scrollY:Math.round(window.scrollY||0),viewportHeight:Math.round(window.innerHeight||0),progressSeries:$('v082SeriesText')?.textContent||'',progressWorkout:$('v082WorkoutText')?.textContent||''};
  }

  function reports(){const v=safe(localStorage.getItem(REPORTS_KEY),[]);return Array.isArray(v)?v:[]}
  function persistActive(){if(!active)return;try{localStorage.setItem(ACTIVE_KEY,JSON.stringify(active));}catch(e){}}
  function storeReport(r){
    const list=reports();
    const i=list.findIndex(x=>x.id===r.id);if(i>=0)list.splice(i,1);
    list.unshift(r);try{localStorage.setItem(REPORTS_KEY,JSON.stringify(list.slice(0,20)));}catch(e){}
  }
  function addEvent(type,data){
    if(!active)return;
    active.events=Array.isArray(active.events)?active.events:[];
    active.events.push({at:nowIso(),ms:Date.now()-active.startedAt,type,data:data||{}});
    if(active.events.length>500)active.events=active.events.slice(-500);
    active.updatedAt=Date.now();persistActive();
  }
  function beginSession(){
    const old=safe(localStorage.getItem(ACTIVE_KEY),null);
    if(old&&old.id&&!old.endedAt){old.endedAt=Date.now();old.endReason='recovered-as-interrupted';old.events=old.events||[];old.events.push({at:nowIso(),ms:Math.max(0,Date.now()-(old.startedAt||Date.now())),type:'RECOVERY_CLOSE',data:{}});storeReport(old);}
    let plan='';try{plan=currentPlan?.title||$('planTitle')?.textContent||''}catch(e){}
    active={id:'ts'+Date.now(),schemaVersion:1,appVersion:appVersion(),startedAt:Date.now(),startedIso:nowIso(),plan,mode:(typeof mode!=='undefined'?mode:null),shared:!!(typeof net!=='undefined'&&net&&net.active),events:[]};
    addEvent('START',currentSnapshot());
  }
  function endSession(reason){
    if(!active)return;
    addEvent('END',Object.assign({reason:reason||'running-false'},currentSnapshot()));
    active.endedAt=Date.now();active.endedIso=nowIso();active.durationMs=Math.max(0,active.endedAt-active.startedAt);active.endReason=reason||'running-false';
    storeReport(active);try{localStorage.removeItem(ACTIVE_KEY);}catch(e){}
    active=null;setTimeout(renderReportCard,100);
  }

  function hydrationToday(){
    try{const s=window.TrenerHydration078?.state?.();return s?Number(s.todayMl)||0:null}catch(e){return null}
  }
  function networkState(){try{return typeof net!=='undefined'&&net?String(net.status||((net.connected)?'connected':'offline')):''}catch(e){return ''}}

  function monitorSession(){
    const run=readRunning(),pause=readPaused(),recs=readRecords(),ctx=readContext();
    let rest=false;try{rest=Number(restEnd||0)>Date.now()+100}catch(e){}
    const ns=networkState(),water=hydrationToday();
    if(run&&!prev.running)beginSession();
    if(active&&recs.length>prev.records){
      for(let i=prev.records;i<recs.length;i++){
        const r=recs[i]||{};
        addEvent('SET',{exercise:r.name||r.id||'',kg:Number(r.kg)||0,reps:Number(r.reps)||0,athlete:Number(r.athlete)||0,ex:Number(r.ex)||0,set:Number(r.set)||0});
      }
    }
    if(run&&active){
      if(pause!==prev.paused)addEvent(pause?'PAUSE':'RESUME',currentSnapshot());
      if(rest!==prev.rest){
        if(rest)addEvent('REST_START',currentSnapshot());
        else if(Date.now()-lastRestSkipAt>700)addEvent('REST_END',currentSnapshot());
      }
      if(ctx&&ctx!==prev.context)addEvent('CONTEXT',currentSnapshot());
      if(ns!==prev.net)addEvent('NETWORK',{status:ns});
      if(water!==null&&prev.water!==null&&water!==prev.water)addEvent('WATER',{from:prev.water,to:water,delta:water-prev.water});
    }
    if(!run&&prev.running)endSession('workout-ended');
    prev={running:run,paused:pause,rest,records:recs.length,context:ctx,net:ns,water};
    updateDeck();
    autosaveTick(ctx,recs.length);
  }

  function saveDraft(){
    if(!readRunning())return;
    const ctx=readContext();if(!ctx)return;
    const d={context:ctx,weight:$('weight')?.value||'',reps:$('reps')?.value||'',updatedAt:Date.now(),appVersion:appVersion()};
    try{localStorage.setItem(DRAFT_KEY,JSON.stringify(d));}catch(e){}
  }
  function restoreDraft(ctx){
    const d=safe(localStorage.getItem(DRAFT_KEY),null);if(!d||d.context!==ctx||Date.now()-Number(d.updatedAt||0)>12*60*60*1000)return;
    const w=$('weight'),r=$('reps');if(w&&d.weight!==''&&String(w.value)!==String(d.weight))w.value=d.weight;if(r&&d.reps!==''&&!r.value)r.value=d.reps;
  }
  function autosaveTick(ctx,recordCount){
    if(!readRunning())return;
    if(ctx&&ctx!==draftContext){draftContext=ctx;setTimeout(()=>restoreDraft(ctx),80);}
    const d=safe(localStorage.getItem(DRAFT_KEY),null);
    if(d&&d.context&&d.context!==ctx&&recordCount>prev.records){try{localStorage.removeItem(DRAFT_KEY);}catch(e){}}
  }
  function installAutosave(){
    ['weight','reps'].forEach(id=>{const el=$(id);if(!el)return;el.addEventListener('input',saveDraft);el.addEventListener('change',saveDraft);el.addEventListener('blur',saveDraft);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){saveDraft();if(active)addEvent('APP_BACKGROUND',currentSnapshot());}else if(active)addEvent('APP_FOREGROUND',currentSnapshot());});
    window.addEventListener('beforeunload',saveDraft);
  }

  function installCss(){
    if($('v079Style'))return;const s=document.createElement('style');s.id='v079Style';s.textContent=`
      #v079SwipeDeck{margin-top:10px;border:1px solid #2e2e2e;border-radius:14px;background:#101010;overflow:hidden;touch-action:pan-y}
      #v079SwipeDeck .v079Head{display:flex;justify-content:space-between;gap:8px;padding:8px 10px 0;color:#777;font-size:9px;font-weight:900;letter-spacing:.08em}
      #v079SwipeDeck .v079Dots{letter-spacing:3px;color:#555}.v079Dots b{color:#fff}
      #v079SwipeCard{padding:10px 12px 12px;min-height:74px}.v079SwipeCard strong{display:block;font-size:13px}.v079SwipeCard span{display:block;margin-top:5px;color:#aaa;font-size:10px;line-height:1.45}
      #v079ProblemBtn{margin-left:auto!important;border-color:#8a3b3b!important;color:#ffb4b4!important}
      #v079ReportCard .v079Summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.v079Summary div{background:#151515;border-radius:10px;padding:8px}.v079Summary span{display:block;color:#777;font-size:9px}.v079Summary b{font-size:12px}
      #v079ReportEvents{max-height:260px;overflow:auto;border-top:1px solid #2a2a2a}.v079Evt{display:grid;grid-template-columns:58px 90px 1fr;gap:7px;padding:7px 0;border-bottom:1px solid #222;font-size:9px}.v079Evt time{color:#777}.v079Evt b{color:#ddd}.v079Evt span{color:#999;overflow-wrap:anywhere}
      #v079ProblemToast{position:fixed;left:14px;right:14px;bottom:92px;z-index:160;background:#221313;border:1px solid #8a3b3b;border-radius:14px;padding:12px;display:none}#v079ProblemToast.show{display:block}
      #v079ProblemToast strong{display:block}#v079ProblemToast span{font-size:10px;color:#c99;display:block;margin-top:4px}
    `;document.head.appendChild(s);
  }

  function remainingSets(){
    try{if(!currentPlan||!currentPlan.ex)return 0;let total=0;for(let i=Number(exIdx)||0;i<currentPlan.ex.length;i++){const ex=currentPlan.ex[i];total+=i===(Number(exIdx)||0)?Math.max(0,(Number(ex.sets)||0)-(Number(setIdx)||0)):Number(ex.sets)||0;}return total;}catch(e){return 0}
  }
  function currentExerciseRecords(){
    try{const ex=currentPlan?.ex?.[exIdx];const athlete=(typeof net!=='undefined'&&net&&net.active)?net.localAthlete:athleteIdx;return readRecords().filter(r=>(r.id===ex?.id||r.name===ex?.n)&&Number(r.athlete||0)===Number(athlete||0)).slice(-3);}catch(e){return []}
  }
  function deckCards(){
    let ex='',series='',tech='';try{const x=currentPlan?.ex?.[exIdx];ex=x?.n||'Ćwiczenie';series='Seria '+((Number(setIdx)||0)+1)+'/'+(x?.sets||'?');tech=x?.tip||$('technique')?.textContent||'';}catch(e){}
    const rs=currentExerciseRecords();const hist=rs.length?rs.map(r=>(Number(r.kg)>0?String(r.kg)+' kg × ':'')+String(r.reps||0)).join(' • '):'Brak zapisanych serii tego ćwiczenia.';
    const h=window.TrenerHydration078?.state?.()||{};
    return [
      {title:'SERIA',text:ex+' • '+series+' • Do końca około '+remainingSets()+' serii'},
      {title:'OSTATNIE SERIE',text:hist},
      {title:'JAK WYKONAĆ',text:tech||'Pilnuj techniki i zostaw zapas powtórzeń.'},
      {title:'NAWODNIENIE',text:(Number(h.todayMl)||0)+' / '+(Number(h.targetMl)||2500)+' ml • przesuń kartę dalej lub użyj przypomnienia ŁYK WODY'}
    ];
  }
  function updateDeck(){
    const root=$('v079SwipeDeck');if(!root)return;root.style.display=readRunning()?'block':'none';if(!readRunning())return;
    const cards=deckCards();deckIndex=Math.max(0,Math.min(deckIndex,cards.length-1));$('v079SwipeCard').innerHTML='<strong>'+esc(cards[deckIndex].title)+'</strong><span>'+esc(cards[deckIndex].text)+'</span>';
    $('v079Dots').innerHTML=cards.map((_,i)=>i===deckIndex?'<b>●</b>':'●').join('');
  }
  function installDeck(){
    if($('v079SwipeDeck'))return;const training=$('training');if(!training)return;
    const deck=document.createElement('div');deck.id='v079SwipeDeck';deck.innerHTML='<div class="v079Head"><span>PRZESUŃ ← / →</span><span id="v079Dots" class="v079Dots"></span></div><div id="v079SwipeCard"></div>';training.insertBefore(deck,$('coach')||null);
    updateDeck();
  }

  function interactive(el){return !!el?.closest?.('input,textarea,select,button,a,label,summary,[contenteditable="true"],.photoGallery,.v078QuickWater,.noSwipe')}
  function visibleTab(){return document.querySelector('.tab.active')?.dataset?.tab||document.querySelector('.screen.show')?.id||'start'}
  function switchTab(dir){const id=visibleTab(),i=TABS.indexOf(id);if(i<0)return;const ni=i+dir;if(ni<0||ni>=TABS.length)return;try{if(typeof showTab==='function')showTab(TABS[ni]);else document.querySelector('.tab[data-tab="'+TABS[ni]+'"]').click();}catch(e){}}
  function installSwipe(){
    document.addEventListener('touchstart',e=>{if(e.touches.length!==1||interactive(e.target))return;const p=e.touches[0];touch={x:p.clientX,y:p.clientY,target:e.target,at:Date.now(),deck:!!e.target.closest('#v079SwipeDeck')};},{passive:true});
    document.addEventListener('touchend',e=>{if(!touch)return;const p=e.changedTouches&&e.changedTouches[0];if(!p){touch=null;return;}const dx=p.clientX-touch.x,dy=p.clientY-touch.y,dt=Date.now()-touch.at,isHorizontal=Math.abs(dx)>=65&&Math.abs(dx)>Math.abs(dy)*1.35&&dt<900;const wasDeck=touch.deck;touch=null;if(!isHorizontal)return;
      if(readRunning()){if(!wasDeck)return;const cards=deckCards();deckIndex=Math.max(0,Math.min(cards.length-1,deckIndex+(dx<0?1:-1)));updateDeck();return;}
      switchTab(dx<0?1:-1);
    },{passive:true});
  }

  function installRestSkipCapture(){
    document.addEventListener('click',e=>{
      if(!e.target?.closest?.('#skipRestBtn'))return;
      if(!active||!readRunning())return;
      lastRestSkipAt=Date.now();
      addEvent('REST_SKIP',currentSnapshot());
    },true);
  }

  function installProblemButton(){
    if($('v079ProblemBtn'))return;const controls=$('training')?.querySelector('.controls');if(!controls)return;const b=document.createElement('button');b.id='v079ProblemBtn';b.className='secondary';b.type='button';b.textContent='⚑ PROBLEM';controls.appendChild(b);
    b.addEventListener('click',()=>{if(!active&&readRunning())beginSession();addEvent('PROBLEM',currentSnapshot());showProblemAck();});
  }
  function showProblemAck(){let box=$('v079ProblemToast');if(!box){box=document.createElement('div');box.id='v079ProblemToast';box.innerHTML='<strong>✓ Zapisano punkt problemu</strong><span>Raport ma godzinę, ekran, ćwiczenie, serię, pola i stan synchronizacji.</span>';document.body.appendChild(box);}box.classList.add('show');setTimeout(()=>box.classList.remove('show'),2200);}

  function fmtMs(ms){ms=Math.max(0,Number(ms)||0);const s=Math.floor(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60);return (h?String(h).padStart(2,'0')+':':'')+String(m%60).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
  function eventText(e){const d=e.data||{};if(e.type==='SET')return (d.exercise||'')+' '+(d.kg?d.kg+'kg × ':'')+(d.reps||'');if(e.type==='NETWORK')return d.status||'';if(e.type==='WATER')return (d.delta>=0?'+':'')+d.delta+' ml';if(e.type==='PROBLEM')return [d.exercise,d.series,d.network].filter(Boolean).join(' • ');if(d.exercise||d.series)return [d.exercise,d.series].filter(Boolean).join(' • ');return d.reason||''}
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function installReportCard(){
    if($('v079ReportCard'))return;const history=$('history');if(!history)return;const c=document.createElement('div');c.id='v079ReportCard';c.className='card';c.innerHTML='<div class="eyebrow">BETA • RAPORT SESJI</div><h2>Raport testowy</h2><div id="v079ReportBody" class="hint">Raport pojawi się po treningu.</div>';history.appendChild(c);renderReportCard();
  }
  function renderReportCard(){
    const body=$('v079ReportBody');if(!body)return;const r=reports()[0];if(!r){body.innerHTML='Raport pojawi się po treningu.';return;}
    const ev=Array.isArray(r.events)?r.events:[],sets=ev.filter(x=>x.type==='SET').length,problems=ev.filter(x=>x.type==='PROBLEM').length,net=ev.filter(x=>x.type==='NETWORK').length;
    body.innerHTML=`<div><b>${esc(r.plan||'Trening')}</b><div class="meta">${new Date(r.startedAt).toLocaleString('pl-PL')} • ${esc(r.appVersion||'')} • ${fmtMs(r.durationMs||0)}</div></div><div class="v079Summary"><div><span>SERIE</span><b>${sets}</b></div><div><span>PROBLEMY</span><b>${problems}</b></div><div><span>ZMIANY SIECI</span><b>${net}</b></div></div><div id="v079ReportEvents">${ev.map(e=>`<div class="v079Evt"><time>+${fmtMs(e.ms)}</time><b>${esc(e.type)}</b><span>${esc(eventText(e))}</span></div>`).join('')}</div><div class="controls" style="margin-top:10px"><button id="v079CopyReport" class="secondary" type="button">KOPIUJ RAPORT</button></div>`;
    $('v079CopyReport')?.addEventListener('click',()=>copyReport(r));
  }
  function copyReport(r){const text=JSON.stringify(r,null,2);if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>{try{toast('Raport skopiowany.')}catch(e){}}).catch(()=>fallbackCopy(text));else fallbackCopy(text)}
  function fallbackCopy(text){const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');toast('Raport skopiowany.');}catch(e){toast('Nie udało się skopiować raportu.');}t.remove();}

  function installErrorCapture(){window.addEventListener('error',e=>{if(active)addEvent('JS_ERROR',{message:String(e.message||''),file:String(e.filename||''),line:Number(e.lineno)||0});});window.addEventListener('unhandledrejection',e=>{if(active)addEvent('PROMISE_ERROR',{message:String(e.reason?.message||e.reason||'')});});}

  function boot(){
    installCss();installDeck();installAutosave();installSwipe();installRestSkipCapture();installProblemButton();installReportCard();installErrorCapture();
    const recovered=safe(localStorage.getItem(ACTIVE_KEY),null);if(recovered&&recovered.id&&!recovered.endedAt)active=recovered;
    prev={running:readRunning(),paused:readPaused(),rest:false,records:readRecords().length,context:readContext(),net:networkState(),water:hydrationToday()};
    if(readRunning()&&!active)beginSession();
    setInterval(monitorSession,250);
    document.querySelector('.tab[data-tab="history"]')?.addEventListener('click',()=>setTimeout(renderReportCard,80));
  }

  window.TrenerTest079={report:()=>active||reports()[0]||null,markProblem:()=>{if(active)addEvent('PROBLEM',currentSnapshot());},saveDraft};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
