(function(){
'use strict';
var core=window.TrenerLiteProfileCore;if(!core)return;
var KEY='trainer3.lite.profiles.v037',SELECTED='trainer3.lite.selected.v037',
 ROSTER='trainer3.onePhone.participants.v086', PENDING='trainer3.onePhone.pending.v086';
var doc=document,dirty=false,shownName='',statusText='';
function $(id){return doc.getElementById(id);}
function esc(v){return String(v===undefined||v===null?'':v).replace(/[&<>"']/g,function(c){
 return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
});}
function parse(k,f){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v===null?f:v;}catch(e){return f;}}
function history(){var h=parse('trainer3.history',[]);return Array.isArray(h)?h:[];}
function personalRecords(){var x=parse('trainer3.lite.pr.v1',{});return Array.isArray(x.records)?x.records:[];}
function pending(){return parse(PENDING,null);}
function ownId(){
 try{if(window.TrenerData070&&window.TrenerData070.participantId)
  return String(window.TrenerData070.participantId()||'');}catch(e){}
 return String(localStorage.getItem('trainer3.participantId.v070')||'');
}
function saved(){return parse(KEY,{schemaVersion:1,people:[]});}
function primary(){return {id:ownId(),name:$('nameA')&&$('nameA').value||'Osoba 1'};}
function refresh(){
 var old=saved(),oldRoster=parse(ROSTER,[]),h=history();
 var reconciled=core.build(old,oldRoster,h,pending(),personalRecords(),primary());
 if(JSON.stringify(reconciled)!==JSON.stringify(old))
  localStorage.setItem(KEY,JSON.stringify(reconciled));
 return reconciled;
}
function ids(profiles){
 var selected=parse(SELECTED,[]);
 var good=Array.isArray(selected)?selected.filter(function(id){
  return profiles.people.some(function(p){return p.id===id;});
 }):[];
 if(!good.length){
  var old=parse(ROSTER,[]);
  good=Array.isArray(old)?old.map(function(p){return p.id;}).filter(function(id){
   return profiles.people.some(function(p){return p.id===id;});
  }):[];
 }
 if(!good.length&&profiles.people.length)good=[profiles.people[0].id];
 return good.slice(0,6);
}
function setIds(selected){
 var p=refresh();
 var roster=core.select(p,selected);
 localStorage.setItem(SELECTED,JSON.stringify(selected));
 return roster;
}
function selectedRoster(){
 var p=refresh();
 return core.select(p,ids(p));
}
function activeTraining(){
 try{return typeof running!=='undefined'&&!!running;}catch(e){return false;}
}
function message(s){statusText=s;var el=$('liteProfileMessage');if(el)el.textContent=s;}
function displayAge(iso){
 if(!iso)return '—';
 try{return new Date(iso).toLocaleDateString('pl-PL');}catch(e){return '—';}
}
function countSessions(id){
 return history().filter(function(h){return core.historyRows(h,id).length>0;}).length;
}
function saveList(list){
 localStorage.setItem(KEY,JSON.stringify(list));
 return list;
}
function newId(){
 var random=new Uint32Array(3);
 try{if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(random);
  else throw Error('brak bezpiecznego generatora');}
 catch(e){return 'lite'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);}
 return 'lite'+Array.prototype.map.call(random,function(n){return n.toString(36);}).join('-');
}
function add(){
 if(activeTraining()){message('Nie dodawaj profilu podczas treningu.');return;}
 var el=$('liteProfileNew'),n=el&&el.value||'';
 try{
  var updated=core.add(refresh(),newId(),n);
  saveList(updated);el.value='';
  setIds(ids(updated).concat(updated.people[updated.people.length-1].id).slice(-6));
  draw();message('Profil utworzony. Nazwę można zmieniać tylko do pierwszego treningu.');
 }catch(e){message('Nie dodano profilu: '+e.message);}
}
function rename(id){
 if(activeTraining()){message('Nie zmieniaj profilu podczas treningu.');return;}
 var p=refresh().people.filter(function(p){return p.id===id;})[0];
 if(!p)return;
 if(p.locked){message('Imię „'+p.name+'” jest zablokowane, ponieważ zapisano już historię.');return;}
 var next=prompt('Nowe imię / nazwa profilu:',p.name);
 if(next===null)return;
 try{
  var after=core.change(refresh(),id,next);
  saveList(after);
  if(id===ownId()&&$('nameA')){$('nameA').value=after.people.filter(function(x){return x.id===id;})[0].name;
   try{if(typeof saveSettings==='function')saveSettings();}catch(ignore){}
  }
  draw();message('Zapisano nazwę. Historia pozostaje przypisana do stałego ID.');
 }catch(e){message('Nie można zmienić nazwy: '+e.message);}
}
function remove(id){
 if(activeTraining()){message('Nie usuwaj profilu podczas treningu.');return;}
 var all=refresh(),p=all.people.filter(function(x){return x.id===id;})[0];
 if(!p)return;
 if(p.locked||core.hasHistory(id,history(),pending(),personalRecords())){
  message('Nie można usuwać profilu z historią. Możesz odznaczyć osobę przy wyborze grupy.');return;
 }
 if(id===ownId()){message('Profil podstawowy urządzenia nie może zostać usunięty.');return;}
 if(!confirm('Usunąć pusty profil „'+p.name+'”? Nie usunie to żadnej historii.'))return;
 all.people=all.people.filter(function(x){return x.id!==id;});
 saveList(all);
 var selection=ids(all);setIds(selection);
 draw();message('Usunięto pusty profil.');
}
function fileLabel(person){return String(person.name||'Uczestnik').replace(/[^a-z0-9ąćęłńóśźż_-]+/gi,'-').slice(0,26);}
function exportSession(person,sessionId){
 var found=history().map(function(h){return core.sessionFor(h,person);})
  .filter(function(x){return !!x;}).filter(function(x){return x.sessionId===sessionId;})[0];
 if(!found){message('Nie znaleziono sesji tej osoby.');return;}
 if(!window.LiteBridge||!LiteBridge.exportBackup){message('Zapis pliku wymaga aplikacji Android.');return;}
 try{
  LiteBridge.exportBackup(JSON.stringify(found),'Trener2-'+fileLabel(person)+'-'+
    sessionId.replace(/[^a-z0-9_-]+/gi,'-').slice(0,35)+'.json');
  message('Wybierz miejsce zapisu JSON. W pełnym Trenerze 2 użyj Historia → Import wyniku do mojego profilu.');
 }catch(e){message('Błąd eksportu: '+e.message);}
}
function exportWhole(person){
 if(!window.LiteBridge||!LiteBridge.exportBackup){message('Zapis pliku wymaga aplikacji Android.');return;}
 try{
  var pack=core.personExport(person,history(),personalRecords());
  if(!pack.sessions.length&&!pack.personalRecords.length){
   message('Ten profil nie ma jeszcze danych treningowych do wyeksportowania.');return;
  }
  LiteBridge.exportBackup(JSON.stringify(pack),'Trener2-profil-'+fileLabel(person)+'.zip');
  message('Eksport całej historii „'+person.name+'”. ZIP będzie zawierał osobny plik JSON każdej sesji zgodny z pełnym Trenerem 2. Nie obejmuje danych innych osób.');
 }catch(e){message('Nie można wyeksportować profilu: '+e.message);}
}
function draw(){
 var host=$('liteProfileCards');if(!host)return;
 var data;
 try{data=refresh();}catch(e){message('Błąd profili: '+e.message);return;}
 var chosen=ids(data),max=chosen.length;
 host.innerHTML=data.people.map(function(p){
  var count=countSessions(p.id),sel=chosen.indexOf(p.id)!==-1,lock=p.locked;
  return '<div class="liteProfileCard" data-id="'+esc(p.id)+'">'+
   '<div class="liteProfileCardHead"><label><input class="liteProfileSelect" type="checkbox"'+
   (sel?' checked':'')+'><strong>'+esc(p.name)+'</strong></label>'+
   '<span class="'+(lock?'liteProfileLocked':'liteProfileUnlocked')+'">'+
   (lock?'NAZWA ZABLOKOWANA':'MOŻNA ZMIENIĆ NAZWĘ')+'</span></div>'+
   '<div class="hint">'+count+' treningów • '+(lock?'stały profil':'profil bez historii')+
   '</div><div class="liteProfileActions">'+
   '<button type="button" class="secondary liteProfileRename"'+(lock?' disabled':'')+'>ZMIEŃ NAZWĘ</button>'+
   '<button type="button" class="secondary liteProfileExport">EKSPORTUJ DANE</button>'+
   '<button type="button" class="secondary liteProfileDelete"'+(lock||p.id===ownId()?' disabled':'')+'>USUŃ PUSTY</button></div>'+
   '<div class="liteProfileSessions hidden"></div></div>';
 }).join('');
 Array.from(host.querySelectorAll('.liteProfileCard')).forEach(function(el){
  var id=el.getAttribute('data-id'),p=data.people.filter(function(x){return x.id===id;})[0];
  var check=el.querySelector('.liteProfileSelect');
  check.onchange=function(){
   try{
    if(activeTraining())throw Error('Nie można zmieniać grupy podczas treningu.');
    var current=ids(refresh());
    var proposed=check.checked?current.concat([id]):current.filter(function(x){return x!==id;});
    var result=setIds(proposed);draw();
    message('Wybrano '+result.length+' osób. Użyj WSPÓLNY 1–6 → START.');
   }catch(e){draw();message('Nie zapisano wyboru: '+e.message);}
  };
  el.querySelector('.liteProfileRename').onclick=function(){rename(id);};
  el.querySelector('.liteProfileDelete').onclick=function(){remove(id);};
  el.querySelector('.liteProfileExport').onclick=function(){
   var list=el.querySelector('.liteProfileSessions');
   if(!list.classList.contains('hidden')){list.classList.add('hidden');return;}
   Array.from(host.querySelectorAll('.liteProfileSessions')).forEach(function(x){x.classList.add('hidden');});
   var sessions=history().map(function(h){return core.sessionFor(h,p);}).filter(Boolean);
   list.innerHTML='<button type="button" class="primary liteProfileAll">EKSPORTUJ CAŁY PROFIL (ZIP)</button>'+
    '<p class="hint">W ZIP są osobne pliki JSON dla kolejnych sesji. W pełnym Trenerze 2 importujesz je w Historii. Automatyczny import całej paczki wymaga aktualizacji telefonu.</p>'+
    (sessions.length?'<label>Lub zapisz jeden trening do telefonu:</label>'+
    '<select class="liteProfileSessionSelect">'+sessions.map(function(s){
     return '<option value="'+esc(s.sessionId)+'">'+esc((s.session.date||'')+' — '+(s.session.plan||'Trening'))+'</option>';
    }).join('')+'</select><button type="button" class="secondary liteProfileOne">EKSPORTUJ WYBRANY TRENING JSON</button>':
    '<p class="hint">Brak zapisanych sesji treningowych.</p>');
   list.querySelector('.liteProfileAll').onclick=function(){exportWhole(p);};
   var one=list.querySelector('.liteProfileOne');
   if(one)one.onclick=function(){exportSession(p,list.querySelector('select').value);};
   list.classList.remove('hidden');
  };
 });
 var primaryPerson=data.people.filter(function(p){return p.id===ownId();})[0];
 var input=$('nameA');
 if(input&&primaryPerson&&primaryPerson.locked){
  input.value=primaryPerson.name;
  input.readOnly=true;
  input.setAttribute('title','Nazwa nie może być zmieniona po zapisaniu historii treningowej.');
 }
 var summary=$('liteProfileSelected');
 if(summary)summary.textContent='Wybrano: '+chosen.map(function(id){
  var p=data.people.filter(function(p){return p.id===id;})[0];return p&&p.name||'';
 }).join(', ')+' ('+max+'/6)';
}
function install(){
 var settings=$('settings');
 if(settings&&!$('liteProfilesSettings')){
  var box=doc.createElement('section');box.id='liteProfilesSettings';box.className='card';
  box.innerHTML='<div class="eyebrow">TRENER 2 LITE • STAŁE PROFILE</div>'+
   '<h2>Użytkownicy i wspólne treningi</h2>'+
   '<p class="hint">Każda osoba ma stałe ID. Imię można poprawić tylko do pierwszej serii. Po rozpoczęciu historii profil pozostaje na stałe powiązany z wynikami. Możesz odznaczyć osobę, ale nie usuwać jej danych.</p>'+
   '<label>Dodaj uczestnika</label><div class="liteProfileNew">'+
   '<input id="liteProfileNew" maxlength="40" placeholder="Imię lub nazwa (np. Bartek)">'+
   '<button type="button" class="primary" id="liteProfileAdd">DODAJ OSOBĘ</button></div>'+
   '<p id="liteProfileSelected" class="hint"></p>'+
   '<div id="liteProfileCards"></div>'+
   '<p id="liteProfileMessage" role="status" class="hint" aria-live="polite"></p>';
  settings.insertBefore(box,settings.firstChild);
  $('liteProfileAdd').onclick=add;
 }
 var setup=$('v086Setup');
 if(setup&&!$('liteProfilesLauncher')){
  var wrap=doc.createElement('div');wrap.id='liteProfilesLauncher';
  wrap.innerHTML='<strong>Wybierz zapisane osoby</strong>'+
   '<p class="hint">Liczba i kolejność osób są wybierane w Ustawieniach → Użytkownicy. Możesz wybrać dowolne 1–6 osób. Stałe profile są wspólne dla historii i rekordów.</p>'+
   '<button id="liteProfilesOpen" class="secondary" type="button">OTWÓRZ PROFILE I WYBIERZ GRUPĘ</button>';
  setup.insertBefore(wrap,setup.firstChild);
  $('liteProfilesOpen').onclick=function(){var tab=doc.querySelector('.tab[data-tab="settings"]');if(tab)tab.click();
   $('liteProfilesSettings')&&$('liteProfilesSettings').scrollIntoView();};
 }
 if(!$('liteProfilesCss')){
  var style=doc.createElement('style');style.id='liteProfilesCss';style.textContent=
   '#liteProfilesSettings{border-left:4px solid #ef2b2d}#liteProfilesSettings button{min-height:52px;font-size:15px}' +
   '#liteProfilesSettings input,#liteProfilesSettings select{min-height:52px;font-size:17px}' +
   '.liteProfileCard{padding:12px;margin:10px 0;border:1px solid #353535;border-radius:12px;background:#111}' +
   '.liteProfileCardHead{display:-webkit-flex;display:flex;-webkit-justify-content:space-between;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}' +
   '.liteProfileCardHead label{display:-webkit-flex;display:flex;align-items:center;gap:12px;font-size:20px}' +
   '.liteProfileCardHead input[type=checkbox]{width:30px;height:30px;min-height:30px}' +
   '.liteProfileLocked{color:#ffcc66;font-size:12px;font-weight:800}' +
   '.liteProfileUnlocked{color:#74e6a4;font-size:12px;font-weight:800}' +
   '.liteProfileActions{display:-webkit-flex;display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}' +
   '.liteProfileActions button{flex:1 1 27%;min-width:135px}' +
   '.liteProfileNew{display:-webkit-flex;display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}' +
   '.liteProfileNew input{flex:2 1 170px}.liteProfileNew button{flex:1 1 140px}' +
   '.liteProfileSessions{padding:10px 0}.liteProfileSessions button,.liteProfileSessions select{width:100%;margin:7px 0}' +
   '#liteProfilesLauncher{padding:10px;border:1px solid #414141;border-radius:10px;margin:8px 0}' +
   '#liteProfilesLauncher button{width:100%;min-height:58px;font-size:17px}';
  doc.head.appendChild(style);
 }
 if($('liteProfileCards'))draw();
}
function boot(){
 try{refresh();install();}catch(e){message('Błąd uruchomienia profili: '+e.message);}
 // Po zakończeniu pierwszego treningu aktualizuj jedynie blokady nazw.
 var lastSig='';
 setInterval(function(){
  if(!doc.getElementById('liteProfileCards')){install();return;}
  var data=refresh(),signature=data.people.map(function(p){return p.id+':'+p.name+':'+p.locked;}).join('|');
  if(signature!==lastSig){lastSig=signature;draw();}
 },2500);
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot);
else boot();
window.TrenerLiteProfiles={selectedRoster:selectedRoster,refresh:refresh,select:setIds,
 list:function(){return refresh().people.slice();},activeTraining:activeTraining};
})();
