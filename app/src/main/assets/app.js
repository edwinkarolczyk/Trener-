const $ = id => document.getElementById(id);

const exerciseLibrary = [
  {id:'bench',n:'Wyciskanie sztangi na płaskiej',sets:4,min:6,max:8,rest:150,tip:'Łopatki ściągnięte, stopy stabilnie. Nie odbijaj sztangi od klatki.'},
  {id:'incline',n:'Wyciskanie na skosie dodatnim 20–30°',sets:3,min:8,max:10,rest:120,tip:'Kontroluj opuszczanie. Nie ustawiaj ławki zbyt pionowo.'},
  {id:'closebench',n:'Wyciskanie wąsko',sets:3,min:10,max:12,rest:105,tip:'Łokcie prowadź blisko tułowia. Chwyt nie musi być bardzo wąski.'},
  {id:'pushups',n:'Pompki',sets:2,min:10,max:20,rest:75,tip:'Pełny zakres. Zakończ serię zanim technika zacznie się rozpadać.'},
  {id:'row',n:'Wiosłowanie sztangą',sets:4,min:8,max:10,rest:120,tip:'Neutralny kręgosłup, napięty brzuch. Przyciągaj gryf do dolnej części brzucha.'},
  {id:'underrow',n:'Wiosłowanie podchwytem',sets:3,min:8,max:10,rest:105,tip:'Bez szarpania tułowiem. Kontroluj fazę opuszczania.'},
  {id:'curl',n:'Uginanie sztangi stojąc',sets:4,min:8,max:10,rest:105,tip:'Łokcie przy ciele. Bez bujania biodrami; opuszczaj 2–3 sekundy.'},
  {id:'seatedcurl',n:'Uginanie sztangi siedząc',sets:3,min:10,max:12,rest:90,tip:'Użyj mniejszego ciężaru niż stojąc. Nie odchylaj pleców.'},
  {id:'reversecurl',n:'Uginanie nachwytem',sets:3,min:10,max:15,rest:75,tip:'Stabilne nadgarstki. Mocniej pracują także przedramiona.'},
  {id:'curl21',n:'21 ze sztangą',sets:2,min:21,max:21,rest:90,tip:'7 dół–połowa + 7 połowa–góra + 7 pełnych ruchów. Lekki ciężar.'},
  {id:'iso90',n:'Izometria 90°',sets:2,min:20,max:30,rest:60,time:true,tip:'Trzymaj sztangę nieruchomo przy zgięciu łokci około 90°.'},
  {id:'ohp',n:'Wyciskanie żołnierskie',sets:4,min:6,max:8,rest:150,tip:'Napnij brzuch i pośladki. Nie odchylaj mocno tułowia do tyłu.'},
  {id:'squat',n:'Przysiady ze sztangą',sets:4,min:8,max:10,rest:150,tip:'Kolana prowadź zgodnie z kierunkiem stóp. Utrzymuj stabilny tułów.'},
  {id:'lunges',n:'Wykroki',sets:3,min:10,max:10,rest:90,tip:'10 powtórzeń na nogę. Kontroluj kolano i równowagę.'},
  {id:'plank',n:'Plank',sets:3,min:30,max:60,rest:60,time:true,tip:'Napnij brzuch i pośladki. Biodra nie mogą opadać.'}
];

const byId = id => JSON.parse(JSON.stringify(exerciseLibrary.find(x=>x.id===id)));
const plans = {
  mon:{title:'Poniedziałek — klatka + triceps',ex:['bench','incline','closebench','pushups'].map(byId)},
  wed:{title:'Środa — plecy + biceps',ex:['row','underrow','curl','reversecurl'].map(byId)},
  fri:{title:'Piątek — barki + nogi + brzuch',ex:['ohp','squat','lunges','plank'].map(byId)},
  biceps:{title:'Biceps — sesja dodatkowa',ex:['curl','seatedcurl','reversecurl','curl21','iso90'].map(byId)}
};

let mode=1,running=false,paused=false,planKey='mon',currentPlan=null,exIdx=0,setIdx=0,athleteIdx=0;
let startedAt=0,pauseStarted=0,pausedTotal=0,restEnd=0,restPaused=0,transitionRest=false;
let readyAt=[0,0],records=[],tickHandle=null,lastCompletedExercise=-1;

const net={
  available:false,
  connected:false,
  role:null,
  active:false,
  sessionId:'',
  localAthlete:0,
  names:['Osoba 1','Osoba 2'],
  done:[false,false],
  status:'offline',
  detail:'',
  lastError:'',
  last:[null,null]
};

function migrateOldData(){
  if(!localStorage.getItem('trainer3.settings') && localStorage.getItem('trainer2.settings')) localStorage.setItem('trainer3.settings',localStorage.getItem('trainer2.settings'));
  if(!localStorage.getItem('trainer3.history') && localStorage.getItem('trainer2.history')) localStorage.setItem('trainer3.history',localStorage.getItem('trainer2.history'));
}

function showTab(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('show'));
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  $(id).classList.add('show');
  if(id==='history') renderHistory();
  if(id==='progress') renderProgress();
  if(id==='settings') refreshWifiInfo();
}

function loadSettings(){
  const s=safeJson(localStorage.getItem('trainer3.settings'),{});
  if(s.nameA) $('nameA').value=s.nameA;
  if(s.nameB) $('nameB').value=s.nameB;
  if(s.stepKg) $('stepKg').value=s.stepKg;
  if(s.planKey && getPlan(s.planKey)) $('planSelect').value=s.planKey;
  setMode(s.mode===2?2:1,false);
  refreshCustomOption();
}

function saveSettings(){
  localStorage.setItem('trainer3.settings',JSON.stringify({
    nameA:$('nameA').value.trim()||'Osoba 1',
    nameB:$('nameB').value.trim()||'Osoba 2',
    stepKg:parseFloat($('stepKg').value)||2.5,
    planKey:$('planSelect').value,
    mode
  }));
}

function setMode(m,save=true){
  mode=m;
  $('soloBtn').classList.toggle('active',m===1);
  $('duoBtn').classList.toggle('active',m===2);
  $('partnerWrap').classList.toggle('hidden',m===1);
  if(save) saveSettings();
}

function getCustomPlan(){return safeJson(localStorage.getItem('trainer3.customPlan'),null)}
function getPlan(key){return key==='custom'?getCustomPlan():plans[key]}

function refreshCustomOption(){
  const custom=getCustomPlan();
  $('customOption').disabled=!custom;
  $('customOption').textContent=custom?(custom.title||'Mój trening mieszany'):'Mój trening mieszany — brak';
}

