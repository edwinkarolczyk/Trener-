(function(){
'use strict';
const LIB='trainer3.foodCatalog.v083', CACHE='trainer3.foodSearchCache.v083',
      USDA_KEY='foodCatalog.usdaKey.local';
const $=id=>document.getElementById(id);
const state={picked:null,found:[],query:'',requestId:0,waiting:0,lastError:''};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;
  const n=Number(String(v).replace(',','.'));return Number.isFinite(n)&&n>=0?n:null;};
const rnd=(n,d=1)=>Math.round(n*10**d)/10**d;
const fmt=n=>n===null||n===undefined?'—':String(rnd(n)).replace('.',',');
function read(k,f){try{return JSON.parse(localStorage.getItem(k))??f;}catch(e){return f;}}
function own(){const x=read(LIB,[]);return Array.isArray(x)?x:[];}
function writeOwn(x){localStorage.setItem(LIB,JSON.stringify(x.slice(0,300)));}
function cached(){const x=read(CACHE,{});return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}
function storeCache(q,source,foods){
  const c=cached();c[source+':'+q.toLowerCase()]={at:Date.now(),items:foods};
  const out={};Object.keys(c).sort((a,b)=>c[b].at-c[a].at).slice(0,20).forEach(k=>out[k]=c[k]);
  try{localStorage.setItem(CACHE,JSON.stringify(out));}catch(e){}
}
function complete(p){return p&&p.name&&['kcal100','protein100','carbs100','fat100']
  .some(k=>p[k]!==null&&p[k]!==undefined);}

const QUERY_PL_EN={
  'jajko':'egg','jajka':'egg','jajecznica':'scrambled eggs',
  'pierś kurczaka':'chicken breast','pierś z kurczaka':'chicken breast',
  'piers kurczaka':'chicken breast','kurczak':'chicken','kurczaka':'chicken',
  'udko kurczaka':'chicken thigh','indyk':'turkey',
  'ryż':'rice','ryz':'rice','makaron':'pasta','chleb':'bread','bułka':'roll',
  'mintaj':'pollock','łosoś':'salmon','losos':'salmon','tuńczyk':'tuna',
  'mleko':'milk','masło':'butter','maslo':'butter','ser':'cheese',
  'wołowina':'beef','wolowina':'beef','wieprzowina':'pork',
  'ziemniaki':'potatoes','ziemniak':'potato','puree ziemniaczane':'mashed potatoes',
  'banan':'banana','jabłko':'apple','jablko':'apple','pomidor':'tomato',
  'ogórek':'cucumber','ogorek':'cucumber','marchew':'carrot',
  'pizza':'pizza','owsianka':'oatmeal','płatki owsiane':'oats',
  'oliwa':'olive oil','olej':'oil','mąka':'flour','maka':'flour'
};
const NAME_PL={
  pizza:'pizza',chicken:'kurczak',breast:'pierś',breasts:'piersi',
  thigh:'udko',turkey:'indyk',egg:'jajko',eggs:'jajka',scrambled:'jajecznica',
  rice:'ryż',bread:'chleb',pasta:'makaron',roll:'bułka',rolls:'bułki',
  fish:'ryba',pollock:'mintaj',salmon:'łosoś',tuna:'tuńczyk',
  beef:'wołowina',pork:'wieprzowina',milk:'mleko',butter:'masło',
  cheese:'ser',potato:'ziemniak',potatoes:'ziemniaki',
  banana:'banan',bananas:'banany',apple:'jabłko',apples:'jabłka',
  tomato:'pomidor',tomatoes:'pomidory',cucumber:'ogórek',carrot:'marchew',
  raw:'surowy',cooked:'gotowany',boiled:'gotowany',fried:'smażony',
  baked:'pieczony',roasted:'pieczony',roast:'pieczony',grilled:'grillowany',
  skinless:'bez skóry',boneless:'bez kości',white:'biały',brown:'brązowy',
  whole:'cały',fresh:'świeży',frozen:'mrożony',mashed:'puree',ground:'mielony',
  oats:'płatki owsiane',oatmeal:'owsianka',olive:'oliwkowy',oil:'olej'
};
function usdaQuery(q){
  const normalized=String(q||'').trim().toLocaleLowerCase('pl-PL').replace(/\s+/g,' ');
  return QUERY_PL_EN[normalized]||q;
}
function displayPl(original){
  const text=String(original||'').trim();
  let count=0;
  const phrases=[
    [/chicken breasts?/g,'pierś z kurczaka'],
    [/chicken thighs?/g,'udko kurczaka'],
    [/scrambled eggs?/g,'jajecznica'],
    [/mashed potatoes/g,'puree ziemniaczane'],
    [/olive oil/g,'oliwa z oliwek']
  ];
  let normalized=text.toLowerCase();
  for(const [pattern,label] of phrases){
    normalized=normalized.replace(pattern,()=>{count++;return label;});
  }
  const translated=normalized.replace(/[a-z]+/g,word=>{
    if(!Object.prototype.hasOwnProperty.call(NAME_PL,word))return word;
    count++;return NAME_PL[word];
  });
  return count?translated.charAt(0).toLocaleUpperCase('pl-PL')+translated.slice(1):text;
}

function off(p){
  const n=p.nutriments||{},nget=k=>num(n[k]);let kcal=nget('energy-kcal_100g');
  const joules=nget('energy_100g');if(kcal===null&&joules!==null)kcal=rnd(joules/4.184);
  return {id:'off:'+String(p.code||''),name:String(p.product_name_pl||p.product_name||'').trim().slice(0,90),
    source:'Open Food Facts',kcal100:kcal,protein100:nget('proteins_100g'),
    carbs100:nget('carbohydrates_100g'),fat100:nget('fat_100g'),
    servingGrams:num(p.serving_quantity),gramsPerPiece:null,gramsPerMl:null};
}
function usda(p){
  const ns=Array.isArray(p.foodNutrients)?p.foodNutrients:[];
  const val=ids=>{const x=ns.find(n=>ids.includes(Number(n.nutrientId||n.number))&&
    (Number(n.nutrientId||n.number)!==1008||String(n.unitName||'').toUpperCase()==='KCAL'));
    return x?num(x.value):null;};
  const protein=val([1003]),carbs=val([1005]),fat=val([1004]);
  let kcal=val([1008,2047,2048]);
  if(kcal===null&&protein!==null&&carbs!==null&&fat!==null)kcal=rnd(protein*4+carbs*4+fat*9);
  const originalName=String(p.description||'').slice(0,100);
  return {id:'usda:'+String(p.fdcId||''),name:displayPl(originalName).slice(0,90),originalName,
    source:'USDA FoodData Central',kcal100:kcal,protein100:protein,carbs100:carbs,fat100:fat,
    servingGrams:String(p.servingSizeUnit||'').toLowerCase()==='g'?num(p.servingSize):null,
    gramsPerPiece:null,gramsPerMl:null};
}
function status(msg,warn=false){const x=$('v083Status');if(x){x.textContent=msg;x.classList.toggle('foodWarn',warn);}}
function render(){
 const x=$('v083Results');if(!x)return;
 x.innerHTML=state.found.length?state.found.slice(0,50).map((p,i)=>`
 <div class="foodItem"><strong>${esc(p.name)}</strong>
 <small>${esc(p.source)}${p.originalName&&p.originalName.toLocaleLowerCase('pl-PL')!==p.name.toLocaleLowerCase('pl-PL')?' • oryg.: '+esc(p.originalName):''}</small>
 <small>${fmt(p.kcal100)} kcal • B ${fmt(p.protein100)} • W ${fmt(p.carbs100)} • T ${fmt(p.fat100)} / 100 g</small>
 <button class="secondary" type="button" data-food="pick" data-index="${i}">WYBIERZ</button>
 ${p.source==='Własny produkt'?`<button class="secondary" type="button" data-food="delete" data-index="${i}">USUŃ</button>`:''}</div>`).join(''):
 '<p class="foodMeta">Brak wyników. Możesz dodać własny produkt.</p>';
}
function merge(items){
 const seen=new Set(state.found.map(p=>p.id));
 items.forEach(p=>{if(complete(p)&&!seen.has(p.id)){state.found.push(p);seen.add(p.id);}});
 render();
}
function search(){
 const query=String($('v083Query').value||'').trim().slice(0,90);
 if(query.length<2){status('Wpisz co najmniej 2 znaki.',true);return;}
 state.query=query;state.requestId++;state.lastError='';state.waiting=0;
 state.found=own().filter(p=>p.name.toLocaleLowerCase('pl-PL').includes(query.toLocaleLowerCase('pl-PL')));
 $('v083Editor').classList.add('foodHidden');
 const cache=cached();
 ['off','usda'].forEach(source=>{const x=cache[source+':'+query.toLowerCase()];
   if(x&&Date.now()-x.at<7*86400000)merge(x.items||[]);});
 render();
 if(!window.Android||typeof Android.searchFoodCatalog!=='function'){
   status('Wyszukiwanie online wymaga aplikacji Android 0.8.3.',true);return;
 }
 ['off','usda'].forEach(source=>{
   const key=source==='usda'?(localStorage.getItem(USDA_KEY)||''):'';
   if(source==='usda'&&!key)return;
   state.waiting++;
   try{Android.searchFoodCatalog(source,source==='usda'?usdaQuery(query):query,key,state.requestId);}
   catch(e){state.waiting--;state.lastError='Błąd połączenia z bazą.';}
 });
 status(state.waiting?'Szukam w bazach…':'Wyniki lokalne. Dodaj klucz USDA, aby rozszerzyć wyszukiwanie.');
}
function nativeResult(source,result,payload,requestId){
 if(Number(requestId)!==state.requestId||!state.query)return;
 state.waiting=Math.max(0,state.waiting-1);
 if(result==='ok'){
   try{const raw=JSON.parse(payload);
     const items=(source==='off'?(raw.products||[]).map(off):(raw.foods||[]).map(usda))
       .filter(complete).slice(0,20);
     storeCache(state.query,source,items);merge(items);
   }catch(e){state.lastError='Otrzymano niepoprawne dane.';}
 }else{
   const unavailable=/\b(502|503|504)\b/.test(String(payload));
   state.lastError=source==='off'&&unavailable
      ? 'Open Food Facts chwilowo niedostępne. Wyniki USDA i własne produkty nadal działają.'
      : (source==='usda'?'USDA: ':'Open Food Facts: ')+String(payload||'Błąd połączenia.');
 }
 status(state.waiting?'Pobrano '+state.found.length+' wyników. Sprawdzam drugą bazę…':
   'Znaleziono '+state.found.length+' produktów.'+(state.lastError?' '+state.lastError:''),!!state.lastError);
}
function pick(p){
 state.picked={...p};$('v083Editor').classList.remove('foodHidden');
 $('v083EditorTitle').textContent=p.name||'Nowy produkt';
 $('v083Source').textContent='Źródło: '+p.source;
 $('v083Name').value=p.name||'';
 [['v083Kcal','kcal100'],['v083Protein','protein100'],['v083Carbs','carbs100'],
  ['v083Fat','fat100'],['v083Piece','gramsPerPiece'],['v083Density','gramsPerMl']]
 .forEach(([id,k])=>$(id).value=p[k]===null||p[k]===undefined?'':p[k]);
 $('v083Unit').value='g';$('v083Amount').value=p.servingGrams||100;calculate();
 $('v083Editor').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function data(){
 const p=state.picked||{};
 return {id:p.id||'',name:$('v083Name').value.trim().slice(0,90),source:p.source||'Własny produkt',
  kcal100:num($('v083Kcal').value),protein100:num($('v083Protein').value),
  carbs100:num($('v083Carbs').value),fat100:num($('v083Fat').value),
  gramsPerPiece:num($('v083Piece').value),gramsPerMl:num($('v083Density').value),
  servingGrams:p.servingGrams||null};
}
function calculate(){
 const unit=$('v083Unit').value,amount=num($('v083Amount').value),p=data();
 $('v083PieceWrap').classList.toggle('foodHidden',unit!=='szt');
 $('v083DensityWrap').classList.toggle('foodHidden',unit!=='ml');
 const multiplier=unit==='g'?1:unit==='szt'?p.gramsPerPiece:p.gramsPerMl;
 const grams=amount!==null&&multiplier>0?amount*multiplier:null;
 $('v083Calculated').textContent=grams===null?'Podaj poprawną ilość i przelicznik jednostki.':
  `${fmt(grams)} g • kcal/B/W/T: ${['kcal100','protein100','carbs100','fat100']
    .map(k=>fmt(p[k]===null?null:rnd(p[k]*grams/100))).join(' / ')}`;
 return grams;
}
function saveProduct(){
 const p=data();if(!p.name||!complete(p)){status('Podaj nazwę i co najmniej jedną wartość odżywczą.',true);return;}
 const id=state.picked?.source==='Własny produkt'&&state.picked.id?state.picked.id:
  'own:'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 const item={...p,id,source:'Własny produkt'};
 try{writeOwn([item,...own().filter(x=>x.id!==id)]);state.picked=item;
   status('Zapisano produkt lokalnie. Uwzględni go kopia danych.');}
 catch(e){status('Nie udało się zapisać produktu — sprawdź pamięć telefonu.',true);}
}
function use(){
 const p=data(),grams=calculate();
 if(!p.name||!complete(p)||grams===null||grams<=0){
   status('Podaj nazwę, wartości i poprawną ilość produktu.',true);return;
 }
 [['v076MealName',null],['v076Kcal','kcal100'],['v076Protein','protein100'],
  ['v076Carbs','carbs100'],['v076Fat','fat100']].forEach(([id,k])=>{
    if($(id))$(id).value=k?(p[k]===null?'':rnd(p[k]*grams/100)):p.name.slice(0,60);
  });
 const u=$('v083Unit').value;
 if($('v077Portion'))$('v077Portion').value=fmt(num($('v083Amount').value))+' '+u+' ('+fmt(grams)+' g)';
 $('v076AddMeal')?.scrollIntoView({behavior:'smooth',block:'center'});
 status('Przeliczono '+fmt(grams)+' g. Sprawdź pola i naciśnij DODAJ POSIŁEK.');
}
function install(){
 const root=$('v076DietRoot'),add=$('v076AddMeal')?.closest('.card');
 if(!root||!add||$('v083FoodCard'))return !!$('v083FoodCard');
 const style=document.createElement('style');style.textContent=`
 #v083FoodCard input,#v083FoodCard select{box-sizing:border-box;width:100%;min-width:0}
 #v083FoodCard .foodRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
 #v083FoodCard .foodRow button{margin:0!important}
 #v083FoodCard .foodResults{max-height:300px;overflow-y:auto;margin:10px 0}
 #v083FoodCard .foodItem{padding:8px 0;border-top:1px solid #333}
 #v083FoodCard .foodItem strong{display:block;font-size:13px}
 #v083FoodCard .foodItem small{display:block;font-size:10px;color:#aaa;margin:3px 0;line-height:1.4}
 #v083FoodCard .foodItem button{margin:5px 6px 0 0!important;padding:7px 10px!important}
 #v083FoodCard .foodGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
 #v083FoodCard .foodGrid label{font-size:11px}
 #v083FoodCard .foodMeta{font-size:10px;color:#aaa;line-height:1.45;margin:8px 0}
 #v083FoodCard .foodHidden{display:none!important}
 #v083FoodCard .foodActions{display:flex;flex-wrap:wrap;gap:8px}
 #v083FoodCard .foodActions button{margin:4px 0!important}
 #v083FoodCard .foodStatus{font-size:11px;color:#b7d7c4}
 #v083FoodCard .foodWarn{color:#f0bf75}`;
 document.head.appendChild(style);
 const card=document.createElement('div');card.id='v083FoodCard';card.className='card';
 card.innerHTML=`
 <div class="eyebrow">BAZA ŻYWNOŚCI • 0.8.3</div><h2>Znajdź produkt po nazwie</h2>
 <div class="foodRow"><div><label>Produkt</label><input id="v083Query" maxlength="90"
 placeholder="np. jajko, kurczak, ryż, mintaj"></div>
 <button id="v083Search" type="button" class="primary">SZUKAJ</button></div>
 <p class="foodMeta">Własne produkty → Open Food Facts → USDA. Nazwy USDA są tłumaczone pomocniczo; oryginał pozostaje widoczny. Sprawdzaj wartości z etykietą.</p>
 <div id="v083Status" class="foodStatus" role="status">Wpisz nazwę lub dodaj własny produkt.</div>
 <div id="v083Results" class="foodResults"></div>
 <div class="foodActions"><button id="v083New" type="button" class="secondary">+ NOWY WŁASNY</button>
 <button id="v083Own" type="button" class="secondary">MOJE PRODUKTY</button></div>
 <div id="v083Editor" class="foodHidden">
 <h3 id="v083EditorTitle">Produkt</h3><p class="foodMeta" id="v083Source"></p>
 <label>Nazwa produktu</label><input id="v083Name" maxlength="90">
 <div class="foodGrid">
 <div><label>kcal / 100 g</label><input id="v083Kcal" type="number" min="0" step="0.1"></div>
 <div><label>Białko / 100 g</label><input id="v083Protein" type="number" min="0" step="0.1"></div>
 <div><label>Węgle / 100 g</label><input id="v083Carbs" type="number" min="0" step="0.1"></div>
 <div><label>Tłuszcz / 100 g</label><input id="v083Fat" type="number" min="0" step="0.1"></div>
 <div><label>Ilość</label><input id="v083Amount" type="number" min="0.01" step="any" value="100"></div>
 <div><label>Jednostka</label><select id="v083Unit"><option value="g">gramy (g)</option>
 <option value="szt">sztuki</option><option value="ml">mililitry (ml)</option></select></div>
 <div id="v083PieceWrap" class="foodHidden"><label>Gramów / 1 szt.</label>
 <input id="v083Piece" type="number" min="0.01" step="any" placeholder="waga sztuki"></div>
 <div id="v083DensityWrap" class="foodHidden"><label>Gramów / 1 ml</label>
 <input id="v083Density" type="number" min="0.001" step="any" placeholder="g/ml z etykiety"></div>
 </div><p id="v083Calculated" class="foodMeta"></p>
 <div class="foodActions"><button id="v083Use" type="button" class="primary">WSTAW DO POSIŁKU</button>
 <button id="v083Save" type="button" class="secondary">ZAPISZ DO MOICH</button>
 <button id="v083Cancel" type="button" class="secondary">ZAMKNIJ</button></div>
 <p class="foodMeta">Dla sztuk podaj masę jednej sztuki. Dla ml podaj g/ml — olej i mleko nie mają tej samej gęstości.</p>
 </div><details><summary>USDA — produkty bez kodów</summary>
 <p class="foodMeta">Darmowy indywidualny klucz API USDA. Jest zapisany wyłącznie lokalnie, bez eksportu do kopii.</p>
 <label>Klucz API USDA</label><input id="v083ApiKey" type="password" autocomplete="off">
 <div class="foodActions"><button id="v083SaveKey" type="button" class="secondary">ZAPISZ KLUCZ</button>
 <button id="v083EraseKey" type="button" class="secondary">USUŃ KLUCZ</button></div>
 </details><p class="foodMeta">Źródła: Open Food Facts (ODbL), USDA FoodData Central. Wyszukiwanie online wymaga internetu.</p>`;
 root.insertBefore(card,add);
 $('v083ApiKey').value=localStorage.getItem(USDA_KEY)||'';
 $('v083Search').onclick=search;
 $('v083Query').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search();}});
 $('v083New').onclick=()=>pick({id:'',name:'',source:'Własny produkt',kcal100:null,
  protein100:null,carbs100:null,fat100:null,gramsPerPiece:null,gramsPerMl:null,servingGrams:null});
 $('v083Own').onclick=()=>{state.found=own();state.query='';state.requestId++;state.waiting=0;
   render();status('Produkty zapisane na telefonie.');};
 $('v083Unit').onchange=calculate;
 ['v083Amount','v083Piece','v083Density','v083Kcal','v083Protein','v083Carbs','v083Fat']
   .forEach(id=>$(id).addEventListener('input',calculate));
 $('v083Use').onclick=use;$('v083Save').onclick=saveProduct;
 $('v083Cancel').onclick=()=>$('v083Editor').classList.add('foodHidden');
 $('v083SaveKey').onclick=()=>{const key=$('v083ApiKey').value.trim();
   if(key&&!/^[a-zA-Z0-9_-]{8,128}$/.test(key)){status('Sprawdź format klucza USDA.',true);return;}
   if(key)localStorage.setItem(USDA_KEY,key);else localStorage.removeItem(USDA_KEY);
   status(key?'Klucz USDA zapisany na telefonie.':'Klucz USDA usunięty.');};
 $('v083EraseKey').onclick=()=>{localStorage.removeItem(USDA_KEY);
   $('v083ApiKey').value='';status('Klucz USDA usunięty.');};
 card.addEventListener('click',e=>{const b=e.target.closest('[data-food]');if(!b)return;
   const p=state.found[Number(b.dataset.index)];if(!p)return;
   if(b.dataset.food==='pick')pick(p);
   if(b.dataset.food==='delete'&&p.source==='Własny produkt'&&confirm('Usunąć produkt „'+p.name+'”?')){
     writeOwn(own().filter(x=>x.id!==p.id));state.found=state.found.filter(x=>x.id!==p.id);render();
   }
 });
 return true;
}
function boot(){let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>=60)clearInterval(t);},100);}
window.TrenerFoodCatalog={nativeResult,parseOff:off,parseUsda:usda,usdaQuery,displayPl,
  calculate:(p,amount,unit,gPiece,gMl)=>{const k=unit==='g'?1:unit==='szt'?gPiece:unit==='ml'?gMl:null;
    if(!(k>0)||!(amount>0))return null;const grams=amount*k,out={grams};
    ['kcal100','protein100','carbs100','fat100'].forEach(f=>out[f]=p[f]===null?null:rnd(p[f]*grams/100));return out;}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
