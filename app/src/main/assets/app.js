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
  planKey=$('planSelect').value;
  currentPlan=getPlan(planKey);
  if(!currentPlan){toast('Najpierw zbuduj trening mieszany.');return;}
  exIdx=0;setIdx=0;athleteIdx=0;records=[];readyAt=[0,0];lastCompletedExercise=-1;
  startedAt=Date.now();pausedTotal=0;pauseStarted=0;restEnd=0;restPaused=0;transitionRest=false;
  running=true;paused=false;
  $('setup').classList.add('hidden');
  $('training').classList.remove('hidden');
  $('stateBadge').textContent=mode===1?'TRENING — SOLO':'TRENING — 2 OSOBY';
  $('stateBadge').className='badge green';
  $('pauseBtn').textContent='PAUZA';
  $('planTitle').textContent=currentPlan.title;
  $('coach').textContent='Trener: zostaw 1–2 powtórzenia w zapasie i pilnuj techniki.';
  $('restTime').textContent='GOTOWY';
  $('skipRestBtn').classList.add('hidden');
  prefillWeight();
  updateView();
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
      $('saveSetBtn').disabled=false;
      vibrate(180);
    }else $('restTime').textContent=formatTime(left);
  }
}

function elapsedMs(){
  const now=paused?pauseStarted:Date.now();
  return Math.max(0,now-startedAt-pausedTotal);
}

function completeSet(){
  if(!running||paused||restEnd>0)return;
  const ex=currentPlan.ex[exIdx];
  const reps=parseInt($('reps').value,10);
  if(!Number.isFinite(reps)||reps<=0){toast('Wpisz liczbę powtórzeń albo sekund.');return;}
  const kg=parseFloat(String($('weight').value||'0').replace(',','.'))||0;
  const finishedExIdx=exIdx, finishedAthlete=athleteIdx;
  records.push({id:ex.id||slug(ex.n),name:ex.n,ex:exIdx,set:setIdx,athlete:athleteIdx,kg,reps,time:!!ex.time});
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
  else {
    $('restTime').textContent=mode===2?'ZMIANA — NASTĘPNA OSOBA GOTOWA':'GOTOWY';
    $('saveSetBtn').disabled=false;
  }
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
  $('saveSetBtn').disabled=false;
}

function togglePause(){
  if(!running)return;
  if(!paused){
    paused=true;pauseStarted=Date.now();
    if(restEnd>0){restPaused=Math.max(0,restEnd-Date.now());restEnd=0;}
    $('pauseBtn').textContent='WZNÓW';
    $('stateBadge').textContent='PAUZA';
    $('stateBadge').className='badge pause';
    $('saveSetBtn').disabled=true;
  }else{
    paused=false;pausedTotal+=Date.now()-pauseStarted;pauseStarted=0;
    if(restPaused>0){restEnd=Date.now()+restPaused;restPaused=0;}
    $('pauseBtn').textContent='PAUZA';
    $('stateBadge').textContent=mode===1?'TRENING — SOLO':'TRENING — 2 OSOBY';
    $('stateBadge').className='badge green';
    $('saveSetBtn').disabled=restEnd>0;
  }
  tick();
}

function stopWorkout(){
  if(!running)return;
  if(confirm('Zakończyć trening? Wykonane serie zostaną zapisane jako trening przerwany.')) finishWorkout(true);
}

function finishWorkout(interrupted){
  if(!running)return;
  const duration=elapsedMs();
  running=false;paused=false;restEnd=0;restPaused=0;
  if(tickHandle){clearInterval(tickHandle);tickHandle=null;}
  saveHistory(interrupted,duration);
  const sets=records.length;
  const volume=Math.round(records.reduce((a,r)=>a+r.kg*r.reps,0));
  $('training').classList.add('hidden');
  $('setup').classList.remove('hidden');
  $('clock').textContent='00:00';
  renderHistory();renderProgress();
  toast((interrupted?'Trening przerwany':'Trening zakończony')+' • '+formatTime(duration)+' • '+sets+' serii • '+volume+' kg·powt.');
}

function updateView(){
  if(!running)return;
  const ex=currentPlan.ex[exIdx];
  const name=athleteIdx===0?($('nameA').value.trim()||'Osoba 1'):($('nameB').value.trim()||'Osoba 2');
  $('athlete').textContent=name;
  $('exercise').textContent=ex.n;
  $('series').textContent='Seria '+(setIdx+1)+'/'+ex.sets+(mode===2?' • osoba '+(athleteIdx+1):'');
  $('target').textContent=ex.time?'Cel: '+ex.min+'–'+ex.max+' sekund':'Cel: '+ex.min+'–'+ex.max+' powtórzeń';
  $('reps').placeholder=ex.time?'sek.':'powt.';
  $('repsLabel').textContent=ex.time?'Czas [sek.]':'Powtórzenia';
  $('technique').textContent='Technika: '+ex.tip+' Przerwa: '+formatRest(ex.rest)+'.';
  $('saveSetBtn').disabled=paused||restEnd>0;
}

function prefillWeight(){
  if(!currentPlan)return;
  const ex=currentPlan.ex[exIdx];
  const history=getHistory();
  for(const h of history){
    const match=(h.records||[]).find(r=>(r.id===ex.id||r.name===ex.n)&&r.athlete===athleteIdx&&Number(r.kg)>0);
    if(match){$('weight').value=match.kg;return;}
  }
  $('weight').value='';
}

function exerciseAdvice(index){
  const ex=currentPlan.ex[index];
  const step=parseFloat($('stepKg').value)||2.5;
  const lines=[];
  for(let a=0;a<mode;a++){
    const reps=records.filter(r=>r.ex===index&&r.athlete===a).map(r=>r.reps);
    const name=a===0?($('nameA').value.trim()||'Osoba 1'):($('nameB').value.trim()||'Osoba 2');
    lines.push('<span class="title">'+escapeHtml(name)+':</span> '+advise(reps,ex.min,ex.max,step));
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
  history.unshift({
    id:'w'+Date.now(),
    iso:new Date().toISOString(),
    date:new Date().toLocaleString('pl-PL'),
    plan:currentPlan.title,
    planKey,
    mode,
    names:[$('nameA').value.trim()||'Osoba 1',$('nameB').value.trim()||'Osoba 2'],
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
    const volume=Math.round((h.records||[]).reduce((a,r)=>a+(Number(r.kg)||0)*(Number(r.reps)||0),0));
    const details=groupHistory(h);
    return `<details class="historyItem"><summary><span class="title">${escapeHtml(h.plan||'Trening')}</span><div class="meta">${escapeHtml(h.date||'')} • ${h.mode===2?'2 osoby':'solo'} • ${formatTime((h.duration||0)*1000)} • ${(h.records||[]).length} serii${h.interrupted?' • przerwany':''}</div></summary><div class="meta" style="margin-top:8px">Objętość: ${volume} kg·powt.</div>${details}</details>`;
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
  const allRecords=history.flatMap(h=>(h.records||[]).filter(r=>(r.athlete||0)===0));
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

function exportData(){
  const data={
    version:3,
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
}

function init(){
  migrateOldData();bind();loadSettings();renderBuilder();renderHistory();renderProgress();loadReminderSettings();
  const day=new Date().getDay();
  const stored=safeJson(localStorage.getItem('trainer3.settings'),{});
  if(!stored.planKey){if(day===1)$('planSelect').value='mon';if(day===3)$('planSelect').value='wed';if(day===5)$('planSelect').value='fri';}
}

init();