function renderBuilder(){
  const custom=getCustomPlan();
  const selected=new Set((custom?.ex||[]).map(x=>x.id));
  if(custom?.title) $('customName').value=custom.title;
  $('exerciseBuilder').innerHTML=exerciseLibrary.map(ex=>`<label class="exercisePick"><input type="checkbox" class="builderCheck" value="${ex.id}" ${selected.has(ex.id)?'checked':''}><div><strong>${escapeHtml(ex.n)}</strong><span>${ex.sets} serie • ${ex.min}${ex.min===ex.max?'':'–'+ex.max} ${ex.time?'sek.':'powt.'} • przerwa ${formatRest(ex.rest)}</span></div></label>`).join('');
}

function saveCustomPlan(){
  const ids=[...document.querySelectorAll('.builderCheck:checked')].map(x=>x.value);
  if(ids.length<2){toast('Wybierz co najmniej 2 ćwiczenia.');return;}
  const title=$('customName').value.trim()||'Mój trening mieszany';
  const custom={title,ex:ids.map(byId)};
  localStorage.setItem('trainer3.customPlan',JSON.stringify(custom));
  refreshCustomOption();
  $('planSelect').value='custom';
  saveSettings();
  toast('Trening mieszany zapisany.');
}

function startWorkout(){
  saveSettings();
  if(net.connected && net.role==='guest'){
    toast('Wspólny trening rozpoczyna gospodarz.');
    return;
  }
  planKey=$('planSelect').value;
  currentPlan=getPlan(planKey);
  if(!currentPlan){toast('Najpierw zbuduj trening mieszany.');return;}

  const shared=net.connected && net.role==='host' && mode===2;
  resetWorkoutState();
  if(shared){
    net.active=true;
    net.sessionId='s'+Date.now();
    net.localAthlete=0;
    net.names=[$('nameA').value.trim()||'Osoba 1',$('nameB').value.trim()||'Osoba 2'];
    net.done=[false,false];
  }else{
    net.active=false;
    net.sessionId='';
    net.localAthlete=0;
    net.done=[false,false];
  }

  athleteIdx=net.active?net.localAthlete:0;
  startedAt=Date.now();
  running=true;paused=false;
  openTrainingUi();
  if(net.active){
    wifiSend({
      type:'START',
      sessionId:net.sessionId,
      planKey,
      plan:currentPlan,
      names:net.names,
      startedAt:Date.now()
    });
    setTimeout(broadcastSnapshot,250);
  }
}

function resetWorkoutState(){
  exIdx=0;setIdx=0;athleteIdx=0;records=[];readyAt=[0,0];lastCompletedExercise=-1;
  startedAt=0;pausedTotal=0;pauseStarted=0;restEnd=0;restPaused=0;transitionRest=false;
}

function openTrainingUi(){
  $('setup').classList.add('hidden');
  $('training').classList.remove('hidden');
  $('stateBadge').textContent=net.active?'WSPÓLNY TRENING — WI‑FI':(mode===1?'TRENING — SOLO':'TRENING — 2 OSOBY');
  $('stateBadge').className='badge green';
  $('pauseBtn').textContent=net.active&&net.role==='guest'?'PAUZA — HOST':'PAUZA';
  $('planTitle').textContent=currentPlan.title;
  $('coach').textContent='Trener: zostaw 1–2 powtórzenia w zapasie i pilnuj techniki.';
  $('restTime').textContent='GOTOWY';
  $('skipRestBtn').classList.add('hidden');
  $('wifiLive').classList.toggle('hidden',!net.active);
  prefillWeight();
  updateView();
  renderLivePanel();
  startTicker();
}

function startTicker(){
  if(tickHandle) clearInterval(tickHandle);
  tickHandle=setInterval(tick,250);
  tick();
}

function tick(){
  if(!running)return;
  $('clock').textContent=formatTime(elapsedMs());
  if(paused)return;
  if(restEnd>0){
    const left=restEnd-Date.now();
    if(left<=0){
      restEnd=0;restPaused=0;transitionRest=false;
      $('restTime').textContent='GOTOWY — KOLEJNA SERIA';
      $('skipRestBtn').classList.add('hidden');
      $('saveSetBtn').disabled=net.active&&net.done[net.localAthlete];
      vibrate(180);
      renderLivePanel();
    }else $('restTime').textContent=formatTime(left);
  }
}

function elapsedMs(){
  const now=paused?pauseStarted:Date.now();
  return Math.max(0,now-startedAt-pausedTotal);
}

function completeSet(){
  if(!running||paused||restEnd>0)return;
  if(net.active){completeNetworkSet();return;}
  completeLocalSet();
}

function completeLocalSet(){
  const ex=currentPlan.ex[exIdx];
  const reps=readReps();
  if(reps===null)return;
  const kg=readKg();
  const finishedExIdx=exIdx,finishedAthlete=athleteIdx;
  records.push(makeRecord(ex,finishedExIdx,setIdx,finishedAthlete,kg,reps));
  readyAt[finishedAthlete]=Date.now()+ex.rest*1000;
  $('reps').value='';
  lastCompletedExercise=finishedExIdx;

  const result=advanceState();
  if(result.finished){finishWorkout(false);return;}

  let wait=0;
  if(result.exerciseChanged){
    $('coach').innerHTML=exerciseAdvice(finishedExIdx);
    readyAt=[0,0];
    wait=90000;
    transitionRest=true;
  }else{
    wait=Math.max(0,readyAt[athleteIdx]-Date.now());
    transitionRest=false;
  }
  prefillWeight();
  updateView();
  if(wait>1000) startRest(wait);
  else{
    $('restTime').textContent=mode===2?'ZMIANA — NASTĘPNA OSOBA GOTOWA':'GOTOWY';
    $('saveSetBtn').disabled=false;
  }
}

function completeNetworkSet(){
  const ex=currentPlan.ex[exIdx];
  const reps=readReps();
  if(reps===null)return;
  const kg=readKg();
  const athlete=net.localAthlete;
  const finishedExIdx=exIdx,finishedSetIdx=setIdx;
  const rec=makeRecord(ex,finishedExIdx,finishedSetIdx,athlete,kg,reps);
  rec.uid=net.sessionId+':'+athlete+':'+finishedExIdx+':'+finishedSetIdx;
  mergeRecord(rec);
  net.last[athlete]=rec;
  $('reps').value='';
  wifiSend({type:'SET',sessionId:net.sessionId,record:rec,rest:ex.rest});
  lastCompletedExercise=finishedExIdx;

  const advanced=advanceNetworkLocal();
  if(advanced.finished){
    net.done[athlete]=true;
    wifiSend({type:'DONE',sessionId:net.sessionId,athlete,records:records.filter(r=>r.athlete===athlete)});
    $('restTime').textContent='TWÓJ TRENING GOTOWY — CZEKAM NA PARTNERA';
    $('saveSetBtn').disabled=true;
    $('skipRestBtn').classList.add('hidden');
    $('coach').textContent='Twoje serie są zapisane. Wspólna sesja zakończy się, gdy partner skończy albo gospodarz użyje STOP.';
    renderLivePanel();
    if(net.role==='host'&&net.done[0]&&net.done[1]) setTimeout(()=>finishSharedForAll(false),350);
    return;
  }

  const wait=advanced.exerciseChanged?90000:ex.rest*1000;
  if(advanced.exerciseChanged){
    $('coach').innerHTML=exerciseAdvice(finishedExIdx);
    transitionRest=true;
  }else transitionRest=false;
  prefillWeight();
  updateView();
  renderLivePanel();
  if(wait>1000)startRest(wait);
}

