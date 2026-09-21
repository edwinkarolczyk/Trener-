(function(){
  'use strict';

  const KEY='trainer3.diet.v076';
  const $=id=>document.getElementById(id);
  const state={date:'',editId:null};

  function safe(raw,fallback){try{return JSON.parse(raw||'')||fallback;}catch(e){return fallback;}}
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function num(v){const n=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(n)?Math.max(0,n):0;}
  function round(v,d=0){const p=Math.pow(10,d);return Math.round((Number(v)||0)*p)/p;}
  function pad(v){return String(v).padStart(2,'0');}
  function localKey(d=new Date()){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function parseKey(k){const m=String(k||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0):new Date();}
  function shiftKey(k,days){const d=parseKey(k);d.setDate(d.getDate()+days);return localKey(d);}
  function dayLabel(k){const d=parseKey(k);const now=localKey();if(k===now)return 'Dzisiaj';if(k===shiftKey(now,-1))return 'Wczoraj';return d.toLocaleDateString('pl-PL',{weekday:'short',day:'2-digit',month:'2-digit'});}
  function uid(prefix){return prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
  function fmt(v,d=0){return round(v,d).toLocaleString('pl-PL',{maximumFractionDigits:d,minimumFractionDigits:0});}

  function defaults(){return {
    version:1,
    targets:{mode:'maintain',kcal:0,protein:0,carbs:0,fat:0},
    meals:[],
    shopping:[]
  };}

  function load(){
    const d=safe(localStorage.getItem(KEY),defaults());
    if(!d.targets)d.targets=defaults().targets;
    if(!Array.isArray(d.meals))d.meals=[];
    if(!Array.isArray(d.shopping))d.shopping=[];
    return d;
  }

  function save(d){
    d.version=1;
    d.meals=(d.meals||[]).slice(-1500);
    d.shopping=(d.shopping||[]).slice(-300);
    localStorage.setItem(KEY,JSON.stringify(d));
  }

  function totalsFor(d,key){
    return (d.meals||[]).filter(m=>m.date===key).reduce((a,m)=>{
      a.kcal+=num(m.kcal);a.protein+=num(m.protein);a.carbs+=num(m.carbs);a.fat+=num(m.fat);return a;
    },{kcal:0,protein:0,carbs:0,fat:0});
  }

  function modeLabel(v){return v==='reduce'?'Redukcja':v==='gain'?'Masa':'Utrzymanie';}
  function mealTypeLabel(v){return ({breakfast:'Śniadanie',lunch:'Obiad',dinner:'Kolacja',snack:'Przekąska',other:'Inne'})[v]||'Posiłek';}

  function installCss(){
    if($('v076DietStyle'))return;
    const s=document.createElement('style');s.id='v076DietStyle';s.textContent=`
      #diet .v076DateNav{display:grid;grid-template-columns:46px 1fr 46px;gap:8px;align-items:center;margin:10px 0 14px}
      #diet .v076DateNav button{height:42px;padding:0!important;margin:0!important}.v076Date{text-align:center;font-size:17px;font-weight:950}
      #diet .v076Summary{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.v076Macro{background:#101010;border:1px solid #303030;border-radius:14px;padding:12px}
      .v076Macro span{display:block;color:#999;font-size:10px}.v076Macro b{display:block;font-size:22px;margin:3px 0}.v076Macro small{display:block;color:#9b9b9b;font-size:10px;line-height:1.35}
      .v076Bar{height:6px;background:#242424;border-radius:999px;overflow:hidden;margin-top:9px}.v076Bar i{display:block;height:100%;background:#39d27d;border-radius:999px}.v076Bar.over i{background:#ef5658}
      .v076NoTarget{margin-top:10px;padding:9px 10px;border:1px solid #4a3434;background:#1b1111;border-radius:11px;color:#d7b1b1;font-size:11px}
      .v076Fields{display:grid;grid-template-columns:1fr 1fr;gap:9px}.v076Fields .wide{grid-column:1 / -1}
      #diet .v076MealRow{display:grid;grid-template-columns:1fr auto;gap:10px;padding:11px 0;border-top:1px solid #292929;align-items:center}.v076MealRow:first-child{border-top:0}
      .v076MealRow strong{display:block}.v076MealRow span{display:block;color:#9b9b9b;font-size:10px;margin-top:3px;line-height:1.35}.v076MealRow button{min-width:40px!important;width:40px!important;height:36px!important;padding:0!important;margin:0!important}
      .v076HistoryRow{display:grid;grid-template-columns:74px 1fr auto;gap:9px;align-items:center;padding:10px 0;border-top:1px solid #292929}.v076HistoryRow:first-child{border-top:0}
      .v076HistoryRow span{font-size:11px;color:#bbb}.v076HistoryRow b{font-size:12px}.v076HistoryRow small{font-size:9px;color:#888}
      .v076ShopAdd{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}.v076ShopAdd button{height:43px;margin:0!important}
      .v076ShopRow{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;padding:9px 0;border-top:1px solid #292929}.v076ShopRow:first-child{border-top:0}.v076ShopRow input{width:22px;height:22px;margin:0}.v076ShopRow.done span{text-decoration:line-through;color:#777}.v076ShopRow button{min-width:36px!important;width:36px!important;height:34px!important;padding:0!important;margin:0!important}
      .v076Info{color:#888;font-size:10px;line-height:1.45;margin-top:8px}.v076Mode{display:inline-block;border-radius:999px;background:#242424;color:#ddd;font-size:10px;font-weight:900;padding:5px 8px}
      #diet .v0885MealStats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 11px;margin-top:10px}
      #diet .v0885MealStat{min-width:0}.v0885MealStat small{display:flex;justify-content:space-between;gap:3px;color:#bdbdbd!important;font-size:10px!important;margin:0 0 3px!important}.v0885MealStat b{color:#eee;font-size:10px}
      #diet .v0885MealTrack{height:6px;background:#303030;border-radius:999px;overflow:hidden}
      #diet .v0885MealTrack i{display:block;height:100%;border-radius:999px;background:#50c878}
      #diet .v0885MealTrack.over i{background:#e65d5d}
      #diet .v0885Ingredients{margin-top:8px;color:#aaa;font-size:11px;line-height:1.5}
      #diet .v0885Ingredients summary{cursor:pointer;color:#ddd}
      @media(max-width:390px){#diet .v076Summary,#diet .v076Fields{grid-template-columns:1fr}.v076Fields .wide{grid-column:auto}}
    `;document.head.appendChild(s);
  }

  function build(){
    const root=$('diet');if(!root||$('v076DietRoot'))return;
    root.innerHTML=`<div id="v076DietRoot">
      <div class="card dietHero">
        <div class="eyebrow">DIETA • BILANS DNIA</div>
        <div class="topline"><h2 style="margin:0">Kalorie i makro</h2><span id="v076ModeBadge" class="v076Mode">Utrzymanie</span></div>
        <div class="v076DateNav"><button id="v076Prev" class="secondary" type="button">‹</button><div id="v076Date" class="v076Date">Dzisiaj</div><button id="v076Next" class="secondary" type="button">›</button></div>
        <div id="v076Summary" class="v076Summary"></div>
        <div id="v076NoTarget" class="v076NoTarget hidden">Ustaw cel dzienny poniżej. Posiłki możesz zapisywać już teraz.</div>
      </div>

      <div class="card">
        <div class="eyebrow">DODAJ POSIŁEK</div><h2>Co zjadłeś?</h2>
        <div class="v076Fields">
          <div><label>Typ</label><select id="v076MealType"><option value="breakfast">Śniadanie</option><option value="lunch">Obiad</option><option value="dinner">Kolacja</option><option value="snack">Przekąska</option><option value="other">Inne</option></select></div>
          <div><label>Nazwa</label><input id="v076MealName" maxlength="60" placeholder="np. jajecznica + pieczywo"></div>
          <div><label>Kalorie [kcal]</label><input id="v076Kcal" type="number" min="0" step="1" inputmode="decimal" placeholder="np. 650"></div>
          <div><label>Białko [g]</label><input id="v076Protein" type="number" min="0" step="0.1" inputmode="decimal" placeholder="np. 35"></div>
          <div><label>Węglowodany [g]</label><input id="v076Carbs" type="number" min="0" step="0.1" inputmode="decimal" placeholder="np. 70"></div>
          <div><label>Tłuszcze [g]</label><input id="v076Fat" type="number" min="0" step="0.1" inputmode="decimal" placeholder="np. 20"></div>
        </div>
        <button id="v076AddMeal" class="primary bigBtn" type="button">DODAJ POSIŁEK</button>
        <button id="v076CancelEdit" class="secondary bigBtn hidden" type="button">ANULUJ EDYCJĘ</button>
        <div class="v076Info">Kalorie możesz przepisać z etykiety. Jeżeli zostawisz kcal puste, aplikacja policzy je z makro: 4 kcal/g białka + 4 kcal/g węglowodanów + 9 kcal/g tłuszczu.</div>
      </div>

      <div class="card"><div class="eyebrow">WYBRANY DZIEŃ</div><h2>Posiłki</h2><div id="v076Meals"></div></div>

      <div class="card">
        <div class="eyebrow">CEL DZIENNY</div><h2>Ustaw własne wartości</h2>
        <div class="v076Fields">
          <div><label>Cel</label><select id="v076TargetMode"><option value="reduce">Redukcja</option><option value="maintain">Utrzymanie</option><option value="gain">Masa</option></select></div>
          <div><label>Kalorie [kcal]</label><input id="v076TargetKcal" type="number" min="0" step="10" inputmode="numeric"></div>
          <div><label>Białko [g]</label><input id="v076TargetProtein" type="number" min="0" step="1" inputmode="numeric"></div>
          <div><label>Węglowodany [g]</label><input id="v076TargetCarbs" type="number" min="0" step="1" inputmode="numeric"></div>
          <div><label>Tłuszcze [g]</label><input id="v076TargetFat" type="number" min="0" step="1" inputmode="numeric"></div>
        </div>
        <button id="v076SaveTargets" class="primary bigBtn" type="button">ZAPISZ CEL</button>
        <div class="v076Info">To są Twoje ręcznie ustawione cele. Aplikacja nie zmienia ich automatycznie na podstawie treningu ani masy ciała.</div>
      </div>

      <div class="card"><div class="eyebrow">OSTATNIE 7 DNI</div><h2>Historia diety</h2><div id="v076History"></div></div>

      <div class="card">
        <div class="eyebrow">LISTA ZAKUPÓW</div><h2>Zakupy</h2>
        <div class="v076ShopAdd"><div><label>Produkt</label><input id="v076ShopName" maxlength="60" placeholder="np. twaróg, ryż, banany"></div><button id="v076ShopAdd" class="primary" type="button">DODAJ</button></div>
        <div id="v076Shopping" style="margin-top:10px"></div>
        <button id="v076ClearDone" class="secondary bigBtn" type="button">USUŃ KUPIONE</button>
      </div>
    </div>`;

    $('v076Prev').onclick=()=>{clearMealEdit();state.date=shiftKey(state.date,-1);render();};
    $('v076Next').onclick=()=>{const next=shiftKey(state.date,1);if(next<=localKey()){clearMealEdit();state.date=next;render();}};
    $('v076AddMeal').onclick=addMeal;
    $('v076CancelEdit').onclick=clearMealEdit;
    $('v076SaveTargets').onclick=saveTargets;
    $('v076ShopAdd').onclick=addShopping;
    $('v076ShopName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addShopping();}});
    $('v076ClearDone').onclick=clearDone;
    root.addEventListener('click',handleAction);
    root.addEventListener('change',handleChange);
  }

  function macroCard(label,key,total,target,unit){
    const has=target>0,left=target-total,pct=has?Math.min(100,(total/target)*100):0,over=has&&total>target;
    const detail=has?(left>=0?'Zostało '+fmt(left,key==='kcal'?0:1)+' '+unit:'Przekroczono o '+fmt(Math.abs(left),key==='kcal'?0:1)+' '+unit):'Cel nieustawiony';
    return `<div class="v076Macro"><span>${esc(label)}</span><b>${fmt(total,key==='kcal'?0:1)} ${unit}</b><small>${has?'Cel '+fmt(target,key==='kcal'?0:0)+' '+unit+' • ':''}${esc(detail)}</small><div class="v076Bar ${over?'over':''}"><i style="width:${pct}%"></i></div></div>`;
  }

  function renderSummary(d){
    const t=d.targets||defaults().targets,total=totalsFor(d,state.date);
    $('v076Date').textContent=dayLabel(state.date)+' • '+parseKey(state.date).toLocaleDateString('pl-PL');
    $('v076ModeBadge').textContent=modeLabel(t.mode);
    $('v076Summary').innerHTML=macroCard('Kalorie','kcal',total.kcal,num(t.kcal),'kcal')+macroCard('Białko','protein',total.protein,num(t.protein),'g')+macroCard('Węglowodany','carbs',total.carbs,num(t.carbs),'g')+macroCard('Tłuszcze','fat',total.fat,num(t.fat),'g');
    $('v076NoTarget').classList.toggle('hidden',num(t.kcal)>0||num(t.protein)>0||num(t.carbs)>0||num(t.fat)>0);
    $('v076Next').disabled=state.date>=localKey();
  }

  function clearMealEdit(){
    state.editId=null;
    $('v076AddMeal').textContent='DODAJ POSIŁEK';
    $('v076CancelEdit')?.classList.add('hidden');
    ['v076MealName','v076Kcal','v076Protein','v076Carbs','v076Fat','v077Portion'].forEach(id=>{if($(id))$(id).value='';});
    try{window.TrenerMealComposer0885?.clearSelection?.();}catch(e){}
  }

  function mealBar(key,label,value,target,unit){
    const amount=num(value),goal=num(target),has=goal>0,pct=has?amount/goal*100:0,over=has&&amount>goal;
    const number=key==='kcal'?0:1;
    return '<div class="v0885MealStat"><small><span>'+esc(label)+'</span><b>'+
      fmt(amount,number)+' '+unit+' / '+(has?fmt(goal,number)+' '+unit:'cel —')+
      (has?' ('+fmt(pct,0)+'%)':'')+'</b></small><div class="v0885MealTrack '+(over?'over':'')+
      '"><i style="width:'+(has?Math.min(100,pct):0)+'%"></i></div></div>';
  }
  function renderMeals(d){
    const rows=(d.meals||[]).filter(m=>m.date===state.date).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
    const t=d.targets||defaults().targets;
    $('v076Meals').innerHTML=rows.length?rows.map(m=>{
      const ingredients=Array.isArray(m.ingredients)?m.ingredients:[];
      const detail=ingredients.length?'<details class="v0885Ingredients"><summary>Składniki ('+ingredients.length+')</summary>'+
        ingredients.map(x=>'<div>'+esc(x.name||'Produkt')+' • '+(x.grams>0?fmt(x.grams,1)+' g • ':'')+
          fmt(x.kcal)+' kcal • B '+fmt(x.protein,1)+' • W '+fmt(x.carbs,1)+' • T '+fmt(x.fat,1)+'</div>').join('')+'</details>':'';
      const bars='<div class="v0885MealStats">'+
        mealBar('kcal','Kalorie',m.kcal,t.kcal,'kcal')+
        mealBar('protein','Białko',m.protein,t.protein,'g')+
        mealBar('carbs','Węgle',m.carbs,t.carbs,'g')+
        mealBar('fat','Tłuszcz',m.fat,t.fat,'g')+'</div>';
      return '<div class="v076MealRow"><div><strong>'+esc(m.name||mealTypeLabel(m.type))+
        '</strong><span>'+mealTypeLabel(m.type)+' • '+fmt(m.kcal)+' kcal • B '+fmt(m.protein,1)+' g • W '+
        fmt(m.carbs,1)+' g • T '+fmt(m.fat,1)+' g</span>'+bars+detail+
        '</div><div style="display:flex;gap:6px"><button class="secondary" type="button" aria-label="Edytuj posiłek" title="Edytuj" data-diet-action="edit-meal" data-id="'+esc(m.id)+'">✎</button>'+
        '<button class="danger" type="button" aria-label="Usuń posiłek" data-diet-action="delete-meal" data-id="'+esc(m.id)+'">×</button></div></div>';
    }).join(''):'<p class="hint">Brak posiłków w tym dniu.</p>';
  }

  function renderTargets(d){
    const t=d.targets||defaults().targets;
    $('v076TargetMode').value=t.mode||'maintain';
    $('v076TargetKcal').value=num(t.kcal)||'';
    $('v076TargetProtein').value=num(t.protein)||'';
    $('v076TargetCarbs').value=num(t.carbs)||'';
    $('v076TargetFat').value=num(t.fat)||'';
  }

  function renderHistory(d){
    const target=d.targets||defaults().targets,rows=[];let k=localKey();
    for(let i=0;i<7;i++){const total=totalsFor(d,k);rows.push({key:k,total});k=shiftKey(k,-1);}
    $('v076History').innerHTML=rows.map(r=>{
      const meals=(d.meals||[]).filter(m=>m.date===r.key).length;
      const kcalTarget=num(target.kcal),proteinTarget=num(target.protein);
      const kcalText=kcalTarget?fmt(r.total.kcal)+' / '+fmt(kcalTarget)+' kcal':fmt(r.total.kcal)+' kcal';
      const proteinText=proteinTarget?'B '+fmt(r.total.protein,1)+' / '+fmt(proteinTarget)+' g':'B '+fmt(r.total.protein,1)+' g';
      return `<div class="v076HistoryRow"><span>${esc(dayLabel(r.key))}</span><div><b>${kcalText}</b><br><small>${proteinText} • ${meals} ${meals===1?'posiłek':'posiłków'}</small></div><button class="secondary" type="button" data-diet-action="open-day" data-date="${r.key}" style="padding:7px 8px!important;margin:0!important">OTWÓRZ</button></div>`;
    }).join('');
  }

  function renderShopping(d){
    const rows=(d.shopping||[]).slice().sort((a,b)=>Number(a.done)-Number(b.done)||Number(b.createdAt||0)-Number(a.createdAt||0));
    $('v076Shopping').innerHTML=rows.length?rows.map(x=>`<div class="v076ShopRow ${x.done?'done':''}"><input type="checkbox" data-diet-action="toggle-shop" data-id="${esc(x.id)}" ${x.done?'checked':''}><span>${esc(x.name)}</span><button class="secondary" type="button" data-diet-action="delete-shop" data-id="${esc(x.id)}">×</button></div>`).join(''):'<p class="hint">Lista zakupów jest pusta.</p>';
    $('v076ClearDone').disabled=!rows.some(x=>x.done);
  }

  function render(){
    const d=load();
    renderSummary(d);renderMeals(d);renderTargets(d);renderHistory(d);renderShopping(d);
  }

  function addMeal(){
    const d=load(),protein=num($('v076Protein').value),carbs=num($('v076Carbs').value),fat=num($('v076Fat').value);
    let kcal=num($('v076Kcal').value);if(!kcal&&(protein||carbs||fat))kcal=round(protein*4+carbs*4+fat*9,0);
    const name=String($('v076MealName').value||'').trim().slice(0,60),type=$('v076MealType').value||'other';
    const portion=String($('v077Portion')?.value||'').trim().slice(0,30);
    if(!kcal&&!protein&&!carbs&&!fat){try{toast('Wpisz kalorie albo przynajmniej jedno makro.');}catch(e){}return;}
    const editing=!!state.editId;
    if(editing){
      const old=(d.meals||[]).find(m=>m.id===state.editId);
      if(!old){clearMealEdit();try{toast('Posiłek nie istnieje.');}catch(e){}return;}
      Object.assign(old,{type,name:name||mealTypeLabel(type),kcal,protein,carbs,fat});
      old.portion=portion;
      $('v076AddMeal').dataset.v077SkipPortion='1';
    }else{
      d.meals.push({id:uid('m'),date:state.date,type,name:name||mealTypeLabel(type),kcal,protein,carbs,fat,portion,createdAt:Date.now()});
    }
    save(d);clearMealEdit();
    render();try{toast(editing?'Zmiany posiłku zapisane.':'Posiłek zapisany.');}catch(e){}
  }

  function saveTargets(){
    const d=load();d.targets={mode:$('v076TargetMode').value||'maintain',kcal:num($('v076TargetKcal').value),protein:num($('v076TargetProtein').value),carbs:num($('v076TargetCarbs').value),fat:num($('v076TargetFat').value)};save(d);render();try{toast('Cel diety zapisany.');}catch(e){}
  }

  function addShopping(){
    const input=$('v076ShopName'),name=String(input?.value||'').trim().slice(0,60);if(!name)return;
    const d=load();d.shopping.push({id:uid('s'),name,done:false,createdAt:Date.now()});save(d);input.value='';renderShopping(d);
  }

  function clearDone(){const d=load();d.shopping=(d.shopping||[]).filter(x=>!x.done);save(d);renderShopping(d);}

  function handleAction(ev){
    const el=ev.target?.closest?.('[data-diet-action]');if(!el)return;const action=el.dataset.dietAction,id=el.dataset.id;
    if(action==='edit-meal'){
      const meal=(load().meals||[]).find(m=>m.id===id);if(!meal)return;
      if(Array.isArray(meal.ingredients)&&meal.ingredients.length&&window.TrenerMealComposer0885?.edit){
        window.TrenerMealComposer0885.edit(meal);return;
      }
      state.editId=meal.id;state.date=meal.date;
      $('v076MealType').value=meal.type||'other';
      [['v076MealName','name'],['v076Kcal','kcal'],['v076Protein','protein'],
       ['v076Carbs','carbs'],['v076Fat','fat'],['v077Portion','portion']]
        .forEach(([field,key])=>{if($(field))$(field).value=meal[key]??'';});
      $('v076AddMeal').textContent='ZAPISZ ZMIANY';
      $('v076CancelEdit')?.classList.remove('hidden');
      $('v076AddMeal').scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    if(action==='delete-meal'){
      const d=load();const meal=(d.meals||[]).find(m=>m.id===id);if(!meal)return;
      if(!confirm('Usunąć posiłek „'+String(meal.name||'Posiłek')+'”?'))return;
      d.meals=d.meals.filter(m=>m.id!==id);save(d);if(state.editId===id)clearMealEdit();render();return;
    }
    if(action==='delete-shop'){
      const d=load();d.shopping=d.shopping.filter(x=>x.id!==id);save(d);renderShopping(d);return;
    }
    if(action==='open-day'){
      clearMealEdit();state.date=el.dataset.date||localKey();render();try{$('diet')?.scrollIntoView({block:'start'});}catch(e){}return;
    }
  }

  function handleChange(ev){
    const el=ev.target;if(!el||el.dataset?.dietAction!=='toggle-shop')return;
    const d=load(),row=(d.shopping||[]).find(x=>x.id===el.dataset.id);if(!row)return;row.done=!!el.checked;save(d);renderShopping(d);
  }

  function boot(){
    installCss();state.date=localKey();build();render();
    document.querySelectorAll('.tab[data-tab="diet"]').forEach(b=>b.addEventListener('click',()=>setTimeout(render,0)));
  }

  window.TrenerDiet076={render,load:()=>clone(load()),setDate:k=>{state.date=String(k||localKey());render();}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
