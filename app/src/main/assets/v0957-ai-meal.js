(function(root){
'use strict';

const DIET_KEY='trainer3.diet.v076';
const MODULE='AI Foto 0.9.5.7';
const MAX_WEIGHT_G=10000;
const $=id=>typeof document!=='undefined'?document.getElementById(id):null;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null;};
const round=(v,d=1)=>Math.round((Number(v)||0)*10**d)/10**d;
const clone=v=>JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDate=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function validDay(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return false;const d=new Date(v+'T12:00:00');return !Number.isNaN(+d)&&localDate(d)===v;}
const PHOTO_FOODS=Object.freeze({
  riceCooked:["Ryż biały ugotowany",130,2.7,28.2,0.3],
  pastaCooked:["Makaron pszenny ugotowany",157,5.8,30.9,0.9],
  buckwheatCooked:["Kasza gryczana ugotowana",92,3.4,19.9,0.6],
  lentilsCooked:["Soczewica ugotowana",116,9,20.1,0.4],
  turkeyCooked:["Indyk po obróbce",135,29,0,1.6],
  fishCooked:["Mintaj po obróbce",90,19,0,1.2]
});
function foods(){return {...(root.TrenerRecipes090?.FOODS||{}),...PHOTO_FOODS};}
function catalog(){const out={};for(const [key,row] of Object.entries(foods()))out[key]=row?.[0]||key;return out;}
function normText(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
const aliases={
  'kurczak':'chickenCooked','piers kurczaka':'chickenCooked','piers z kurczaka':'chickenCooked',
  'kurczak grillowany':'chickenCooked','kurczak pieczony':'chickenCooked','filet z kurczaka':'chickenCooked',
  'ziemniak':'potato','ziemniaki':'potato','kartofle':'potato',
  'ryz':'riceCooked','makaron':'pastaCooked','kasza gryczana':'buckwheatCooked',
  'warzywa':'veg','surowka':'veg','salatka warzywna':'veg',
  'jajko':'egg','jajka':'egg','pieczywo':'bread','chleb':'bread',
  'twarog':'twarog','skyr':'skyr','mleko':'milk','banan':'banana','jablko':'apple',
  'tunczyk':'tuna','indyk':'turkeyCooked','ser':'cheese','ser zolty':'cheese','szynka':'ham',
  'mintaj':'fishCooked','fasola':'beans','soczewica':'lentilsCooked','tortilla':'tortilla',
  'orzechy':'nuts','miod':'honey','maslo orzechowe':'pb','olej':'oil'
};
function resolveKey(raw){
  const f=foods(),key=String(raw||'').trim();
  if(key&&f[key])return key;
  const n=normText(raw);if(!n)return '';
  if(aliases[n]&&f[aliases[n]])return aliases[n];
  for(const [k,row] of Object.entries(f)){
    const name=normText(row?.[0]||'');
    if(name===n)return k;
  }
  for(const [k,row] of Object.entries(f)){
    const name=normText(row?.[0]||'');
    if(name&&n.length>=4&&(name.includes(n)||n.includes(name)))return k;
  }
  return '';
}
function normalizeResult(payload){
  let raw=payload;
  if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch(e){throw Error('Silnik AI zwrócił nieprawidłowy JSON.');}}
  if(!raw||typeof raw!=='object')throw Error('Brak wyniku analizy AI.');
  const source=Array.isArray(raw.items)?raw.items:Array.isArray(raw.ingredients)?raw.ingredients:null;
  if(!source||!source.length)throw Error('AI nie rozpoznało składników.');
  if(source.length>12)throw Error('AI zwróciło zbyt wiele składników.');
  const items=source.map((x,i)=>{
    if(!x||typeof x!=='object')throw Error('Nieprawidłowy składnik '+(i+1)+'.');
    let share=num(x.share??x.ratio??x.percent);
    if(!(share>0))throw Error('Brak udziału składnika '+(i+1)+'.');
    if(share>1&&share<=100)share/=100;
    if(!(share>0&&share<=1))throw Error('Nieprawidłowy udział składnika '+(i+1)+'.');
    const observedName=String(x.observedName||x.name||x.label||x.food||'Składnik '+(i+1)).trim().slice(0,80);
    const foodKey=resolveKey(x.foodKey||x.key||observedName);
    let confidence=num(x.confidence);if(confidence!==null)confidence=clamp(confidence>1?confidence/100:confidence,0,1);
    return {observedName,foodKey,share,confidence};
  });
  const totalShare=items.reduce((s,x)=>s+x.share,0);
  if(!(totalShare>0))throw Error('Nie udało się policzyć udziałów składników.');
  items.forEach(x=>x.share=x.share/totalShare);
  let confidence=num(raw.confidence);if(confidence!==null)confidence=clamp(confidence>1?confidence/100:confidence,0,1);
  return {
    mealName:String(raw.mealName||raw.name||'Posiłek ze zdjęcia').trim().slice(0,60)||'Posiłek ze zdjęcia',
    confidence,
    items,
    engine:String(raw.engine||raw.model||'').slice(0,80)
  };
}
function nutrientFor(foodKey,grams){
  const row=foods()[foodKey],g=num(grams);
  if(!row||!(g>0))return null;
  return {
    kcal:round(row[1]*g/100,1),
    protein:round(row[2]*g/100,1),
    carbs:round(row[3]*g/100,1),
    fat:round(row[4]*g/100,1)
  };
}
function prepare(result,totalWeight,overrides){
  const normalized=normalizeResult(result),weight=num(totalWeight);
  if(!(weight>0&&weight<=MAX_WEIGHT_G))throw Error('Podaj wagę całego jedzenia w gramach.');
  const rows=normalized.items.map((x,i)=>{
    const o=Array.isArray(overrides)?(overrides[i]||{}):{};
    const grams=num(o.grams);
    const g=grams!==null?grams:round(weight*x.share,1);
    if(!(g>0&&g<=MAX_WEIGHT_G))throw Error('Nieprawidłowa gramatura składnika '+(i+1)+'.');
    const foodKey=resolveKey(o.foodKey||x.foodKey);
    const nutrient=nutrientFor(foodKey,g);
    return {
      id:'ai-i-'+i,observedName:x.observedName,foodKey,share:x.share,confidence:x.confidence,
      name:foodKey?(foods()[foodKey]?.[0]||x.observedName):x.observedName,grams:g,portion:round(g,1)+' g',
      base100:foodKey?{kcal:foods()[foodKey][1],protein:foods()[foodKey][2],carbs:foods()[foodKey][3],fat:foods()[foodKey][4]}:null,
      source:'AI Foto'+(normalized.engine?' • '+normalized.engine:''),
      ...(nutrient||{kcal:0,protein:0,carbs:0,fat:0})
    };
  });
  const totals={kcal:0,protein:0,carbs:0,fat:0};
  rows.forEach(x=>{for(const k of Object.keys(totals))totals[k]+=Number(x[k])||0;});
  for(const k of Object.keys(totals))totals[k]=round(totals[k],1);
  const unresolved=rows.filter(x=>!x.foodKey).map(x=>x.observedName);
  return {
    name:normalized.mealName,type:'other',confidence:normalized.confidence,engine:normalized.engine,
    totalWeightG:weight,ingredients:rows,unresolved,...totals
  };
}
function readDiet(){
  const api=root.TrenerDiet076;
  if(!api||typeof api.load!=='function')throw Error('Nie wczytano Diety.');
  const d=api.load();if(!d||!Array.isArray(d.meals))throw Error('Nieprawidłowe dane Diety.');
  return d;
}
function saveApproved(preview,date,confirm,type){
  if(confirm!==true)throw Error('Najpierw zatwierdź analizę.');
  if(!preview||!Array.isArray(preview.ingredients)||!preview.ingredients.length)throw Error('Brak składników.');
  if(preview.unresolved?.length)throw Error('Dopasuj wszystkie rozpoznane składniki do bazy.');
  if(!validDay(date))throw Error('Nieprawidłowa data posiłku.');
  const d=readDiet(),now=Date.now(),mealType=String(type||preview.type||'other');
  const meal={
    id:'ai-meal-'+now.toString(36)+'-'+Math.random().toString(36).slice(2,8),
    date,createdAt:now,type:mealType,name:String(preview.name||'Posiłek ze zdjęcia').slice(0,60),
    source:'AI Foto',kcal:preview.kcal,protein:preview.protein,carbs:preview.carbs,fat:preview.fat,
    grams:preview.totalWeightG,totalWeightG:preview.totalWeightG,
    aiConfidence:preview.confidence,aiEngine:preview.engine||'',
    ingredients:clone(preview.ingredients)
  };
  d.meals.push(meal);
  try{localStorage.setItem(DIET_KEY,JSON.stringify(d));}
  catch(e){throw Error('Brak miejsca na zapis. Starsze dane pozostały bez zmian.');}
  try{root.TrenerDiet076?.render?.();root.TrenerWidget077?.sync?.(true);}catch(e){}
  return meal;
}

const api=Object.freeze({catalog,resolveKey,normalizeResult,prepare,saveApproved,validDay});
root.TrenerAiMeal0957=api;
if(typeof document==='undefined')return;

const state={file:null,analysis:null,rows:[],request:0,busy:false,previewUrl:'',configHasToken:false};
function status(msg,error=false){
  const el=$('ai0957Status');if(!el)return;el.textContent=msg||'';el.classList.toggle('ai0957Error',!!error);
}
function installCss(){
  if($('ai0957Style'))return;
  const s=document.createElement('style');s.id='ai0957Style';s.textContent=`
  #ai0957Card .ai0957Grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
  #ai0957Card .ai0957Wide{grid-column:1/-1}
  #ai0957Card .ai0957Actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  #ai0957Card .ai0957Actions button{margin:0!important}
  #ai0957Card .ai0957Preview{width:100%;max-height:260px;object-fit:contain;border:1px solid #333;border-radius:12px;margin-top:10px;background:#111}
  #ai0957Card .ai0957Rows{margin-top:10px}
  #ai0957Card .ai0957Row{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(90px,.7fr);gap:8px;padding:9px 0;border-top:1px solid #303030}
  #ai0957Card .ai0957Row:first-child{border-top:0}
  #ai0957Card .ai0957Row small{display:block;color:#999;margin-top:4px}
  #ai0957Card .ai0957Row select,#ai0957Card .ai0957Row input{width:100%;box-sizing:border-box}
  #ai0957Card .ai0957Totals{font-weight:900;margin:10px 0 0}
  #ai0957Card .ai0957Warn{color:#efc66f;font-size:11px;line-height:1.45}
  #ai0957Card .ai0957Error{color:#ef7777!important}
  #ai0957Card .ai0957Status{font-size:11px;color:#a9d7bb;line-height:1.45;margin-top:8px}
  #ai0957Card details{margin-top:12px}
  #ai0957Card .ai0957Config{display:grid;gap:8px;margin-top:9px}
  @media(max-width:390px){#ai0957Card .ai0957Grid,#ai0957Card .ai0957Row{grid-template-columns:1fr}.ai0957Wide{grid-column:auto}}
  `;document.head.appendChild(s);
}
function foodOptions(selected){
  const list=Object.entries(catalog()).sort((a,b)=>a[1].localeCompare(b[1],'pl'));
  return '<option value="">— wybierz produkt —</option>'+list.map(([k,n])=>'<option value="'+esc(k)+'" '+(k===selected?'selected':'')+'>'+esc(n)+'</option>').join('');
}
function currentWeight(){return num($('ai0957Weight')?.value);}
function currentPreview(){
  if(!state.analysis)throw Error('Najpierw wykonaj analizę zdjęcia.');
  const weight=currentWeight();
  const overrides=state.rows.map(x=>({foodKey:x.foodKey,grams:x.grams}));
  const p=prepare(state.analysis,weight,overrides);
  p.type=$('v076MealType')?.value||'other';
  return p;
}
function draw(){
  const box=$('ai0957Result'),save=$('ai0957Save'),recalc=$('ai0957Recalc');
  if(!box)return;
  if(!state.analysis){box.innerHTML='';if(save)save.disabled=true;if(recalc)recalc.disabled=true;return;}
  let p;try{p=currentPreview();}catch(e){box.innerHTML='<p class="ai0957Warn">'+esc(e.message)+'</p>';if(save)save.disabled=true;return;}
  const totalRows=p.ingredients.reduce((s,x)=>s+x.grams,0),delta=Math.abs(totalRows-p.totalWeightG);
  const overall=p.confidence===null?'—':Math.round(p.confidence*100)+'%';
  box.innerHTML='<div class="ai0957Rows">'+p.ingredients.map((x,i)=>
    '<div class="ai0957Row"><div><strong>'+esc(x.observedName)+'</strong><small>AI: '+Math.round(x.share*100)+'%'+
    (x.confidence===null?'':' • pewność '+Math.round(x.confidence*100)+'%')+'</small>'+
    '<select data-ai-key="'+i+'">'+foodOptions(x.foodKey)+'</select></div>'+
    '<div><label>Gramów</label><input data-ai-grams="'+i+'" type="number" min="0.1" max="'+MAX_WEIGHT_G+'" step="0.1" inputmode="decimal" value="'+x.grams+'"></div></div>'
  ).join('')+'</div>'+
  '<div class="ai0957Totals">'+round(p.kcal,0)+' kcal · B '+round(p.protein,1)+' g · W '+round(p.carbs,1)+' g · T '+round(p.fat,1)+' g</div>'+
  '<p class="ai0957Warn">Pewność całej analizy: '+overall+'. Suma składników: '+round(totalRows,1)+' g / wpisane '+round(p.totalWeightG,1)+' g.'+
  (delta>3?' Sprawdź gramatury — suma różni się od wagi całkowitej.':'')+
  (p.unresolved.length?' Dopasuj do bazy: '+esc(p.unresolved.join(', '))+'.':'')+'</p>';
  box.querySelectorAll('[data-ai-key]').forEach(el=>el.addEventListener('change',()=>{
    const i=Number(el.dataset.aiKey);if(state.rows[i])state.rows[i].foodKey=el.value;draw();
  }));
  box.querySelectorAll('[data-ai-grams]').forEach(el=>el.addEventListener('input',()=>{
    const i=Number(el.dataset.aiGrams),g=num(el.value);if(state.rows[i]&&g!==null)state.rows[i].grams=g;draw();
  }));
  if(save)save.disabled=!!p.unresolved.length;
  if(recalc)recalc.disabled=false;
}
function recalcFromWeight(){
  if(!state.analysis)return;
  try{
    const p=prepare(state.analysis,currentWeight());
    state.rows=p.ingredients.map(x=>({foodKey:x.foodKey,grams:x.grams}));
    draw();status('Gramatury przeliczone z jednej wagi całego posiłku.');
  }catch(e){status(e.message,true);}
}
function applyAnalysis(raw){
  const normalized=normalizeResult(raw);
  state.analysis=normalized;
  const p=prepare(normalized,currentWeight());
  state.rows=p.ingredients.map(x=>({foodKey:x.foodKey,grams:x.grams}));
  draw();
  status(p.unresolved.length?
    'AI rozpoznało potrawę. Część składników wymaga wskazania produktu z bazy.':
    'AI rozpoznało potrawę. Sprawdź składniki i zatwierdź zapis.');
}
function readConfig(){
  try{
    if(!root.Android?.getAiMealConfig)return;
    const c=JSON.parse(root.Android.getAiMealConfig()||'{}');
    if($('ai0957Endpoint'))$('ai0957Endpoint').value=c.endpoint||'';
    state.configHasToken=!!c.hasToken;
    if($('ai0957ConfigState'))$('ai0957ConfigState').textContent=c.endpoint?
      'Endpoint zapisany'+(c.hasToken?' • token zapisany w prywatnych danych aplikacji':' • bez tokenu'):
      'Silnik AI nie jest jeszcze skonfigurowany.';
  }catch(e){}
}
function saveConfig(){
  const endpoint=String($('ai0957Endpoint')?.value||'').trim(),token=String($('ai0957Token')?.value||'').trim();
  try{
    if(!root.Android?.saveAiMealConfig)throw Error('Ta wersja aplikacji nie ma natywnego łącznika AI.');
    const tokenArg=!token&&state.configHasToken?'__KEEP__':token;
    const ok=!!root.Android.saveAiMealConfig(endpoint,tokenArg);
    if(!ok)throw Error('Sprawdź adres endpointu. Token wymaga HTTPS.');
    if($('ai0957Token'))$('ai0957Token').value='';
    readConfig();status('Konfiguracja silnika AI zapisana.');
  }catch(e){status(e.message||String(e),true);}
}
function clearConfig(){
  try{root.Android?.clearAiMealConfig?.();state.configHasToken=false;if($('ai0957Endpoint'))$('ai0957Endpoint').value='';if($('ai0957Token'))$('ai0957Token').value='';readConfig();status('Konfiguracja AI usunięta.');}
  catch(e){status('Nie udało się usunąć konfiguracji.',true);}
}
function downscale(file){
  return new Promise((resolve,reject)=>{
    if(!file||!String(file.type||'').startsWith('image/'))return reject(Error('Wybierz zdjęcie potrawy.'));
    if(file.size>15*1024*1024)return reject(Error('Zdjęcie jest zbyt duże.'));
    const reader=new FileReader();
    reader.onerror=()=>reject(Error('Nie udało się odczytać zdjęcia.'));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(Error('Nie udało się otworzyć zdjęcia.'));
      img.onload=()=>{
        try{
          const max=1280,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
          const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
          const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);
          let data=canvas.toDataURL('image/jpeg',0.78);
          if(data.length>3000000)data=canvas.toDataURL('image/jpeg',0.62);
          const b64=(data.split(',')[1]||'');
          if(!b64||b64.length>3000000)throw Error('Zdjęcie po zmniejszeniu nadal jest zbyt duże.');
          resolve(b64);
        }catch(e){reject(e);}
      };
      img.src=String(reader.result||'');
    };
    reader.readAsDataURL(file);
  });
}
async function analyze(){
  if(state.busy)return;
  const weight=currentWeight();
  if(!(weight>0&&weight<=MAX_WEIGHT_G)){status('Najpierw wpisz wagę całego jedzenia w gramach.',true);return;}
  if(!state.file){status('Najpierw wybierz zdjęcie potrawy.',true);return;}
  if(!root.Android?.analyzeMealPhoto){status('Brak natywnego łącznika AI w tej wersji aplikacji.',true);return;}
  state.busy=true;const btn=$('ai0957Analyze');if(btn)btn.disabled=true;
  const request=++state.request;
  status('Przygotowuję zdjęcie i wysyłam je do silnika AI…');
  try{
    const b64=await downscale(state.file);
    root.Android.analyzeMealPhoto(b64,JSON.stringify(catalog()),weight,request);
  }catch(e){state.busy=false;if(btn)btn.disabled=false;status(e.message||String(e),true);}
}
function nativeResult(requestId,statusCode,payload){
  if(Number(requestId)!==state.request)return;
  state.busy=false;const btn=$('ai0957Analyze');if(btn)btn.disabled=false;
  if(statusCode!=='ok'){status(String(payload||'Błąd analizy AI.'),true);return;}
  try{applyAnalysis(payload);}catch(e){status(e.message||String(e),true);}
}
function saveMeal(){
  try{
    const preview=currentPreview(),date=root.TrenerDiet076?.getDate?.()||localDate(),type=$('v076MealType')?.value||'other';
    const meal=saveApproved(preview,date,true,type);
    status('Dodano „'+meal.name+'” do Diety.');try{toast('Posiłek ze zdjęcia zapisany.');}catch(e){}
  }catch(e){status(e.message||String(e),true);}
}
function install(){
  const rootEl=$('v076DietRoot'),add=$('v076AddMeal')?.closest('.card');
  if(!rootEl||!add||$('ai0957Card'))return !!$('ai0957Card');
  installCss();
  const card=document.createElement('div');card.id='ai0957Card';card.className='card';
  card.innerHTML=`
   <div class="eyebrow">AI ZE ZDJĘCIA • BETA</div><h2>Rozpoznaj posiłek</h2>
   <p class="hint">Wybierz zdjęcie potrawy, wpisz jedną wagę całego jedzenia, a AI podzieli ją między składniki. Kalorie i makro liczy baza Trenera 2 — przed zapisem możesz poprawić rozpoznanie i gramaturę. Sosy, olej i składniki niewidoczne na zdjęciu zawsze sprawdź ręcznie.</p>
   <div class="ai0957Grid">
    <div class="ai0957Wide"><label>Zdjęcie potrawy</label><input id="ai0957Photo" type="file" accept="image/*" capture="environment"></div>
    <div><label>Waga całego jedzenia [g]</label><input id="ai0957Weight" type="number" min="1" max="${MAX_WEIGHT_G}" step="1" inputmode="decimal" placeholder="np. 620"></div>
    <div><label>Data</label><input id="ai0957DateView" disabled></div>
   </div>
   <img id="ai0957Preview" class="ai0957Preview" hidden alt="Podgląd potrawy">
   <div class="ai0957Actions"><button id="ai0957Analyze" type="button" class="primary">ANALIZUJ ZDJĘCIE</button>
   <button id="ai0957Recalc" type="button" class="secondary" disabled>PRZELICZ Z WAGI</button></div>
   <div id="ai0957Result"></div>
   <button id="ai0957Save" type="button" class="primary bigBtn" disabled>DODAJ DO DIETY — POTWIERDZAM</button>
   <p id="ai0957Status" class="ai0957Status" role="status">Silnik AI wymaga skonfigurowanego endpointu.</p>
   <details><summary>Silnik AI / konfiguracja</summary><div class="ai0957Config">
    <p id="ai0957ConfigState" class="hint"></p>
    <label>Endpoint HTTPS<input id="ai0957Endpoint" type="url" inputmode="url" placeholder="https://…"></label>
    <label>Token / klucz endpointu<input id="ai0957Token" type="password" autocomplete="new-password" placeholder="pozostaw puste, aby zachować zapisany"></label>
    <div class="ai0957Actions"><button id="ai0957SaveConfig" class="secondary" type="button">ZAPISZ SILNIK</button>
    <button id="ai0957ClearConfig" class="secondary" type="button">USUŃ KONFIGURACJĘ</button></div>
    <p class="hint">Klucz nie jest wpisany do APK. Trener 2 przechowuje go w prywatnych danych aplikacji i wysyła tylko do wskazanego przez Ciebie endpointu. Oczekiwany wynik: lista składników z kluczem produktu, udziałem i pewnością.</p>
   </div></details>`;
  rootEl.insertBefore(card,add);
  $('ai0957DateView').value=root.TrenerDiet076?.getDate?.()||localDate();
  $('ai0957Photo').addEventListener('change',e=>{
    state.file=e.target.files?.[0]||null;state.analysis=null;state.rows=[];draw();
    if(state.previewUrl){try{URL.revokeObjectURL(state.previewUrl);}catch(err){}state.previewUrl='';}
    const img=$('ai0957Preview');
    if(state.file&&img){state.previewUrl=URL.createObjectURL(state.file);img.src=state.previewUrl;img.hidden=false;status('Zdjęcie gotowe. Wpisz wagę całego jedzenia i uruchom analizę.');}
    else if(img)img.hidden=true;
  });
  $('ai0957Weight').addEventListener('input',()=>{if(state.analysis)recalcFromWeight();});
  $('ai0957Analyze').onclick=analyze;
  $('ai0957Recalc').onclick=recalcFromWeight;
  $('ai0957Save').onclick=saveMeal;
  $('ai0957SaveConfig').onclick=saveConfig;
  $('ai0957ClearConfig').onclick=clearConfig;
  readConfig();
  return true;
}
function boot(){
  let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>=80)clearInterval(t);},100);
  document.querySelectorAll('.tab[data-tab="diet"]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{
    if($('ai0957DateView'))$('ai0957DateView').value=root.TrenerDiet076?.getDate?.()||localDate();
  },0)));
}
root.TrenerAiMeal0957=Object.freeze({...api,nativeResult});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof window!=='undefined'?window:globalThis);