function readReps(){
  const reps=parseInt($('reps').value,10);
  if(!Number.isFinite(reps)||reps<=0){toast('Wpisz liczbę powtórzeń albo sekund.');return null;}
  return reps;
}
function readKg(){return parseFloat(String($('weight').value||'0').replace(',','.'))||0}
function makeRecord(ex,exIndex,setIndex,athlete,kg,reps){
  return {id:ex.id||slug(ex.n),name:ex.n,ex:exIndex,set:setIndex,athlete,kg,reps,time:!!ex.time,at:Date.now()};
}
function mergeRecord(rec){
  const uid=rec.uid||'local:'+rec.athlete+':'+rec.ex+':'+rec.set+':'+rec.at;
  const idx=records.findIndex(r=>(r.uid||'')===uid);
  if(idx>=0)records[idx]=rec;else records.push(rec);
}

function advanceState(){
  const ex=currentPlan.ex[exIdx];
  if(mode===2 && athleteIdx===0){athleteIdx=1;return {exerciseChanged:false,finished:false};}
  athleteIdx=0;
  setIdx++;
  if(setIdx<ex.sets)return {exerciseChanged:false,finished:false};
  setIdx=0;exIdx++;
  if(exIdx>=currentPlan.ex.length)return {exerciseChanged:true,finished:true};
  return {exerciseChanged:true,finished:false};
}

function advanceNetworkLocal(){
  const ex=currentPlan.ex[exIdx];
  setIdx++;
  if(setIdx<ex.sets)return {exerciseChanged:false,finished:false};
  setIdx=0;exIdx++;
  if(exIdx>=currentPlan.ex.length)return {exerciseChanged:true,finished:true};
  return {exerciseChanged:true,finished:false};
}

function deriveLocalPosition(){
  const a=net.localAthlete;
  for(let e=0;e<currentPlan.ex.length;e++){
    const ex=currentPlan.ex[e];
    for(let s=0;s<ex.sets;s++){
      const has=records.some(r=>r.athlete===a&&r.ex===e&&r.set===s);
      if(!has)return {ex:e,set:s,done:false};
    }
  }
  return {ex:Math.max(0,currentPlan.ex.length-1),set:0,done:true};
}

function startRest(ms){
  restPaused=0;restEnd=Date.now()+ms;
  $('saveSetBtn').disabled=true;
  $('skipRestBtn').classList.remove('hidden');
  tick();
}

function skipRest(){
  restEnd=0;restPaused=0;transitionRest=false;
  $('restTime').textContent='PRZERWA POMINIĘTA';
  $('skipRestBtn').classList.add('hidden');
  $('saveSetBtn').disabled=net.active&&net.done[net.localAthlete];
  if(net.active)wifiSend({type:'STATUS',sessionId:net.sessionId,athlete:net.localAthlete,state:'ready'});
}

function togglePause(){
  if(!running)return;
  if(net.active&&net.role==='guest'&&net.connected){toast('Pauzę wspólnej sesji kontroluje gospodarz.');return;}
  setPausedState(!paused);
  if(net.active&&net.role==='host')wifiSend({type:'PAUSE',sessionId:net.sessionId,paused});
}

function setPausedState(value){
  if(value===paused)return;
  if(value){
    paused=true;pauseStarted=Date.now();
    if(restEnd>0){restPaused=Math.max(0,restEnd-Date.now());restEnd=0;}
    $('pauseBtn').textContent=net.active&&net.role==='guest'?'PAUZA — HOST':'WZNÓW';
    $('stateBadge').textContent='PAUZA';
    $('stateBadge').className='badge pause';
    $('saveSetBtn').disabled=true;
  }else{
    paused=false;pausedTotal+=Math.max(0,Date.now()-pauseStarted);pauseStarted=0;
    if(restPaused>0){restEnd=Date.now()+restPaused;restPaused=0;}
    $('pauseBtn').textContent=net.active&&net.role==='guest'?'PAUZA — HOST':'PAUZA';
    $('stateBadge').textContent=net.active?'WSPÓLNY TRENING — WI‑FI':(mode===1?'TRENING — SOLO':'TRENING — 2 OSOBY');
    $('stateBadge').className='badge green';
    $('saveSetBtn').disabled=restEnd>0||(net.active&&net.done[net.localAthlete]);
  }
  tick();
}

function stopWorkout(){
  if(!running)return;
  if(net.active&&net.role==='guest'){
    if(confirm('Opuścić wspólny trening? Twoje wykonane serie zostaną zapisane na tym telefonie.')){
      wifiSend({type:'LEAVE',sessionId:net.sessionId,athlete:net.localAthlete});
      finishWorkout(true,true);
    }
    return;
  }
  const msg=net.active?'Zakończyć wspólny trening na obu telefonach?':'Zakończyć trening? Wykonane serie zostaną zapisane jako trening przerwany.';
  if(confirm(msg)){
    if(net.active&&net.role==='host')finishSharedForAll(true);
    else finishWorkout(true);
  }
}

function finishSharedForAll(interrupted){
  if(!running||!net.active)return;
  wifiSend({type:'FINISH',sessionId:net.sessionId,interrupted:!!interrupted,records:[...records]});
  finishWorkout(!!interrupted,true);
}

function finishWorkout(interrupted,fromNetwork=false){
  if(!running)return;
  const duration=elapsedMs();
  if(net.active&&!fromNetwork){
    if(net.role==='host')wifiSend({type:'FINISH',sessionId:net.sessionId,interrupted:!!interrupted,records:[...records]});
    else wifiSend({type:'LEAVE',sessionId:net.sessionId,athlete:net.localAthlete});
  }
  running=false;paused=false;restEnd=0;restPaused=0;
  if(tickHandle){clearInterval(tickHandle);tickHandle=null;}
  saveHistory(interrupted,duration);
  const sets=records.filter(r=>!net.active||r.athlete===net.localAthlete).length;
  const ownAthlete=net.active?net.localAthlete:0;
  const volume=Math.round(records.filter(r=>!net.active||r.athlete===ownAthlete).reduce((a,r)=>a+(Number(r.kg)||0)*(Number(r.reps)||0),0));
  $('training').classList.add('hidden');
  $('setup').classList.remove('hidden');
  $('wifiLive').classList.add('hidden');
  $('clock').textContent='00:00';
  if(net.active){net.active=false;net.done=[false,false];net.sessionId='';}
  renderHistory();renderProgress();updateWifiUi();
  toast((interrupted?'Trening przerwany':'Trening zakończony')+' • '+formatTime(duration)+' • '+sets+' serii • '+volume+' kg·powt.');
}

