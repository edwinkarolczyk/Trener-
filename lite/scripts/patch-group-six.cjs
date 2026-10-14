'use strict';
// Wyłącznie kopia modułu wspólnego treningu pakowana do Lite — oryginał jest nietknięty.
const patch=function patch(source){
let s=String(source);
function block(from,to,code){let i=s.indexOf(from),j=s.indexOf(to,i+from.length);if(i<0||j<0)throw Error("Patch nie znalazł: "+from);s=s.slice(0,i)+code+"\n"+s.slice(j);}
function replace(a,b){if(!s.includes(a))throw Error("Patch nie znalazł: "+a);s=s.replace(a,b);}
replace("const HOLD='trainer3.history';","const HOLD='trainer3.history';\nconst groupCore=window.TrenerLiteGroupCore;");

block("function rosterFor(count,names,ids){","const state=", `
function rosterFor(count,names,ids){
 if(window.TrenerLiteProfiles?.selectedRoster){
  const persons=window.TrenerLiteProfiles.selectedRoster();
  if(persons.length===count)return persons;
 }
 const previous=stored(),current=ownId();
 return Array.from({length:count},(_,index)=>({
  index,id:index===0?current:String(ids?.[index]||previous[index]?.id||uid()),
  name:safeName(names[index]||previous[index]?.name)||'Osoba '+(index+1)
 }));
}
function saveRoster(p){
 const selected=window.TrenerLiteProfiles?.selectedRoster?.();
 const list=Array.isArray(selected)?selected:p;
 if(!Array.isArray(list)||!groupCore.validRoster(list))throw Error('Nieprawidłowe profile — użyj Menedżera użytkowników.');
 localStorage.setItem(CFG,JSON.stringify(list.map(({index,id,name})=>({index,id,name}))));
}
`);

replace("baseFinish:null,lastHistoryId:'',renderedKey:''","plans:{},cursor:{},deferred:{},skipped:[],planMode:'shared',baseFinish:null,lastHistoryId:'',renderedKey:''");
replace("p.slice(0,4)","p.slice(0,6)");
replace("Math.min(4,Number($('v086Count')?.value)||2)","Math.min(6,Number($('v086Count')?.value)||2)");
replace("Math.min(4,old.length||2)","Math.min(6,old.length||2)");
replace("WSPÓLNY 2–4 • JEDEN TELEFON","WSPÓLNY 1–6 • JEDEN TABLET");
replace("'<option value=\"4\">4 osoby</option></select><div id=\"v086People\"></div>'",
"'<option value=\"4\">4 osoby</option><option value=\"5\">5 osób</option><option value=\"6\">6 osób</option></select>'+ "+
"'<label>Plany uczestników</label><select id=\"v086PlanMode\"><option value=\"shared\">Wspólny plan</option><option value=\"individual\">Osobne plany</option></select><div id=\"v086People\"></div>'");
replace("const panel=document.createElement('div');panel.id='v086Setup';panel.className='hidden';","const panel=document.createElement('div');panel.id='v086Setup';panel.className='hidden';");
block("function renderFields(){","function selectLocal",`
function renderFields(){
 const count=Number($('v086Count')?.value)||2,prev=stored(),root=$('v086People');
 if(!root)return;
 const opts=Array.from($('planSelect')?.options||[]).filter(o=>!o.disabled)
  .map(o=>'<option value="'+esc(o.value)+'">'+esc(o.textContent)+'</option>').join('');
 const saved=read('trainer3.liteGroup.personPlans.v033',{});
 root.innerHTML=Array.from({length:count-1},(_,j)=>{
  const i=j+1,p=prev[i]||{},selection=saved[p.id]||{};
  return '<label>Osoba '+(i+1)+'</label><input maxlength="40" id="v086Name'+i+'" value="'+esc(p.name||'')+'" placeholder="Imię">'+
  '<details><summary>Plan i cel tej osoby</summary><label>Plan</label><select id="v086Plan'+i+'">'+opts+'</select>'+
  '<label>Min. powtórzeń (puste = z planu)</label><input type="number" min="1" max="100" id="v086Min'+i+'" value="'+esc(selection.min||'')+'">'+
  '<label>Maks. powtórzeń</label><input type="number" min="1" max="100" id="v086Max'+i+'" value="'+esc(selection.max||'')+'">'+
  '<label>Serie</label><input type="number" min="1" max="12" id="v086Sets'+i+'" value="'+esc(selection.sets||'')+'"></details>';
 }).join('');
 for(let i=1;i<count;i++){
  const p=prev[i]||{},choice=(saved[p.id]||{}).planKey;
  const el=$('v086Plan'+i);
  if(el&&choice&&Array.from(el.options).some(o=>o.value===choice))el.value=choice;
 }
}
`);
replace("  saveRoster(rosterFor(names.length,names));\n  toast('Uczestnicy zapisani.');",`
  const group=window.TrenerLiteProfiles?.selectedRoster?.()||rosterFor(names.length,names);
  if(!groupCore.validRoster(group)){toast('Wybierz użytkowników w Ustawieniach.');return;}
  saveRoster(group);
  const saved=read('trainer3.liteGroup.personPlans.v033',{});
  for(const p of group.slice(1))saved[p.id]={planKey:$('v086Plan'+p.index)?.value||'',
    min:$('v086Min'+p.index)?.value||'',max:$('v086Max'+p.index)?.value||'',sets:$('v086Sets'+p.index)?.value||''};
  localStorage.setItem('trainer3.liteGroup.personPlans.v033',JSON.stringify(saved));
  toast('Uczestnicy i ich cele zapisane.');`);
replace(" const old=stored();$('v086Count').value="," const old=stored();$('v086PlanMode').value=localStorage.getItem('trainer3.liteGroup.mode.v033')==='individual'?'individual':'shared';\n $('v086PlanMode').onchange=()=>localStorage.setItem('trainer3.liteGroup.mode.v033',$('v086PlanMode').value);\n $('v086Count').value=");
replace("  '<button id=\"v086SkipRest\" class=\"secondary hidden\" type=\"button\">POMIŃ PRZERWĘ</button>';",
`  '<div class="v086Actions"><button id="v086SkipTurn" class="secondary" type="button">POMIŃ KOLEJKĘ</button>'+
  '<button id="v086SkipExercise" class="danger" type="button">POMIŃ ĆWICZENIE OSOBY</button></div>'+
  '<div id="v086Load" class="v086Note"></div>';`);
block(" $('v086SkipRest').onclick=()=>{","}\nfunction installTransferUi",`
 $('v086SkipTurn').onclick=()=>{
  if(!state.active)return;
  state.deferred[state.turn]=Date.now()+15000;state.lastTurn=state.turn;
  state.renderedKey='';chooseTurn();if(state.active){render();checkpoint();}
 };
 $('v086SkipExercise').onclick=()=>{
  if(!state.active)return;
  const p=state.participants[state.turn],pos=groupCore.nextPosition(p,state.plans,state.cursor,records);
  if(!pos||!confirm('Pominąć '+pos.ex.n+' dla '+p.name+'?'))return;
  state.skipped.push({participantId:p.id,exerciseId:pos.ex.id||pos.ex.n,ex:pos.exercise,at:Date.now()});
  state.cursor[p.index]=pos.exercise+1;state.readyAt[p.index]=0;state.lastTurn=p.index;
  state.renderedKey='';checkpoint();chooseTurn();if(state.active){render();checkpoint();}
 };
`);
block("function validateSetup(){","function finishLocal",`
function validateSetup(){
 if(net.connected||net.active){toast('Rozłącz sesję Wi-Fi przed treningiem na tablecie.');return null;}
 const selected=window.TrenerNearby087?.selectedRoster?.();
 const managed=window.TrenerLiteProfiles?.selectedRoster?.();
 const others=Array.isArray(managed)&&managed.length>=1?managed:
  Array.isArray(selected)&&selected.length>=2?selected:null;
 const names=others?others.map(p=>p.name):loadInputNames();
 if(names.length<1||names.length>6||!validatePeople(names)){toast('Wybierz 1–6 zapisanych osób o różnych imionach.');return null;}
 const participants=others?others.map((p,i)=>({index:i,id:p.id,name:p.name})):rosterFor(names.length,names);
 if(!groupCore.validRoster(participants)){toast('Nieprawidłowe identyfikatory uczestników.');return null;}
 const baseKey=$('planSelect')?.value,base=getPlan(baseKey);
 if(!base?.ex?.length){toast('Wybierz plan.');return null;}
 const individual=$('v086PlanMode')?.value==='individual';
 const saved=read('trainer3.liteGroup.personPlans.v033',{}),plans={};
 for(const p of participants){
  const spec=p.index?{planKey:$('v086Plan'+p.index)?.value||saved[p.id]?.planKey||baseKey,
   min:$('v086Min'+p.index)?.value||saved[p.id]?.min||'',
   max:$('v086Max'+p.index)?.value||saved[p.id]?.max||'',
   sets:$('v086Sets'+p.index)?.value||saved[p.id]?.sets||''}:{};
  const chosen=getPlan(individual?(spec.planKey||baseKey):baseKey);
  if(!chosen?.ex?.length){toast('Brak planu dla '+p.name);return null;}
  const plan=clone(chosen),min=Number(spec.min)||0,max=Number(spec.max)||0,sets=Number(spec.sets)||0;
  if(individual&&p.index&&min&&max&&min>max){toast('Sprawdź cel powtórzeń dla '+p.name);return null;}
  if(individual&&p.index)plan.ex=plan.ex.map(ex=>{
   const x=clone(ex);
   if(min>0)x.min=min;if(max>0)x.max=max;if(sets>0)x.sets=sets;
   return x;
  });
  plans[p.index]=plan;
 }
 return {members:participants,plan:clone(base),plans,planMode:individual?'individual':'shared',baseKey};
}
function begin(ev){
 if(!state.selected||running)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 const setup=validateSetup();if(!setup)return;
 const members=setup.members;saveRoster(members);saveSettings();
 state.participants=members;state.plan=setup.plan;state.plans=setup.plans;state.planMode=setup.planMode;
 state.sessionId='one:'+uid();state.cursor={};members.forEach(p=>state.cursor[p.index]=0);
 state.deferred={};state.skipped=[];state.exercise=0;state.turn=0;state.lastTurn=-1;
 state.readyAt={};state.lastWeights={};state.renderedKey='';state.active=true;state.startAt=Date.now();
 planKey=setup.baseKey;currentPlan=clone(setup.plan);mode=1;
 resetWorkoutState();net.active=false;net.sessionId='';athleteIdx=0;
 startedAt=Date.now();running=true;paused=false;
 try{openTrainingUi();showTab('start');}catch(e){
  state.active=false;running=false;toast('Nie udało się uruchomić treningu.');return;
 }
 $('stateBadge').textContent='WSPÓLNY • JEDEN TABLET';
 $('v086Workout').classList.remove('hidden');chooseTurn();if(state.active){render();checkpoint();}
}
function exerciseRows(a,e){return records.filter(r=>Number(r.athlete)===a&&Number(r.ex)===e);}
function chooseTurn(){
 if(!state.active||!running)return;
 state.participants.forEach(p=>{
  const pos=groupCore.nextPosition(p,state.plans,state.cursor,records);
  state.cursor[p.index]=pos?pos.exercise:state.plans[p.index].ex.length;
 });
 const result=groupCore.pick(state.participants,state.plans,state.cursor,records,
  state.readyAt,state.lastTurn,state.deferred,Date.now());
 if(result.finished){finishWorkout(false);return;}
 const selected=result.selected;if(!selected)return;
 const p=selected.person,pos=selected.position,key=p.id+':'+pos.exercise+':'+pos.done;
 if(state.renderedKey&&$('reps')?.value?.trim()&&state.turn!==p.index&&
    Number(state.readyAt[state.turn]||0)<=Date.now())return;
 const changed=state.renderedKey!==key;
 state.turn=p.index;state.exercise=pos.exercise;
 currentPlan=state.plans[p.index];exIdx=pos.exercise;setIdx=pos.done;athleteIdx=p.index;
 if(changed){
  state.renderedKey=key;$('reps').value='';
  const ex=pos.ex,weightKey=p.id+':'+(ex.id||ex.n);
  const prev=state.lastWeights[weightKey];
  const suggestion=groupCore.suggestion(readHistory(),p.id,ex,Number($('stepKg')?.value)||2.5);
  const proposed=suggestion?suggestion.target:undefined;
  const feasible=window.TrenerLiteInventory?.onGroupTurn?
   window.TrenerLiteInventory.onGroupTurn(p,ex,proposed,prev):proposed;
  $('weight').value=prev===undefined?(feasible===null||feasible===undefined?'':String(feasible)):String(prev);
  if($('v086Load'))$('v086Load').textContent=suggestion?
   p.name+' • poprzednio '+suggestion.last+' kg • zalecane '+suggestion.target+
   ' kg'+(feasible===null?' • Brak możliwego układu z katalogu.':
     feasible!==undefined&&feasible!==suggestion.target?' • Z posiadanych talerzy: '+feasible+' kg.':'')+
   ' Możesz zmienić ciężar.':
   p.name+' • brak ostatniego ciężaru. Wpisz ręcznie.';
  window.TrenerLiteInventory?.showResult?.();
 }
}
`);
replace(" h.onePhone={version:1,participants:members,deviceCount:1};",
" h.onePhone={version:2,participants:members,deviceCount:1,plans:clone(state.plans),planMode:state.planMode,skipped:clone(state.skipped)};");
replace("deviceId:members[0]?.id||ownId(),sharedEquipment:false","deviceId:members[0]?.id||ownId(),sharedEquipment:true");
block("function saveSet(ev){","function checkpoint(){",`
function saveSet(ev){
 if(!state.active)return;ev.preventDefault();ev.stopImmediatePropagation();
 if(paused){toast('Najpierw wznów trening.');return;}
 const p=state.participants[state.turn],pos=p&&groupCore.nextPosition(p,state.plans,state.cursor,records);
 if(!p||!pos)return;
 if(Number(state.readyAt[p.index]||0)>Date.now()){toast('Odpoczynek jeszcze trwa.');return;}
 const reps=readReps();if(reps===null)return;
 const ex=pos.ex,kg=readKg(),idx=pos.done;
 const rec=makeRecord(ex,pos.exercise,idx,p.index,kg,reps);
 rec.participantId=p.id;rec.uid=state.sessionId+':'+p.id+':'+pos.exercise+':'+idx;
 rec.equipment=window.TrenerLiteInventory?.snapshot?.(kg)||null;
 if(records.some(r=>r.uid===rec.uid))return;
 records.push(rec);state.readyAt[p.index]=Date.now()+Math.max(0,Number(ex.rest)||0)*1000;
 state.lastTurn=p.index;state.lastWeights[p.id+':'+(ex.id||ex.n)]=kg;
 if(idx+1>=pos.total)state.cursor[p.index]=pos.exercise+1;
 $('reps').value='';state.renderedKey='';checkpoint();
 chooseTurn();if(state.active){render();checkpoint();}
}
function render(){
 if(!state.active||!running)return;
 $('v086Workout')?.classList.remove('hidden');
 const p=state.participants[state.turn],pos=groupCore.nextPosition(p,state.plans,state.cursor,records);
 if(!p||!pos)return;
 const ex=pos.ex,due=Math.max(0,Number(state.readyAt[p.index]||0)-Date.now());
 $('athlete').textContent=p.name;$('exercise').textContent=ex.n;
 $('series').textContent='Seria '+(pos.done+1)+'/'+pos.total+' • '+p.name;
 $('target').textContent='Cel: '+ex.min+'–'+ex.max+(ex.time?' sekund':' powtórzeń');
 $('repsLabel').textContent=ex.time?'Czas [sek.]':'Powtórzenia';
 $('reps').placeholder=ex.time?'sek.':'powt.';
 $('technique').textContent='Technika: '+(ex.tip||'—')+' • osobne ciężary i przerwy.';
 $('stateBadge').textContent='WSPÓLNY • JEDEN TABLET';$('v086Turn').textContent='Teraz: '+p.name;
 $('v086Status').textContent='Ćwiczenie '+(pos.exercise+1)+'/'+state.plans[p.index].ex.length+
  ' • '+(due>0?'Odpoczynek '+Math.ceil(due/1000)+' s.':'Możesz zapisać serię.');
 if(!$('liteFireRoster')){
 $('v086Progress').innerHTML=state.participants.map(item=>{
  const x=groupCore.nextPosition(item,state.plans,state.cursor,records);
  const w=Number(state.readyAt[item.index]||0)-Date.now();
  const status=!x?'UKOŃCZONE':w>0?'Odpoczynek '+Math.ceil(w/1000)+' s':
   Number(state.deferred[item.index]||0)>Date.now()?'Pominięta kolejka':'Gotowy';
  return '<div class="v086Person '+(item.index===state.turn?'now':'')+'"><b>'+esc(item.name)+
   '</b><span>'+ (x?esc(x.ex.n)+' • '+x.done+'/'+x.total+' serii':'Wszystkie ćwiczenia')+
   ' • '+status+'</span></div>';
 }).join('');
 }
 $('saveSetBtn').disabled=!!paused||due>0;
 $('restTime').textContent=due>0?'ODPOCZYNEK '+Math.ceil(due/1000)+' s':'GOTOWY — '+p.name;
 $('skipRestBtn')?.classList.add('hidden');
}
`);
block("function checkpoint(){","function updateResume(){",`
function checkpoint(){
 if(!state.active)return;
 try{localStorage.setItem(PENDING,JSON.stringify({sessionId:state.sessionId,
  plan:state.plan,plans:state.plans,planMode:state.planMode,participants:state.participants,
  records:clone(records),readyAt:state.readyAt,cursor:state.cursor,deferred:state.deferred,
  skipped:state.skipped,exercise:state.exercise,turn:state.turn,lastTurn:state.lastTurn,
  lastWeights:state.lastWeights,startedAt,elapsed:elapsedMs(),planKey}));
 }catch(e){toast('Błąd zapisu sesji — wykonaj kopię.');}
 updateResume();
}
`);
block("function resume(){","function boot(){",`
function resume(){
 const x=read(PENDING,null);
 if(running||!x||!Array.isArray(x.participants)||x.participants.length<1||x.participants.length>6)return;
 if(!confirm('Wznowić trening '+x.participants.map(p=>p.name).join(', ')+'?'))return;
 state.selected=true;state.active=true;state.participants=x.participants;state.sessionId=x.sessionId;
 state.plan=x.plan||x.plans?.[0]||{};state.plans=x.plans||Object.fromEntries(x.participants.map(p=>[p.index,clone(x.plan)]));
 state.planMode=x.planMode||'shared';state.cursor=x.cursor||{};state.deferred=x.deferred||{};state.skipped=x.skipped||[];
 state.exercise=x.exercise||0;state.turn=x.turn||0;state.lastTurn=x.lastTurn??-1;
 state.readyAt=x.readyAt||{};state.lastWeights=x.lastWeights||{};state.renderedKey='';
 mode=1;net.active=false;net.sessionId='';planKey=x.planKey||'custom';
 currentPlan=clone(state.plan);resetWorkoutState();
 records=Array.isArray(x.records)?x.records:[];startedAt=Date.now()-Math.max(0,x.elapsed||0);
 running=true;paused=false;openTrainingUi();$('v086Workout').classList.remove('hidden');
 chooseTurn();if(state.active){render();checkpoint();}selectLocal(true);
}
`);
replace("'.v086Person span{font-size:10px;color:#aaa}'+",
"'.v086Person span{font-size:13px;color:#aaa}'+\n  '.v086Actions{display:flex;flex-wrap:wrap;gap:8px}.v086Actions button{flex:1 1 42%;min-height:64px}'+");
replace("  if(h.length>=100)throw Error('Historia jest pełna (100 treningów). Zrób kopię i usuń stare wpisy.');","  // Nie ograniczaj liczby sesji w Lite; decyduje pojemność pamięci.");

replace("  get participants(){return state.participants.slice();}};",
`  get participants(){return state.participants.slice();},
  get tabletState(){
   if(!state.active||!running)return null;
   return {active:true,paused:!!paused,personIndex:state.turn,sessionId:state.sessionId,
    participants:state.participants.map(p=>{
      const pos=groupCore.nextPosition(p,state.plans,state.cursor,records);
      const plan=state.plans[p.index];
      return {id:p.id,name:p.name,index:p.index,done:!pos,
       exerciseName:pos?pos.ex.n:'',exerciseIndex:pos?pos.exercise:-1,
       seriesDone:pos?pos.done:0,seriesTotal:pos?pos.total:0,
       readyAt:Number(state.readyAt[p.index]||0),
       deferredUntil:Number(state.deferred[p.index]||0),
       exercisesTotal:plan&&plan.ex?plan.ex.length:0,
       completedSets:records.filter(r=>r.athlete===p.index).length,
       totalSets:plan&&plan.ex?plan.ex.reduce((n,ex)=>n+Math.max(1,Number(ex.sets)||1),0):0};
    })};
  }};`);
return s;
};
module.exports={patch};
