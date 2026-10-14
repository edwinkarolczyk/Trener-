(function(){
'use strict';
// Bezpieczny import: podgląd -> wybór zakresu -> potwierdzenie -> scalenie z rollbackiem.
var core=window.TrenerLiteDataCore;
if(!core)return;
var current=null,pending=null,personMap=[];
function $(id){return document.getElementById(id);}
function esc(x){return String(x===undefined||x===null?'':x).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
});}
function msg(s){var o=$('liteDataMessage');if(o)o.textContent=s;}
function backupSnapshot(){
  var out={};
  for(var i=0;i<localStorage.length;i++){
    var k=localStorage.key(i);
    if(k)out[k]=localStorage.getItem(k);
  }
  return out;
}
function parse(raw){return typeof raw==='string'?JSON.parse(raw):raw;}
function people(data){
  var map={};function add(id,name){
    var key=String(id||'');if(!key)return;
    if(!map[key])map[key]=String(name||key);
  }
  var src=core.source(data);
  var arr=src.storage['trainer3.history'];
  if(arr){
    JSON.parse(arr).forEach(function(h){
      if(!h||!Array.isArray(h.records))return;
      var members=h.onePhone&&h.onePhone.participants||h.group&&h.group.participants;
      if(Array.isArray(members))members.forEach(function(p){add(p.id||p.deviceId,p.name);});
      if(h.participantId)add(h.participantId,h.names&&h.names[h.localAthlete||0]);
      h.records.forEach(function(r){if(r.participantId)add(r.participantId,'');});
    });
  }
  var ids=Object.keys(map).sort(function(a,b){return map[a].localeCompare(map[b],'pl');});
  return ids.map(function(id){return {id:id,name:map[id]};});
}
function isRunning(){
  try{if(window.TrenerOnePhone086&&window.TrenerOnePhone086.active)return true;}catch(e){}
  var t=$('training');
  return !!t&&!t.classList.contains('hidden');
}
function preview(raw){
  if(isRunning()){msg('Najpierw zakończ albo bezpiecznie zapisz aktualną sesję. Import jest zablokowany w trakcie treningu.');return false;}
  try{
    var parsed=parse(raw);
    var found=people(parsed);
    // Zidentyfikuj zawartość bez modyfikacji lokalnej pamięci.
    core.prepare(parsed,backupSnapshot(),'all','');
    current=parsed;personMap=found;
    var select=$('liteDataPerson');
    if(select)select.innerHTML=found.map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.name)+' — '+esc(p.id)+'</option>';}).join('');
    $('liteDataMode').value='all';$('liteDataPersonRow').classList.add('hidden');
    $('liteDataPreview').classList.remove('hidden');
    msg('Plik wczytany do podglądu. Niczego jeszcze nie zmieniono.');
    updatePreview();return true;
  }catch(e){current=null;msg('Odmowa importu: '+String(e.message||e));return false;}
}
function updatePreview(){
  if(!current)return;
  try{
    var mode=$('liteDataMode').value,select=$('liteDataPerson'),personId=mode==='person'?select.value:'';
    $('liteDataPersonRow').classList.toggle('hidden',mode!=='person');
    if(mode==='person'&&!personId)throw Error('W kopii nie ma jednoznacznie oznaczonych profili. Wybierz całą kopię.');
    pending=core.prepare(current,backupSnapshot(),mode,personId);
    var s=pending.stats;
    $('liteDataStats').innerHTML='<div class="liteDataSummary">'+
      '<b>Nowe treningi: '+s.historyAdded+'</b>'+
      '<span>Powtórzenia pominięte: '+s.historyDuplicate+'</span>'+
      '<span>Konflikty identyfikatorów (zachowano obecne): '+s.historyConflict+'</span>'+
      '<span>Sesje bez jednoznacznej osoby / wadliwe: '+s.historySkipped+'</span>'+
      '<span>Inne nowe dane: '+s.otherImported+' • rekordy: '+s.recordsAdded+'</span>'+
      '<span>Inne klucze pozostawione bez zmian: '+s.otherSkipped+'</span>'+
      '</div><p class="hint">Istniejące plany i ustawienia mają pierwszeństwo. Nowe klucze, zdjęcia i treningi są dodawane. Konflikty nie są cicho nadpisywane.</p>';
    $('liteDataMerge').disabled=pending.keyCount===0;
  }catch(e){
    pending=null;$('liteDataMerge').disabled=true;
    $('liteDataStats').textContent='Błąd podglądu: '+String(e.message||e);
  }
}
function apply(){
  if(isRunning()){msg('Import zablokowany: aktywny trening.');return;}
  if(!current||!pending)return;
  // Przelicz plan tuż przed potwierdzeniem — bez korzystania z przeterminowanego snapshotu.
  updatePreview();if(!pending)return;
  var s=pending.stats,question='Dodać '+s.historyAdded+' treningów i '+s.otherImported+' innych danych?\n'+
    'Istniejące dane pozostaną bez zmian.\n'+
    'Konfliktów: '+s.historyConflict+'.';
  if(!window.confirm(question))return;
  var result=core.apply(localStorage,pending);
  if(!result.ok){
    msg(result.recovered?'Błąd zapisu. Przywrócono wszystkie poprzednie dane.':
      'KRYTYCZNY BŁĄD ODTWARZANIA. Nie zamykaj aplikacji; wykonaj kopię danych. '+result.error);
    return;
  }
  msg('Scalono dane. Dodano '+s.historyAdded+' treningów. Odświeżam historię…');
  current=null;pending=null;$('liteDataPreview').classList.add('hidden');
  // Dotychczasowe historię przelicza pełny silnik po bezpiecznym odświeżeniu UI.
  setTimeout(function(){window.location.reload();},400);
}
function install(){
  var settings=$('settings');if(!settings||$('liteDataTools'))return;
  var block=document.createElement('div');block.id='liteDataTools';block.className='card';
  block.innerHTML='<div class="eyebrow">TRENER 2 LITE • OCHRONA DANYCH</div>'+
    '<h2>Bezpieczna kopia i przywracanie</h2>'+
    '<p class="hint">Eksport zapisuje treningi, zdjęcia, ustawienia oraz — jeśli istnieje — archiwalną bazę SQLite starego Lite. Kopię zapisz poza tabletem.</p>'+
    '<button type="button" class="primary" id="liteDataExport">EKSPORTUJ KOMPLETNĄ KOPIĘ JSON</button>'+
    '<button type="button" class="secondary" id="liteDataImport">IMPORTUJ Z PODGLĄDEM I SCALANIEM</button>'+
    '<div id="liteDataPreview" class="hidden">'+
    '<label>Zakres importu</label><select id="liteDataMode">'+
    '<option value="all">Cała kopia — dodaj brakujące dane</option>'+
    '<option value="person">Tylko jedna wybrana osoba</option></select>'+
    '<div id="liteDataPersonRow" class="hidden"><label>Uczestnik z kopii</label><select id="liteDataPerson"></select></div>'+
    '<div id="liteDataStats" aria-live="polite"></div>'+
    '<button type="button" class="primary" id="liteDataMerge">POTWIERDŹ SCALENIE</button>'+
    '<button type="button" class="secondary" id="liteDataCancel">ANULUJ</button>'+
    '</div><p id="liteDataMessage" class="hint" aria-live="polite">Dane z aktualnej instalacji mają pierwszeństwo. Import nie zastępuje ich automatycznie.</p>'+
    '<p class="hint">Ważne: import nie odtwarza osobno oryginalnego pliku SQLite; zachowuje go jako część kopii i przenosi rozpoznane sesje do historii treningowej.</p>';
  settings.insertBefore(block,settings.firstChild);
  var css=document.createElement('style');css.textContent=
    '#liteDataTools{border-left:4px solid #ef2b2d}#liteDataTools button{width:100%;margin-top:9px;min-height:60px;font-size:17px}' +
    '#liteDataTools select{width:100%;min-height:56px;font-size:18px}'+
    '#liteDataTools label{display:block;margin:12px 0 6px}'+
    '.liteDataSummary{margin:12px 0;background:#101010;border:1px solid #353535;border-radius:10px;padding:12px}'+
    '.liteDataSummary>*{display:block;margin:6px 0}';
  document.head.appendChild(css);
  $('liteDataExport').onclick=function(){
    try{if(window.TrenerBackup&&window.TrenerBackup.exportNow)window.TrenerBackup.exportNow();
      else msg('Eksport niedostępny. Ponów próbę po uruchomieniu wszystkich modułów.');
    }catch(e){msg('Błąd eksportu: '+e.message);}
  };
  $('liteDataImport').onclick=function(){
    if(isRunning()){msg('Zakończ sesję przed importem.');return;}
    if(window.LiteBridge&&LiteBridge.importBackup)LiteBridge.importBackup();
    else msg('Nie udało się uruchomić wyboru pliku.');
  };
  $('liteDataMode').onchange=updatePreview;
  $('liteDataPerson').onchange=updatePreview;
  $('liteDataMerge').onclick=apply;
  $('liteDataCancel').onclick=function(){current=null;pending=null;$('liteDataPreview').classList.add('hidden');msg('Import anulowany — nie zmieniono danych.');};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
else install();
window.TrenerLiteData={previewImport:preview,previewRefresh:updatePreview};
})();