function updateView(){
  if(!running)return;
  if(net.active&&net.done[net.localAthlete]){
    $('athlete').textContent=athleteName(net.localAthlete);
    $('exercise').textContent='Twoja część zakończona';
    $('series').textContent='Czekamy na partnera';
    $('target').textContent='Wspólna sesja nadal trwa';
    $('technique').textContent='Możesz obserwować postęp partnera poniżej.';
    $('saveSetBtn').disabled=true;
    return;
  }
  const ex=currentPlan.ex[exIdx];
  athleteIdx=net.active?net.localAthlete:athleteIdx;
  $('athlete').textContent=athleteName(athleteIdx);
  $('exercise').textContent=ex.n;
  $('series').textContent='Seria '+(setIdx+1)+'/'+ex.sets+(mode===2?' • '+athleteName(athleteIdx):'');
  $('target').textContent=ex.time?'Cel: '+ex.min+'–'+ex.max+' sekund':'Cel: '+ex.min+'–'+ex.max+' powtórzeń';
  $('reps').placeholder=ex.time?'sek.':'powt.';
  $('repsLabel').textContent=ex.time?'Czas [sek.]':'Powtórzenia';
  $('technique').textContent='Technika: '+ex.tip+' Przerwa: '+formatRest(ex.rest)+'.';
  $('saveSetBtn').disabled=paused||restEnd>0||(net.active&&net.done[net.localAthlete]);
}

function athleteName(index){
  if(net.active&&net.names[index])return net.names[index];
  return index===0?($('nameA').value.trim()||'Osoba 1'):($('nameB').value.trim()||'Osoba 2');
}

function prefillWeight(){
  if(!currentPlan||exIdx>=currentPlan.ex.length)return;
  const ex=currentPlan.ex[exIdx];
  const history=getHistory();
  for(const h of history){
    const localIndex=h.localAthlete??0;
    const match=(h.records||[]).find(r=>(r.id===ex.id||r.name===ex.n)&&r.athlete===localIndex&&Number(r.kg)>0);
    if(match){$('weight').value=match.kg;return;}
  }
  $('weight').value='';
}

function exerciseAdvice(index){
  const ex=currentPlan.ex[index];
  const step=parseFloat($('stepKg').value)||2.5;
  const lines=[];
  const athletes=net.active?[net.localAthlete]:Array.from({length:mode},(_,i)=>i);
  for(const a of athletes){
    const reps=records.filter(r=>r.ex===index&&r.athlete===a).map(r=>r.reps);
    lines.push('<span class="title">'+escapeHtml(athleteName(a))+':</span> '+advise(reps,ex.min,ex.max,step));
  }
  return 'Trener:<br>'+lines.join('<br>');
}

function advise(reps,min,max,step){
  if(!reps.length)return 'brak danych.';
  if(reps.every(r=>r>=max))return '<span style="color:#5ef0a0">DOŁÓŻ +'+trim(step)+' kg</span>, jeśli technika była czysta.';
  if(reps.filter(r=>r<min).length>=2)return '<span style="color:#ffd269">ODEJMIJ około 5%</span> — ciężar był za duży.';
  return 'ZOSTAW ciężar i spróbuj dobić górny zakres.';
}

function saveHistory(interrupted,duration){
  const history=getHistory();
  const localAthlete=net.active?net.localAthlete:0;
  history.unshift({
    id:'w'+Date.now(),
    iso:new Date().toISOString(),
    date:new Date().toLocaleString('pl-PL'),
    plan:currentPlan.title,
    planKey,
    mode,
    shared:net.active,
    sessionId:net.active?net.sessionId:null,
    localAthlete,
    names:net.active?[...net.names]:[$('nameA').value.trim()||'Osoba 1',$('nameB').value.trim()||'Osoba 2'],
    duration:Math.round(duration/1000),
    interrupted,
    records:[...records]
  });
  localStorage.setItem('trainer3.history',JSON.stringify(history.slice(0,100)));
}

function getHistory(){return safeJson(localStorage.getItem('trainer3.history'),[])}

function renderHistory(){
  const history=getHistory();
  if(!history.length){$('historyContent').textContent='Brak zapisanych treningów.';return;}
  $('historyContent').innerHTML=history.map(h=>{
    const localIndex=h.localAthlete??0;
    const own=(h.records||[]).filter(r=>(r.athlete||0)===localIndex);
    const volume=Math.round(own.reduce((a,r)=>a+(Number(r.kg)||0)*(Number(r.reps)||0),0));
    const details=groupHistory(h);
    const modeLabel=h.shared?'Wi‑Fi • wspólny':(h.mode===2?'2 osoby':'solo');
    return `<details class="historyItem"><summary><span class="title">${escapeHtml(h.plan||'Trening')}</span><div class="meta">${escapeHtml(h.date||'')} • ${modeLabel} • ${formatTime((h.duration||0)*1000)} • ${own.length} Twoich serii${h.interrupted?' • przerwany':''}</div></summary><div class="meta" style="margin-top:8px">Twoja objętość: ${volume} kg·powt.</div>${details}</details>`;
  }).join('');
}

function groupHistory(h){
  const by={};
  (h.records||[]).forEach(r=>{
    const key=(r.name||r.id||'Ćwiczenie')+'|'+(r.athlete||0);
    if(!by[key])by[key]=[];
    by[key].push(r);
  });
  return Object.entries(by).map(([key,arr])=>{
    const [name,a]=key.split('|');
    const person=(h.names||[])[Number(a)]||('Osoba '+(Number(a)+1));
    return `<div class="recordRow"><span>${escapeHtml(person)} — ${escapeHtml(name)}</span><b>${arr.map(r=>(r.kg?trim(r.kg)+'kg×':'')+r.reps).join(' / ')}</b></div>`;
  }).join('');
}

function saveWeight(){
  const kg=parseFloat(String($('bodyWeight').value||'').replace(',','.'));
  if(!Number.isFinite(kg)||kg<30||kg>300){toast('Wpisz prawidłową masę ciała.');return;}
  const weights=safeJson(localStorage.getItem('trainer3.weights'),[]);
  weights.unshift({iso:new Date().toISOString(),date:new Date().toLocaleDateString('pl-PL'),kg,name:$('nameA').value.trim()||'Edwin'});
  localStorage.setItem('trainer3.weights',JSON.stringify(weights.slice(0,365)));
  $('bodyWeight').value='';renderProgress();toast('Waga zapisana.');
}

