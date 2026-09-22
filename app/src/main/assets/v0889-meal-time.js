(function(){
'use strict';
// Convenience default, not a rule for the user's diet. All hours use the phone's local time.
const IDS=['v076MealType','v0885Type'];
const $=id=>document.getElementById(id);
function typeForHour(hour){
  const h=Number(hour);
  if(!Number.isFinite(h))return 'breakfast';
  if(h<10)return 'breakfast';
  if(h<15)return 'lunch';
  if(h<18)return 'afternoon';
  return 'dinner';
}
function currentType(date=new Date()){return typeForHour(date.getHours());}
function typeForRepeat(previous,date=new Date()){
  // A repeat or saved set is a new meal at the current time, unless the user
  // deliberately classified it as "Przekąska" or "Inne".
  return previous==='snack'||previous==='other'?previous:currentType(date);
}
function apply(id,force=false){
  const el=$(id);if(!el)return false;
  if(!force&&el.dataset.mealTimeManual==='1')return false;
  el.value=currentType();
  el.dataset.mealTimeManual='0';
  return true;
}
function reset(){
  IDS.forEach(id=>apply(id,true));
}
function beginEdit(id,type){
  const el=$(id);if(!el)return;
  el.value=type||'other';
  el.dataset.mealTimeManual='1';
}
function install(){
  let installed=0;
  for(const id of IDS){
    const el=$(id);if(!el)continue;
    installed++;
    if(el.dataset.mealTimeReady==='1')continue;
    el.dataset.mealTimeReady='1';
    el.addEventListener('change',()=>{el.dataset.mealTimeManual='1';});
    apply(id,true);
  }
  return installed===IDS.length;
}
function boot(){
  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>=90)clearInterval(timer);},100);
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('.tab[data-tab="diet"]'))IDS.forEach(id=>apply(id));
  });
  window.addEventListener('focus',()=>IDS.forEach(id=>apply(id)));
}
window.TrenerMealTime0889={typeForHour,currentType,typeForRepeat,apply,reset,beginEdit,install};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();