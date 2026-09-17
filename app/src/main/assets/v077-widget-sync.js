(function(){
  'use strict';
  const KEY='trainer3.diet.v076';
  let last='';
  function safe(raw,fallback){try{return JSON.parse(raw||'')||fallback}catch(e){return fallback}}
  function num(v){const n=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(n)?Math.max(0,n):0;}
  function dayKey(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function sync(){
    try{
      if(!(window.TrenerWidget&&TrenerWidget.syncDietWidget))return;
      const d=safe(localStorage.getItem(KEY),{targets:{},meals:[]}),today=dayKey();
      const total=(Array.isArray(d.meals)?d.meals:[]).filter(m=>m.date===today).reduce((a,m)=>{a.kcal+=num(m.kcal);a.protein+=num(m.protein);return a;},{kcal:0,protein:0});
      const t=d.targets||{};
      const payload=JSON.stringify({kcal:Math.round(total.kcal),protein:Math.round(total.protein*10)/10,targetKcal:Math.round(num(t.kcal)),targetProtein:Math.round(num(t.protein)*10)/10,updatedAt:Date.now()});
      const signature=[Math.round(total.kcal),Math.round(total.protein*10),Math.round(num(t.kcal)),Math.round(num(t.protein)*10)].join('|');
      if(signature===last)return;last=signature;TrenerWidget.syncDietWidget(payload);
    }catch(e){}
  }
  setInterval(sync,1200);setTimeout(sync,350);
  document.addEventListener('click',()=>setTimeout(sync,100),true);
  window.TrenerWidget077={sync};
})();