function renderProgress(){
  const history=getHistory();
  const weights=safeJson(localStorage.getItem('trainer3.weights'),[]);
  const allRecords=history.flatMap(h=>{
    const localIndex=h.localAthlete??0;
    return (h.records||[]).filter(r=>(r.athlete||0)===localIndex);
  });
  $('currentWeight').textContent=weights.length?trim(weights[0].kg)+' kg':'—';
  $('trainingCount').textContent=history.length;
  $('setCount').textContent=allRecords.length;
  const volume=Math.round(allRecords.reduce((a,r)=>a+(Number(r.kg)||0)*(Number(r.reps)||0),0));
  $('totalVolume').textContent=volume>=1000?(volume/1000).toFixed(1)+' t':volume+' kg';

  const best={};
  allRecords.forEach(r=>{
    if(!Number(r.kg))return;
    const key=r.name||r.id||'Ćwiczenie';
    if(!best[key]||Number(r.kg)>best[key].kg)best[key]={kg:Number(r.kg),reps:Number(r.reps)||0};
  });
  const entries=Object.entries(best).sort((a,b)=>b[1].kg-a[1].kg);
  $('recordsContent').innerHTML=entries.length?entries.map(([name,v])=>`<div class="recordRow"><span>${escapeHtml(name)}</span><b>${trim(v.kg)} kg × ${v.reps}</b></div>`).join(''):'Po pierwszych treningach pojawią się tu najlepsze ciężary.';
  renderPhotos();
}

function handleProgressPhoto(ev){
  const file=ev.target.files&&ev.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const max=720,scale=Math.min(1,max/Math.max(img.width,img.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      const data=canvas.toDataURL('image/jpeg',0.62);
      const photos=safeJson(localStorage.getItem('trainer3.photos'),[]);
      photos.unshift({id:'p'+Date.now(),iso:new Date().toISOString(),date:new Date().toLocaleDateString('pl-PL'),data});
      try{
        localStorage.setItem('trainer3.photos',JSON.stringify(photos.slice(0,12)));
        renderPhotos();toast('Zdjęcie zapisane lokalnie.');
      }catch(e){toast('Brak miejsca na kolejne zdjęcie — usuń starsze.');}
    };
    img.src=reader.result;
  };
  reader.readAsDataURL(file);ev.target.value='';
}

function renderPhotos(){
  const photos=safeJson(localStorage.getItem('trainer3.photos'),[]);
  $('photoGallery').innerHTML=photos.map(p=>`<div class="photoCard"><img src="${p.data}" alt="Zdjęcie postępu"><button onclick="deletePhoto('${p.id}')">×</button><div class="photoMeta">${escapeHtml(p.date)}</div></div>`).join('');
}

function deletePhoto(id){
  const photos=safeJson(localStorage.getItem('trainer3.photos'),[]).filter(p=>p.id!==id);
  localStorage.setItem('trainer3.photos',JSON.stringify(photos));renderPhotos();
}

function loadReminderSettings(){
  let cfg=safeJson(localStorage.getItem('trainer3.reminders'),{enabled:false,days:'2,4,6',hour:18,minute:0});
  try{
    if(window.Android&&Android.getReminderConfig){const nativeCfg=JSON.parse(Android.getReminderConfig());if(nativeCfg)cfg=nativeCfg;}
  }catch(e){}
  $('reminderEnabled').checked=!!cfg.enabled;
  const days=new Set(String(cfg.days||'2,4,6').split(','));
  document.querySelectorAll('.dayCheck').forEach(c=>c.checked=days.has(c.value));
  $('reminderTime').value=String(cfg.hour??18).padStart(2,'0')+':'+String(cfg.minute??0).padStart(2,'0');
  updateReminderStatus(cfg);
}

function saveReminderSettings(){
  const enabled=$('reminderEnabled').checked;
  const days=[...document.querySelectorAll('.dayCheck:checked')].map(x=>x.value);
  if(enabled&&!days.length){toast('Wybierz co najmniej jeden dzień.');return;}
  const parts=($('reminderTime').value||'18:00').split(':');
  const hour=parseInt(parts[0],10)||0,minute=parseInt(parts[1],10)||0;
  const cfg={enabled,days:days.join(','),hour,minute};
  localStorage.setItem('trainer3.reminders',JSON.stringify(cfg));
  try{
    if(window.Android){
      if(enabled)Android.scheduleReminders(cfg.days,hour,minute);
      else Android.cancelReminders();
    }
  }catch(e){}
  updateReminderStatus(cfg);toast(enabled?'Powiadomienia zapisane.':'Powiadomienia wyłączone.');
}

function updateReminderStatus(cfg){
  if(!cfg.enabled){$('reminderStatus').textContent='Powiadomienia są wyłączone.';return;}
  const labels={'1':'Nd','2':'Pon','3':'Wt','4':'Śr','5':'Czw','6':'Pt','7':'Sob'};
  const ds=String(cfg.days||'').split(',').filter(Boolean).map(d=>labels[d]||d).join(', ');
  $('reminderStatus').textContent='Aktywne: '+ds+' o '+String(cfg.hour).padStart(2,'0')+':'+String(cfg.minute).padStart(2,'0')+'.';
}

