(function(){
'use strict';
// Rekordy Lite są oddzielone od serii treningowych i synchronizacji pełnego Trenera 2.
var KEY='trainer3.lite.pr.v1', core=window.TrenerLitePRCore;
if(!core)return;
var doc=document, currentMode='', dueProfile='', state=load();
function $(id){return doc.getElementById(id);}
function parse(raw,fallback){try{var o=JSON.parse(raw);return o&&typeof o==='object'?o:fallback;}catch(e){return fallback;}}
function load(){
  var s=parse(localStorage.getItem(KEY),{});
  return {records:Array.isArray(s.records)?s.records:[],
    intervalWeeks:core.safeInterval(s.intervalWeeks),
    lastAction:s.lastAction&&typeof s.lastAction==='object'?s.lastAction:{},
    snoozedUntil:s.snoozedUntil&&typeof s.snoozedUntil==='object'?s.snoozedUntil:{}};
}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(state));return true;}
  catch(e){message('Nie udało się zapisać danych. Zwolnij pamięć tabletu i wykonaj kopię.');return false;}
}
function esc(s){return String(s===null||s===undefined?'':s).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
});}
function fmt(n){return Number(n).toFixed(1).replace(/\.0$/, '').replace('.',',');}
function message(txt){var node=$('litePrMessage');if(node)node.textContent=txt;}
function history(){
  try{if(typeof getHistory==='function')return getHistory();}catch(e){}
  var h=parse(localStorage.getItem('trainer3.history'),[]);
  return Array.isArray(h)?h:[];
}
function people(){
  var map={};
  function add(id,name){id=String(id||'');if(!id)return;var n=String(name||'').trim();
    if(!map[id]||n&&map[id].name.indexOf('Uczestnik')===0)map[id]={id:id,name:n||'Uczestnik'};}
  var own=String(localStorage.getItem('trainer3.participantId.v070')||'');
  if(!own)try{if(window.TrenerData070&&window.TrenerData070.participantId)own=String(window.TrenerData070.participantId()||'');}catch(e){}
  if(own)add(own,$('nameA')?$('nameA').value:'Osoba 1');
  var stored=parse(localStorage.getItem('trainer3.onePhone.participants.v086'),[]);
  if(Array.isArray(stored))stored.forEach(function(p){add(p.id,p.name);});
  try{if(window.TrenerOnePhone086&&window.TrenerOnePhone086.getStored)
    window.TrenerOnePhone086.getStored().forEach(function(p){add(p.id,p.name);});}catch(e){}
  history().forEach(function(h){
    var members=h.onePhone&&h.onePhone.participants||h.group&&h.group.participants;
    if(Array.isArray(members))members.forEach(function(p){add(p.id||p.deviceId,p.name);});
    if(h.participantId&&!map[h.participantId])add(h.participantId,(h.names&&h.names[h.localAthlete||0])||'Uczestnik');
    (h.records||[]).forEach(function(r){
      if(r.participantId&&!map[r.participantId])add(r.participantId,'Uczestnik');
    });
  });
  state.records.forEach(function(r){add(r.profileId,r.profileName);});
  var out=Object.keys(map).map(function(id){return map[id];});
  if(!out.length)add('lite-local-primary',$('nameA')?$('nameA').value:'Osoba 1');
  out=Object.keys(map).map(function(id){return map[id];});
  return out.slice(0,12);
}
function selected(){var p=$('litePrPerson');return p?p.value:'';}
function chosenName(){var id=selected(),list=people();for(var i=0;i<list.length;i++)if(list[i].id===id)return list[i].name;return 'Uczestnik';}
function rows(){return core.historyRows(history(),selected());}
function exercises(){
  var available={};
  rows().forEach(function(r){if(r.exerciseId)available[r.exerciseId]=r.exerciseName;});
  state.records.forEach(function(r){if(r.profileId===selected()&&r.exerciseId)available[r.exerciseId]=r.exerciseName;});
  try{
    if(typeof exerciseLibrary!=='undefined')exerciseLibrary.forEach(function(ex){
      if(ex&&ex.id&&!ex.time)available[String(ex.id)]=String(ex.n||ex.name||ex.id);
    });
  }catch(e){}
  if(!Object.keys(available).length)available['bench-press-lite']='Wyciskanie na ławce';
  return Object.keys(available).map(function(id){return {id:id,name:available[id]};})
    .sort(function(a,b){return a.name.localeCompare(b.name,'pl');});
}
function updateSelect(select,items){
  if(!select)return;
  var old=select.value;
  select.innerHTML=items.map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>';}).join('');
  if(items.some(function(p){return p.id===old;}))select.value=old;
}
function progressSummary(){
  var result=$('litePrSummary'),p=selected(),ex=$('litePrExercise');
  if(!result||!ex)return;
  var best=core.bestEstimated(rows(),ex.value),actual=null;
  state.records.forEach(function(r){if(r.profileId===p&&r.exerciseId===ex.value&&(!actual||r.kg>actual.kg))actual=r;});
  var label=ex.options.length?ex.options[ex.selectedIndex].text:'Ćwiczenie';
  result.innerHTML='<b>'+esc(chosenName())+' — '+esc(label)+'</b>'+
    '<p>Szacowany maksymalny ciężar (e1RM): <strong>'+(best?fmt(best.estimated)+' kg':'brak danych')+'</strong></p>'+
    (best?'<p class="hint">Z serii '+fmt(best.kg)+' kg × '+best.reps+' powt. (wzór Epleya). To tylko szacunek, nie wynik rzeczywistego testu.</p>':
      '<p class="hint">Do obliczenia potrzeba serii z 1–10 poprawnymi powtórzeniami.</p>')+
    '<p>Zmierzony rekord 1RM: <strong>'+(actual?fmt(actual.kg)+' kg':'jeszcze nie zapisano')+'</strong></p>'+
    (actual?'<p class="hint">Data: '+esc(new Date(actual.at).toLocaleDateString('pl-PL'))+'</p>':'');
}
function updateRoster(){
  var person=$('litePrPerson'),ex=$('litePrExercise');if(!person||!ex)return;
  updateSelect(person,people());updateSelect(ex,exercises());
  progressSummary();renderRecords();renderDue();
}
function renderRecords(){
  var target=$('litePrRecords');if(!target)return;
  var p=selected(),e=$('litePrExercise').value;
  var items=state.records.filter(function(r){return r.profileId===p&&r.exerciseId===e;})
    .sort(function(a,b){return b.at-a.at;}).slice(0,6);
  target.innerHTML=items.length?
    '<div class="litePrLabel">Ostatnie potwierdzone testy</div>'+
    items.map(function(r){return '<div class="litePrRecord"><span>'+esc(new Date(r.at).toLocaleDateString('pl-PL'))+
      '</span><b>'+fmt(r.kg)+' kg × 1</b></div>';}).join(''):
    '<p class="hint">Brak zapisanych testów rzeczywistego maksimum.</p>';
}
function renderDue(){
  var n=$('litePrNudge');if(!n)return;
  var weeks=state.intervalWeeks,now=Date.now();
  var active=!!(window.TrenerOnePhone086&&window.TrenerOnePhone086.active);
  var train=$('training');
  if(train&&!train.classList.contains('hidden'))active=true;
  dueProfile='';
  var all=people(),historyData=history();
  var order=all.slice().sort(function(a,b){return (a.id===selected()?-1:0)-(b.id===selected()?-1:0);});
  for(var i=0;i<order.length;i++){
    var id=order[i].id;
    var eligible=core.historyRows(historyData,id).length>0||
      state.records.some(function(r){return r.profileId===id;});
    if(weeks>0&&eligible&&core.isDue(state.lastAction[id],weeks,now)&&now>=Number(state.snoozedUntil[id]||0)){
      dueProfile=id;break;
    }
  }
  n.classList.toggle('hidden',!dueProfile||active);
  var name=$('litePrNudgeName');
  if(name&&dueProfile){for(var j=0;j<all.length;j++)if(all[j].id===dueProfile){name.textContent=all[j].name;break;}}
}
function selectDue(){
  if(!dueProfile)return;
  var person=$('litePrPerson');person.value=dueProfile;
  updateSelect($('litePrExercise'),exercises());
  progressSummary();renderRecords();
}
function markAction(){
  var id=selected();if(!id)return;
  state.lastAction[id]=Date.now();delete state.snoozedUntil[id];
  if(save())renderDue();
}
function openProgress(mode){
  var tab=doc.querySelector('.tab[data-tab="progress"]');
  if(tab)tab.click();
  var panel=$('litePrPanel');if(panel)panel.scrollIntoView({behavior:'auto',block:'start'});
  if(mode==='estimate')showEstimate();
  if(mode==='actual')showTest();
}
function showEstimate(){
  currentMode='estimate';
  if($('litePrActual'))$('litePrActual').classList.add('hidden');
  progressSummary();markAction();
  message('Szacowany e1RM to orientacyjny wynik. Nie musisz próbować maksymalnego ciężaru.');
}
function showTest(){
  currentMode='actual';
  if($('litePrActual'))$('litePrActual').classList.remove('hidden');
  message('Rekord rzeczywisty zapisuj wyłącznie po udanym pojedynczym powtórzeniu. Zapewnij asekurację, szczególnie na ławce.');
}
function saveTest(){
  var kg=Number(String($('litePrKg').value||'').replace(',','.'));
  var acknowledged=$('litePrSafety').checked,exercise=$('litePrExercise'),id=selected();
  if(!isFinite(kg)||kg<=0||kg>1000){message('Wpisz prawidłowy ciężar od 0 do 1000 kg.');return;}
  if(!acknowledged){message('Najpierw potwierdź wykonanie bez bólu, dobrą technikę i asekurację.');return;}
  if(!exercise||!exercise.value||!id){message('Wybierz osobę i ćwiczenie.');return;}
  if(window.TrenerOnePhone086&&window.TrenerOnePhone086.active){message('Zakończ lub wstrzymaj trening przed zapisem testu maksimum.');return;}
  var entry={id:'pr:'+Date.now()+':'+Math.floor(Math.random()*1000000),
    profileId:id,profileName:chosenName(),exerciseId:exercise.value,
    exerciseName:exercise.options[exercise.selectedIndex].text,kg:kg,reps:1,at:Date.now(),
    note:String(($('litePrNotes')||{}).value||'').slice(0,250)};
  state.records.unshift(entry);state.lastAction[id]=Date.now();delete state.snoozedUntil[id];
  if(!save()){state.records.shift();delete state.lastAction[id];return;}
  $('litePrKg').value='';$('litePrSafety').checked=false;$('litePrNotes').value='';
  $('litePrActual').classList.add('hidden');currentMode='';
  progressSummary();renderRecords();renderDue();
  message('Rekord '+fmt(kg)+' kg zapisany dla '+chosenName()+'.');
}
function postpone(){
  var id=dueProfile||selected();state.snoozedUntil[id]=Date.now()+7*24*60*60*1000;
  if(save())renderDue();
}
function install(){
  var progress=$('progress'),setup=$('setup');
  if(!progress||!setup||$('litePrPanel'))return;
  var style=doc.createElement('style');style.id='litePrStyle';style.textContent=
    '#litePrPanel{border-left:4px solid #ef2b2d}#litePrPanel .litePrActions{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}' +
    '#litePrPanel .litePrActions button{flex:1 1 42%;min-height:64px;font-size:17px}' +
    '#litePrPanel select,#litePrPanel input{width:100%;min-height:57px;font-size:19px}' +
    '#litePrPanel label{display:block;margin-top:10px}' +
    '#litePrActual{border:1px solid #454545;border-radius:12px;padding:12px;margin-top:12px}' +
    '#litePrSummary{background:#101010;border:1px solid #343434;border-radius:12px;padding:12px;margin:12px 0;line-height:1.45}' +
    '#litePrSummary strong{color:#65e2a1}#litePrNudge{border-left:4px solid #d9ad54}' +
    '#litePrNudge .litePrActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}' +
    '#litePrNudge button{flex:1 1 42%;min-height:58px}' +
    '.litePrRecord{display:flex;justify-content:space-between;gap:12px;padding:8px;border-bottom:1px solid #303030}' +
    '.litePrLabel{font-weight:700;margin:12px 0 5px;color:#ddd}';
  doc.head.appendChild(style);
  var block=doc.createElement('div');block.className='card';block.id='litePrPanel';
  block.innerHTML='<div class="eyebrow">TRENER 2 LITE • REKORDY SIŁOWE</div>'+
    '<h2>Sprawdź rekord</h2><p class="hint">Dwa sposoby: oszacowanie z historii treningów lub rzeczywisty test 1 powtórzenia. Każdy uczestnik ma własne rekordy.</p>'+
    '<label for="litePrPerson">Osoba</label><select id="litePrPerson"></select>'+
    '<label for="litePrExercise">Ćwiczenie</label><select id="litePrExercise"></select>'+
    '<div class="litePrActions"><button class="secondary" id="litePrEstimate" type="button">SZACOWANY MAKS (e1RM)</button>'+
    '<button class="primary" id="litePrTry" type="button">TEST RZECZYWISTEGO 1RM</button></div>'+
    '<div id="litePrSummary" aria-live="polite"></div><div id="litePrActual" class="hidden">'+
    '<h3>Wykonany test — jedno powtórzenie</h3><p class="hint">Zapisz dopiero PO zakończonej udanej próbie. Na ławce korzystaj z asekuracji i ograniczników. Nie wykonuj próby przy bólu.</p>'+
    '<label for="litePrKg">Rzeczywiście podniesiony ciężar [kg]</label><input id="litePrKg" type="number" min="0.5" max="1000" step="0.5" inputmode="decimal" placeholder="np. 50">'+
    '<label for="litePrNotes">Notatka (opcjonalnie)</label><input id="litePrNotes" maxlength="250" placeholder="np. ławka, asekuracja">'+
    '<label><input type="checkbox" id="litePrSafety"> Potwierdzam poprawne powtórzenie, brak bólu oraz niezbędną asekurację.</label>'+
    '<div class="litePrActions"><button class="primary" type="button" id="litePrSave">ZAPISZ REKORD</button>'+
    '<button class="secondary" type="button" id="litePrCancel">ANULUJ</button></div></div>'+
    '<p class="hint" id="litePrMessage" aria-live="polite"></p><div id="litePrRecords"></div>'+
    '<label for="litePrWeeks">Przypomnij o możliwości sprawdzenia rekordu</label>'+
    '<select id="litePrWeeks"><option value="8">Co 8 tygodni (zalecane)</option>'+
    '<option value="6">Co 6 tygodni</option><option value="4">Co 4 tygodnie</option>'+
    '<option value="0">Bez przypomnień — tylko ręcznie</option></select>'+
    '<p class="hint">Przypomnienie pojawia się na ekranie Start po uruchomieniu aplikacji — nie jest to alarm systemowy. Możesz je odłożyć.</p>'+
    '<p class="hint">Uwaga: katalog własnych talerzy i gryfów jest osobnym etapem; obecnie samodzielnie sprawdź, czy dany ciężar da się bezpiecznie zmontować.</p>';
  progress.insertBefore(block,progress.firstChild);
  var nudge=doc.createElement('div');nudge.id='litePrNudge';nudge.className='card hidden';
  nudge.innerHTML='<div class="eyebrow">PRZYPOMNIENIE TRENERA 2 LITE</div>'+
    '<h3>Czas sprawdzić postępy?</h3><p class="hint"><b id="litePrNudgeName"></b> — możesz zobaczyć wyliczony maksymalny ciężar albo samodzielnie przetestować rekord. Wybór należy do Ciebie.</p>'+
    '<div class="litePrActions"><button class="secondary" id="litePrNudgeEstimate" type="button">SZACOWANY REKORD</button>'+
    '<button class="primary" id="litePrNudgeActual" type="button">TEST 1RM</button>'+
    '<button class="secondary" id="litePrNudgeLater" type="button">PRZYPOMNIJ ZA 7 DNI</button></div>';
  var start=$('startBtn');if(start)start.insertAdjacentElement('beforebegin',nudge);
  else setup.appendChild(nudge);
  $('litePrWeeks').value=String(state.intervalWeeks);
  $('litePrWeeks').addEventListener('change',function(){
    var before=state.intervalWeeks;state.intervalWeeks=core.safeInterval(this.value);
    if(!save())state.intervalWeeks=before;
    renderDue();
  });
  $('litePrPerson').addEventListener('change',function(){updateSelect($('litePrExercise'),exercises());progressSummary();renderRecords();renderDue();});
  $('litePrExercise').addEventListener('change',function(){progressSummary();renderRecords();});
  $('litePrEstimate').addEventListener('click',showEstimate);
  $('litePrTry').addEventListener('click',showTest);
  $('litePrCancel').addEventListener('click',function(){$('litePrActual').classList.add('hidden');currentMode='';});
  $('litePrSave').addEventListener('click',saveTest);
  $('litePrNudgeEstimate').addEventListener('click',function(){selectDue();openProgress('estimate');});
  $('litePrNudgeActual').addEventListener('click',function(){selectDue();openProgress('actual');});
  $('litePrNudgeLater').addEventListener('click',postpone);
  doc.querySelector('.tab[data-tab="progress"]')?.addEventListener('click',function(){setTimeout(updateRoster,40);});
  updateRoster();
  setInterval(renderDue,15000);
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',install);
else install();
window.TrenerLitePR={estimate:core.estimate,refresh:updateRoster};
})();