(function(){
  'use strict';
  const KEY='trainer3.diet.v076';
  let last='';
  function safe(raw,fallback){try{return JSON.parse(raw||'')||fallback;}catch(e){return fallback;}}
  function num(v){const n=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(n)?Math.max(0,n):0;}
  function decimal(v){return Math.round(v*10)/10;}
  function dayKey(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function payloadFor(d,today){
    const totals=(Array.isArray(d.meals)?d.meals:[]).filter(m=>m.date===today).reduce((a,m)=>{
      a.kcal+=num(m.kcal);a.protein+=num(m.protein);
      a.carbs+=num(m.carbs);a.fat+=num(m.fat);return a;
    },{kcal:0,protein:0,carbs:0,fat:0});
    const targets=d.targets||{};
    return {day:today,mode:['reduce','gain'].includes(targets.mode)?targets.mode:'maintain',
      kcal:Math.round(totals.kcal),protein:decimal(totals.protein),
      carbs:decimal(totals.carbs),fat:decimal(totals.fat),
      targetKcal:Math.round(num(targets.kcal)),
      targetProtein:decimal(num(targets.protein)),
      targetCarbs:decimal(num(targets.carbs)),targetFat:decimal(num(targets.fat))};
  }
  function sync(force=false){
    try{
      if(!(window.TrenerWidget&&TrenerWidget.syncDietWidget))return;
      const d=safe(localStorage.getItem(KEY),{targets:{},meals:[]});
      const payload=payloadFor(d,dayKey());
      const signature=JSON.stringify(payload);
      if(!force&&signature===last)return;
      TrenerWidget.syncDietWidget(JSON.stringify({...payload,updatedAt:Date.now()}));
      last=signature;
    }catch(e){}
  }
  // If the app is open, changes and midnight roll-over are reflected even without
  // switching to the Diet tab. Widget provider handles date roll-over when app is closed.
  setInterval(sync,1200);setTimeout(()=>sync(true),350);
  document.addEventListener('click',()=>setTimeout(sync,100),true);
  window.TrenerWidget077={sync,payloadFor,dayKey};
})();