function installWifiUi(){
  if(!document.getElementById('wifi-v04-style')){
    const link=document.createElement('link');
    link.id='wifi-v04-style';link.rel='stylesheet';link.href='wifi.css';
    document.head.appendChild(link);
  }

  const wifiCard=[...document.querySelectorAll('#settings .card')].find(c=>{
    const e=c.querySelector('.eyebrow');
    return e&&e.textContent.includes('DWA TELEFONY');
  });
  if(wifiCard){
    wifiCard.innerHTML=`
      <div class="eyebrow">DWA TELEFONY • WI‑FI</div>
      <h2>Wspólna sesja</h2>
      <p class="hint">Oba telefony muszą być w tej samej sieci Wi‑Fi albo jeden może udostępnić hotspot. Internet nie jest potrzebny — serie lecą bezpośrednio między telefonami.</p>
      <div id="wifiStatus" class="connectionStatus">Niepołączono</div>
      <div class="wifiMeta">
        <div><span>IP tego telefonu</span><b id="localIp">—</b></div>
        <div><span>Rola</span><b id="wifiRole">—</b></div>
        <div><span>Partner</span><b id="wifiPartner">—</b></div>
      </div>
      <div class="wifiSplit">
        <div id="wifiHostPane" class="wifiPane">
          <h3>1. Gospodarz</h3>
          <p class="hint">Na telefonie osoby, która wybiera plan treningu.</p>
          <label>Kod sesji</label>
          <input id="hostCode" readonly placeholder="pojawi się po utworzeniu">
          <button id="hostBtn" class="primary">UTWÓRZ SESJĘ</button>
        </div>
        <div id="wifiJoinPane" class="wifiPane">
          <h3>2. Partner</h3>
          <p class="hint">Przepisz IP i 6‑cyfrowy kod z telefonu gospodarza.</p>
          <label>IP gospodarza</label>
          <input id="joinIp" inputmode="decimal" placeholder="np. 192.168.1.25">
          <label>Kod</label>
          <input id="joinCode" inputmode="numeric" maxlength="6" placeholder="123456">
          <button id="joinBtn" class="success">DOŁĄCZ</button>
        </div>
      </div>
      <button id="disconnectWifiBtn" class="danger hidden wifiDisconnect">ROZŁĄCZ WI‑FI</button>
      <p class="hint wifiNote">Po utracie połączenia trening działa dalej lokalnie. Po ponownym dołączeniu brakujące serie są dosyłane automatycznie. Połączenie jest lokalne i chronione kodem sesji, ale nie jest szyfrowane.</p>`;
  }

  const appTitle=document.querySelector('.appHeader h1');
  if(appTitle&&!$('wifiHeaderState')){
    const state=document.createElement('span');
    state.id='wifiHeaderState';
    state.className='wifiHeaderState hidden';
    state.innerHTML='<span id="wifiHeaderRole" class="wifiHeaderBadge role"></span><span id="wifiHeaderLink" class="wifiHeaderBadge link"></span>';
    appTitle.appendChild(state);
  }

  if(!$('wifiLive')){
    const live=document.createElement('div');
    live.id='wifiLive';live.className='wifiLive hidden';
    live.innerHTML=`
      <div class="wifiLiveHead"><b>WSPÓLNA SESJA</b><span id="liveLink">Wi‑Fi</span></div>
      <div class="liveGrid">
        <div id="liveA" class="livePerson"><strong>Osoba 1</strong><span>0 serii</span></div>
        <div id="liveB" class="livePerson"><strong>Osoba 2</strong><span>0 serii</span></div>
      </div>`;
    const coach=$('coach');
    coach.parentNode.insertBefore(live,coach);
  }
}

/* Wi-Fi: jeden telefon jest gospodarzem, drugi gościem. Dane nie wychodzą poza LAN. */
function wifiNativeAvailable(){
  return !!(window.Android&&Android.wifiHost&&Android.wifiJoin&&Android.wifiSend&&Android.wifiDisconnect);
}

function refreshWifiInfo(){
  net.available=wifiNativeAvailable();
  let ip='—';
  try{if(net.available&&Android.wifiLocalIp)ip=Android.wifiLocalIp()||'—';}catch(e){}
  $('localIp').textContent=ip;
  updateWifiUi();
}

function createWifiSession(){
  if(running){toast('Najpierw zakończ bieżący trening.');return;}
  if(!wifiNativeAvailable()){toast('Połączenie Wi‑Fi działa tylko w aplikacji Android.');return;}
  const code=String(Math.floor(100000+Math.random()*900000));
  $('hostCode').value=code;
  net.role='host';net.localAthlete=0;net.status='starting';net.connected=false;net.detail='';net.lastError='';
  net.names=[$('nameA').value.trim()||'Osoba 1',$('nameB').value.trim()||'Osoba 2'];
  setMode(2);
  try{Android.wifiHost(code);toast('Tworzę sesję. Partner wpisuje IP i kod.');}catch(e){toast('Nie udało się uruchomić sesji.');}
  updateWifiUi();
}

function joinWifiSession(){
  if(running&&!(net.active&&net.role==='guest')){toast('Najpierw zakończ bieżący trening.');return;}
  if(!wifiNativeAvailable()){toast('Połączenie Wi‑Fi działa tylko w aplikacji Android.');return;}
  const ip=$('joinIp').value.trim();
  const code=$('joinCode').value.trim();
  if(!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)){toast('Wpisz IP gospodarza, np. 192.168.1.25.');return;}
  if(!/^\d{6}$/.test(code)){toast('Kod sesji ma 6 cyfr.');return;}
  net.role='guest';net.localAthlete=1;net.status='connecting';net.connected=false;net.detail='';net.lastError='';
  setMode(2);
  try{Android.wifiJoin(ip,code);toast('Łączę z gospodarzem…');}catch(e){toast('Nie udało się rozpocząć połączenia.');}
  updateWifiUi();
}

function disconnectWifi(preserveError=false){
  preserveError=preserveError===true;
  try{if(wifiNativeAvailable())Android.wifiDisconnect();}catch(e){}
  net.connected=false;
  if(preserveError){
    net.status='error';
    net.detail=net.lastError||net.detail||'Połączenie odrzucone.';
  }else{
    net.status='offline';net.detail='';net.lastError='';
  }
  if(!running){net.role=null;net.active=false;net.sessionId='';}
  updateWifiUi();
}

function wifiSend(obj){
  if(!net.connected||!wifiNativeAvailable())return false;
  try{Android.wifiSend(JSON.stringify(obj));return true;}catch(e){return false;}
}

function nativeWifiStatus(status,detail){
  const incoming=status||'offline';
  const message=String(detail||'');
  if(incoming==='disconnected'&&net.lastError){
    net.status='error';
    net.detail=net.lastError;
  }else{
    net.status=incoming;
    net.detail=message;
  }
  if(incoming==='connected'){
    net.connected=true;net.lastError='';net.detail='';
    if(detail==='host')net.role='host';
    if(detail==='guest')net.role='guest';
    setMode(2);
    if(net.role==='guest'){
      wifiSend({type:'PROFILE',name:$('nameA').value.trim()||'Partner'});
      if(net.active){
        wifiSend({
          type:'RESYNC',
          sessionId:net.sessionId,
          athlete:net.localAthlete,
          done:net.done[net.localAthlete],
          records:records.filter(r=>r.athlete===net.localAthlete)
        });
      }
    }else if(net.role==='host'){
      if(net.active)broadcastSnapshot();
      else wifiSend({type:'PROFILE_STATE',names:[$('nameA').value.trim()||'Osoba 1',$('nameB').value.trim()||'Osoba 2']});
    }
    toast('Połączono z partnerem przez Wi‑Fi.');
  }else if(incoming==='waiting'){
    net.connected=false;net.lastError='';
  }else if(incoming==='disconnected'){
    net.connected=false;
    if(running&&net.active)toast('Partner rozłączony — trening działa dalej lokalnie.');
  }else if(incoming==='error'||incoming==='denied'){
    net.connected=false;
    net.lastError=message||'Błąd połączenia Wi‑Fi.';
    net.detail=net.lastError;
    toast(net.lastError);
  }
  updateWifiUi();
  renderLivePanel();
}

