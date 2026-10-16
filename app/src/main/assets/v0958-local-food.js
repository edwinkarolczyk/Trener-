(function(){
'use strict';
// Wspolny lokalny katalog: starsze klucze sa zachowane dla kompatybilnosci kopii.
const OWN='trainer3.foodCatalog.v083',SCAN='trainer3.openFoodFactsCache.v0802',
 LEGACY_RECENT='trainer3.openFoodFactsRecent.v0802',RECENT='trainer3.foodRecent.v0958';
const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key));return v??fallback;}catch(e){return fallback;}};
const list=()=>{const v=read(OWN,[]);return Array.isArray(v)?v:[];};
const normal=v=>{const s=String(v??'').replace(/\D/g,'');return /^\d{8,14}$/.test(s)?s:'';};
const number=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;
 const n=Number(String(v).replace(',','.'));return Number.isFinite(n)&&n>=0?n:null;};
const good=p=>p&&String(p.name||'').trim()&&['kcal100','protein100','carbs100','fat100'].some(k=>number(p[k])!==null);
function findBarcode(raw){
 const code=normal(raw);if(!code)return null;
 const own=list().find(p=>normal(p.barcode)===code);
 if(own)return {...own,source:'Własny produkt'};
 const cache=read(SCAN,{}),row=cache&&typeof cache==='object'?cache[code]:null;
 return row?.product||null;
}
function asScan(p){
 if(!p)return null;
 return {id:p.id||'',barcode:normal(p.barcode)||(String(p.id||'').startsWith('off:')?normal(String(p.id).slice(4)):''),
  name:String(p.name||'Produkt'),brand:String(p.brand||''),quantity:String(p.quantity||''),
  servingQuantity:number(p.servingGrams??p.servingQuantity)||100,
  kcal100:number(p.kcal100),protein100:number(p.protein100),
  carbs100:number(p.carbs100),fat100:number(p.fat100),
  source:p.source||'Własny produkt',imageUrl:p.imageUrl||''};
}
function recents(){
 const raw=localStorage.getItem(RECENT),saved=raw===null?read(LEGACY_RECENT,[]):read(RECENT,[]);
 return Array.isArray(saved)?saved.filter(x=>x&&x.name).slice(0,20):[];
}
function same(a,b){
 const aa=normal(a.barcode),bb=normal(b.barcode);
 if(aa&&bb&&aa===bb)return true;
 if(a.id&&b.id&&a.id===b.id)return true;
 return !aa&&!bb&&!a.id&&!b.id&&String(a.name).toLocaleLowerCase('pl-PL')===String(b.name).toLocaleLowerCase('pl-PL');
}
function remember(p){
 if(!p?.name)return false;
 const product=asScan(p),value={...product,id:p.id||'',
  savedAt:Date.now()};
 const rows=[value,...recents().filter(x=>!same(x,value))].slice(0,20);
 try{localStorage.setItem(RECENT,JSON.stringify(rows));return true;}catch(e){return false;}
}
function saveOwn(raw){
 const name=String(raw?.name||'').trim().slice(0,90),barcode=normal(raw?.barcode);
 if(!name||!good({...raw,name}))return {ok:false,message:'Podaj nazwę i wartości odżywcze.'};
 if(raw.barcode&&!barcode)return {ok:false,message:'Kod EAN/UPC musi mieć 8–14 cyfr.'};
 const oldRaw=localStorage.getItem(OWN);
 if(oldRaw!==null){
  try{if(!Array.isArray(JSON.parse(oldRaw)))throw Error('bad catalog');}
  catch(e){return {ok:false,message:'Nieprawidłowy zapis bazy produktów. Zrób kopię danych; nie nadpisano starej bazy.'};}
 }
 const rows=list();
 let index=rows.findIndex(p=>barcode&&normal(p.barcode)===barcode);
 if(index<0&&raw.id)index=rows.findIndex(p=>p.id===raw.id&&p.source==='Własny produkt');
 if(index<0)index=rows.findIndex(p=>String(p.name||'').trim().toLocaleLowerCase('pl-PL')===name.toLocaleLowerCase('pl-PL')&&
   (!normal(p.barcode)||normal(p.barcode)===barcode));
 if(index<0&&rows.length>=300)return {ok:false,message:'Osiągnięto limit 300 własnych produktów. Nic nie usunięto.'};
 const previous=index<0?{}:rows[index];
 const id=previous.id||'own:'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 const item={...previous,...raw,id,name,barcode:barcode||normal(previous.barcode),source:'Własny produkt',
  kcal100:number(raw.kcal100),protein100:number(raw.protein100),carbs100:number(raw.carbs100),
  fat100:number(raw.fat100)};
 const next=[item,...rows.filter((_,i)=>i!==index)];
 try{localStorage.setItem(OWN,JSON.stringify(next));remember(item);return {ok:true,product:item};}
 catch(e){return {ok:false,message:'Brak miejsca na zapis produktu — istniejących danych nie zmieniono.'};}
}
function removeOwn(id){
 const rows=list(),next=rows.filter(x=>x.id!==id);
 if(next.length===rows.length)return false;
 try{localStorage.setItem(OWN,JSON.stringify(next));}catch(e){return false;}
 try{localStorage.setItem(RECENT,JSON.stringify(recents().filter(x=>x.id!==id)));}catch(e){}
 return true;
}
function captureMeal(p){
 const grams=number(p?.grams);if(!(grams>0)||!String(p?.name||'').trim())return {ok:false,skipped:true};
 const mapped={name:String(p.name).trim().slice(0,90),barcode:p.barcode||'',
  imageUrl:p.imageUrl||'',id:p.catalogId||'',
  servingGrams:grams,kcal100:null,protein100:null,carbs100:null,fat100:null};
 for(const k of ['kcal','protein','carbs','fat']){
  const val=number(p[k]);if(val===null)return {ok:false,skipped:true};
  mapped[k==='kcal'?'kcal100':k+'100']=Math.round(val*100000/grams)/1000;
 }
 return saveOwn(mapped);
}
window.TrenerLocalFood0958={own:list,findBarcode,asScan,recents,remember,saveOwn,removeOwn,captureMeal,normal};
})();