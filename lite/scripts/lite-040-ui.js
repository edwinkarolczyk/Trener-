(function(){
'use strict';
// Warstwa interfejsu Lite 0.4.0. Nie nadpisuje oryginalnych sesji ani kluczy profili.
var doc=document,core=window.TrenerLite040Core;
if(!core)return;
var PROFILE_KEY='trainer3.lite.profiles.v037',WEEK_KEY='trainer3.lite.week.v040',
 PENDING='trainer3.onePhone.pending.v086',AVATARS='trainer3.lite.avatar.v040',
 KEEP='trainer3.lite.screen.keep.v040',VIDEO='trainer3.lite.videos.v040';
var shown='start',signature='',startDate='',historyMode='mine',historyPerson='',manualPlan=false;
function $(id){return doc.getElementById(id);}
function esc(s){return String(s===undefined||s===null?'':s).replace(/[&<>"']/g,function(c){
 return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function read(key,fallback){return core.parse(localStorage.getItem(key),fallback);}
function write(key,data){localStorage.setItem(key,JSON.stringify(data));}
function make(tag,cls,text){var e=doc.createElement(tag);if(cls)e.className=cls;
 if(text!==undefined)e.textContent=text;return e;}
function message(text){var el=$('lite040Message');if(el)el.textContent=text;}
function people(){try{return window.TrenerLiteProfiles?TrenerLiteProfiles.list():[];}catch(e){message('Nie można odczytać profili: '+e.message);return [];}}
function selected(){try{return window.TrenerLiteProfiles?TrenerLiteProfiles.selectedRoster():[];}catch(e){return [];}}
function active(){return !!(window.TrenerOnePhone086&&TrenerOnePhone086.active);}
function toStart(){var tab=doc.querySelector('.tab[data-tab="start"]');if(tab)tab.click();}
function pending(){var p=read(PENDING,null);return p&&Array.isArray(p.participants)&&p.participants.length>=1&&p.plan&&p.plan.ex&&p.plan.ex.length?p:null;}
function optionHtml(value,label){return '<option value="'+esc(value)+'">'+esc(label)+'</option>';}
function plans(){
 var el=$('planSelect'),a=[];
 if(!el)return a;
 Array.prototype.forEach.call(el.options,function(o){if(!o.disabled)a.push({value:o.value,label:o.textContent});});
 return a;
}
function personLabel(id){return (people().filter(function(p){return p.id===id;})[0]||{}).name||'Uczestnik';}
function avatar(id,name){
 var data=read(AVATARS,{}),photo=data[id];
 if(photo&&/^data:image\/(?:jpeg|png|webp);base64,/i.test(photo))
  return '<img src="'+esc(photo)+'" alt="Awatar '+esc(name)+'">';
 return '<span class="lite040Initial">'+esc((name||'?').charAt(0).toUpperCase())+'</span>';
}
function pickedIds(){return selected().map(function(p){return p.id;});}
function setIds(ids){
 if(active()){message('Nie zmieniaj osób w trakcie treningu.');return;}
 try{TrenerLiteProfiles.select(ids);manualPlan=false;drawStart(true);}catch(e){message('Nie zmieniono grupy: '+e.message);}
}
function insertStart(){
 if($('lite040Start')||!$('setup'))return;
 var setup=$('setup'),header=make('div','lite040Start');
 header.id='lite040Start';
 header.innerHTML='<div id="lite040ResumeBox" class="hidden"><button type="button" id="lite040Resume" class="lite040Resume">WZNÓW NIEDOKOŃCZONY TRENING</button></div>'+
 '<h2>Start • wybierz uczestników</h2><div id="lite040People" class="lite040People"></div>'+
 '<div class="lite040Add"><button type="button" class="secondary" id="lite040Add">+ DODAJ OSOBĘ</button>'+
 '<input type="file" accept="image/*" id="lite040Photo" class="hidden" aria-label="Zdjęcie profilu"></div>'+
 '<details id="lite040Last"><summary>Ostatni trening wybranej osoby</summary><div id="lite040LastInfo" class="hint"></div></details>'+
 '<div class="lite040Plan"><label for="lite040Plan">Plan na dziś</label>'+
 '<select id="lite040Plan"></select><div id="lite040PlanInfo" class="hint"></div></div>'+
 '<p id="lite040Message" class="hint" role="status" aria-live="polite"></p>';
 setup.insertBefore(header,setup.firstChild);
 var last=make('details','lite040Options');last.id='lite040Options';
 last.innerHTML='<summary>Więcej opcji treningu</summary>';
 setup.appendChild(last);
 var v=$('v086Setup'),cols=setup.querySelector('.twoCols');
 if(v)last.appendChild(v);
 if(cols)last.appendChild(cols);
 var primary=$('lite040Plan');
 plans().forEach(function(p){primary.appendChild(new Option(p.label,p.value));});
 primary.onchange=function(){
  manualPlan=true;
  var source=$('planSelect');if(source){source.value=this.value;source.dispatchEvent(new Event('change'));}
 };
 $('lite040Resume').onclick=function(){var button=$('v086Resume');if(button)button.click();
  else message('Nie można wznowić: moduł treningu nie odpowiada.');};
 $('lite040Add').onclick=function(){
  if(active()){message('Profilu nie można dodać w trakcie treningu.');return;}
  var name=prompt('Imię nowej osoby (maks. 40 znaków):','');
  if(name===null)return;
  if(!$('liteProfileNew')||!$('liteProfileAdd')){message('Moduł profili jeszcze się ładuje.');return;}
  $('liteProfileNew').value=name;
  $('liteProfileAdd').click();drawStart(true);
 };
 $('lite040Photo').onchange=function(e){
  var file=e.target.files&&e.target.files[0],id=this.getAttribute('data-for');
  if(!file||!id||!/^image\//.test(file.type)){message('Wybierz zdjęcie JPG lub PNG.');return;}
  if(file.size>8*1024*1024){message('Zdjęcie jest zbyt duże (maks. 8 MB).');return;}
  var reader=new FileReader();
  reader.onerror=function(){message('Nie udało się odczytać zdjęcia.');};
  reader.onload=function(){
   var image=new Image();
   image.onload=function(){
    try{
     var canvas=doc.createElement('canvas');canvas.width=96;canvas.height=96;
     var ctx=canvas.getContext('2d'),sz=Math.min(image.width,image.height);
     ctx.drawImage(image,(image.width-sz)/2,(image.height-sz)/2,sz,sz,0,0,96,96);
     var a=read(AVATARS,{});a[id]=canvas.toDataURL('image/jpeg',0.72);
     write(AVATARS,a);drawStart(true);message('Zapisano awatar profilu.');
    }catch(err){message('Nie zapisano zdjęcia: '+err.message);}
   };
   image.onerror=function(){message('Nieprawidłowe zdjęcie.');};
   image.src=reader.result;
  };
  reader.readAsDataURL(file);
  this.value='';
 };
}
function drawStart(force){
 if(!$('lite040People'))return;
 var all=people(),ids=pickedIds(),stamp=all.map(function(p){return p.id+':'+p.name+':'+!!p.locked;}).join('|')+
 '|'+ids.join('|'),date=new Date().toDateString();
 if(!force&&stamp===signature&&date===startDate){updateResume();return;}
 signature=stamp;startDate=date;
 var host=$('lite040People');host.innerHTML='';
 all.forEach(function(p){
  var on=ids.indexOf(p.id)!==-1,item=make('div','lite040Person'+(on?' isSelected':''));
  var btn=make('button','lite040PersonChoose');btn.type='button';btn.setAttribute('aria-pressed',on?'true':'false');
  btn.innerHTML=avatar(p.id,p.name)+'<b>'+esc(p.name)+'</b><small>'+(on?'WYBRANY':'WYBIERZ')+'</small>';
  btn.onclick=function(){
   var now=pickedIds(),index=now.indexOf(p.id);
   if(index>=0){if(now.length===1){message('Wybierz co najmniej jedną osobę.');return;}now.splice(index,1);}
   else{if(now.length>=6){message('Możesz wybrać maksymalnie 6 osób.');return;}now.push(p.id);}
   setIds(now);
  };
  var photo=make('button','lite040AvatarEdit','ZDJĘCIE');photo.type='button';
  photo.title='Ustaw zdjęcie lub awatar';photo.onclick=function(){
   if(active()){message('Zdjęcie ustaw po zakończeniu treningu.');return;}
   $('lite040Photo').setAttribute('data-for',p.id);$('lite040Photo').click();};
  item.appendChild(btn);item.appendChild(photo);host.appendChild(item);
 });
 var has=pending(),resume=$('lite040ResumeBox');resume.classList.toggle('hidden',!has||active());
 var hs=read('trainer3.history',[]),last=$('lite040LastInfo');
 last.textContent='Brak wcześniejszego treningu.';
 if(ids.length){
  var found=hs.filter(function(h){return core.includesPerson(h,ids[0]);})[0];
  if(found)last.textContent=personLabel(ids[0])+': '+(found.date||'')+' • '+(found.plan||'Trening');
 }
 applyDailyPlan();
}
function updateResume(){var box=$('lite040ResumeBox');if(box)box.classList.toggle('hidden',!pending()||active());}
function applyDailyPlan(){
 var ids=pickedIds(),schedule=read(WEEK_KEY,{}),today=new Date(),selectedPlans={},preset=plans();
 if(!ids.length||!preset.length)return;
 var first=core.dayPlan(schedule,ids[0],today);
 var valid=function(v){return preset.some(function(p){return p.value===v;});};
 var current=$('lite040Plan'),source=$('planSelect');
 if(first&&valid(first)&&!manualPlan){if(source)source.value=first;if(current)current.value=first;}
 else if(current&&source&&!manualPlan)current.value=source.value;
 var distinct=0;
 ids.forEach(function(id,index){
  var value=core.dayPlan(schedule,id,today);
  if(!valid(value))value=index===0?source.value:'';
  if(value)distinct++;
  selectedPlans[id]=value;
  if(index>0){
   var selector=$('v086Plan'+index);
   if(selector&&value&&valid(value))selector.value=value;
  }
 });
 var mode=$('v086PlanMode');if(mode&&ids.length>1)mode.value='individual';
 var info=$('lite040PlanInfo');
 if(info)info.textContent=distinct===ids.length?'Plany dobrane według tygodnia każdej osoby.':
  'Brak planu na dziś dla części osób — możesz ustawić tygodniowy plan w zakładce Plan.';
}
function installWeek(){
 var plan=$('plan');if(!plan||$('lite040Week'))return;
 var card=make('div','card');card.id='lite040Week';
 card.innerHTML='<div class="eyebrow">PLAN TYGODNIOWY</div><h2>Plany osobno dla każdego uczestnika</h2>'+
 '<label for="lite040WeekPerson">Uczestnik</label><select id="lite040WeekPerson"></select>'+
 '<div id="lite040WeekDays"></div><button type="button" class="primary" id="lite040WeekSave">ZAPISZ TYDZIEŃ</button>'+
 '<p class="hint" id="lite040WeekMessage">Puste dni nie uruchamiają treningu automatycznie; plan można wybrać ręcznie.</p>';
 plan.insertBefore(card,plan.firstChild);
 $('lite040WeekPerson').onchange=renderWeekDays;
 $('lite040WeekSave').onclick=function(){
  try{
   var id=$('lite040WeekPerson').value;if(!id)return;
   var a=read(WEEK_KEY,{});a[id]=[];
   Array.prototype.forEach.call(card.querySelectorAll('.lite040WeekDay'),function(el,i){a[id][i]=el.value;});
   write(WEEK_KEY,a);manualPlan=false;applyDailyPlan();
   $('lite040WeekMessage').textContent='Plan tygodniowy zapisany dla '+personLabel(id)+'.';
  }catch(e){$('lite040WeekMessage').textContent='Nie zapisano planu: '+e.message;}
 };
 renderWeekPeople();
}
function renderWeekPeople(){
 var sel=$('lite040WeekPerson');if(!sel)return;
 var old=sel.value,all=people();
 sel.innerHTML=all.map(function(p){return optionHtml(p.id,p.name);}).join('');
 if(all.some(function(p){return p.id===old;}))sel.value=old;
 renderWeekDays();
}
function renderWeekDays(){
 var sel=$('lite040WeekPerson'),host=$('lite040WeekDays');
 if(!sel||!host)return;
 var days=['Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota','Niedziela'];
 var week=read(WEEK_KEY,{})[sel.value]||[],p=plans();
 host.innerHTML=days.map(function(day,i){
  return '<label>'+day+'<select class="lite040WeekDay" data-day="'+i+'">'+optionHtml('','Brak planu')+
   p.map(function(x){return optionHtml(x.value,x.label);}).join('')+'</select></label>';
 }).join('');
 Array.prototype.forEach.call(host.querySelectorAll('.lite040WeekDay'),function(el,i){el.value=week[i]||'';});
}
function installExercises(){
 var plan=$('plan'),nav=doc.querySelector('.tabs');if(!plan||!nav||$('exercises'))return;
 var screen=make('section','screen');screen.id='exercises';
 screen.innerHTML='<div class="card"><div class="eyebrow">MOJE ĆWICZENIA</div>'+
 '<h2>Biblioteka ćwiczeń</h2><div class="lite040LibraryActions">'+
 '<button type="button" id="lite040NewExercise" class="primary">+ DODAJ / EDYTUJ</button>'+
 '<label class="lite040ShowAll"><input type="checkbox" id="lite040AllExercise"> Pokaż wszystkie</label></div>'+
 '<p class="hint" id="lite040ExerciseCount"></p><div id="lite040Exercises"></div></div>';
 plan.parentNode.insertBefore(screen,plan.nextSibling);
 var btn=make('button','tab','Moje ćwiczenia');btn.type='button';btn.setAttribute('data-tab','exercises');
 var history=doc.querySelector('.tab[data-tab="history"]');
 nav.insertBefore(btn,history);
 btn.onclick=function(){
  if(active())return;
  // Reużyj funkcji showTab silnika bez zmiany listy starych ekranów.
  var planTab=doc.querySelector('.tab[data-tab="plan"]');if(planTab)planTab.click();
  Array.prototype.forEach.call(doc.querySelectorAll('.screen'),function(s){s.classList.remove('show');});
  screen.classList.add('show');
  Array.prototype.forEach.call(doc.querySelectorAll('.tab'),function(t){t.classList.toggle('active',t===btn);});
  shown='exercises';renderExercises();
 };
 $('lite040NewExercise').onclick=function(){
  if(window.TrenerCustomExerciseUi094)TrenerCustomExerciseUi094.open();
  else message('Biblioteka ćwiczeń jeszcze się uruchamia.');
 };
 $('lite040AllExercise').onchange=renderExercises;
 var importer=$('liteExerciseImportCard');if(importer)screen.appendChild(importer);
 var old=$('v094Open');if(old)old.style.display='none';
}
function library(){
 var all=[];
 try{if(typeof exerciseLibrary!=='undefined')all=exerciseLibrary.slice();}catch(e){}
 try{if(window.TrenerCustomExercises094)all=all.concat(TrenerCustomExercises094.list());}catch(e){}
 return all;
}
function renderExercises(){
 var host=$('lite040Exercises');if(!host)return;
 var inv=null;try{inv=TrenerLiteInventory.load();}catch(e){}
 var showAll=$('lite040AllExercise').checked;
 var items=library().filter(function(ex){return core.matchesEquipment(ex,inv,showAll);});
 var count=$('lite040ExerciseCount');
 if(count)count.textContent='Widoczne ćwiczenia: '+items.length+' • kliknij, by zobaczyć pełną kartę.';
 host.innerHTML='';
 items.forEach(function(ex){
  var item=make('button','lite040Exercise');item.type='button';
  var img=ex.imageStart||ex.imageEnd;
  var name=ex.n||ex.name||'Ćwiczenie',group=ex.group||ex.equipment||'Trening';
  item.innerHTML=(img?'<img src="'+esc(img)+'" alt="">':'<span class="lite040ExerciseIcon">💪</span>')+
   '<span><b>'+esc(name)+'</b><small>'+esc(group)+'</small></span><span>›</span>';
  item.onclick=function(){openExercise(ex);};
  host.appendChild(item);
 });
}
function openExercise(ex){
 var shade=make('div','lite040Overlay');shade.id='lite040ExerciseDetail';
 var img=ex.imageStart||'',end=ex.imageEnd||'';
 var id=String(ex.id||ex.n||ex.name||''),video=read(VIDEO,{})[id]||ex.videoUrl||'';
 if(!/^(https:\/\/|data:video\/(?:mp4|webm);base64,)/i.test(video))video='';
 shade.innerHTML='<div class="lite040Dialog" role="dialog" aria-modal="true"><button type="button" id="lite040Close" class="secondary">ZAMKNIJ ×</button>'+
 '<h2>'+esc(ex.n||ex.name||'Ćwiczenie')+'</h2><p>'+esc(ex.group||ex.equipment||'')+'</p>'+
 (img?'<img src="'+esc(img)+'" alt="Pozycja startowa">':'')+
 '<p><b>Serie: </b>'+esc(ex.sets||'-')+' • <b>Powtórzenia: </b>'+esc(ex.min||'-')+'–'+esc(ex.max||'-')+'</p>'+
 '<p><b>Wykonanie:</b> '+esc(ex.movement||ex.tip||'Brak opisu.')+'</p>'+
 '<p><b>Pozycja początkowa:</b> '+esc(ex.setup||'—')+'</p>'+
 (end?'<img src="'+esc(end)+'" alt="Pozycja końcowa">':'')+
 '<p><b>Błędy:</b> '+esc(ex.mistake||'—')+'</p>'+
 '<p><b>Przerwa:</b> '+esc(ex.rest||'-')+' s</p>'+
 (video?'<video controls preload="none" src="'+esc(video)+'" style="display:block;width:100%;max-height:320px"></video>':'')+
 '<button id="lite040SetVideo" class="secondary" type="button">'+(video?'ZMIEŃ LINK DO FILMU':'DODAJ LINK DO KRÓTKIEGO FILMU')+'</button>'+
 '<button id="lite040PickVideo" class="secondary" type="button">WYBIERZ KRÓTKI FILM Z TABLETU</button>'+
 '<input id="lite040VideoFile" type="file" accept="video/mp4,video/webm" class="hidden">'+
 '<p class="hint">Filmy z linku wymagają Internetu. Mały film MP4/WebM do 512 KB zapiszesz offline w pełnej kopii JSON.</p></div>';
 doc.body.appendChild(shade);
 $('lite040Close').onclick=function(){shade.parentNode.removeChild(shade);};
 $('lite040SetVideo').onclick=function(){
  var url=prompt('Wklej link HTTPS do MP4/WebM (puste = usuń link):',/^https:\/\//i.test(video)?video:'');
  if(url===null)return;
  url=String(url).trim();
  if(url&&(!/^https:\/\//i.test(url)||url.length>1000)){alert('Wklej poprawny link HTTPS.');return;}
  try{var a=read(VIDEO,{});if(url)a[id]=url;else delete a[id];write(VIDEO,a);
   shade.parentNode.removeChild(shade);openExercise(ex);
  }catch(e){alert('Nie udało się zapisać linku: '+e.message);}
 };
 $('lite040PickVideo').onclick=function(){$('lite040VideoFile').click();};
 $('lite040VideoFile').onchange=function(){
  var file=this.files&&this.files[0];this.value='';
  if(!file)return;
  if(!/^video\/(mp4|webm)$/.test(file.type)){alert('Obsługiwane są tylko MP4 lub WebM.');return;}
  if(file.size>512*1024){alert('Film jest za duży. Wybierz krótki, skompresowany film do 512 KB.');return;}
  var reader=new FileReader();
  reader.onerror=function(){alert('Nie można odczytać filmu.');};
  reader.onload=function(){
   try{
    if(!/^data:video\/(mp4|webm);base64,/i.test(reader.result))throw Error('Nieprawidłowy format filmu.');
    var a=read(VIDEO,{});a[id]=reader.result;write(VIDEO,a);
    shade.parentNode.removeChild(shade);openExercise(ex);
   }catch(e){alert('Nie zapisano filmu (może brakować miejsca): '+e.message);}
  };
  reader.readAsDataURL(file);
 };
}
function installHistory(){
 var section=$('history'),target=$('historyContent');if(!section||!target||$('lite040History'))return;
 target.style.display='none';
 var block=make('div','lite040History');block.id='lite040History';
 block.innerHTML='<div class="lite040HistoryControls"><label>Osoba <select id="lite040HistoryPerson"></select></label>'+
 '<label>Widok <select id="lite040HistoryMode"><option value="mine">Moje treningi</option>'+
 '<option value="group">Wspólne treningi</option></select></label>'+
 '<label>Szukaj daty, osoby lub ćwiczenia<input id="lite040HistorySearch" type="search" placeholder="Wyszukaj..."></label></div>'+
 '<div id="lite040HistoryList"></div>';
 target.parentNode.insertBefore(block,target.nextSibling);
 $('lite040HistoryMode').onchange=function(){historyMode=this.value;renderHistory();};
 $('lite040HistoryPerson').onchange=function(){historyPerson=this.value;renderHistory();};
 $('lite040HistorySearch').oninput=renderHistory;
 block.addEventListener('toggle',function(e){
  var el=e.target;if(!el.open||!el.classList.contains('lite040HistoryItem'))return;
  Array.prototype.forEach.call(block.querySelectorAll('details.lite040HistoryItem'),function(d){if(d!==el)d.open=false;});
 },true);
 var tab=doc.querySelector('.tab[data-tab="history"]');
 if(tab)tab.addEventListener('click',function(){setTimeout(renderHistory,140);});
 renderHistory();
}
function renderHistory(){
 var host=$('lite040HistoryList'),person=$('lite040HistoryPerson');if(!host||!person)return;
 var all=people(),prior=historyPerson||person.value||'';
 person.innerHTML=optionHtml('','Wybierz profil')+all.map(function(p){return optionHtml(p.id,p.name);}).join('');
 if(all.some(function(p){return p.id===prior;}))person.value=prior;
 historyPerson=person.value;
 if(!historyPerson){host.textContent='Wybierz profil, aby zobaczyć jego treningi.';return;}
 var allHistory=read('trainer3.history',[]),
  filtered=core.filterHistory(allHistory,historyPerson,historyMode,$('lite040HistorySearch').value);
 host.innerHTML='';
 if(!filtered.length){host.textContent='Brak treningów dla wybranych filtrów.';return;}
 var best=core.bestRecords(allHistory,historyPerson);
 filtered.forEach(function(h){
  var isGroup=historyMode==='group',records=isGroup?(h.records||[]):core.recordsOf(h,historyPerson);
  var lines=records.map(function(r){
   var id=core.memberId(h,r),display=isGroup?personLabel(id)+' • ':'';
   var pr=core.bestRecords(allHistory,id),kg=Number(r.kg)||0;
   var idEx=String(r.id||r.name||'');
   var badge=kg>0&&pr[idEx]===kg?'<strong class="lite040Pr">PR</strong>':'';
   return '<div class="lite040HistoryRecord">'+esc(display+(r.name||r.id||'Ćwiczenie'))+
    ' • '+esc(kg||0)+' kg × '+esc(r.reps||0)+' '+badge+'</div>';
  }).join('');
  var item=make('details','lite040HistoryItem');
  item.innerHTML='<summary><b>'+esc(h.date||'Bez daty')+' • '+esc(h.plan||'Trening')+'</b>'+
   '<small>'+core.formatTime((h.duration||0)/60)+' • '+records.length+' serii'+
   (h.interrupted?' • przerwany':'')+'</small></summary>'+
   '<div class="lite040HistoryDetails">'+(lines||'<p>Brak serii.</p>')+'</div>';
  host.appendChild(item);
 });
}
function installProgress(){
 var section=$('progress');if(!section||$('lite040Progress'))return;
 var card=make('div','card');card.id='lite040Progress';
 card.innerHTML='<div class="eyebrow">PODSUMOWANIE WSZYSTKICH UCZESTNIKÓW</div>'+
 '<label>Osoba <select id="lite040ProgressPerson"><option value="">Wszyscy uczestnicy</option></select></label>'+
 '<div id="lite040ProgressRows"></div><details><summary>Statystyki szczegółowe</summary>'+
 '<p class="hint">Pełne wykresy i istniejące rekordy pozostają poniżej.</p></details>';
 section.insertBefore(card,section.firstChild);
 $('lite040ProgressPerson').onchange=renderProgress;
 var tab=doc.querySelector('.tab[data-tab="progress"]');
 if(tab)tab.addEventListener('click',function(){setTimeout(renderProgress,120);});
 renderProgress();
}
function renderProgress(){
 var sel=$('lite040ProgressPerson'),host=$('lite040ProgressRows');if(!sel||!host)return;
 var current=sel.value,users=people(),hs=read('trainer3.history',[]);
 sel.innerHTML=optionHtml('','Wszyscy uczestnicy')+users.map(function(p){return optionHtml(p.id,p.name);}).join('');
 sel.value=users.some(function(p){return p.id===current;})?current:'';
 host.innerHTML='';
 users.filter(function(p){return !sel.value||sel.value===p.id;}).forEach(function(p){
  var count=0,sets=0,volume=0;
  hs.forEach(function(h){var rows=core.recordsOf(h,p.id);if(rows.length)count++;
   rows.forEach(function(r){sets++;volume+=(Number(r.kg)||0)*(Number(r.reps)||0);});
  });
  var row=make('div','lite040ProgressPerson');
  row.innerHTML='<b>'+esc(p.name)+'</b><span>'+count+' treningów • '+sets+
   ' serii • '+Math.round(volume)+' kg·powt.</span>';
  host.appendChild(row);
 });
}
function diagnostic(){
 var hs=read('trainer3.history',[]),users=people(),data={
  exportedAt:new Date().toISOString(),app:'Trener2Lite',version:'0.4.0',
  userAgent:navigator.userAgent,users:users.length,sessions:hs.length,
  selectedProfiles:pickedIds().length,hasPending:!!pending(),
  keys:[],screenKeepOn:localStorage.getItem(KEEP)==='yes'};
 for(var i=0;i<localStorage.length;i++)data.keys.push(localStorage.key(i));
 data.keys.sort();
 try{if(window.LiteBridge&&LiteBridge.exportBackup)
  LiteBridge.exportBackup(JSON.stringify(data,null,2),'Trener2-Lite-diagnostyka.json');
  else alert('Eksport diagnostyki wymaga aplikacji Android.');
 }catch(e){alert('Eksport diagnostyki nie powiódł się: '+e.message);}
}
function installSettings(){
 var section=$('settings');if(!section||$('lite040Settings'))return;
 var wrapper=make('div','lite040Settings');wrapper.id='lite040Settings';
 var categories=[
  ['profiles','Użytkownicy'],['gear','Mój sprzęt'],['backup','Kopie danych'],
  ['update','Aktualizacje'],['diagnostics','Diagnostyka']];
 categories.forEach(function(c){
  var d=make('details','lite040Category');d.id='lite040Category-'+c[0];
  var summary=make('summary','',c[1]);d.appendChild(summary);wrapper.appendChild(d);
 });
 section.insertBefore(wrapper,section.firstChild);
 var cards=Array.prototype.slice.call(section.children).filter(function(x){
  return x!==wrapper&&x.classList&&x.classList.contains('card');});
 cards.forEach(function(card){
  var heading=(card.textContent||'').toLowerCase();
  if(card.id==='liteProfilesSettings')wrapper.querySelector('#lite040Category-profiles').appendChild(card);
  else if(card.id==='liteInvCard')wrapper.querySelector('#lite040Category-gear').appendChild(card);
  else if(card.id==='liteDataTools')wrapper.querySelector('#lite040Category-backup').appendChild(card);
  else if(card.id==='liteBridgeTools')wrapper.querySelector('#lite040Category-update').appendChild(card);
  else if(card.id==='liteFireSignals')wrapper.querySelector('#lite040Category-diagnostics').appendChild(card);
  else if(/połączenie z partnerem|przypomnienia o treningu|kopi(a|e) treningów/.test(heading)){
   card.classList.add('lite040HiddenLegacy');card.setAttribute('aria-hidden','true');
   wrapper.querySelector('#lite040Category-diagnostics').appendChild(card);
  }else wrapper.querySelector('#lite040Category-diagnostics').appendChild(card);
 });
 var update=make('div','lite040SettingsExtra');
 update.innerHTML='<button id="lite040Changelog" type="button" class="secondary">POKAŻ LISTĘ ZMIAN</button>'+
 '<div id="lite040Changes" class="hint hidden">0.4.0 — uproszczony Start, profile, plany, biblioteka, historia, ustawienia.</div>';
 wrapper.querySelector('#lite040Category-update').appendChild(update);
 $('lite040Changelog').onclick=function(){$('lite040Changes').classList.toggle('hidden');};
 var settings=make('div','lite040SettingsExtra');
 settings.innerHTML='<label><input id="lite040KeepAwake" type="checkbox"> Nie wygaszaj ekranu podczas treningu</label>'+
 '<p class="hint">Możesz wyłączyć tę opcję, aby tablet sam wygaszał ekran.</p>'+
 '<button id="lite040DiagExport" class="secondary" type="button">EKSPORTUJ DIAGNOSTYKĘ</button>';
 wrapper.querySelector('#lite040Category-diagnostics').appendChild(settings);
 $('lite040KeepAwake').checked=localStorage.getItem(KEEP)==='yes';
 $('lite040KeepAwake').onchange=function(){
  try{localStorage.setItem(KEEP,this.checked?'yes':'no');
   if(window.LiteBridge&&LiteBridge.setTabletTrainingActive)
    LiteBridge.setTabletTrainingActive(active()&&this.checked);
  }catch(e){alert('Nie zapisano ustawienia: '+e.message);}
 };
 $('lite040DiagExport').onclick=diagnostic;
 var legacy=$('v060Settings');if(legacy)legacy.classList.add('lite040HiddenLegacy');
}
function installStyles(){
 if($('lite040Css'))return;
 var s=make('style');s.id='lite040Css';s.textContent=
 '.lite040HiddenLegacy,#start>.compactTop,body.liteFireActive #technique,#setup>label,#setup>#planSelect,#setup>.hint{display:none!important}'+
 '#setup .heroCard{padding:10px}#setup>h2,#setup>.eyebrow,#liteProfilesLauncher,#v086Select{display:none!important}'+
 '.lite040Start h2{font-size:26px;margin:0 0 12px}'+
 '.lite040People{display:-webkit-flex;display:flex;-webkit-flex-wrap:wrap;flex-wrap:wrap;gap:9px;margin:12px 0}'+
 '.lite040Person{width:calc(33.33% - 8px);min-width:115px;max-width:205px;background:#1a1a1a;border:2px solid #333;border-radius:15px;padding:5px;box-sizing:border-box}'+
 '.lite040Person.isSelected{border-color:#70d69a;background:#1a2b22}'+
 '.lite040PersonChoose{background:transparent!important;border:0!important;color:#fff;display:block;width:100%;min-height:104px}'+
 '.lite040PersonChoose img,.lite040Initial{display:block;width:50px;height:50px;margin:0 auto 7px;border-radius:50%;background:#373737;object-fit:cover;color:#fff;font-size:29px;line-height:50px}'+
 '.lite040PersonChoose b{display:block;font-size:17px;word-break:break-word}.lite040PersonChoose small{display:block;font-size:11px;margin-top:4px;color:#ddd}'+
 '.lite040AvatarEdit{display:block;width:100%;min-height:30px!important;font-size:11px!important;background:#292929!important;color:#eee!important;border-radius:8px}'+
 '.lite040Add button,.lite040Resume{min-height:62px;width:100%;border-radius:13px;font-size:19px;font-weight:800}'+
 '.lite040Resume{background:#18552f!important;color:#fff!important;border:2px solid #3eae65!important;margin-bottom:12px}'+
 '.lite040Options,#lite040Last,.lite040Category{border:1px solid #444;border-radius:12px;padding:12px;margin:10px 0}'+
 '.lite040Options>summary,#lite040Last>summary,.lite040Category>summary{font-size:19px;font-weight:800;min-height:36px}'+
 '.lite040Plan{margin:10px 0}.lite040Plan select{width:100%}#lite040Options>div{margin-top:12px}'+
 '.lite040Category>.card{margin:10px 0;padding:10px}.lite040Category button{max-width:100%}'+
 '.lite040LibraryActions{display:-webkit-flex;display:flex;flex-wrap:wrap;gap:10px;align-items:center}'+
 '.lite040LibraryActions button{flex:1 1 60%;min-width:180px}.lite040ShowAll{display:-webkit-flex;display:flex;align-items:center;gap:8px}'+
 '.lite040Exercise{background:#191919;color:#fff;border:1px solid #444;border-radius:12px;padding:9px;display:-webkit-flex;display:flex;width:100%;align-items:center;gap:12px;margin:8px 0;text-align:left}'+
 '.lite040Exercise img,.lite040ExerciseIcon{width:58px;height:58px;object-fit:cover;flex-shrink:0;font-size:32px}'+
 '.lite040Exercise b,.lite040Exercise small{display:block}.lite040Exercise small{color:#aaa;font-size:14px;margin-top:5px}'+
 '.lite040Overlay{position:fixed;left:0;right:0;top:0;bottom:0;z-index:999999;background:rgba(0,0,0,.88);overflow-y:auto;padding:10px}'+
 '.lite040Dialog{background:#181818;color:#eee;margin:auto;max-width:720px;padding:20px;border-radius:15px}.lite040Dialog img{max-width:100%;max-height:260px;object-fit:contain;display:block;margin:auto}'+
 '.lite040HistoryControls{display:-webkit-flex;display:flex;flex-wrap:wrap;gap:9px}.lite040HistoryControls label{flex:1 1 200px}'+
 '.lite040HistoryControls select,.lite040HistoryControls input{width:100%}'+
 '.lite040HistoryItem{padding:12px;margin:8px 0;border:1px solid #444;border-radius:12px;background:#151515}'+
 '.lite040HistoryItem summary{font-size:17px;min-height:47px}.lite040HistoryItem small{display:block;color:#bbb;font-size:14px;margin:4px 0}'+
 '.lite040HistoryRecord{padding:9px 0;border-top:1px solid #333;font-size:16px}'+
 '.lite040Pr{color:#162419;background:#66d78e;font-size:12px;padding:3px 7px;border-radius:5px}'+
 '.lite040ProgressPerson{padding:10px;border:1px solid #353535;border-radius:10px;margin:7px 0}'+
 '.lite040ProgressPerson b,.lite040ProgressPerson span{display:block;margin:4px 0}'+
 '.lite040WeekDay{display:block;width:100%}#lite040WeekDays label{display:block;margin:8px 0}'+
 '@media(max-width:380px){.lite040Person{width:calc(50% - 8px);min-width:115px}}'+
 '@media(min-width:650px){.lite040Person{width:calc(25% - 9px)}}';
 doc.head.appendChild(s);
}
function reconcileModules(){
 var more=$('lite040Options'),setup=$('v086Setup');
 if(more&&setup&&setup.parentNode!==more)more.appendChild(setup);
 ['v059Card','litePrNudge'].forEach(function(id){var e=$(id);if(more&&e&&e.parentNode!==more)more.appendChild(e);});
 var importer=$('liteExerciseImportCard'),ex=$('exercises');
 if(ex&&importer&&importer.parentNode!==ex)ex.appendChild(importer);
 var old=$('v094Open');if(old)old.classList.add('lite040HiddenLegacy');
 var wrapper=$('lite040Settings'),settings=$('settings');
 if(wrapper&&settings){
  Array.prototype.forEach.call(settings.children,function(card){
   if(card===wrapper||!card.classList||!card.classList.contains('card'))return;
   var heading=(card.textContent||'').toLowerCase(),target='diagnostics';
   if(card.id==='liteProfilesSettings')target='profiles';
   else if(card.id==='liteInvCard')target='gear';
   else if(card.id==='liteDataTools')target='backup';
   else if(card.id==='liteBridgeTools')target='update';
   else if(/połączenie z partnerem|przypomnienia o treningu|kopia treningów/.test(heading)){
    card.classList.add('lite040HiddenLegacy');card.setAttribute('aria-hidden','true');
   }
   var category=$('lite040Category-'+target);
   if(category)category.appendChild(card);
  });
 }
}
function boot(){
 installStyles();insertStart();installWeek();installExercises();installHistory();installProgress();
 installSettings();reconcileModules();
 try{localStorage.setItem('trainer3.lastTab.v0884','start');}catch(e){}
 toStart();drawStart(true);
 setInterval(function(){reconcileModules();if(!active())drawStart(false);else updateResume();},3000);
 doc.addEventListener('click',function(e){
  var target=e.target&&e.target.closest?e.target.closest('.tab'):null;
  if(target&&target.getAttribute('data-tab')==='start'){shown='start';setTimeout(function(){drawStart(true);},50);}
  if(target&&target.getAttribute('data-tab')==='plan')setTimeout(renderWeekPeople,60);
  if(target&&target.getAttribute('data-tab')==='exercises')setTimeout(renderExercises,60);
 });
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',function(){setTimeout(boot,250);});
else setTimeout(boot,250);
window.TrenerLite040={refreshStart:function(){drawStart(true);},refreshHistory:renderHistory,
 scheduleFor:function(id,date){return core.dayPlan(read(WEEK_KEY,{}),id,date);}};
})();