function nativeWifiMessage(raw){
  const m=safeJson(raw,null);
  if(!m||!m.type)return;
  if(m.type==='PROFILE'&&net.role==='host'){
    const guest=String(m.name||'Partner').trim()||'Partner';
    net.names=[$('nameA').value.trim()||'Osoba 1',guest];
    $('nameB').value=guest;
    saveSettings();
    wifiSend({type:'PROFILE_STATE',names:net.names});
    if(net.active)broadcastSnapshot();
    updateWifiUi();
    return;
  }
  if(m.type==='PROFILE_STATE'&&net.role==='guest'){
    if(Array.isArray(m.names)&&m.names.length>=2)net.names=m.names.slice(0,2);
    updateWifiUi();renderLivePanel();return;
  }
  if(m.type==='START'&&net.role==='guest'){
    beginGuestSharedWorkout(m);return;
  }
  if(m.type==='SET'&&net.active&&m.sessionId===net.sessionId&&m.record){
    mergeRecord(m.record);
    net.last[m.record.athlete]=m.record;
    renderLivePanel();
    return;
  }
  if(m.type==='DONE'&&net.active&&m.sessionId===net.sessionId){
    if(Array.isArray(m.records))m.records.forEach(mergeRecord);
    net.done[Number(m.athlete)||0]=true;
    renderLivePanel();
    if(net.role==='host'&&net.done[0]&&net.done[1])setTimeout(()=>finishSharedForAll(false),350);
    return;
  }
  if(m.type==='PAUSE'&&net.active&&net.role==='guest'&&m.sessionId===net.sessionId){
    setPausedState(!!m.paused);return;
  }
  if(m.type==='FINISH'&&net.active&&m.sessionId===net.sessionId){
    if(Array.isArray(m.records))m.records.forEach(mergeRecord);
    finishWorkout(!!m.interrupted,true);return;
  }
  if(m.type==='SNAPSHOT'&&net.role==='guest'){
    applySnapshot(m);return;
  }
  if(m.type==='RESYNC'&&net.role==='host'&&net.active&&m.sessionId===net.sessionId){
    if(Array.isArray(m.records))m.records.forEach(mergeRecord);
    const a=Number(m.athlete)||1;
    net.done[a]=!!m.done;
    broadcastSnapshot();
    renderLivePanel();return;
  }
  if(m.type==='LEAVE'&&net.active){
    net.done[Number(m.athlete)||1]=true;
    toast('Partner opuścił wspólną sesję.');
    renderLivePanel();
  }
}

function beginGuestSharedWorkout(m){
  if(running&&(!net.active||net.sessionId!==m.sessionId))finishWorkout(true,true);
  resetWorkoutState();
  currentPlan=m.plan;
  planKey=m.planKey||'shared';
  if(!currentPlan||!Array.isArray(currentPlan.ex)){toast('Nieprawidłowy plan od gospodarza.');return;}
  net.active=true;net.sessionId=m.sessionId;net.localAthlete=1;net.done=[false,false];
  net.names=Array.isArray(m.names)&&m.names.length>=2?m.names.slice(0,2):['Gospodarz',$('nameA').value.trim()||'Partner'];
  mode=2;athleteIdx=1;startedAt=Date.now();running=true;paused=false;
  openTrainingUi();
  showTab('start');
  wifiSend({type:'RESYNC',sessionId:net.sessionId,athlete:1,done:false,records:[]});
  toast('Gospodarz rozpoczął wspólny trening.');
}

function broadcastSnapshot(){
  if(net.role!=='host'||!net.connected)return;
  wifiSend({
    type:'SNAPSHOT',
    active:net.active,
    sessionId:net.sessionId,
    planKey,
    plan:currentPlan,
    names:net.active?net.names:[$('nameA').value.trim()||'Osoba 1',$('nameB').value.trim()||'Osoba 2'],
    records:[...records],
    done:[...net.done],
    paused,
    elapsed:running?elapsedMs():0
  });
}

function applySnapshot(m){
  if(!m.active){
    if(Array.isArray(m.names))net.names=m.names.slice(0,2);
    return;
  }
  if(!net.active||net.sessionId!==m.sessionId){
    resetWorkoutState();
    currentPlan=m.plan;planKey=m.planKey||'shared';
    if(!currentPlan||!Array.isArray(currentPlan.ex))return;
    net.active=true;net.sessionId=m.sessionId;net.localAthlete=1;mode=2;
    startedAt=Date.now()-Math.max(0,Number(m.elapsed)||0);
    running=true;paused=false;
    openTrainingUi();showTab('start');
  }
  if(Array.isArray(m.names))net.names=m.names.slice(0,2);
  if(Array.isArray(m.records))m.records.forEach(mergeRecord);
  if(Array.isArray(m.done))net.done=[!!m.done[0],!!m.done[1]];
  const p=deriveLocalPosition();
  exIdx=p.ex;setIdx=p.set;net.done[1]=net.done[1]||p.done;
  if(m.paused&&!paused)setPausedState(true);
  if(!m.paused&&paused)setPausedState(false);
  prefillWeight();updateView();renderLivePanel();
}

function renderLivePanel(){
  if(!$('wifiLive'))return;
  $('wifiLive').classList.toggle('hidden',!net.active);
  if(!net.active)return;
  const total=(currentPlan?.ex||[]).reduce((a,e)=>a+e.sets,0);
  for(let a=0;a<2;a++){
    const own=records.filter(r=>r.athlete===a);
    const last=own.slice().sort((x,y)=>(y.at||0)-(x.at||0))[0];
    const txt=net.done[a]?'GOTOWY':(last?`${own.length}/${total} serii • ${last.kg?trim(last.kg)+' kg × ':''}${last.reps}`:`0/${total} serii`);
    const el=$(a===0?'liveA':'liveB');
    el.querySelector('strong').textContent=net.names[a]||('Osoba '+(a+1));
    el.querySelector('span').textContent=txt;
    el.classList.toggle('done',!!net.done[a]);
  }
  $('liveLink').textContent=net.connected?'Wi‑Fi: połączono':'Wi‑Fi: offline — zapis lokalny';
}

