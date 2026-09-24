(function(root){
'use strict';
const DIET_KEY='trainer3.diet.v076';
const round=(x,n=1)=>Math.round(x*10**n)/10**n;
const num=x=>{const v=Number(String(x??'').replace(',','.'));return Number.isFinite(v)&&v>=0?v:null;};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function localDate(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function validDay(d){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d||'')))return false;
 const dt=new Date(d+'T12:00:00');return !Number.isNaN(+dt)&&localDate(dt)===d;}
function totals(items){const t={kcal:0,protein:0,carbs:0,fat:0};for(const x of items)for(const k of Object.keys(t))t[k]+=x[k];for(const k of Object.keys(t))t[k]=round(t[k]);return t;}
function prepare(meal,grams){
 if(!meal||!Array.isArray(meal.items)||!meal.items.length)throw Error('Brak składników przepisu.');
 const f=root.TrenerRecipes090?.FOODS;if(!f)throw Error('Nie wczytano bazy przepisów.');
 const items=meal.items.map((x,i)=>{
  const key=x.key||x[0],food=f[key],g=grams?.[i]??x.grams??x[1],weight=num(g);
  if(!food||weight===null||weight<=0||weight>10000)throw Error('Nieprawidłowa gramatura składnika '+(i+1)+'.');
  const values={kcal:round(food[1]*weight/100),protein:round(food[2]*weight/100),
   carbs:round(food[3]*weight/100),fat:round(food[4]*weight/100)};
  return {id:'recipe-i-'+i,key,name:food[0],grams:weight,portion:weight+' g',
   base100:{kcal:food[1],protein:food[2],carbs:food[3],fat:food[4]},
   source:'Przepisy Trener 2',...values};
 });
 return {name:String(meal.name||'Posiłek z przepisu').slice(0,60),type:meal.type||'other',
  recipeId:meal.recipeId||meal.id||'',ingredients:items,...totals(items)};
}
function readDiet(){const api=root.TrenerDiet076;
 if(!api||typeof api.load!=='function')throw Error('Nie wczytano Diety.');
 const d=api.load();if(!d||!Array.isArray(d.meals))throw Error('Nieprawidłowe dane Diety.');
 return d;
}
function saveApproved(preview,date,confirm){
 if(confirm!==true)throw Error('Najpierw zatwierdź dodanie posiłku.');
 if(!validDay(date))throw Error('Nieprawidłowa data posiłku.');
 const d=readDiet(),now=Date.now();
 // No meal is persisted on preview; only the explicit approval path writes once.
 const meal={id:'recipe-'+now.toString(36)+'-'+Math.random().toString(36).slice(2,9),
  date,createdAt:now,type:preview.type,name:preview.name,recipeId:preview.recipeId,
  source:'Przepisy Trener 2',kcal:preview.kcal,protein:preview.protein,
  carbs:preview.carbs,fat:preview.fat,ingredients:JSON.parse(JSON.stringify(preview.ingredients))};
 d.meals.push(meal);
 try{localStorage.setItem(DIET_KEY,JSON.stringify(d));}
 catch(e){throw Error('Brak miejsca na zapis. Starsze dane pozostają bez zmian.');}
 try{root.TrenerDiet076?.render?.();root.TrenerWidget077?.sync?.(true);}catch(e){}
 return meal;
}
const api=Object.freeze({prepare,saveApproved,validDay,localDate,totals});
root.TrenerRecipeDiet093=api;
if(typeof document==='undefined')return;
let selected=null,original=null,kind='',index=0;
const $=id=>document.getElementById(id);
const info=msg=>{const el=$('r093Info');if(el)el.textContent=msg;};
function editor(meal,mode,idx){
 original=meal;kind=mode;index=idx;
 const date=root.TrenerDiet076?.getDate?.()||localDate();
 selected={date,grams:meal.items.map(x=>x.grams??x[1])};
 const box=$('r093Preview');if(!box)return;
 box.hidden=false;
 box.innerHTML='<h3>Potwierdź posiłek</h3><p class="hint">Sam plan nie jest zapisem jedzenia. Możesz zmienić ilości przed dodaniem.</p>'+
 '<label>Data w dzienniku<input id="r093Date" type="date" value="'+esc(date)+'"></label>'+
 '<div id="r093Ingredients"></div><p id="r093Totals" aria-live="polite"></p>'+
 '<button type="button" class="primary bigBtn" id="r093Approve">DODAJ DO DIETY — POTWIERDZAM</button>'+
 '<button type="button" class="secondary bigBtn" id="r093Cancel">Anuluj</button>'+
 '<p id="r093Info" role="status"></p>';
 $('r093Date').addEventListener('change',e=>{selected.date=e.target.value;});
 $('r093Cancel').addEventListener('click',()=>{box.hidden=true;selected=null;original=null;});
 $('r093Approve').addEventListener('click',()=>{
  try{
   const preview=prepare(original,selected.grams);
   saveApproved(preview,selected.date,true);
   box.hidden=true;selected=null;original=null;
   const message=$('r090DietMessage');if(message)message.textContent='Posiłek został dodany do Diety. Możesz go tam edytować.';
  }catch(e){info(e.message||String(e));}
 });
 drawIngredients();
 box.scrollIntoView?.({block:'nearest',behavior:'smooth'});
}
function drawIngredients(){
 const box=$('r093Ingredients');if(!box||!original||!selected)return;
 let preview;
 try{preview=prepare(original,selected.grams);}catch(e){info(e.message);return;}
 box.innerHTML=preview.ingredients.map((x,i)=>'<label class="r093Ingredient">'+esc(x.name)+
 '<input type="number" min="0.1" max="10000" step="any" inputmode="decimal" data-ingredient="'+i+
 '" value="'+x.grams+'"> g</label>').join('');
 $('r093Totals').textContent=preview.kcal+' kcal · B '+preview.protein+' g · W '+preview.carbs+' g · T '+preview.fat+' g';
 box.querySelectorAll('[data-ingredient]').forEach(el=>el.addEventListener('input',()=>{
  const weight=num(el.value);
  if(weight===null||weight<=0||weight>10000){info('Podaj gramaturę większą od zera.');$('r093Approve').disabled=true;return;}
  selected.grams[Number(el.dataset.ingredient)]=weight;
  try{const updated=prepare(original,selected.grams);
   $('r093Totals').textContent=updated.kcal+' kcal · B '+updated.protein+' g · W '+updated.carbs+' g · T '+updated.fat+' g';
   $('r093Approve').disabled=false;info('');
  }catch(e){$('r093Approve').disabled=true;info(e.message);}
 }));
}
function openFromPlan(day,mealIndex){
 const recipe=root.TrenerRecipes090;
 const plan=root.TrenerRecipePlan090?.();
 if(!plan||!plan.days?.[day-1]){info('Najpierw wygeneruj jadłospis.');return;}
 const meal=plan.days[day-1].meals[mealIndex];if(meal)editor(meal,'plan',mealIndex);
}
function openLibrary(recipeId){
 const recipe=root.TrenerRecipes090?.RECIPES.find(x=>x.id===recipeId);
 if(!recipe)return;
 editor({...root.TrenerRecipes090.nutrition(recipe,1),name:recipe.name,type:recipe.type,recipeId:recipe.id},'library',0);
}
function boot(){
 const host=$('recipes');if(!host)return;
 const box=document.createElement('section');box.id='r093Preview';box.className='card r093Preview';box.hidden=true;
 host.appendChild(box);
 host.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-r093-plan],[data-r093-recipe]');if(!el)return;
  if(el.dataset.r093Plan!==undefined)openFromPlan(Number(el.dataset.r093Plan),Number(el.dataset.meal));
  else openLibrary(el.dataset.r093Recipe);
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof window!=='undefined'?window:globalThis);
