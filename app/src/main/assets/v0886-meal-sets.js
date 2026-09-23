(function(){
'use strict';
const KEY='trainer3.mealSets.v0886',DIET_KEY='trainer3.diet.v076';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy=x=>JSON.parse(JSON.stringify(x));
const round=x=>Math.round(x*10)/10;
const keys=['kcal','protein','carbs','fat'];
function sets(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}}
function saveList(rows){localStorage.setItem(KEY,JSON.stringify(rows.slice(0,60)));}
function sum(items){
 const totals={kcal:0,protein:0,carbs:0,fat:0};
 for(const item of items)for(const key of keys)totals[key]+=Math.max(0,Number(item[key])||0);
 for(const key of keys)totals[key]=round(totals[key]);
 return totals;
}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function message(s){const el=$('v0886SetMessage');if(el)el.textContent=s;}
function render(){
 const list=$('v0886SetList');if(!list)return;
 list.innerHTML=sets().map((s,i)=>'<div class="v0886Set"><div><strong>'+esc(s.name)+'</strong>'+
 '<small>'+s.ingredients.length+' składników • '+sum(s.ingredients).kcal+' kcal</small></div>'+
 '<button type="button" class="primary" data-set="add" data-index="'+i+'">+ DODAJ</button>'+
 '<button type="button" class="secondary" data-set="edit" data-index="'+i+'">EDYTUJ</button>'+
 '<button type="button" class="secondary" data-set="delete" data-index="'+i+'" aria-label="Usuń">×</button></div>').join('')||
 '<p class="hint">Zapisz własny zestaw, np. kanapki z serem i szynką. Dodasz go ponownie jednym kliknięciem.</p>';
}
function save(){
 const api=window.TrenerMealComposer0885;
 const ingredients=api?.getItems?.()||[];
 if(!ingredients.length){message('Najpierw dodaj składniki do zestawu.');return;}
 const name=String($('v0885Name')?.value||'').trim().slice(0,60)||
   (ingredients.length===1?ingredients[0].name:'Mój zestaw');
 const type=$('v0885Type')?.value||'other';
 const rows=sets(), editing=$('v0886Sets')?.dataset.editing||'';
 if(editing){
   const found=rows.find(x=>x.id===editing);
   if(found)Object.assign(found,{name,type,ingredients:copy(ingredients)});
   else rows.unshift({id:'set'+Date.now(),name,type,ingredients:copy(ingredients)});
 }else rows.unshift({id:'set'+Date.now()+Math.random().toString(36).slice(2,6),
   name,type,ingredients:copy(ingredients)});
 try{saveList(rows);$('v0886Sets').dataset.editing='';render();message('Zestaw zapisany. Nie doliczono go jeszcze do dziennego bilansu.');}
 catch(e){message('Nie udało się zapisać zestawu.');}
}
function add(index){
 const saved=sets()[index];if(!saved)return;
 const ingredients=copy(saved.ingredients);
 const entry={id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
   date:window.TrenerDiet076?.getDate?.()||today(),createdAt:Date.now(),name:saved.name,
   type:(window.TrenerDiet076?.getDate?.()||today())===today()?
      (window.TrenerMealTime0889?.typeForRepeat?.(saved.type)||saved.type||'other'):(saved.type||'other'),
   ...sum(ingredients),ingredients};
 let data;try{data=JSON.parse(localStorage.getItem(DIET_KEY)||'{}');}catch(e){data={};}
 if(!Array.isArray(data.meals))data.meals=[];
 data.meals.push(entry);data.version=1;
 try{
   localStorage.setItem(DIET_KEY,JSON.stringify(data));
   window.TrenerDiet076?.render?.();
   window.TrenerWidget077?.sync?.(true);
   render();message('Dodano „'+saved.name+'” jako jeden posiłek.');
 }catch(e){message('Nie udało się zapisać posiłku.');}
}
function choose(event){
 const b=event.target.closest('[data-set]');if(!b)return;
 const i=Number(b.dataset.index),saved=sets()[i];
 if(!saved)return;
 if(b.dataset.set==='add')return add(i);
 if(b.dataset.set==='edit'){
   if(window.TrenerMealComposer0885?.loadItems?.(saved.ingredients,saved.name,saved.type)){
     $('v0886Sets').dataset.editing=saved.id;message('Edytujesz zestaw. Zapisz go po zmianach.');
     $('v0885Composer')?.scrollIntoView({behavior:'smooth',block:'center'});
   }
   return;
 }
 if(b.dataset.set==='delete'&&confirm('Usunąć zestaw „'+saved.name+'”?')){
   saveList(sets().filter(x=>x.id!==saved.id));render();
 }
}
function install(){
 const pane=$('v0885Composer');if(!pane||$('v0886Sets'))return !!$('v0886Sets');
 const style=document.createElement('style');
 style.textContent='#diet .v0886Set{display:grid;grid-template-columns:minmax(0,1fr) auto auto 29px;gap:4px;align-items:center;border-top:1px solid #303030;padding:9px 0}'+
 '#diet .v0886Set strong{display:block;font-size:12px;overflow-wrap:anywhere}'+
 '#diet .v0886Set small{display:block;font-size:10px;color:#aaa}'+
 '#diet .v0886Set button{width:auto!important;min-width:0!important;font-size:10px!important;padding:8px 5px!important;margin:0!important}'+
 '#diet #v0886Sets{margin-top:15px;padding-top:14px;border-top:1px solid #333}'+
 '#diet #v0886SetMessage{font-size:11px;color:#9bd3ac}';
 document.head.appendChild(style);
 const box=document.createElement('div');box.id='v0886Sets';
 box.innerHTML='<button id="v0886SaveSet" class="secondary bigBtn" type="button">ZAPISZ JAKO MÓJ ZESTAW</button>'+
  '<p id="v0886SetMessage" role="status"></p><h3 id="v0885Templates">Moje zestawy</h3>'+
  '<div id="v0886SetList"></div>';
 pane.appendChild(box);
 $('v0886SaveSet').addEventListener('click',save);
 $('v0886SetList').addEventListener('click',choose);
 render();return true;
}
function boot(){let n=0;const t=setInterval(()=>{n++;if(install()||n>=90)clearInterval(t);},100);}
window.TrenerMealSets0886={sum,sets,add,render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();