function updateWifiUi(){
  if(!$('wifiStatus'))return;
  const labels={
    offline:'Niepołączono',
    starting:'Uruchamianie gospodarza…',
    waiting:'Sesja utworzona — czekam na partnera',
    connecting:'Łączenie…',
    reconnecting:'Utracono połączenie — łączę ponownie…',
    connected:'Połączono',
    disconnected:'Rozłączono',
    error:'Błąd połączenia',
    denied:'Błędny kod'
  };
  let statusText=labels[net.status]||net.status||'Niepołączono';
  const detail=String(net.lastError||net.detail||'').trim();
  if((net.status==='error'||net.status==='denied')&&detail)statusText+=' — '+detail;
  $('wifiStatus').textContent=statusText;
  $('wifiStatus').className='connectionStatus '+(net.connected?'ok':(net.status==='error'||net.status==='denied'?'bad':''));

  const hostPane=$('wifiHostPane'),joinPane=$('wifiJoinPane');
  if(hostPane)hostPane.classList.toggle('hidden',net.role==='guest');
  if(joinPane)joinPane.classList.toggle('hidden',net.role==='host');

  $('disconnectWifiBtn').classList.toggle('hidden',!(net.connected||net.role));
  $('hostBtn').disabled=running||!net.available||net.role==='host';
  $('hostBtn').textContent=net.role==='host'?'SESJA UTWORZONA':'UTWÓRZ SESJĘ';
  $('joinBtn').disabled=!net.available||net.role==='guest'||(running&&!(net.active&&net.role==='guest'));

  const role=net.role==='host'?'Gospodarz':(net.role==='guest'?'Gość':'—');
  $('wifiRole').textContent=role;
  if(net.connected&&net.role==='guest')$('wifiPartner').textContent=net.names[0]||'Gospodarz';
  else if(net.role==='host'&&net.connected)$('wifiPartner').textContent=net.names[1]||$('nameB').value||'Partner';
  else if(net.role==='host')$('wifiPartner').textContent='Brak połączenia';
  else if(net.role==='guest'&&net.status==='reconnecting')$('wifiPartner').textContent=net.names?.[0]||'Gospodarz';
  else $('wifiPartner').textContent='—';

  const header=$('wifiHeaderState'),roleBadge=$('wifiHeaderRole'),linkBadge=$('wifiHeaderLink');
  if(header&&roleBadge&&linkBadge){
    const visible=!!net.role;
    header.classList.toggle('hidden',!visible);
    if(visible){
      roleBadge.textContent=net.role==='host'?'HOST':'GOŚĆ';
      roleBadge.className='wifiHeaderBadge role '+(net.role==='host'?'host':'guest');
      let link='OFFLINE',cls='offline';
      if(net.connected){link='POŁĄCZONO';cls='connected';}
      else if(net.role==='host'&&(net.status==='waiting'||net.status==='starting')){link='CZEKA NA PARTNERA';cls='waiting';}
      else if(net.status==='connecting'){link='ŁĄCZENIE';cls='waiting';}
      else if(net.status==='reconnecting'){link='RECONNECT…';cls='waiting';}
      else if(net.status==='error'||net.status==='denied'){link='BŁĄD';cls='error';}
      linkBadge.textContent=link;
      linkBadge.className='wifiHeaderBadge link '+cls;
    }
  }
}

window.TrenerWifi={
  nativeStatus:nativeWifiStatus,
  nativeMessage:nativeWifiMessage
};

function exportData(){
  const data={
    version:4,
    exportedAt:new Date().toISOString(),
    settings:safeJson(localStorage.getItem('trainer3.settings'),{}),
    history:getHistory(),
    weights:safeJson(localStorage.getItem('trainer3.weights'),[]),
    customPlan:getCustomPlan(),
    reminders:safeJson(localStorage.getItem('trainer3.reminders'),{})
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Trener2-kopia-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function importData(ev){
  const file=ev.target.files&&ev.target.files[0];if(!file)return;
  const r=new FileReader();r.onload=()=>{
    try{
      const d=JSON.parse(r.result);
      if(d.settings)localStorage.setItem('trainer3.settings',JSON.stringify(d.settings));
      if(Array.isArray(d.history))localStorage.setItem('trainer3.history',JSON.stringify(d.history));
      if(Array.isArray(d.weights))localStorage.setItem('trainer3.weights',JSON.stringify(d.weights));
      if(d.customPlan)localStorage.setItem('trainer3.customPlan',JSON.stringify(d.customPlan));
      if(d.reminders)localStorage.setItem('trainer3.reminders',JSON.stringify(d.reminders));
      loadSettings();renderBuilder();renderHistory();renderProgress();loadReminderSettings();toast('Kopia danych wczytana.');
    }catch(e){toast('Nieprawidłowy plik kopii.');}
  };r.readAsText(file);ev.target.value='';
}

function formatTime(ms){const sec=Math.max(0,Math.ceil(ms/1000));const m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function formatRest(sec){return sec>=120?trim(sec/60)+' min':sec+' s'}
function trim(v){return Number(v).toLocaleString('pl-PL',{maximumFractionDigits:2})}
function safeJson(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi,'-').replace(/^-|-$/g,'')}
function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function vibrate(ms){try{if(window.Android&&Android.vibrate)Android.vibrate(ms);else if(navigator.vibrate)navigator.vibrate(ms)}catch(e){}}
function toast(msg){const e=$('toast');e.textContent=msg;e.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>e.classList.remove('show'),2600)}

function bind(){
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
  $('soloBtn').addEventListener('click',()=>setMode(1));
  $('duoBtn').addEventListener('click',()=>setMode(2));
  $('startBtn').addEventListener('click',startWorkout);
  $('saveSetBtn').addEventListener('click',completeSet);
  $('skipRestBtn').addEventListener('click',skipRest);
  $('pauseBtn').addEventListener('click',togglePause);
  $('stopBtn').addEventListener('click',stopWorkout);
  $('saveCustomBtn').addEventListener('click',saveCustomPlan);
  $('saveWeightBtn').addEventListener('click',saveWeight);
  $('progressPhoto').addEventListener('change',handleProgressPhoto);
  $('saveReminderBtn').addEventListener('click',saveReminderSettings);
  $('exportBtn').addEventListener('click',exportData);
  $('importFile').addEventListener('change',importData);
  $('planSelect').addEventListener('change',saveSettings);
  $('hostBtn').addEventListener('click',createWifiSession);
  $('joinBtn').addEventListener('click',joinWifiSession);
  $('disconnectWifiBtn').addEventListener('click',()=>disconnectWifi(false));
}

function init(){
  migrateOldData();installWifiUi();bind();loadSettings();renderBuilder();renderHistory();renderProgress();loadReminderSettings();
  net.available=wifiNativeAvailable();refreshWifiInfo();
  const day=new Date().getDay();
  const stored=safeJson(localStorage.getItem('trainer3.settings'),{});
  if(!stored.planKey){if(day===1)$('planSelect').value='mon';if(day===3)$('planSelect').value='wed';if(day===5)$('planSelect').value='fri';}
}

init();
