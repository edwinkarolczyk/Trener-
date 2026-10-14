(function(){
'use strict';
var core=window.TrenerLiteExerciseCore;
if(!core)return;
var doc=document,pkg=null,map={},result=null,loadBusy=false;
function $(id){return doc.getElementById(id);}
function esc(x){return String(x===undefined||x===null?'':x).replace(/[&<>"']/g,function(c){
 return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
});}
function status(message){var el=$('liteExerciseStatus');if(el)el.textContent=message;}
function store(){return window.TrenerCustomExercises094;}
function isTraining(){try{return typeof running!=='undefined'&&!!running;}catch(e){return false;}}
function options(headers,selected){
 return '<option value="">Nie importuj</option>'+headers.map(function(k){
  return '<option value="'+esc(k)+'"'+(k===selected?' selected':'')+'>'+esc(k)+'</option>';
 }).join('');
}
var labels=[
 ['n','Nazwa ćwiczenia *'],['group','Partia mięśniowa *'],
 ['equipment','Sprzęt'],['sets','Liczba serii'],['min','Powtórzenia od'],['max','Powtórzenia do'],
 ['rest','Przerwa [sek.]'],['time','Ćwiczenie na czas'],
 ['setup','Pozycja startowa — opis'],['movement','Jak wykonać'],['mistake','Typowe błędy'],
 ['tip','Wskazówki'],['imageStart','Zdjęcie START'],['imageEnd','Zdjęcie KONIEC']
];
function renderMap(){
 var host=$('liteExerciseMapping');if(!host||!pkg)return;
 var headers=Object.keys(pkg.rows[0]||{});
 host.innerHTML=labels.map(function(item){
  return '<label>'+esc(item[1])+
   '<select data-column="'+item[0]+'">'+options(headers,map[item[0]])+'</select></label>';
 }).join('');
 Array.from(host.querySelectorAll('select')).forEach(function(el){
  el.onchange=function(){map[el.getAttribute('data-column')]=el.value;renderPreview();};
 });
}
function readBuiltins(){
 try{return typeof exerciseLibrary!=='undefined'?exerciseLibrary.filter(function(ex){
  return ex&&String(ex.id||'').indexOf('user:')!==0;
 }):[];}catch(e){return [];}
}
function renderPreview(){
 if(!pkg)return;
 var mod=store();if(!mod){status('Biblioteka ćwiczeń jeszcze się uruchamia. Otwórz ponownie zakładkę Plan.');return;}
 try{
  if(!map.n||!map.group)throw Error('Zmapuj wymagane kolumny: Nazwa i Partia.');
  var list=mod.list(),builtins=readBuiltins();
  result=core.preview(pkg,map,list,builtins);
  var counts=result.counts;
  status('Do dodania: '+counts.new+' • Duplikaty pominięte: '+counts.duplicate+
    ' • Błędne: '+counts.invalid+'. Dane na tablecie nie zostały zmienione.');
  var listBox=$('liteExerciseRows');listBox.textContent='';
  result.entries.forEach(function(entry,index){
   var row=doc.createElement('div');row.className='liteExerciseRow';
   var check=doc.createElement('input');check.type='checkbox';check.checked=entry.selected;
   check.disabled=entry.status!=='new';
   check.setAttribute('aria-label','Importuj wiersz '+entry.row);
   check.onchange=function(){entry.selected=check.checked;updateCounter();};
   row.appendChild(check);
   var detail=doc.createElement('div');detail.className='liteExerciseDetail';
   var ex=entry.exercise;
   var title=doc.createElement('b');title.textContent='Wiersz '+entry.row+' • '+(ex?ex.n:'Niepoprawny');
   detail.appendChild(title);
   var info=doc.createElement('div');info.className='hint';
   info.textContent=entry.status==='duplicate'?'Duplikat — zachowano istniejące ćwiczenie':
    entry.status==='invalid'?entry.error:(ex.group+' • '+ex.sets+' serie • '+
    (ex.imageStart?'Zdjęcie START ✓':'Bez START')+' • '+
    (ex.imageEnd?'Zdjęcie KONIEC ✓':'Bez KONIEC'));
   detail.appendChild(info);
   if(ex&&(ex.imageStart||ex.imageEnd)){
    var photos=doc.createElement('div');photos.className='liteExercisePhotos';
    [ex.imageStart,ex.imageEnd].forEach(function(imgSrc,idx){
     if(!imgSrc)return;
     var img=doc.createElement('img');img.alt=idx===0?'Start':'Koniec';img.src=imgSrc;
     photos.appendChild(img);
    });
    detail.appendChild(photos);
   }
   row.appendChild(detail);listBox.appendChild(row);
  });
  updateCounter();
 }catch(e){result=null;status('Błąd podglądu: '+String(e.message||e));$('liteExerciseRows').textContent='';}
}
function updateCounter(){
 var selected=result?result.entries.filter(function(x){return x.selected&&x.status==='new';}).length:0;
 var save=$('liteExerciseCommit');
 if(save){save.disabled=selected===0;save.textContent='DODAJ '+selected+' ĆWICZEŃ DO BIBLIOTEKI';}
}
function receive(raw){
 loadBusy=false;
 try{
  if(isTraining())throw Error('Zakończ trening przed importem — plik nie został zapisany.');
  var data=typeof raw==='string'?JSON.parse(raw):raw;
  if(!data||data.format!=='trener2-lite-exercises'||!Array.isArray(data.rows))
    throw Error('Nie rozpoznano pakietu ćwiczeń.');
  pkg=data;map=core.guess(Object.keys(data.rows[0]||{}));
  $('liteExerciseImportPreview').classList.remove('hidden');
  renderMap();renderPreview();
  var tab=doc.querySelector('.tab[data-tab="plan"]');if(tab)tab.click();
  $('liteExerciseImportPreview').scrollIntoView();
 }catch(e){pkg=null;result=null;status('Import odrzucony: '+String(e.message||e));}
}
function error(msg){loadBusy=false;status(String(msg||'Błąd wczytywania pliku.'));pkg=null;result=null;}
function submit(){
 if(isTraining()){status('Zakończ bieżący trening przed importem.');return;}
 if(!result||!pkg)return;
 var mod=store();if(!mod){status('Biblioteka jest niedostępna. Nie zapisano danych.');return;}
 try{
  var old=localStorage.getItem(mod.KEY),existing=mod.list();
  // Jeszcze raz sprawdź duplikaty względem aktualnej zawartości.
  var checked=result.entries.filter(function(x){return x.selected&&x.status==='new';});
  var now=core.preview(pkg,map,existing,readBuiltins());
  var next=now.entries.filter(function(x){return x.status==='new'&&
    checked.some(function(y){return y.exercise&&x.exercise&&y.exercise.id===x.exercise.id;});});
  if(next.length!==checked.length)throw Error('Biblioteka zmieniła się od podglądu. Odśwież i ponów import.');
  next.forEach(function(x){x.selected=true;});
  var prepared=core.commitPlan(existing,next,function(x,id){return mod.validate(x,id);});
  if(!prepared.added){status('Brak wybranych nowych ćwiczeń.');return;}
  if(!confirm('Dodać '+prepared.added+' ćwiczeń do wspólnej biblioteki?\nWcześniejsze dane i historię pozostawiamy bez zmian.'))return;
  localStorage.setItem(mod.KEY,prepared.serialized);
  if(!mod.refresh()){
   // Żadnych pół-stanów: przywróć wcześniejszą bibliotekę po błędzie walidacji.
   if(old===null)localStorage.removeItem(mod.KEY);else localStorage.setItem(mod.KEY,old);
   mod.refresh();throw Error('Błąd odświeżania — poprzednia biblioteka została przywrócona.');
  }
  pkg=null;result=null;$('liteExerciseImportPreview').classList.add('hidden');
  status('Dodano '+prepared.added+' ćwiczeń. Zdjęcia zapisano razem z biblioteką. Użyj „Moje ćwiczenia”, żeby je obejrzeć.');
 }catch(e){status('Nie zapisano importu: '+String(e.message||e)+'. Dotychczasowe dane pozostają bez zmian.');}
}
function install(){
 var section=$('plan');
 if(!section||$('liteExerciseImportCard'))return;
 var card=doc.createElement('div');card.id='liteExerciseImportCard';card.className='card';
 card.innerHTML='<div class="eyebrow">TRENER 2 LITE • BIBLIOTEKA ĆWICZEŃ</div>'+
  '<h2>Import Excel / ZIP + zdjęcia</h2>'+
  '<p class="hint">Wybierz CSV, XLSX lub ZIP z arkuszem i zdjęciami START/KONIEC. Każdy wiersz to ćwiczenie. Plik nie zmienia danych przed potwierdzeniem.</p>'+
  '<button type="button" class="primary bigBtn" id="liteExercisePick">WYBIERZ PLIK ĆWICZEŃ</button>'+
  '<p class="hint">Kolumny: <b>Nazwa; Partia; Sprzęt; Serie; Powt_min; Powt_max; Przerwa; Wykonanie; Zdjecie_start; Zdjecie_koniec</b>. W ZIP ścieżki do zdjęć wpisz w odpowiednich kolumnach, np. <code>zdjecia/wyciskanie-start.jpg</code>.</p>'+
  '<div id="liteExerciseImportPreview" class="hidden">'+
  '<details><summary>Dopasuj kolumny Excel (możesz zmienić automatyczne dopasowanie)</summary>'+
  '<div id="liteExerciseMapping"></div></details>'+
  '<h3>Podgląd ćwiczeń</h3>'+
  '<div id="liteExerciseRows"></div>'+
  '<button type="button" class="primary bigBtn" id="liteExerciseCommit" disabled>ZATWIERDŹ IMPORT</button>'+
  '<button type="button" class="secondary bigBtn" id="liteExerciseCancel">ANULUJ — BEZ ZMIAN</button></div>'+
  '<p id="liteExerciseStatus" class="hint" aria-live="polite">Możesz także importować sam Excel bez zdjęć.</p>';
 section.insertBefore(card,section.firstChild);
 var style=doc.createElement('style');style.id='liteExerciseImportStyle';style.textContent=
 '#liteExerciseImportCard{border-left:4px solid #ef2b2d}' +
 '#liteExerciseImportCard button{min-height:60px;font-size:18px}' +
 '#liteExerciseImportCard select{min-height:54px;font-size:17px}' +
 '#liteExerciseMapping{display:-webkit-flex;display:flex;-webkit-flex-wrap:wrap;flex-wrap:wrap;gap:8px}' +
 '#liteExerciseMapping label{flex:1 1 42%;min-width:190px}' +
 '.liteExerciseRow{display:-webkit-flex;display:flex;gap:12px;align-items:flex-start;padding:10px;border:1px solid #333;background:#111;border-radius:12px;margin:7px 0}' +
 '.liteExerciseRow input[type=checkbox]{width:28px;height:28px;min-width:28px}' +
 '.liteExerciseDetail{flex:1 1 auto;min-width:0}.liteExerciseDetail b{font-size:17px}' +
 '.liteExercisePhotos{display:-webkit-flex;display:flex;gap:10px;margin:8px 0}' +
 '.liteExercisePhotos img{width:100px;height:90px;object-fit:contain;background:#080808;border-radius:8px}' +
 '#liteExerciseImportPreview details{margin:12px 0;padding:12px;background:#101010;border:1px solid #333;border-radius:12px}' +
 '#liteExerciseImportPreview summary{font-size:18px;min-height:38px;color:#fff}';
 doc.head.appendChild(style);
 $('liteExercisePick').onclick=function(){
  if(loadBusy||isTraining()){status('Nie można importować w trakcie treningu.');return;}
  if(!window.LiteBridge||typeof LiteBridge.importExercisePackage!=='function'){
   status('Import z pliku wymaga Trenera 2 Lite 0.3.6 lub nowszego.');return;
  }
  loadBusy=true;status('Wybierz plik .xlsx, .csv lub .zip w oknie Androida.');
  LiteBridge.importExercisePackage();
 };
 $('liteExerciseCommit').onclick=submit;
 $('liteExerciseCancel').onclick=function(){pkg=null;result=null;loadBusy=false;
  $('liteExerciseImportPreview').classList.add('hidden');status('Anulowano — niczego nie zmieniono.');};
}
function boot(){install();setTimeout(install,250);}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot);
else boot();
window.TrenerLiteExerciseImport={receive:receive,error:error};
})();
