(function(){
  'use strict';
  // 0.8.8.5: builder for multi-ingredient meals. Existing single meals remain unchanged.
  const KEY='trainer3.diet.v076', $=id=>document.getElementById(id);
  const state={items:[],editId:null,editDate:'',selected:null};
  const fields=['v076MealName','v076Kcal','v076Protein','v076Carbs','v076Fat'];
  const nutrients=['kcal','protein','carbs','fat'];
  const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;
    const n=Number(String(v).replace(',','.'));return Number.isFinite(n)&&n>=0?n:null;};
  const round=(v,d=1)=>Math.round(v*10**d)/10**d;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>round(Number(v)||0,1).toLocaleString('pl-PL',{maximumFractionDigits:1});
  const id=()=> 'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const toastSafe=s=>{try{toast(s);}catch(e){const el=$('v0885Message');if(el)el.textContent=s;}};
  const clone=x=>JSON.parse(JSON.stringify(x));
  function diet(){return window.TrenerDiet076?.load?.()||{version:1,targets:{},meals:[],shopping:[]};}
  function save(d){
    d.version=1;d.meals=(d.meals||[]).slice(-1500);
    try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){toastSafe('Nie udało się zapisać posiłku.');return false;}
    try{window.TrenerDiet076?.render?.();window.TrenerDiet077?.syncWidget?.();}catch(e){}
    return true;
  }
  function clearSelection(){
    state.selected=null;
    if($('v0885Grams'))$('v0885Grams').value='';
    if($('v0885Source'))$('v0885Source').textContent='Wpisy ręczne: pola B/W/T/kcal oznaczają wartości dla podanej porcji.';
  }
  function clearFood(){
    clearSelection();
    fields.forEach(k=>{if($(k))$(k).value='';});
    if($('v077Portion'))$('v077Portion').value='';
  }
  function base100(p){
    return {kcal:num(p.kcal100),protein:num(p.protein100),
      carbs:num(p.carbs100),fat:num(p.fat100)};
  }
  function recalc(base,grams){
    const out={};
    for(const k of nutrients)out[k]=base[k]===null?null:round(base[k]*grams/100,1);
    return out;
  }
  function setCatalogSource(p,grams,unit,amount){
    const g=num(grams);if(!(g>0))return;
    state.selected={base100:base100(p),grams:g,unit:String(unit||'g'),amount:num(amount),source:String(p.source||'')};
    if($('v0885Grams'))$('v0885Grams').value=round(g,2);
    if($('v0885Source'))$('v0885Source').textContent='Z bazy: '+state.selected.source+
      '. Zmiana gramów automatycznie przelicza kcal, B, W i T.';
    const card=$('v076AddMeal')?.closest('.card');
    if(card?.classList.contains('v084Collapsed'))card.querySelector('.v084Toggle')?.click();
  }
  function captureSelection(){
    const grams=num($('v0885Grams')?.value);
    if(!(grams>0))return null;
    const values={};
    for(let i=0;i<nutrients.length;i++){
      values[nutrients[i]]=num($(fields[i+1])?.value);
      if(values[nutrients[i]]===null)return null;
    }
    const norm={};
    for(const key of nutrients)norm[key]=round(values[key]*100/grams,5);
    return {grams,base100:norm,source:state.selected?.source||'Ręcznie'};
  }
  function restoreSelection(meal){
    clearSelection();
    let grams=num(meal.grams),normal=meal.source100||null,source=String(meal.source||'Zapisany posiłek');
    if(!(grams>0)||!normal){
      // Older meals only had a free-text portion. Restore only unambiguous gram amounts.
      const portion=String(meal.portion||'');
      const match=portion.match(/^(\d+(?:[.,]\d+)?)\s*g(?:\s|$|\()/i)||
        portion.match(/\((\d+(?:[.,]\d+)?)\s*g\)/i);
      grams=match?num(match[1]):null;
      if(!(grams>0))return;
      normal={};
      for(const key of nutrients)normal[key]=round((Number(meal[key])||0)*100/grams,5);
      source='Odtworzone ze starej porcji — sprawdź wartości z etykietą';
    }
    state.selected={base100:normal,grams,source};
    if($('v0885Grams'))$('v0885Grams').value=grams;
    if($('v0885Source'))$('v0885Source').textContent='Edycja gramów przelicza wszystkie wartości. '+source;
  }
  function changeGrams(){
    const g=num($('v0885Grams')?.value);
    if(!state.selected)return;
    if(!(g>0)){
      nutrients.forEach((k,i)=>{const input=$(fields[i+1]);if(input)input.value='';});
      if($('v0885Source'))$('v0885Source').textContent='Podaj liczbę gramów większą od zera.';
      return;
    }
    state.selected.grams=g;
    const values=recalc(state.selected.base100,g);
    nutrients.forEach((k,i)=>{if($(fields[i+1]))$(fields[i+1]).value=values[k]===null?'':values[k];});
    if($('v077Portion'))$('v077Portion').value=fmt(g)+' g';
  }
  function readItem(){
    const name=String($('v076MealName')?.value||'').trim().slice(0,60);
    if(!name){toastSafe('Podaj nazwę składnika.');return null;}
    const protein=num($('v076Protein')?.value),carbs=num($('v076Carbs')?.value),
      fat=num($('v076Fat')?.value),explicitKcal=num($('v076Kcal')?.value);
    if(protein===null||carbs===null||fat===null){
      toastSafe('Uzupełnij B/W/T składnika, także zerami, gdy wartość wynosi 0.');return null;
    }
    const kcal=explicitKcal===null?round(protein*4+carbs*4+fat*9,1):explicitKcal;
    let grams=num($('v0885Grams')?.value);
    const portion=String($('v077Portion')?.value||'').trim().slice(0,30);
    const source=state.selected&&grams>0?state.selected:null;
    let normalized=null;
    if(grams>0){
      // The edited form is authoritative: manual changes also update per-100g basis.
      normalized={kcal:round(kcal*100/grams,5),protein:round(protein*100/grams,5),
        carbs:round(carbs*100/grams,5),fat:round(fat*100/grams,5)};
    }
    return {id:id(),name,portion,grams:grams||null,base100:normalized,
      source:source?.source||'Ręcznie',kcal,protein,carbs,fat};
  }
  function addIngredient(){
    const x=readItem();if(!x)return;
    state.items.push(x);window.TrenerDiet076?.cancelEdit?.();clearFood();render();
    toastSafe('Dodano składnik: '+x.name);
  }
  function sumItems(items){
    const t={kcal:0,protein:0,carbs:0,fat:0};
    for(const x of items)for(const k of nutrients)t[k]+=Number(x[k])||0;
    for(const k of nutrients)t[k]=round(t[k],1);
    return t;
  }
  function totals(){return sumItems(state.items);}
  function render(){
    const list=$('v0885Items');if(!list)return;
    list.innerHTML=state.items.length?state.items.map((x,i)=>
      '<div class="v0885Item"><div><strong>'+esc(x.name)+'</strong><small>'+
      fmt(x.kcal)+' kcal • B '+fmt(x.protein)+' • W '+fmt(x.carbs)+' • T '+fmt(x.fat)+
      (x.portion?' • '+esc(x.portion):'')+'</small></div>'+
      (x.base100&&x.grams>0?'<label>g<input class="v0885ItemGrams" type="number" min="0.01" step="any" inputmode="decimal" data-grams="'+i+'" value="'+x.grams+'"></label>':
        '<span class="v0885Plain">ręcznie</span>')+
      '<button class="secondary" type="button" data-remove="'+i+'" aria-label="Usuń składnik">×</button></div>'
    ).join(''):'<p class="hint">Dodaj np. chleb, szynkę i ser — zapiszą się jako jeden posiłek.</p>';
    const t=totals();
    $('v0885Total').textContent=fmt(t.kcal)+' kcal • B '+fmt(t.protein)+' g • W '+
      fmt(t.carbs)+' g • T '+fmt(t.fat)+' g';
    $('v0885Save').disabled=state.items.length===0;
    $('v0885Save').textContent=state.editId?'ZAPISZ ZMIANY POSIŁKU':'ZAPISZ POSIŁEK ZE SKŁADNIKÓW';
    $('v0885Cancel').hidden=!state.editId&&!state.items.length;
    $('v0885AddIngredient').textContent='DODAJ SKŁADNIK DO POSIŁKU';
    const standalone=$('v076AddMeal');if(standalone){
      standalone.disabled=state.items.length>0||!!state.editId;
      standalone.title=standalone.disabled?'Zapisz lub wyczyść rozpoczęty posiłek ze składników.':'';
    }
    if($('v0885Message'))$('v0885Message').textContent=state.editId?
      'Edytujesz złożony posiłek. Zmiany składników zapisz przyciskiem poniżej.':'';
  }
  function saveMeal(){
    if(!state.items.length)return;
    const name=String($('v0885Name')?.value||'').trim().slice(0,60)||
      (state.items.length===1?state.items[0].name:'Posiłek z '+state.items.length+' składników');
    const type=$('v0885Type')?.value||'other';
    const d=diet(),t=totals(),now=Date.now();
    const row={name,type,...t,ingredients:clone(state.items)};
    if(state.editId){
      const old=(d.meals||[]).find(m=>m.id===state.editId);
      if(!old){toastSafe('Nie znaleziono edytowanego posiłku.');return;}
      Object.assign(old,row);
    }else{
      d.meals.push({id:'m'+now.toString(36)+Math.random().toString(36).slice(2,7),
        date:window.TrenerDiet076?.getDate?.()||localDay(),createdAt:now,...row});
    }
    if(!save(d))return;
    state.items=[];state.editId=null;state.editDate='';clearFood();
    $('v0885Name').value='';render();toastSafe('Posiłek zapisany — jedna pozycja w bilansie dnia.');
  }
  function localDay(){
    const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+
      String(d.getDate()).padStart(2,'0');
  }
  function cancel(){
    state.items=[];state.editId=null;state.editDate='';
    if($('v0885Name'))$('v0885Name').value='';
    clearFood();render();
  }
  function edit(meal){
    if(!Array.isArray(meal.ingredients)||!meal.ingredients.length)return;
    if(state.items.length&&!confirm('Zastąpić niezapisany posiłek edycją „'+meal.name+'”?'))return;
    window.TrenerDiet076?.cancelEdit?.();
    state.items=clone(meal.ingredients);state.editId=meal.id;state.editDate=meal.date;
    window.TrenerDiet076?.setDate?.(meal.date);
    $('v0885Name').value=meal.name||'';
    $('v0885Type').value=meal.type||'other';
    const card=$('v076AddMeal')?.closest('.card');
    if(card?.classList.contains('v084Collapsed'))card.querySelector('.v084Toggle')?.click();
    render();
    $('v0885Name')?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function install(){
    const add=$('v076AddMeal')?.closest('.card');
    if(!add||$('v0885Composer')||!$('v077Portion'))return false;
    const portion=$('v077Portion')?.parentElement;
    if(portion){
      const grams=document.createElement('div');grams.className='v0885GramsWrap';
      grams.innerHTML='<label>Gramy produktu / porcji [g]</label>'+
        '<input id="v0885Grams" type="number" min="0.01" step="any" inputmode="decimal" placeholder="np. 150">'+
        '<small id="v0885Source">Wpisy ręczne: pola B/W/T/kcal oznaczają wartości dla podanej porcji.</small>';
      portion.insertAdjacentElement('afterend',grams);
      $('v0885Grams').addEventListener('input',changeGrams);
    }
    const style=document.createElement('style');style.id='v0885Css';style.textContent=[
      '#diet .v0885Composer{margin-top:16px;padding-top:15px;border-top:1px solid #363636}',
      '#diet .v0885Composer h3{font-size:16px;margin:0 0 8px}',
      '#diet .v0885Composer button{margin:7px 0!important}',
      '#diet .v0885Composer .v0885Item{display:grid;grid-template-columns:minmax(0,1fr) 69px 34px;gap:7px;align-items:center;padding:8px 0;border-top:1px solid #303030}',
      '#diet .v0885Item strong{display:block;font-size:12px;overflow-wrap:anywhere}',
      '#diet .v0885Item small{display:block;font-size:10px;color:#aaa;line-height:1.4}',
      '#diet .v0885Item label{font-size:10px;color:#aaa}',
      '#diet .v0885Item input{width:100%;height:36px;min-width:0;padding:4px!important;font-size:13px}',
      '#diet .v0885Item button{width:34px!important;min-width:34px!important;height:36px;margin:0!important;padding:0!important}',
      '#diet .v0885Plain{color:#777;font-size:9px}',
      '#diet .v0885Total{margin:12px 0;font-size:13px;font-weight:800}',
      '#diet .v0885GramsWrap{grid-column:1/-1}',
      '#diet .v0885GramsWrap small{display:block;color:#999;font-size:10px;line-height:1.4;margin-top:5px}',
      '#diet .v0885Composer .v0885Buttons{display:grid;gap:5px}',
      '#diet .v0885Composer .v0885Buttons button{width:100%}'
    ].join('\n');document.head.appendChild(style);
    const pane=document.createElement('div');pane.id='v0885Composer';pane.className='v0885Composer';
    pane.innerHTML='<h3>Złóż posiłek z kilku produktów</h3>'+
      '<p class="hint">Wybierz produkt w bazie lub wpisz go ręcznie powyżej. Uzupełnij gramaturę i wartości, następnie dodaj składnik. Każdy składnik policzy się tylko raz.</p>'+
      '<button id="v0885AddIngredient" class="secondary bigBtn" type="button">DODAJ SKŁADNIK DO POSIŁKU</button>'+
      '<div id="v0885Items"></div><div id="v0885Total" class="v0885Total"></div>'+
      '<div class="v076Fields"><div class="wide"><label>Nazwa całego posiłku</label>'+
      '<input id="v0885Name" maxlength="60" placeholder="np. Kanapki z serem i szynką"></div>'+
      '<div class="wide"><label>Typ posiłku</label><select id="v0885Type">'+
      '<option value="breakfast">Śniadanie</option><option value="lunch">Obiad</option>'+
      '<option value="dinner">Kolacja</option><option value="snack">Przekąska</option>'+
      '<option value="other">Inne</option></select></div></div>'+
      '<div class="v0885Buttons"><button id="v0885Save" class="primary bigBtn" type="button">ZAPISZ POSIŁEK ZE SKŁADNIKÓW</button>'+
      '<button id="v0885Cancel" class="secondary bigBtn" type="button" hidden>WYCZYŚĆ / ANULUJ</button></div>'+
      '<p id="v0885Message" class="hint" role="status"></p>';
    add.appendChild(pane);
    $('v0885AddIngredient').onclick=addIngredient;
    $('v0885Save').onclick=saveMeal;
    $('v0885Cancel').onclick=cancel;
    pane.addEventListener('click',e=>{
      const button=e.target.closest('[data-remove]');if(!button)return;
      state.items.splice(Number(button.dataset.remove),1);render();
    });
    pane.addEventListener('change',e=>{
      const input=e.target.closest('[data-grams]');if(!input)return;
      const item=state.items[Number(input.dataset.grams)],grams=num(input.value);
      if(!item||!item.base100||!(grams>0)){toastSafe('Masa musi być większa od zera.');render();return;}
      Object.assign(item,recalc(item.base100,grams));item.grams=grams;item.portion=fmt(grams)+' g';render();
    });
    ['v076Kcal','v076Protein','v076Carbs','v076Fat'].forEach(k=>$(k)?.addEventListener('input',()=>{
      if(state.selected){state.selected=null;
        $('v0885Source').textContent='Wartości zmienione ręcznie. Dalsza zmiana gramów nie nadpisze Twojej korekty.';}
    }));
    $('v076AddMeal')?.addEventListener('click',()=>{if(!state.items.length&&!state.editId)setTimeout(clearSelection,0);});
    render();return true;
  }
  function boot(){
    let n=0;const t=setInterval(()=>{n++;if(install()||n>=90)clearInterval(t);},100);
  }
  window.TrenerMealComposer0885={setCatalogSource,clearSelection,captureSelection,restoreSelection,edit,recalc,totals:()=>totals(),
    calculate:(per100,grams)=>recalc(per100,grams),sumItems};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();