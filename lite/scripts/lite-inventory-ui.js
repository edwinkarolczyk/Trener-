(function(){
'use strict';
// Oddzielny katalog sprzętu dla Lite. Nie modyfikuje historii ani starego katalogu Trenera 2.
var core=window.TrenerLiteInventoryCore;
if(!core)return;
var KEY='trainer3.lite.inventory.v034';
var CHOICE='trainer3.lite.inventory.exercise.v034';
var doc=document,activeExercise='',activePerson='',lastInfo='',drafts={};
function $(id){return doc.getElementById(id);}
function esc(s){return String(s===null||s===undefined?'':s).replace(/[&<>"']/g,function(c){
 return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
});}
function fmt(n){return Number(n).toLocaleString('pl-PL',{maximumFractionDigits:3});}
function uid(prefix){return prefix+String(Date.now())+String(Math.floor(Math.random()*1e6));}
function raw(k,f){try{var x=JSON.parse(localStorage.getItem(k)||'null');return x===null?f:x;}catch(e){return f;}}
function load(){var x=raw(KEY,{version:1,bars:[],plates:[]});try{return core.validate(x);}
 catch(e){notify('Nieprawidłowy katalog — nie nadpisano go. '+e.message);return {version:1,bars:[],plates:[]};}}
function notify(msg){var p=$('liteInvMessage');if(p)p.textContent=msg;}
function choices(){var x=raw(CHOICE,{});return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}
function selected(){return choices()[activeExercise]||{};}
function save(inv){var value=core.validate(inv);localStorage.setItem(KEY,JSON.stringify(value));return value;}
function fields(entry,type){
 var bar=type==='bars',diam=entry.diameter===null||entry.diameter===undefined?'':entry.diameter;
 return '<div class="liteInvRow" data-id="'+esc(entry.id)+'" data-kind="'+type+'">'+
  '<div class="liteInvRowTitle">'+(bar?(entry.type==='dumbbell'?'GRYF HANTLI':entry.type==='barbell'?'GRYF SZTANGI':'HANTLA STAŁA'):'TALERZE')+
  ' <button type="button" class="secondary liteInvDelete">USUŃ</button></div>'+
  '<label>Nazwa<input class="liteInvName" maxlength="60" value="'+esc(entry.name)+'"></label>'+
  (bar?'<label>Typ<select class="liteInvType"><option value="dumbbell"'+(entry.type==='dumbbell'?' selected':'')+'>Gryf hantli</option>'+
   '<option value="barbell"'+(entry.type==='barbell'?' selected':'')+'>Gryf sztangi</option>'+
   '<option value="fixed"'+(entry.type==='fixed'?' selected':'')+'>Hantla stała</option></select></label>':'')+
  '<div class="liteInvFields"><label>Masa 1 szt. [kg]<input class="liteInvKg" type="number" min="0.1" max="1000" step="0.125" inputmode="decimal" value="'+esc(entry.kg)+'"></label>'+
  '<label>Liczba sztuk<input class="liteInvCount" type="number" min="1" max="300" step="1" value="'+esc(entry.count)+'"></label>'+
  '<label>Średnica [mm] (opcjonalnie)<input class="liteInvDiameter" type="number" min="10" max="60" step="1" placeholder="np. 30" value="'+esc(diam)+'"></label>'+
  (bar?'<label>Limit na gryf [kg] (opcjonalnie)<input class="liteInvMax" type="number" min="0.1" max="1000" step="0.125" placeholder="wg producenta" value="'+esc(entry.maxKg===null?'':entry.maxKg)+'"></label>':'')+
  '</div></div>';
}
function render(){
 var box=$('liteInvList');if(!box)return;
 var inv=load();
 box.innerHTML=inv.bars.map(function(b){return fields(b,'bars');}).concat(
  inv.plates.map(function(p){return fields(p,'plates');})).join('');
 if(!inv.bars.length&&!inv.plates.length)
   box.innerHTML='<p class="hint">Katalog jest pusty. Dodaj swoje gryfy i talerze — niczego nie zakładamy z góry.</p>';
 Array.from(box.querySelectorAll('.liteInvDelete')).forEach(function(button){
  button.onclick=function(){
   var row=button.closest('.liteInvRow'),id=row.getAttribute('data-id');
   if(drafts[id]){delete drafts[id];row.parentNode.removeChild(row);return;}
   if(!confirm('Usunąć tę pozycję ze sprzętu? Historia treningów pozostanie bez zmian.'))return;
   var inv=load();inv.bars=inv.bars.filter(function(x){return x.id!==id;});
   inv.plates=inv.plates.filter(function(x){return x.id!==id;});
   try{save(inv);render();renderBarSelection();showResult();notify('Pozycja usunięta.');}
   catch(e){notify('Nie udało się usunąć: '+e.message);}
  };
 });
}
function fromDom(){
 var current=load(),bars=[],plates=[];
 Array.from(doc.querySelectorAll('#liteInvList .liteInvRow')).forEach(function(row){
  var id=row.getAttribute('data-id'),kind=row.getAttribute('data-kind');
  var source=(kind==='bars'?current.bars:current.plates).filter(function(x){return x.id===id;})[0]||drafts[id];
  if(!source)throw Error('Nieznana pozycja katalogu.');
  var base={id:id,name:row.querySelector('.liteInvName').value.trim(),
    kg:Number(String(row.querySelector('.liteInvKg').value).replace(',','.')),
    count:Number(row.querySelector('.liteInvCount').value),
    diameter:row.querySelector('.liteInvDiameter').value||null};
  if(kind==='bars'){base.type=row.querySelector('.liteInvType').value;
   base.maxKg=row.querySelector('.liteInvMax').value||null;bars.push(base);
  }else plates.push(base);
 });
 return {version:1,bars:bars,plates:plates};
}
function add(type){
 var newId=uid(type==='bars'?'gryf-':'talerz-');
 // Żadnych domyślnie zgadywanych mas. Wpis jest tylko wersją roboczą do ZAPISZ.
 var entry=type==='bars'?
  {id:newId,name:'Nowy gryf',type:'dumbbell',kg:'',count:'',diameter:null,maxKg:null}:
  {id:newId,name:'Talerze',kg:'',count:'',diameter:null};
 drafts[newId]=entry;
 var list=$('liteInvList');
 if(!list)return;
 if(!list.querySelector('.liteInvRow'))list.innerHTML='';
 list.insertAdjacentHTML('beforeend',fields(entry,type));
 var row=list.querySelector('.liteInvRow[data-id="'+newId+'"]');
 if(row)row.querySelector('.liteInvDelete').onclick=function(){
  delete drafts[newId];row.parentNode.removeChild(row);
  notify('Nie zapisano nowego elementu. Dotychczasowy sprzęt bez zmian.');
 };
 notify('Nowy element nie jest jeszcze zapisany. Wpisz rzeczywistą masę i liczbę sztuk, następnie ZAPISZ MÓJ SPRZĘT.');
}
function installSettings(){
 var settings=$('settings');if(!settings||$('liteInvCard'))return;
 var card=doc.createElement('div');card.className='card';card.id='liteInvCard';
 card.innerHTML='<div class="eyebrow">TRENER 2 LITE • MÓJ SPRZĘT</div>'+
  '<h2>Gryfy i talerze</h2>'+
  '<p class="hint">Wpisuj <b>liczbę pojedynczych sztuk</b>, nie par. Dwa gryfy hantli to „2 sztuki”. Masa gryfu jest liczona osobno. Nie dodajemy sprzętu automatycznie.</p>'+
  '<div class="liteInvButtons"><button type="button" id="liteInvAddBar" class="secondary">+ GRYF / HANTLA</button>'+
  '<button type="button" id="liteInvAddPlate" class="secondary">+ TALERZE</button></div>'+
  '<div id="liteInvList"></div>'+
  '<button type="button" id="liteInvSave" class="primary bigBtn">ZAPISZ MÓJ SPRZĘT</button>'+
  '<p class="hint">Talerze rozkładamy symetrycznie. Przy dwóch hantlach liczymy łącznie wszystkie dostępne talerze. Średnice i limity sprawdzamy, jeśli są podane.</p>'+
  '<p class="hint">Dotychczasowy rejestr sprzętu pełnego Trenera 2 nie jest nadpisywany. Nowy katalog Lite jest dołączany do kompletnej kopii JSON.</p>'+
  '<p id="liteInvMessage" class="hint" aria-live="polite"></p>';
 settings.insertBefore(card,settings.firstChild);
 $('liteInvAddBar').onclick=function(){add('bars');};
 $('liteInvAddPlate').onclick=function(){add('plates');};
 $('liteInvSave').onclick=function(){
  try{var data=save(fromDom());drafts={};render();renderBarSelection();showResult();
   notify('Sprzęt zapisany: '+data.bars.length+' rodzajów gryfów i '+data.plates.length+' rodzajów talerzy.');}
  catch(e){notify('Nie zapisano sprzętu: '+e.message);}
 };
 render();
}
function currentEx(){
 try{if(typeof currentPlan!=='undefined'&&typeof exIdx!=='undefined'&&currentPlan&&currentPlan.ex)
   return currentPlan.ex[exIdx]||null;}catch(e){}
 return null;
}
function exerciseId(ex){return String(ex&&(ex.id||ex.n||ex.name)||'').slice(0,120);}
function heuristic(ex){
 var name=String(ex&&(ex.n||ex.name)||'').toLowerCase();
 if(/hantl|sztangiel/.test(name))return /jednorą|jedną|jednorę|jednoracz|jednorącz|pojedyncz/.test(name)?'dumbbell-one':'dumbbell-pair';
 if(/sztang|martwy ciąg|przysiad ze sztang|ławce|wyciskanie leżąc/.test(name))return 'barbell';
 return '';
}
function types(){
 return [
  ['','Wybierz rodzaj sprzętu'],
  ['dumbbell-pair','Dwie identyczne sztangielki'],
  ['dumbbell-one','Jedna sztangielka'],
  ['barbell','Sztanga'],
  ['fixed-pair','Dwie hantle stałe'],
  ['fixed-one','Jedna hantla stała']
 ];
}
function barKind(kind){return kind.indexOf('fixed')===0?'fixed':kind==='barbell'?'barbell':'dumbbell';}
function renderBarSelection(){
 var sel=$('liteInvBar'),kind=$('liteInvMode');if(!sel||!kind)return;
 var inv=load(),type=barKind(kind.value||'');
 var current=selected(),value=sel.value||current.barId||'';
 var wanted=kind.value==='dumbbell-pair'||kind.value==='fixed-pair'?2:1;
 var options=inv.bars.filter(function(b){return b.type===type&&b.count>=wanted;});
 sel.innerHTML='<option value="">Dobierz dowolny zgodny gryf</option>'+
  options.map(function(b){return '<option value="'+esc(b.id)+'">'+esc(b.name)+' • '+fmt(b.kg)+' kg • '+b.count+' szt.</option>';}).join('');
 if(options.some(function(x){return x.id===value;}))sel.value=value;
}
function setExercise(ex){
 var id=exerciseId(ex);if(!id)return;
 activeExercise=id;
 var settings=selected(),kind=settings.kind||heuristic(ex)||'';
 var mode=$('liteInvMode');
 if(mode){mode.value=kind;renderBarSelection();
  var bar=$('liteInvBar');if(bar&&settings.barId)bar.value=settings.barId;
 }
 showResult();
}
function persistChoice(){
 if(!activeExercise)return;
 var all=choices(),kind=$('liteInvMode').value;
 all[activeExercise]={kind:kind,barId:$('liteInvBar').value};
 try{localStorage.setItem(CHOICE,JSON.stringify(all));}
 catch(e){var box=$('liteInvStatus');if(box)box.textContent='Błąd zapisu wyboru gryfu: '+e.message;}
}
function getRequest(){
 var inv=load(),mode=$('liteInvMode'),bar=$('liteInvBar');
 var kind=mode&&mode.value||selected().kind||'',barId=bar&&bar.value||'';
 return {inventory:inv,kind:kind,barId:barId};
}
function showResult(){
 var box=$('liteInvStatus');if(!box)return;
 var req=getRequest(),weight=Number(String($('weight')&&$('weight').value||'').replace(',','.'));
 if(!req.inventory.bars.length){
  box.textContent='Dodaj gryfy i talerze w Ustawieniach, żeby Trener mógł sprawdzać ciężary.';return;
 }
 if(!req.kind){box.textContent='Wybierz rodzaj sprzętu do ćwiczenia. Nie zakładamy automatycznie, że to sztanga lub para hantli.';return;}
 if(!weight||weight<0){box.textContent='Wpisz proponowany ciężar — pokażę, jak go złożyć.';return;}
 try{
  var r=core.recommend(req.inventory,req.kind,req.barId,weight);
  if(!r.possible){box.textContent='NIE MOŻNA ZŁOŻYĆ: '+r.reason;return;}
  lastInfo=r;
  box.innerHTML='<b>'+(r.exact?'MOŻLIWY CIĘŻAR: ':'NAJBLIŻSZY NIEPRZEKRACZAJĄCY CELU: ')+fmt(r.total)+' kg</b>'+
   '<div>'+esc(core.layout(r))+'</div>'+
   (!r.exact?'<div class="liteInvWarning">Cel '+fmt(weight)+' kg jest niewykonalny z wpisanego sprzętu.</div>':'')+
   '<div>Maksimum z dostępnych elementów: '+fmt(r.maximum)+' kg'+(r.pair?' na hantlę':'')+'</div>'+
   (r.diameterUnknown||r.maxUnknown?'<div class="liteInvWarning">Średnica lub nośność nie jest potwierdzona — sprawdź sprzęt przed założeniem.</div>':'');
 }catch(e){box.textContent='Nie udało się obliczyć obciążenia: '+e.message;}
}
function installWorkout(){
 var input=$('training')&&$('training').querySelector('.inputs');
 if(!input||$('liteInvWorkout'))return;
 var panel=doc.createElement('div');panel.id='liteInvWorkout';panel.className='liteInvWorkout';
 panel.innerHTML='<div class="eyebrow">MÓJ SPRZĘT • DOBÓR OBCIĄŻENIA</div>'+
  '<label>Sprzęt dla ćwiczenia</label><select id="liteInvMode">'+types().map(function(a){
   return '<option value="'+a[0]+'">'+a[1]+'</option>';}).join('')+'</select>'+
  '<label>Dostępny gryf / hantle</label><select id="liteInvBar"></select>'+
  '<div id="liteInvStatus" aria-live="polite">Wybierz sprzęt.</div>'+
  '<button type="button" id="liteInvApply" class="secondary">USTAW NAJBLIŻSZY MOŻLIWY CIĘŻAR</button>';
 input.insertAdjacentElement('afterend',panel);
 $('liteInvMode').onchange=function(){renderBarSelection();persistChoice();showResult();};
 $('liteInvBar').onchange=function(){persistChoice();showResult();};
 $('liteInvApply').onclick=function(){
  var kg=Number(String($('weight').value||'').replace(',','.'));
  try{
   var req=getRequest(),result=core.recommend(req.inventory,req.kind,req.barId,kg);
   if(!result.possible){showResult();return;}
   $('weight').value=String(result.total);showResult();
  }catch(e){showResult();}
 };
 $('weight')&&$('weight').addEventListener('input',showResult);
 setExercise(currentEx());
}
function onGroupTurn(person,ex,proposal,previous){
 if(!person||!ex)return proposal;
 activePerson=String(person.id||'');
 installWorkout();setExercise(ex);
 var target=previous!==undefined&&previous!==null?Number(previous):Number(proposal);
 var req=getRequest();
 if(!req.inventory.bars.length||!isFinite(target)||target<=0)return proposal;
 if(!req.kind)return null; // skonfigurowany katalog: bez rodzaju sprzętu nie zgadujemy wartości
 try{
  var r=core.recommend(req.inventory,req.kind,req.barId,target);
  if(!r.possible)return null; // nie wstawiaj automatycznie niewykonalnej propozycji
  return r.total;
 }catch(e){return null;}
}
function snapshot(kg){
 var ex=currentEx(),req=getRequest(),result=null;
 var target=Number(kg);
 if(req.kind&&req.inventory.bars.length&&isFinite(target)&&target>0){
  try{result=core.recommend(req.inventory,req.kind,req.barId,target);}catch(e){}
 }
 return {version:1,exerciseId:exerciseId(ex),kind:req.kind||'',
  barId:result&&result.possible?result.barId:req.barId||'',
  barName:result&&result.possible?result.barName:'',
  targetKg:target,verified:!!(result&&result.possible&&result.exact),
  actualKg:target,side:result&&result.possible&&result.exact?
   result.side.map(function(x){return {kg:x.kg,count:x.count};}):[],
  diameterUnknown:!!(result&&result.diameterUnknown),
  maxUnknown:!!(result&&result.maxUnknown)};
}
function installCss(){
 var style=doc.createElement('style');style.id='liteInvCss';style.textContent=
  '#liteInvCard{border-left:4px solid #ef2b2d}#liteInvCard button,#liteInvWorkout button{min-height:58px;font-size:17px}' +
  '#liteInvCard input,#liteInvCard select,#liteInvWorkout select{width:100%;min-height:56px;font-size:18px}' +
  '.liteInvButtons{display:flex;gap:8px;flex-wrap:wrap}.liteInvButtons button{flex:1 1 42%}' +
  '.liteInvRow{border:1px solid #373737;border-radius:12px;padding:12px;margin:12px 0;background:#111}' +
  '.liteInvRowTitle{display:flex;justify-content:space-between;align-items:center;font-weight:bold;color:#ff9fa0}' +
  '.liteInvRowTitle button{min-height:44px!important}' +
  '.liteInvFields{display:flex;gap:10px;flex-wrap:wrap}.liteInvFields label{flex:1 1 40%;min-width:135px}' +
  '#liteInvWorkout{border:1px solid #413537;border-left:4px solid #ef2b2d;border-radius:12px;padding:14px;margin:12px 0;background:#130e0f}' +
  '#liteInvWorkout label{display:block;margin:10px 0 4px}' +
  '#liteInvStatus{line-height:1.55;padding:12px 0;font-size:16px}' +
  '.liteInvWarning{color:#ffd269;margin:6px 0}';
 doc.head.appendChild(style);
}
function init(){
 if(!$('liteInvCss'))installCss();
 installSettings();installWorkout();
 // W standardowym treningu starego silnika zmienia się indeks ćwiczenia;
 // kontroluj wyłącznie zmianę ćwiczenia, nie przestawiaj formularza w trakcie wpisywania.
 var last='';
 setInterval(function(){
  if(!$('liteInvWorkout'))installWorkout();
  var ex=currentEx(),id=exerciseId(ex);
  if(id&&id!==last){last=id;setExercise(ex);}
 },1200);
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);
else init();
window.TrenerLiteInventory={load:load,onGroupTurn:onGroupTurn,showResult:showResult,setExercise:setExercise,snapshot:snapshot};
})();
