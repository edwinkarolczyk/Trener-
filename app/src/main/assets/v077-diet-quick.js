(function(){
  'use strict';

  const DIET_KEY='trainer3.diet.v076';
  const FAV_KEY='trainer3.dietFavorites.v077';
  const $=id=>document.getElementById(id);

  function safe(raw,fallback){try{return JSON.parse(raw||'')||fallback}catch(e){return fallback}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function num(v){const n=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(n)?Math.max(0,n):0;}
  function uid(){return 'm'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
  function dayKey(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function diet(){const d=safe(localStorage.getItem(DIET_KEY),{targets:{},meals:[],shopping:[]});if(!Array.isArray(d.meals))d.meals=[];return d;}
  function saveDiet(d){localStorage.setItem(DIET_KEY,JSON.stringify(d));try{window.TrenerDiet076?.render?.();}catch(e){}syncWidget(d);}
  function favorites(){const f=safe(localStorage.getItem(FAV_KEY),[]);return Array.isArray(f)?f:[];}
  function saveFavorites(f){localStorage.setItem(FAV_KEY,JSON.stringify(f.slice(0,40)));}
  function signature(m){return [String(m.name||'').trim().toLowerCase(),num(m.kcal),num(m.protein),num(m.carbs),num(m.fat),String(m.portion||'').trim().toLowerCase()].join('|');}
  function cloneFood(m){return {name:String(m.name||'Posiłek').slice(0,60),type:m.type||'other',kcal:num(m.kcal),protein:num(m.protein),carbs:num(m.carbs),fat:num(m.fat),portion:String(m.portion||'').slice(0,30),...(Array.isArray(m.ingredients)&&m.ingredients.length?{ingredients:JSON.parse(JSON.stringify(m.ingredients))}:{}),...(m.grams>0&&m.source100?{grams:m.grams,source100:JSON.parse(JSON.stringify(m.source100)),source:m.source||''}:{})};}
  function recents(d){
    const seen=new Set(),out=[];
    [...(d.meals||[])].sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).forEach(m=>{const s=signature(m);if(!s||seen.has(s))return;seen.add(s);out.push(cloneFood(m));});
    return out.slice(0,10);
  }
  function isFav(food){const s=signature(food);return favorites().some(x=>signature(x)===s);}
  function fmt(food){return `${Math.round(num(food.kcal))} kcal • B ${num(food.protein).toFixed(1)} • W ${num(food.carbs).toFixed(1)} • T ${num(food.fat).toFixed(1)}${food.portion?' • '+esc(food.portion):''}`;}

  function installCss(){
    if($('v077DietQuickStyle'))return;
    const s=document.createElement('style');s.id='v077DietQuickStyle';s.textContent=`
      #diet .v077QuickTabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
      #diet .v077QuickTabs button{margin:0!important}.v077QuickList{display:grid;gap:8px}.v077QuickRow{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:10px;border:1px solid #2b2b2b;border-radius:12px;background:#101010}
      .v077QuickRow strong{display:block;font-size:13px}.v077QuickRow small{display:block;color:#999;font-size:9px;margin-top:3px;line-height:1.35}.v077QuickRow button{margin:0!important;padding:8px 9px!important;min-width:42px!important}
      .v077Portion{grid-column:1/-1}.v077Star{font-size:18px!important}.v077Empty{color:#888;font-size:11px;margin:6px 0}
    `;document.head.appendChild(s);
  }

  function installUi(){
    if($('v077QuickCard'))return;
    const root=$('v076DietRoot');if(!root)return;
    const addCard=$('v076AddMeal')?.closest('.card');if(!addCard)return;

    const portionWrap=document.createElement('div');portionWrap.className='v077Portion';portionWrap.innerHTML='<label>Porcja / ilość</label><input id="v077Portion" maxlength="30" placeholder="np. 150 g, 2 szt., 1 porcja">';
    const fields=addCard.querySelector('.v076Fields');if(fields)fields.appendChild(portionWrap);

    const card=document.createElement('div');card.id='v077QuickCard';card.className='card';
    card.innerHTML=`<div class="eyebrow">SZYBKIE DODAWANIE</div><h2>Ostatnie i ulubione</h2>
      <div class="v077QuickTabs"><button id="v077RecentTab" class="secondary active" type="button">OSTATNIE</button><button id="v077FavTab" class="secondary" type="button">ULUBIONE</button></div>
      <div id="v077QuickList" class="v077QuickList"></div>`;
    root.insertBefore(card,addCard);
    $('v077RecentTab').onclick=()=>renderQuick('recent');$('v077FavTab').onclick=()=>renderQuick('fav');
    card.addEventListener('click',handleQuick);

    $('v076AddMeal')?.addEventListener('click',()=>setTimeout(afterManualAdd,0));
    renderQuick('recent');syncWidget(diet());
  }

  function renderQuick(mode){
    const d=diet(),items=mode==='fav'?favorites():recents(d),list=$('v077QuickList');if(!list)return;
    $('v077RecentTab')?.classList.toggle('active',mode==='recent');$('v077FavTab')?.classList.toggle('active',mode==='fav');
    list.dataset.mode=mode;
    list.innerHTML=items.length?items.map((food,i)=>`<div class="v077QuickRow" data-index="${i}"><div><strong>${esc(food.name)}</strong><small>${fmt(food)}</small></div><button class="secondary v077Star" type="button" data-quick="fav">${isFav(food)?'★':'☆'}</button><button class="primary" type="button" data-quick="add">+ DODAJ</button></div>`).join(''):'<div class="v077Empty">Tu pojawią się produkty, które dodajesz najczęściej.</div>';
  }

  function currentItems(){const mode=$('v077QuickList')?.dataset.mode||'recent';return mode==='fav'?favorites():recents(diet());}
  function handleQuick(ev){
    const btn=ev.target.closest('[data-quick]');if(!btn)return;const row=btn.closest('.v077QuickRow'),food=currentItems()[Number(row?.dataset.index||0)];if(!food)return;
    if(btn.dataset.quick==='add')quickAdd(food);
    if(btn.dataset.quick==='fav'){toggleFavorite(food);renderQuick($('v077QuickList')?.dataset.mode||'recent');}
  }
  function toggleFavorite(food){const list=favorites(),s=signature(food),idx=list.findIndex(x=>signature(x)===s);if(idx>=0)list.splice(idx,1);else list.unshift(cloneFood(food));saveFavorites(list);}
  function quickAdd(food){
    const d=diet(),row=cloneFood(food);
    row.type=window.TrenerMealTime0889?.typeForRepeat?.(row.type)||row.type;
    d.meals.push(Object.assign({id:uid(),date:dayKey(),createdAt:Date.now()},row));saveDiet(d);renderQuick($('v077QuickList')?.dataset.mode||'recent');try{toast('Dodano: '+food.name);}catch(e){}
  }

  function afterManualAdd(){
    if($('v076AddMeal')?.dataset.v077SkipPortion==='1'){
      delete $('v076AddMeal').dataset.v077SkipPortion;
      syncWidget(diet());renderQuick('recent');return;
    }
    const portion=String($('v077Portion')?.value||'').trim().slice(0,30),d=diet();
    const newest=[...(d.meals||[])].sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))[0];
    if(newest&&Date.now()-Number(newest.createdAt||0)<3000&&portion){newest.portion=portion;saveDiet(d);}else syncWidget(d);
    if($('v077Portion'))$('v077Portion').value='';renderQuick('recent');
  }

  function syncWidget(){
    try{window.TrenerWidget077?.sync?.(true);}catch(e){}
  }

  function boot(){installCss();let tries=0;const t=setInterval(()=>{tries++;installUi();if($('v077QuickCard')||tries>40)clearInterval(t);},100);}
  window.TrenerDiet077={syncWidget:()=>syncWidget(diet()),recents:()=>recents(diet()),favorites};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
