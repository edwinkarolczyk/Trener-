(function(){
'use strict';
const CFG='trainer3.onePhone.participants.v086';
const PENDING='trainer3.onePhone.pending.v086';
const LINKS='trainer3.onePhone.links.v086';
const HOLD='trainer3.history';
const $=id=>document.getElementById(id);
const ownId=()=>String(window.TrenerData070?.participantId?.()||localStorage.getItem('trainer3.participantId.v070')||'');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function read(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch(e){return f;}}
function clone(x){return JSON.parse(JSON.stringify(x));}
function uid(){try{if(crypto.randomUUID)return crypto.randomUUID();}catch(e){}return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,12);}
const safeName=v=>String(v||'').trim().slice(0,40);
function stored(){
 const p=read(CFG,[]);return Array.isArray(p)?p.slice(0,4):[];
}
function rosterFor(count,names,ids){
 const previous=stored(),current=ownId();
 return Array.from({length:count},(_,index)=>({
  index,id:index===0?current:String(ids?.[index]||previous[index]?.id||uid()),
  name:safeName(names[index]||previous[index]?.name)||'Osoba '+(index+1)
 }));
}
function saveRoster(p){
 localStorage.setItem(CFG,JSON.stringify(p.map(({index,id,name})=>({index,id,name}))));
}
const state={selected:false,active:false,participants:[],readyAt:{},exercise:0,turn:0,
  lastTurn:-1,sessionId:'',plan:null,lastWeights:{},startAt:0,
  baseFinish:null,lastHistoryId:'',renderedKey:''};
function validatePeople(names){
 const nonEmpty=names.every(x=>safeName(x));
 const uniq=new Set(names.map(x=>safeName(x).toLocaleLowerCase('pl-PL'))).size===names.length;
 return nonEmpty&&uniq;
}
function loadInputNames(){
 const n=Math.max(2,Math.min(4,Number($('v086Count')?.value)||2));
 return Array.from({length:n},(_,i)=>safeName(i===0?$('nameA')?.value:$('v086Name'+i)?.value));
}
function renderFields(){
 const count=Number($('v086Count')?.value)||2;
 const people=stored();
 const root=$('v086People');if(!root)return;
 root.innerHTML=Array.from({length:count-1},(_,i)=>{
  const p=people[i+1]||{},idx=i+1;
  return '<label>Osoba '+(idx+1)+'</label><input maxlength="40" id="v086Name'+idx+
    '" value="'+esc(p.name||'')+'" placeholder="Imię uczestnika">';
 }).join('');
}
function selectLocal(on){
 state.selected=!!on;
 const btn=$('v086Select');if(btn)btn.classList.toggle('v086Selected',state.selected);
 const panel=$('v086Setup');if(panel)panel.classList.toggle('hidden',!state.selected);
 if(state.selected){
  if(typeof setMode==='function')setMode(1);
  if($('soloBtn'))$('soloBtn').classList.remove('active');
  if($('duoBtn'))$('duoBtn').classList.remove('active');
 }
}
function installUi(){
 const setup=$('setup'),row=setup?.querySelector('.modeRow');
 if(!setup||!row||$('v086Select'))return;
 const b=document.createElement('button');b.id='v086Select';b.type='button';
 b.className='secondary bigBtn';b.textContent='WSPÓLNY 2–4 • JEDEN TELEFON';
 row.insertAdjacentElement('afterend',b);
 const panel=document.createElement('div');panel.id='v086Setup';panel.className='hidden';
 panel.innerHTML='<div class="v086Note">Jedna kolejka, osobne serie i odpoczynek każdej osoby. '+
   'Po treningu wyślij każdemu jego wynik w pliku JSON.</div>'+
   '<label>Liczba uczestników</label><select id="v086Count">'+
   '<option value="2">2 osoby</option><option value="3">3 osoby</option>'+
   '<option value="4">4 osoby</option></select><div id="v086People"></div>'+
   '<button id="v086SavePeople" class="secondary" type="button">ZAPISZ UCZESTNIKÓW</button>'+
   '<div class="v086Note">Imię drugiej osoby można zmienić, jej identyfikator pozostanie stały.</div>'+
   '<button id="v086Resume" type="button" class="secondary hidden">WZNÓW PRZERWANY TRENING</button>';
 b.insertAdjacentElement('afterend',panel);
 const old=stored();$('v086Count').value=String(Math.max(2,Math.min(4,old.length||2)));
 renderFields();
 b.onclick=()=>{if(running){toast('Nie zmieniaj trybu podczas treningu.');return;}selectLocal(!state.selected);};
 $('v086Count').onchange=renderFields;
 $('v086SavePeople').onclick=()=>{
  const names=loadInputNames();
  if(!validatePeople(names)){toast('Wpisz różne imiona dla wszystkich uczestników.');return;}
  saveRoster(rosterFor(names.length,names));
  toast('Uczestnicy zapisani.');
 };
 for(const id of ['soloBtn','duoBtn']){
  $(id)?.addEventListener('click',()=>{if(!running)selectLocal(false);});
 }
 $('v086Resume').onclick=resume;
 updateResume();
 installTrainingUi();
 installTransferUi();
}
function installTrainingUi(){
 const training=$('training');
 if(!training||$('v086Workout'))return;
 const panel=document.createElement('div');panel.id='v086Workout';panel.className='hidden';
 panel.innerHTML='<div class="eyebrow">JEDEN TELEFON • WSPÓLNA KOLEJKA</div>'+
  '<h3 id="v086Turn">Kolej</h3><p id="v086Status" class="v086Note"></p>'+
  '<div id="v086Progress" class="v086Participants"></div>'+
  '<button id="v086SkipRest" class="secondary hidden" type="button">POMIŃ PRZERWĘ</button>';
 const input=training.querySelector('.inputs');
 if(input)training.insertBefore(panel,input);else training.prepend(panel);
 $('v086SkipRest').onclick=()=>{
  if(!state.active)return;
  state.readyAt[state.turn]=Date.now();chooseTurn();render();checkpoint();
 };
}
function installTransferUi(){
 const history=$('history');if(!history||$('v086Transfer'))return;
 const card=document.createElement('div');card.id='v086Transfer';card.className='card';
 card.innerHTML='<div class="eyebrow">JEDEN TELEFON • HISTORIA UCZESTNIKÓW</div>'+
  '<h2>Prześlij wynik na drugi telefon</h2>'+
  '<p class="hint">Wybierz trening i osobę. Eksport zawiera tylko jej serie. '+
  'Na drugim telefonie użytkownik importuje plik i potwierdza przypisanie do swojego profilu.</p>'+
  '<label>Wspólny trening</label><select id="v086Session"></select>'+
  '<label>Osoba</label><select id="v086Person"></select>'+
  '<button id="v086Export" class="primary bigBtn" type="button">EKSPORTUJ WYNIK OSOBY JSON</button>'+
  '<label class="secondary fileBtn" style="margin-top:14px">IMPORTUJ WYNIK DO MOJEGO PROFILU'+
  '<input id="v086Import" type="file" accept="application/json" hidden></label>'+
  '<p id="v086TransferStatus" class="hint">Import nie nadpisuje historii innych osób.</p>';
 history.appendChild(card);
 $('v086Session').onchange=renderPeople;
 $('v086Export').onclick=exportPerson;
 $('v086Import').onchange=importFile;
 document.querySelector('.tab[data-tab="history"]')?.addEventListener('click',()=>setTimeout(renderTransfers,50));
 renderTransfers();
}
function readHistory(){
 const h=read(HOLD,[]);return Array.isArray(h)?h:[];
}
function sessions(){return readHistory().filter(h=>h.onePhone&&h.sessionId&&h.onePhone.participants?.length);}
function renderTransfers(){
 const el=$('v086Session');if(!el)return;
 const old=el.value,items=sessions();
 el.innerHTML=items.length?items.map(h=>'<option value="'+esc(h.sessionId)+'">'+
  esc(h.date+' • '+h.plan)+'</option>').join(''):
  '<option value="">Brak zapisanych sesji na jednym telefonie</option>';
 if(items.some(h=>h.sessionId===old))el.value=old;
 $('v086Export').disabled=!items.length;
 renderPeople();
}
function renderPeople(){
 const h=sessions().find(h=>h.sessionId===$('v086Session')?.value);
 const el=$('v086Person');if(!el)return;
 el.innerHTML=(h?.onePhone?.participants||[]).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');
}
function message(text){if($('v086TransferStatus'))$('v086TransferStatus').textContent=text;}
function transferFor(h,p){
 const rows=(h.records||[]).filter(r=>String(r.participantId)===p.id).map(r=>({
  uid:String(r.uid||''),id:String(r.id||''),name:String(r.name||''),
  athlete:0,ex:Number(r.ex)||0,set:Number(r.set)||0,
  kg:Number(r.kg)||0,reps:Number(r.reps)||0,time:!!r.time,at:Number(r.at)||0,
  participantId:p.id
 }));
 return {format:'trener2-one-phone-session',version:1,sourceVersion:'0.8.6',
  originParticipantId:p.id,originName:p.name,sessionId:h.sessionId,
  session:{plan:String(h.plan||''),planKey:String(h.planKey||''),
   iso:String(h.iso||''),date:String(h.date||''),duration:Number(h.duration)||0,
   interrupted:!!h.interrupted,records:rows}};
}
function exportPerson(){
 const h=sessions().find(h=>h.sessionId===$('v086Session')?.value);
 const p=h?.onePhone?.participants?.find(p=>p.id===$('v086Person')?.value);
 if(!h||!p){message('Wybierz trening i osobę.');return;}
 const bundle=transferFor(h,p);
 if(!bundle.session.records.length){message('Ta osoba nie zapisała żadnej serii.');return;}
 const name='Trener2-'+p.name.replace(/[^a-z0-9ąćęłńóśźż_-]+/gi,'-').slice(0,30)+'-'+h.sessionId.replace(/[^a-z0-9_-]+/gi,'-')+'.json';
 try{
  if(window.Android?.exportBackup){Android.exportBackup(JSON.stringify(bundle,null,2),name);
    message('Wybierz miejsce zapisania pliku, a potem prześlij go uczestnikowi.');return;}
 }catch(e){}
 message('Eksport pliku wymaga aplikacji Android.');
}
function validId(s){return typeof s==='string'&&s.length>=5&&s.length<=128&&/^[a-zA-Z0-9:_-]+$/.test(s);}
function sanitizeBundle(data){
 if(!data||data.format!=='trener2-one-phone-session'||data.version!==1||
   !validId(data.originParticipantId)||!validId(data.sessionId)||!data.session||
   !Array.isArray(data.session.records)||data.session.records.length<1||
   data.session.records.length>2000)throw Error('Nieprawidłowy plik treningu.');
 const src=data.originParticipantId,session=data.session;
 const records=session.records.map((r,i)=>{
  if(!r||String(r.participantId)!==src||!Number.isFinite(Number(r.kg))||
   Number(r.kg)<0||Number(r.kg)>2000||!Number.isFinite(Number(r.reps))||
   Number(r.reps)<=0||Number(r.reps)>10000||
   !Number.isInteger(Number(r.ex))||Number(r.ex)<0||Number(r.ex)>500||
   !Number.isInteger(Number(r.set))||Number(r.set)<0||Number(r.set)>100)throw Error('Uszkodzone dane serii.');
  return {uid:String(r.uid||data.sessionId+':'+i).slice(0,180),
   id:String(r.id||'').slice(0,90),name:String(r.name||'Ćwiczenie').slice(0,120),
   athlete:0,ex:Number(r.ex),set:Number(r.set),kg:Number(r.kg),
   reps:Number(r.reps),time:!!r.time,at:Number(r.at)||0,
   participantId:ownId(),originParticipantId:src};
 });
 return {originParticipantId:src,sessionId:data.sessionId,
  originName:safeName(data.originName)||'Uczestnik',
  plan:String(session.plan||'Wspólny trening').slice(0,120),
  planKey:String(session.planKey||'').slice(0,90),
  iso:String(session.iso||'').slice(0,40),
  date:String(session.date||'').slice(0,80),
  duration:Math.max(0,Math.min(86400,Number(session.duration)||0)),
  interrupted:!!session.interrupted,records};
}
function receive(data,paired){
 if(typeof running!=='undefined'&&running)throw Error('Zakończ trening przed importem historii.');
 const b=sanitizeBundle(data),own=ownId();
 if(paired&&(!paired.trustedSourceId||!paired.expectedOriginId||
    paired.expectedOriginId!==b.originParticipantId)){
  throw Error('Wynik nie pasuje do powiązanego profilu.');
 }
 if(!own)throw Error('Brak identyfikatora profilu. Otwórz ponownie aplikację.');
 const links=read(LINKS,{});
 const current=safeName($('nameA')?.value)||'Twój profil';
 if(b.originParticipantId!==own&&links[b.originParticipantId]!==own){
  if(!paired&&!confirm('Powiązać wyniki osoby „'+b.originName+'” z profilem „'+current+
   '” na tym telefonie? Nie importuj wyniku innej osoby.'))return {cancelled:true};
  links[b.originParticipantId]=own;
  localStorage.setItem(LINKS,JSON.stringify(links));
 }
 const h=readHistory();
 if(h.some(x=>x.sessionId===b.sessionId&&x.onePhone&&
   x.participantId===own&&b.originParticipantId===own)){
  return {imported:false,sets:b.records.length};
 }
 const existing=h.find(x=>x.sessionId===b.sessionId&&
   x.onePhoneImport?.originParticipantId===b.originParticipantId);
 const id='import:'+b.sessionId+':'+b.originParticipantId;
 const row={id,iso:b.iso,date:b.date,plan:b.plan,planKey:b.planKey,
  mode:1,shared:false,sessionId:b.sessionId,localAthlete:0,
  names:[current],duration:b.duration,interrupted:b.interrupted,
  records:b.records,participantId:own,schemaVersion:2,
  onePhoneImport:{originParticipantId:b.originParticipantId,originName:b.originName}};
 if(existing){
  const byUid=new Map(existing.records.map(r=>[r.uid,r]));
  b.records.forEach(r=>byUid.set(r.uid,r));
  existing.records=Array.from(byUid.values());
  existing.duration=Math.max(existing.duration||0,b.duration);
  existing.interrupted=b.interrupted;
 }else{
  if(h.length>=100)throw Error('Historia jest pełna (100 treningów). Zrób kopię i usuń stare wpisy.');
  h.unshift(row);
 }
 localStorage.setItem(HOLD,JSON.stringify(h));
 try{renderHistory();renderProgress();window.TrenerData070?.rebuildDerived?.();}catch(e){}
 return {imported:!existing,sets:b.records.length};
}
function importFile(e){
 const file=e.target.files?.[0];e.target.value='';
 if(!file)return;
 if(file.size>2000000){message('Plik jest za duży (maks. 2 MB).');return;}
 const reader=new FileReader();
 reader.onload=()=>{
  try{const r=receive(JSON.parse(String(reader.result||'')));
   if(r.cancelled){message('Import anulowany.');return;}
   message(r.imported?'Dodano '+r.sets+' serii do Twojej historii.':
    'Zaktualizowano istniejący trening bez duplikowania.');}
  catch(err){message(String(err.message||'Nie udało się wczytać wyniku.'));}
 };
 reader.onerror=()=>message('Nie udało się odczytać pliku.');
 reader.readAsText(file);
}
function validateSetup(){
 if(net.connected||net.active){toast('Rozłącz sesję Wi-Fi przed treningiem na jednym telefonie.');return null;}
 const selected=window.TrenerNearby087?.selectedRoster?.();
 const members=Array.isArray(selected)?selected:null;
 if(members&&(!members.length||members.length<2||members.length>4)){
  toast('Wybierz od 2 do 4 osób.');return null;
 }
 const names=members?members.map(p=>p.name):loadInputNames();
 if(!validatePeople(names)){toast('Wybierz 2–4 różne profile.');return null;}
 const plan=getPlan($('planSelect')?.value);
 if(!plan?.ex?.length){toast('Najpierw wybierz trening.');return null;}
 const chosen=members||rosterFor(names.length,names);
 if(new Set(chosen.map(p=>p.id)).size!==chosen.length||!chosen[0].id){
  toast('Profile mają nieprawidłowe identyfikatory.');return null;
 }
 return {members:chosen,plan};
}
function begin(ev){
 if(!state.selected||running)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 const setup=validateSetup();if(!setup)return;
 const p=setup.members;saveRoster(p);saveSettings();
 state.participants=p;state.plan=clone(setup.plan);state.sessionId='one:'+uid();
 state.exercise=0;state.lastTurn=-1;state.turn=0;state.readyAt={};
 state.lastWeights={};state.renderedKey='';state.active=true;state.startAt=Date.now();
 planKey=$('planSelect').value;currentPlan=clone(setup.plan);mode=1;
 resetWorkoutState();net.active=false;net.sessionId='';athleteIdx=0;
 startedAt=Date.now();running=true;paused=false;
 try{openTrainingUi();showTab('start');}catch(e){
  state.active=false;running=false;toast('Nie udało się uruchomić treningu.');return;
 }
 $('stateBadge').textContent='WSPÓLNY • JEDEN TELEFON';
 $('v086Workout').classList.remove('hidden');chooseTurn();render();checkpoint();
}
function exerciseRows(a,e){
 return records.filter(r=>Number(r.athlete)===a&&Number(r.ex)===e);
}
function total(ex){return Math.max(1,Number(ex?.sets)||1);}
function nextCandidate(){
 const current=state.exercise,ex=state.plan?.ex?.[current];if(!ex)return null;
 const pending=state.participants.filter(p=>exerciseRows(p.index,current).length<total(ex));
 if(!pending.length)return null;
 const ordered=pending.slice().sort((a,b)=>((a.index-state.lastTurn+state.participants.length-1)%state.participants.length)-
  ((b.index-state.lastTurn+state.participants.length-1)%state.participants.length));
 const now=Date.now();
 return ordered.find(p=>Number(state.readyAt[p.index]||0)<=now)||
  ordered.sort((a,b)=>Number(state.readyAt[a.index]||0)-Number(state.readyAt[b.index]||0))[0];
}
function chooseTurn(){
 if(!state.active||!running)return;
 let ex=state.plan.ex[state.exercise];
 if(!ex)return;
 if(state.participants.every(p=>exerciseRows(p.index,state.exercise).length>=total(ex))){
  state.exercise++;state.readyAt={};state.lastTurn=-1;
  ex=state.plan.ex[state.exercise];
  if(!ex){finishWorkout(false);return;}
 }
 const next=nextCandidate();if(!next)return;
 const renderedKey=state.exercise+':'+next.id;
 const changed=state.renderedKey!==renderedKey;
 state.turn=next.index;exIdx=state.exercise;
 setIdx=exerciseRows(next.index,state.exercise).length;
 athleteIdx=next.index;
 if(changed){
  state.renderedKey=renderedKey;
  $('reps').value='';
  const previous=state.lastWeights[next.id+':'+(ex.id||ex.n)];
  $('weight').value=previous===undefined?'':String(previous);
 }
}
function finishLocal(interrupted,duration){
 const members=clone(state.participants);
 const sessionId=state.sessionId;
 const savedRecords=records.map(r=>({...r}));
 const beforeIds=new Set(readHistory().map(h=>String(h?.id||'')));
 const durationMs=Math.max(0,Number(duration)||elapsedMs());
 state.active=false;
 let out;
 try{out=state.baseFinish?.call(this,interrupted,false);}catch(e){
  try{console.error('one-phone base finish failed',e);}catch(ignore){}
 }
 const history=readHistory();
 let h=history.find(row=>row&&row.id&&!beforeIds.has(String(row.id)))||null;
 if(!h){
  h={
   id:'w'+Date.now(),iso:new Date().toISOString(),date:new Date().toLocaleString('pl-PL'),
   plan:String(state.plan?.title||currentPlan?.title||'Wspólny trening'),planKey:String(planKey||'custom'),
   mode:members.length,shared:false,sessionId,localAthlete:0,names:members.map(p=>p.name),
   duration:Math.round(durationMs/1000),interrupted:!!interrupted,records:savedRecords
  };
  history.unshift(h);
 }
 h.sessionId=sessionId;h.mode=members.length;h.shared=false;h.localAthlete=0;
 h.participantId=members[0]?.id||ownId();h.schemaVersion=2;
 h.onePhone={version:1,participants:members,deviceCount:1};
 h.group={participants:members.map(p=>({index:p.index,deviceId:p.id,name:p.name})),
   deviceId:members[0]?.id||ownId(),sharedEquipment:false};
 h.names=members.map(p=>p.name);
 h.records=savedRecords;
 h.interrupted=!!interrupted;
 h.duration=h.duration||Math.round(durationMs/1000);
 localStorage.setItem(HOLD,JSON.stringify(history.slice(0,100)));
 localStorage.removeItem(PENDING);
 state.lastHistoryId=h.id||'';
 $('v086Workout')?.classList.add('hidden');
 renderTransfers();
 try{window.TrenerNearby087?.sessionSaved?.(h);}catch(e){}
 try{renderHistory();renderProgress();window.TrenerData070?.rebuildDerived?.();}catch(e){}
 return out;
}
function saveSet(ev){
 if(!state.active)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 if(paused){toast('Najpierw wznów trening.');return;}
 chooseTurn();if(!state.active)return;
 const p=state.participants[state.turn],ex=state.plan.ex[state.exercise];
 if(!p||!ex)return;
 const waiting=Math.max(0,Number(state.readyAt[p.index]||0)-Date.now());
 if(waiting>0){toast('Przerwa '+p.name+' jeszcze trwa.');return;}
 const reps=readReps();if(reps===null)return;
 const kg=readKg(),idx=exerciseRows(p.index,state.exercise).length;
 const rec=makeRecord(ex,state.exercise,idx,p.index,kg,reps);
 rec.participantId=p.id;rec.uid=state.sessionId+':'+p.id+':'+state.exercise+':'+idx;
 if(records.some(r=>r.uid===rec.uid))return;
 records.push(rec);state.readyAt[p.index]=Date.now()+Math.max(0,Number(ex.rest)||0)*1000;
 state.lastTurn=p.index;
 state.lastWeights[p.id+':'+(ex.id||ex.n)]=kg;
 $('reps').value='';chooseTurn();
 if(state.active){render();checkpoint();}
}
function render(){
 if(!state.active||!running)return;
 const panel=$('v086Workout');if(panel)panel.classList.remove('hidden');
 const p=state.participants[state.turn],ex=state.plan.ex[state.exercise];
 if(!p||!ex)return;
 const due=Math.max(0,Number(state.readyAt[p.index]||0)-Date.now());
 $('athlete').textContent=p.name;
 $('exercise').textContent=ex.n;
 $('series').textContent='Seria '+(exerciseRows(p.index,state.exercise).length+1)+'/'+total(ex)+' • '+p.name;
 $('target').textContent='Cel: '+ex.min+'–'+ex.max+(ex.time?' sekund':' powtórzeń');
 $('repsLabel').textContent=ex.time?'Czas [sek.]':'Powtórzenia';
 $('reps').placeholder=ex.time?'sek.':'powt.';
 $('technique').textContent='Technika: '+ex.tip+' • osobne ciężary i przerwy każdego uczestnika.';
 $('stateBadge').textContent='WSPÓLNY • JEDEN TELEFON';
 $('v086Turn').textContent='Teraz: '+p.name;
 $('v086Status').textContent='Ćwiczenie '+(state.exercise+1)+'/'+state.plan.ex.length+
   ' • '+(due>0?'Czekamy '+Math.ceil(due/1000)+' s na odpoczynek.':'Możesz zapisać serię.');
 $('v086Progress').innerHTML=state.participants.map(item=>{
  const count=exerciseRows(item.index,state.exercise).length,d=Number(state.readyAt[item.index]||0)-Date.now();
  const text=count>=total(ex)?'Gotowe':d>0?'Odpoczynek '+Math.ceil(d/1000)+' s':'Gotowy';
  return '<div class="v086Person '+(item.index===state.turn?'now':'')+'"><b>'+
    esc(item.name)+'</b><span>'+count+'/'+total(ex)+' serii • '+text+'</span></div>';
 }).join('');
 $('saveSetBtn').disabled=!!paused||due>0;
 $('restTime').textContent=due>0?'ODPOCZYNEK '+Math.ceil(due/1000)+' s':'GOTOWY — '+p.name;
 $('v086SkipRest').classList.toggle('hidden',due<=0);
 $('skipRestBtn')?.classList.add('hidden');
}
function checkpoint(){
 if(!state.active)return;
 try{
  localStorage.setItem(PENDING,JSON.stringify({sessionId:state.sessionId,
   plan:state.plan,planKey,participants:state.participants,
   records:clone(records),readyAt:state.readyAt,exercise:state.exercise,
   turn:state.turn,lastTurn:state.lastTurn,lastWeights:state.lastWeights,
   startedAt,elapsed:elapsedMs()}));
 }catch(e){}
 updateResume();
}
function updateResume(){
 const button=$('v086Resume');if(button)
  button.classList.toggle('hidden',!read(PENDING,null)||state.active);
}
function resume(){
 const snapshot=read(PENDING,null);
 if(running||!snapshot||!snapshot.plan?.ex?.length||!Array.isArray(snapshot.participants)||snapshot.participants.length<2)return;
 if(!confirm('Wznowić niedokończony trening '+snapshot.participants.map(p=>p.name).join(', ')+'?'))return;
 state.selected=true;state.active=true;state.participants=snapshot.participants;
 state.sessionId=snapshot.sessionId;state.plan=snapshot.plan;state.exercise=snapshot.exercise||0;
 state.turn=snapshot.turn||0;state.lastTurn=snapshot.lastTurn??-1;
 state.readyAt=snapshot.readyAt||{};state.lastWeights=snapshot.lastWeights||{};state.renderedKey='';
 mode=1;net.active=false;net.sessionId='';planKey=snapshot.planKey||'custom';
 currentPlan=clone(snapshot.plan);resetWorkoutState();
 records=Array.isArray(snapshot.records)?snapshot.records:[];startedAt=Date.now()-Math.max(0,snapshot.elapsed||0);
 running=true;paused=false;openTrainingUi();$('v086Workout').classList.remove('hidden');
 chooseTurn();render();checkpoint();selectLocal(true);
}
function boot(){
 const style=document.createElement('style');style.id='v086Style';
 style.textContent='#v086Select.v086Selected{background:#96323a;color:#fff}'+
  '#v086Setup{border:1px solid #414141;border-radius:12px;padding:10px;margin-top:9px}'+
  '.v086Note{color:#bbb;font-size:11px;line-height:1.5;margin:7px 0}'+
  '.v086Participants{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:9px 0}'+
  '.v086Person{padding:9px;border:1px solid #383838;background:#0f0f0f;border-radius:10px}'+
  '.v086Person.now{border-color:#ef4444}.v086Person b{display:block;font-size:12px}'+
  '.v086Person span{font-size:10px;color:#aaa}'+
  '@media(max-width:380px){.v086Participants{grid-template-columns:1fr}}';
 document.head.appendChild(style);
 installUi();
 // Capture at the target prevents the core SOLO/Wi-Fi handlers from double-saving a set.
 $('startBtn')?.addEventListener('click',begin,true);
 $('saveSetBtn')?.addEventListener('click',saveSet,true);
 if(typeof finishWorkout==='function'){
  state.baseFinish=finishWorkout;
  finishWorkout=function(interrupted,fromNetwork){
   if(state.active)return finishLocal(interrupted);
   return state.baseFinish.apply(this,arguments);
  };
 }
 setInterval(()=>{if(state.active&&running){if(!paused){chooseTurn();render();}
   if(state.active)checkpoint();}},1000);
 document.querySelector('.tab[data-tab="history"]')?.addEventListener('click',()=>setTimeout(renderTransfers,0));
}
window.TrenerOnePhone086={rosterFor,transferFor,sanitizeBundle,receive,
  getStored:stored,saveRoster,get active(){return state.active;},
  get participants(){return state.participants.slice();}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
