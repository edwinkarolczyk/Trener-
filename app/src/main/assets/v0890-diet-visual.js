(function(){
'use strict';
// Trener 2 — Dieta 0.8.9.0. Presentation layer, keeps the established local diet schema.
const $=id=>document.getElementById(id);
const ROOT='v076DietRoot',VISUAL='trainer3.dietVisual.v0890',FAV='trainer3.dietMealFavorites.v0890';
const legacy={add:'v076AddMeal',catalog:'v083FoodCard',quick:'v077QuickCard',
 targets:'v076SaveTargets',history:'v076History',shopping:'v076Shopping',water:'v078HydrationCard'};
const metric=[{key:'kcal',name:'Kalorie',short:'Kalorie',unit:'kcal',color:'#56d487',icon:'🔥'},
 {key:'protein',name:'Białko',short:'Białko',unit:'g',color:'#69b9ff',icon:'🏋️'},
 {key:'carbs',name:'Węglowodany',short:'Węgle',unit:'g',color:'#ffd062',icon:'🌾'},
 {key:'fat',name:'Tłuszcz',short:'Tłuszcz',unit:'g',color:'#ff925b',icon:'🟠'}];
const typeNames={breakfast:'Śniadanie',lunch:'Obiad',afternoon:'Podwieczorek',
 dinner:'Kolacja',snack:'Przekąska',other:'Inne'};
const state={ready:false,sheet:'',pane:'search',menu:'',sort:'time',
 expanded:new Set(),hold:null,drag:null,preSave:'',lastOpen:0};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>{const x=Number(String(v??'0').replace(',','.'));return Number.isFinite(x)?Math.max(0,x):0;};
const fmt=(v,places=0)=>n(v).toLocaleString('pl-PL',{maximumFractionDigits:places});
const clone=v=>JSON.parse(JSON.stringify(v));
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(e){return fallback;}}
function store(key,x){try{localStorage.setItem(key,JSON.stringify(x));return true;}catch(e){return false;}}
function ui(){const x=read(VISUAL,{});return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}
function data(){return window.TrenerDiet076?.load?.()||{targets:{},meals:[]};}
function date(){return window.TrenerDiet076?.getDate?.()||localDate();}
function localDate(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function numberOrDash(v,unit,places=0){return v>0?fmt(v,places)+' '+unit:'Cel nieustawiony';}
function bar(value,target){const v=n(value),t=n(target);return {known:t>0,pct:t>0?Math.round(v/t*100):0,width:t>0?Math.min(100,v/t*100):0,over:t>0&&v>t};}
function goals(d){return d.targets||{};}
function totals(d,key){const out={kcal:0,protein:0,carbs:0,fat:0};
 (d.meals||[]).forEach(m=>{if(m.date!==key)return;metric.forEach(x=>out[x.key]+=n(m[x.key]));});
 metric.forEach(x=>out[x.key]=Math.round(out[x.key]*10)/10);
 return out;
}
function filtered(d,key){return (d.meals||[]).filter(m=>m.date===key);}
function orderMeals(meals,sort,manual=[]){
 const rows=meals.slice();
 if(sort==='kcal')return rows.sort((a,b)=>n(b.kcal)-n(a.kcal)||n(a.createdAt)-n(b.createdAt));
 if(sort==='newest')return rows.sort((a,b)=>n(b.createdAt)-n(a.createdAt));
 if(sort==='manual'){
   const idx=new Map(manual.map((k,i)=>[k,i]));
   return rows.sort((a,b)=>(idx.has(a.id)?idx.get(a.id):10000+n(a.createdAt)/1e13)-
     (idx.has(b.id)?idx.get(b.id):10000+n(b.createdAt)/1e13));
 }
 return rows.sort((a,b)=>n(a.createdAt)-n(b.createdAt));
}
function time(m){const val=n(m.createdAt);if(!val)return '';
 const d=new Date(val);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
}
function kind(m){return typeNames[m.type]||'Posiłek';}
function emoji(m){const type=m.type||'other';return ({breakfast:'🥪',lunch:'🍲',afternoon:'🍎',
 dinner:'🥗',snack:'🍫',other:'🍽️'})[type]||'🍽️';}
function label(x){return '<span class="v0890BalanceLabel">'+x+'</span>';}
function ring(name,value,target,color){
 const v=bar(value,target),percent=v.known?fmt(v.pct)+'%':'—';
 return '<div class="v0890RingCell" style="--ring:'+color+'"><div class="v0890Ring" style="--pct:'+v.width+'%;--ring:'+color+'"></div>'+
  '<div class="v0890RingLabel">'+name+'</div><div class="v0890RingValues">'+fmt(value,1)+
  (v.known?' / '+fmt(target,1):' / —')+'</div><div class="v0890RingPercent">'+percent+'</div></div>';
}
function summary(d){
 const node=$('v076Summary');if(!node)return;
 const t=goals(d),value=totals(d,date()),k=bar(value.kcal,t.kcal);
 const remain=n(t.kcal)-value.kcal;
 let water={todayMl:0,targetMl:0};
 try{water=window.TrenerHydration078?.state?.()||water;}catch(e){}
 const waterL=n(water.todayMl)/1000,waterT=n(water.targetMl)/1000;
 node.innerHTML='<div class="v0890BalanceLabel"><span>Bilans dnia</span><span class="v0890Remaining">'+
  (k.known?(remain>=0?'Jeszcze '+fmt(remain)+' kcal':'Przekroczono o '+fmt(-remain)+' kcal'):'Ustaw cel kcal')+
  '</span></div><div class="v0890KcalLine"><strong>'+fmt(value.kcal)+'</strong><span>/ '+
  (k.known?fmt(t.kcal):'—')+' kcal</span></div><div class="v0890Percent">'+(k.known?fmt(k.pct)+'%':'—')+
  '</div><div class="v0890Line'+(k.over?' v0890Over':'')+'" style="--line-color:#56d487"><i style="width:'+k.width+'%"></i></div>'+
  '<div class="v0890Rings">'+
  ring('Białko',value.protein,t.protein,'#69b9ff')+
  ring('Węgle',value.carbs,t.carbs,'#ffd062')+
  ring('Tłuszcz',value.fat,t.fat,'#ff925b')+
  ring('Woda',waterL,waterT,'#61caeb')+'</div>';
 if($('v0890WaterMini')){
   const w=bar(n(water.todayMl),n(water.targetMl));
   $('v0890WaterMini').innerHTML='<span>💧 Woda <b>'+fmt(waterL,2)+' / '+fmt(waterT,2)+' l</b></span>'+
     '<small>'+ (w.known?fmt(w.pct)+'%':'Cel —')+' · Dodaj wodę ›</small>';
 }
}
function metricMarkup(m,t,x){
 const b=bar(m[x.key],t[x.key]);
 return '<div class="v0890MealMetric" style="--metric:'+x.color+'"><label>'+x.short+'</label>'+
  '<b>'+fmt(m[x.key],x.key==='kcal'?0:1)+' / '+(b.known?fmt(t[x.key],x.key==='kcal'?0:1):'—')+'</b>'+
  '<div class="v0890Line'+(b.over?' v0890Over':'')+'" style="--line-color:'+x.color+'"><i style="width:'+b.width+'%"></i></div>'+
  '<output>'+(b.known?fmt(b.pct)+'%':'—')+'</output></div>';
}
function detail(m){
 const ingredients=Array.isArray(m.ingredients)?m.ingredients:[];
 let html='<details class="v0890MealDetail" data-details="'+esc(m.id)+'"'+(state.expanded.has(m.id)?' open':'')+'><summary>'+
   (ingredients.length?'Składniki ('+ingredients.length+')':'Szczegóły posiłku')+' ▾</summary>';
 if(!ingredients.length){
  html+='<div class="v0890Ingredient"><b>'+esc(m.name||'Posiłek')+'</b><span>'+
    (m.portion?esc(m.portion)+' · ':'')+fmt(m.kcal)+' kcal</span></div>';
 }else for(const x of ingredients){
  html+='<div class="v0890Ingredient"><div><b>'+esc(x.name||'Produkt')+'</b><br><small>'+
   fmt(x.kcal)+' kcal · B '+fmt(x.protein,1)+' · W '+fmt(x.carbs,1)+' · T '+fmt(x.fat,1)+
   '</small></div><span>'+(n(x.grams)>0?fmt(x.grams,1)+' g':esc(x.portion||''))+'</span></div>';
 }
 return html+'</details>';
}
function menu(m){
 if(state.menu!==m.id)return '';
 return '<div class="v0890MealMenu" role="group" aria-label="Akcje posiłku">'+
 '<button class="secondary" type="button" data-diet-action="edit-meal" data-id="'+esc(m.id)+'" data-visual="edit">✎ Edytuj</button>'+
 '<button class="secondary" type="button" data-visual="duplicate" data-id="'+esc(m.id)+'">▢ Duplikuj</button>'+
 '<button class="secondary" type="button" data-visual="fav" data-id="'+esc(m.id)+'">♡ Ulubione</button>'+
 '<button class="danger" type="button" data-diet-action="delete-meal" data-id="'+esc(m.id)+'" data-visual="delete">♧ Usuń</button></div>';
}
function meal(m,t){
 const id=esc(m.id),details=Array.isArray(m.ingredients)?m.ingredients.length:0;
 return '<article class="v0890Meal" data-meal-id="'+id+'" tabindex="0">'+
  '<div class="v0890MealTop"><div class="v0890MealEmoji" aria-hidden="true">'+emoji(m)+'</div>'+
  '<div class="v0890MealInfo"><small>'+esc(time(m))+'　'+kind(m)+'</small><strong>'+
  esc(m.name||kind(m))+'</strong><span>'+fmt(m.kcal)+' kcal · B '+fmt(m.protein,1)+' g · W '+
  fmt(m.carbs,1)+' g · T '+fmt(m.fat,1)+' g'+(details?' · '+details+' składn.':'')+'</span></div>'+
  '<button type="button" class="v0890MealDrag" data-drag="'+id+'" aria-label="Przytrzymaj i przesuń posiłek" title="Przytrzymaj i przesuń">⠿</button>'+
  '<button type="button" class="v0890MoreButton" data-visual="menu" data-id="'+id+'" aria-label="Menu posiłku" aria-expanded="'+(state.menu===m.id)+'">⋮</button></div>'+
  '<div class="v0890MealBars">'+metric.map(x=>metricMarkup(m,t,x)).join('')+'</div>'+detail(m)+menu(m)+'</article>';
}
function renderMeals(d){
 const key=date(),prefs=ui(),sort=prefs.sort||'time',rows=orderMeals(filtered(d,key),sort,prefs.order?.[key]||[]);
 const list=$('v076Meals');if(!list)return;
 list.innerHTML=rows.length?rows.map(m=>meal(m,goals(d))).join(''):
   '<p class="hint">Nie masz jeszcze posiłków w tym dniu. Dodaj pierwszy poniżej.</p>';
 if($('v0890Sort'))$('v0890Sort').value=sort;
}
function refresh(){if(!state.ready)return;const d=data();summary(d);renderMeals(d);}
function makeButton(tag,id,text,cls){const el=document.createElement(tag);el.id=id;el.type='button';el.className=cls;el.textContent=text;return el;}
function place(card,parent){if(card&&parent&&card.parentElement!==parent)parent.appendChild(card);}
function ensureVisible(card){
 if(!card)return;
 if(card.classList.contains('v084Collapsed'))card.classList.remove('v084Collapsed');
 if(card.classList.contains('v085Collapsed'))card.classList.remove('v085Collapsed');
}
function pane(mode){
 state.pane=mode;const lookup={search:'catalog',recent:'quick',favorites:'quick',compose:'add',sets:'add'};
 ['catalog','quick','add'].forEach(k=>{
  const c=$(legacy[k])?.closest?.('.card')||$(legacy[k]);
  if(c)c.classList.toggle('v0890PaneHidden',lookup[mode]!==k);
 });
 if($('v0890Favorites'))$('v0890Favorites').hidden=mode!=='favorites';
 if($('v0890SheetTabs'))$('v0890SheetTabs').querySelectorAll('[data-pane]').forEach(b=>
    b.setAttribute('aria-selected',String(b.dataset.pane===mode)));
 if(mode==='recent'||mode==='favorites')$('v077'+(mode==='favorites'?'Fav':'Recent')+'Tab')?.click();
 if(mode==='sets')$('v0885Templates')?.scrollIntoView({block:'nearest'});
}
function setTitle(title){if($('v0890SheetTitle'))$('v0890SheetTitle').textContent=title;}
function closeSheet(){
 const overlay=$('v0890Overlay');if(!overlay)return;
 overlay.classList.remove('v0890Open');overlay.setAttribute('aria-hidden','true');
 state.sheet='';state.menu='';
 document.body.classList.remove('v0890NoScroll');
 try{$('v0890AddButton')?.focus?.({preventScroll:true});}catch(e){}
}
function openSheet(kind='add',mode='search'){
 const overlay=$('v0890Overlay');if(!overlay)return false;
 state.sheet=kind;
 const sheet=$('v0890Sheet'),tabs=$('v0890SheetTabs'),hint=$('v0890SheetHint');
 const sections=['catalog','quick','add','targets','history','shopping','water'];
 sections.forEach(k=>{
   const card=k==='add'?$(legacy.add)?.closest('.card'):
      k==='targets'?$(legacy.targets)?.closest('.card'):
      k==='history'?$(legacy.history)?.closest('.card'):
      k==='shopping'?$(legacy.shopping)?.closest('.card'):
      $(legacy[k]);
   if(card)card.classList.toggle('v0890PaneHidden',true);
 });
 if(kind==='add'){
   setTitle('Dodaj posiłek');tabs.hidden=false;hint.hidden=false;
   hint.textContent='Wyszukaj produkt, zeskanuj kod lub złóż posiłek z kilku składników.';
   if($('v0890Favorites'))$('v0890Favorites').hidden=true;
   pane(mode);
 }else{
   tabs.hidden=true;hint.hidden=true;
   if($('v0890Favorites'))$('v0890Favorites').hidden=true;
   const card=kind==='targets'?$(legacy.targets)?.closest('.card'):
     kind==='history'?$(legacy.history)?.closest('.card'):
     kind==='shopping'?$(legacy.shopping)?.closest('.card'):$(legacy.water);
   if(card){ensureVisible(card);card.classList.remove('v0890PaneHidden');}
   setTitle(({targets:'Cele dzienne',history:'Historia diety',shopping:'Lista zakupów',water:'Nawodnienie'})[kind]||'Dieta');
 }
 overlay.classList.add('v0890Open');overlay.setAttribute('aria-hidden','false');
 state.lastOpen=Date.now();return true;
}
function preserveMeals(d){return JSON.stringify((d.meals||[]).map(m=>[m.id,m.kcal,m.protein,m.carbs,m.fat,m.name,m.type,(m.ingredients||[]).length]));}
function writeMeal(d){
 try{
  d.version=1;d.meals=(d.meals||[]).slice(-1500);
  localStorage.setItem('trainer3.diet.v076',JSON.stringify(d));
  window.TrenerDiet076?.render?.();window.TrenerWidget077?.sync?.(true);
  return true;
 }catch(e){return false;}
}
function notify(s){try{toast(s);}catch(e){if($('v0890Notice'))$('v0890Notice').textContent=s;}}
function duplicate(m){
 const d=data(),copy=clone(m);
 copy.id='m'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
 copy.date=date();copy.createdAt=Date.now();
 copy.type=window.TrenerMealTime0889?.typeForRepeat?.(copy.type)||copy.type;
 d.meals.push(copy);
 if(writeMeal(d)){state.menu='';refresh();notify('Dodano kopię: '+copy.name);}
 else notify('Nie udało się zapisać kopii.');
}
function signature(m){return JSON.stringify([m.name,n(m.kcal),n(m.protein),n(m.carbs),n(m.fat),
 (m.ingredients||[]).map(x=>[x.name,x.grams,x.kcal,x.protein,x.carbs,x.fat])]);}
function favorites(){const all=read(FAV,[]);return Array.isArray(all)?all:[];}
function favorite(m){
 const all=favorites(),sig=signature(m),idx=all.findIndex(x=>signature(x)===sig);
 if(idx>=0)all.splice(idx,1);
 else{const x=clone(m);delete x.id;delete x.date;delete x.createdAt;all.unshift(x);}
 if(!store(FAV,all.slice(0,60))){notify('Brak miejsca na zapis ulubionych.');return;}
 state.menu='';renderFavorites();refresh();notify(idx>=0?'Usunięto z ulubionych.':'Dodano do ulubionych.');
}
function renderFavorites(){
 const list=$('v0890Favorites');if(!list)return;
 const items=favorites();
 list.innerHTML=items.length?'<h3>Moje ulubione posiłki</h3>'+items.map((m,i)=>
 '<div class="v0890Ingredient"><div><b>'+esc(m.name)+'</b><br><small>'+fmt(m.kcal)+
 ' kcal · '+(m.ingredients?.length||1)+' składn.</small></div><button type="button" class="primary" data-visual="add-fav" data-index="'+i+'">+ Dodaj</button></div>').join(''):'';
}
function handle(ev){
 const b=ev.target.closest('[data-visual]');if(!b)return;
 const a=b.dataset.visual,id=b.dataset.id,m=id?(data().meals||[]).find(x=>x.id===id):null;
 if(a==='menu'){state.menu=state.menu===id?'':id;renderMeals(data());return;}
 if(a==='edit'){state.menu='';openSheet('add','compose');setTimeout(()=>{$('v076MealName')?.focus?.();},60);return;}
 if(a==='delete'){state.menu='';setTimeout(refresh,0);return;}
 if(a==='duplicate'&&m){duplicate(m);return;}
 if(a==='fav'&&m){favorite(m);return;}
 if(a==='add-fav'){
   const row=favorites()[Number(b.dataset.index)];if(!row)return;
   duplicate(row);return;
 }
 if(a==='add'){openSheet('add','search');return;}
 if(a==='more'){openSheet(b.dataset.kind);return;}
 if(a==='scan'){
   pane('compose');
   if(window.Android&&typeof Android.scanFoodBarcode==='function')Android.scanFoodBarcode();
   else $('v0802Scan')?.click();
   return;
 }
 if(a==='saved')pane('sets');
}
function menuHold(ev){
 if(ev.target.closest('button,input,select,textarea,summary,[data-drag]'))return;
 const card=ev.target.closest('[data-meal-id]');if(!card)return;
 cancelHold();
 const origin={x:ev.clientX,y:ev.clientY,id:card.dataset.mealId,pointerId:ev.pointerId,timer:0};
 origin.timer=setTimeout(()=>{if(state.hold!==origin)return;state.menu=origin.id;
   renderMeals(data());try{window.navigator?.vibrate?.(20);}catch(e){}},580);
 state.hold=origin;
}
function cancelHold(){if(state.hold)clearTimeout(state.hold.timer);state.hold=null;}
function dragStart(ev){
 const handle=ev.target.closest('[data-drag]');if(!handle||ev.button!==0)return;
 cancelHold();const card=handle.closest('[data-meal-id]');if(!card)return;
 const obj={id:card.dataset.mealId,card,x:ev.clientX,y:ev.clientY,pointerId:ev.pointerId,active:false,timer:0};
 obj.timer=setTimeout(()=>{if(state.drag!==obj)return;obj.active=true;
   card.classList.add('v0890Dragging');try{navigator.vibrate?.(20);}catch(e){}},480);
 state.drag=obj;
 try{handle.setPointerCapture(ev.pointerId);}catch(e){}
}
function dragMove(ev){
 const d=state.drag;if(d&&ev.pointerId===d.pointerId){
  if(!d.active&&Math.hypot(ev.clientX-d.x,ev.clientY-d.y)>10){clearTimeout(d.timer);state.drag=null;return;}
  if(d.active){
   ev.preventDefault();
   const card=d.card,target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest?.('[data-meal-id]');
   if(target&&target!==card&&target.parentElement===card.parentElement){
    const parent=card.parentElement;
    if(ev.clientY>target.getBoundingClientRect().top+target.offsetHeight/2)parent.insertBefore(card,target.nextSibling);
    else parent.insertBefore(card,target);
   }
  }return;
 }
 if(state.hold&&ev.pointerId===state.hold.pointerId&&Math.hypot(ev.clientX-state.hold.x,ev.clientY-state.hold.y)>12)cancelHold();
}
function dragEnd(ev){
 const d=state.drag;
 if(d&&ev.pointerId===d.pointerId){
  clearTimeout(d.timer);state.drag=null;d.card.classList.remove('v0890Dragging');
  if(d.active){
   const ids=Array.from($('v076Meals')?.querySelectorAll('[data-meal-id]')||[]).map(x=>x.dataset.mealId);
   const prefs=ui();prefs.sort='manual';prefs.order=prefs.order||{};prefs.order[date()]=ids;
   store(VISUAL,prefs);state.sort='manual';if($('v0890Sort'))$('v0890Sort').value='manual';
   notify('Zapisano kolejność posiłków.');
  }return;
 }
 cancelHold();
}
function install(){
 const root=$(ROOT),hero=root?.querySelector('.dietHero'),list=$('v076Meals')?.closest('.card');
 const add=$(legacy.add)?.closest('.card'),catalog=$(legacy.catalog),quick=$(legacy.quick),
  target=$(legacy.targets)?.closest('.card'),history=$(legacy.history)?.closest('.card'),
  shopping=$(legacy.shopping)?.closest('.card'),water=$(legacy.water);
 if(!root||!hero||!list||!add||!catalog||!quick||!target||!history||!shopping||!water||!$('v0885Composer'))return false;
 if(state.ready)return true;
 // The original cards are not destroyed: their inputs, listeners and backups continue working.
 list.classList.add('v0890MealsCard');
 const heading=document.createElement('div');heading.className='v0890Heading';
 heading.innerHTML='<h2>Dieta</h2><button type="button" id="v0890Calendar" aria-label="Historia i kalendarz">▦</button>';
 hero.insertBefore(heading,hero.querySelector('.v076DateNav'));
 const mealHead=document.createElement('div');mealHead.className='v0890MealsTitle';
 mealHead.innerHTML='<h2>Posiłki</h2><select id="v0890Sort" aria-label="Sortowanie posiłków">'+
  '<option value="time">Chronologicznie</option><option value="newest">Od najnowszych</option>'+
  '<option value="kcal">Najwięcej kalorii</option><option value="manual">Moja kolejność</option></select>';
 list.insertBefore(mealHead,$('v076Meals'));
 const mini=makeButton('button','v0890WaterMini','','v0890WaterMini');
 const addButton=makeButton('button','v0890AddButton','＋  Dodaj posiłek','v0890AddButton');
 addButton.dataset.visual='add';
 const more=document.createElement('div');more.className='v0890More';more.id='v0890More';
 more.innerHTML='<button type="button" data-visual="more" data-kind="targets">⚙ Cele</button>'+
  '<button type="button" data-visual="more" data-kind="history">▦ Historia</button>'+
  '<button type="button" data-visual="more" data-kind="shopping">☷ Zakupy</button>';
 root.appendChild(mini);root.appendChild(addButton);root.appendChild(more);
 const auxiliary=document.createElement('div');auxiliary.id='v0890Aux';auxiliary.className='v0890Aux';
 root.appendChild(auxiliary);
 const overlay=document.createElement('div');overlay.id='v0890Overlay';overlay.setAttribute('aria-hidden','true');
 overlay.innerHTML='<div id="v0890Sheet" role="dialog" aria-modal="true" aria-label="Dieta">'+
  '<div id="v0890SheetTop"><strong id="v0890SheetTitle">Dodaj posiłek</strong>'+
  '<button type="button" id="v0890Close" class="secondary" aria-label="Zamknij panel">×</button></div>'+
  '<p id="v0890SheetHint" class="v0890SheetHint"></p>'+
  '<div id="v0890SheetTabs">'+
  '<button type="button" data-pane="search">⌕ Szukaj</button>'+
  '<button type="button" data-pane="recent">◷ Ostatnie</button>'+
  '<button type="button" data-pane="favorites">♡ Ulubione</button>'+
  '<button type="button" data-pane="compose">＋ Składniki</button></div>'+
  '<div id="v0890Favorites"></div><div id="v0890SheetCards"></div>'+
  '<p id="v0890Notice" role="status"></p></div>';
 root.appendChild(overlay);
 const sheetCards=$('v0890SheetCards');
 for(const card of [catalog,quick,add,target,history,shopping,water]){
  if(!card)return false;
  card.classList.add('v0890SheetCard');place(card,sheetCards);ensureVisible(card);
 }
 // Root still owns delegated legacy edit/delete listeners after moving cards into the sheet.
 root.classList.add('v0890Ready');state.ready=true;
 const saved=ui();state.sort=saved.sort||'time';
 root.addEventListener('click',handle);
 root.addEventListener('click',e=>{
   if(e.target.id==='v083Use')setTimeout(()=>pane('compose'),0);
   if(e.target.closest('#v076SaveTargets,#v076ShopAdd,[data-water-add],#v078UndoWater'))setTimeout(refresh,120);
 },false);
 root.addEventListener('click',e=>{
   if(e.target.closest('#v076AddMeal,#v0885Save,#v0886SaveSet')){
    setTimeout(()=>{
      if(preserveMeals(data())!==state.preSave){
        if(state.sheet==='add')closeSheet();
        refresh();
      }
    },70);
   }
 });
 root.addEventListener('click',e=>{if(e.target.closest('#v076AddMeal,#v0885Save,#v0886SaveSet'))state.preSave=preserveMeals(data());},true);
 root.addEventListener('pointerdown',e=>{if(e.target.closest('[data-drag]'))dragStart(e);else menuHold(e);});
 root.addEventListener('pointermove',dragMove,{passive:false});
 root.addEventListener('pointerup',dragEnd);
 root.addEventListener('pointercancel',dragEnd);
 root.addEventListener('click',e=>{if(e.target.closest('#v0890Calendar'))openSheet('history');});
 $('v0890WaterMini').onclick=()=>openSheet('water');
 $('v0890Sort').addEventListener('change',e=>{const prefs=ui();prefs.sort=e.target.value;store(VISUAL,prefs);refresh();});
 $('v0890Close').onclick=closeSheet;
 overlay.addEventListener('click',e=>{if(e.target===overlay)closeSheet();});
 $('v0890SheetTabs').addEventListener('click',e=>{const btn=e.target.closest('[data-pane]');if(btn)pane(btn.dataset.pane);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.sheet)closeSheet();});
 document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{if(state.sheet)closeSheet();}));
 renderFavorites();pane('search');refresh();return true;
}
function boot(){let count=0;const t=setInterval(()=>{
 count++;if(install()||count>=100)clearInterval(t);
},120);}
window.TrenerDietVisual0890={refresh,openSheet,pane,closeSheet,bar,totals,orderMeals,signature,
 get ready(){return state.ready;}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();