(function(){
'use strict';
const $=id=>document.getElementById(id);
function reveal(card){
  if(card?.classList.contains('v084Collapsed'))card.querySelector('.v084Toggle')?.click();
}
function focus(id){
  const el=$(id);if(!el)return;
  try{el.scrollIntoView({behavior:'smooth',block:'center'});el.focus?.();}catch(e){}
}
function open(action){
  if(typeof showTab==='function')showTab('diet');
  else document.querySelector('.tab[data-tab="diet"]')?.click();
  const add=$('v076AddMeal')?.closest('.card');
  const catalog=$('v083FoodCard');
  const choice=String(action||'WRITE').toUpperCase();
  if(window.TrenerDietVisual0890?.ready){
    window.TrenerDietVisual0890.openSheet('add',choice==='SET'?'sets':choice==='SCAN'?'compose':'search');
    if(choice==='SCAN'){
      if(window.Android&&typeof Android.scanFoodBarcode==='function')Android.scanFoodBarcode();
      else $('v0802Scan')?.click();
    }else if(choice==='SET')focus('v0885Templates');
    else focus('v083Query');
    return;
  }
  if(choice==='SCAN'){
    reveal(add);
    focus('v0802OffBox');
    if(window.Android&&typeof Android.scanFoodBarcode==='function'){
      Android.scanFoodBarcode();
    }else $('v0802Scan')?.click();
  }else if(choice==='SET'){
    reveal(add);
    focus('v0885Templates');
    if(!$('v0885Templates'))focus('v0885Composer');
  }else{
    reveal(catalog);focus('v083Query');
    if(!$('v083Query')){reveal(add);focus('v076MealName');}
  }
}
function install(){
  const card=$('v076AddMeal')?.closest('.card');
  if(!card||$('v0886Entry'))return !!$('v0886Entry');
  const style=document.createElement('style');
  style.id='v0886EntryStyle';
  style.textContent='#diet #v0886Entry{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:6px 0 14px}'+
    '#diet #v0886Entry button{min-width:0!important;width:100%;margin:0!important;padding:12px 3px!important;border-radius:13px!important;font-size:12px!important}'+
    '#diet #v0802ScanActions{display:none!important}';
  document.head.appendChild(style);
  const box=document.createElement('div');
  box.id='v0886Entry';
  box.innerHTML='<button class="primary" type="button" data-meal-open="SCAN">📷 SKANUJ</button>'+
    '<button class="secondary" type="button" data-meal-open="WRITE">⌕ WPISZ</button>'+
    '<button class="secondary" type="button" data-meal-open="SET">▦ ZESTAW</button>';
  card.insertBefore(box,card.querySelector('.v076Fields'));
  box.addEventListener('click',ev=>{const b=ev.target.closest('[data-meal-open]');if(b)open(b.dataset.mealOpen);});
  return true;
}
function boot(){
  let attempts=0;
  const timer=setInterval(()=>{attempts++;if(install()||attempts>=90)clearInterval(timer);},100);
}
window.TrenerMealEntry0886={open,install};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();