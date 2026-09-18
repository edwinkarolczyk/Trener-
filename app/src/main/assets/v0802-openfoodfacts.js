(function(){
  'use strict';

  const CACHE_KEY='trainer3.openFoodFactsCache.v0802';
  const RECENT_KEY='trainer3.openFoodFactsRecent.v0802';
  const $=id=>document.getElementById(id);
  const state={product:null,grams:100,pendingBarcode:''};

  function safe(raw,fallback){try{return JSON.parse(raw||'')||fallback}catch(e){return fallback}}
  function num(v){const n=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(n)?Math.max(0,n):0}
  function round(v,d=1){const p=Math.pow(10,d);return Math.round((Number(v)||0)*p)/p}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function normalizeBarcode(v){return String(v||'').replace(/[^0-9]/g,'').slice(0,14)}
  function toastSafe(msg){try{toast(msg)}catch(e){}}

  function readCache(){
    const c=safe(localStorage.getItem(CACHE_KEY),{});
    return c&&typeof c==='object'&&!Array.isArray(c)?c:{};
  }
  function writeCache(cache){
    const entries=Object.entries(cache||{}).sort((a,b)=>Number(b[1]?.savedAt||0)-Number(a[1]?.savedAt||0)).slice(0,80);
    const out={};entries.forEach(([k,v])=>out[k]=v);
    try{localStorage.setItem(CACHE_KEY,JSON.stringify(out))}catch(e){}
  }
  function recents(){
    const r=safe(localStorage.getItem(RECENT_KEY),[]);
    return Array.isArray(r)?r.slice(0,20):[];
  }
  function remember(product){
    if(!product?.barcode)return;
    const cache=readCache();cache[product.barcode]={savedAt:Date.now(),product};writeCache(cache);
    const list=recents().filter(x=>x?.barcode!==product.barcode);list.unshift(product);
    try{localStorage.setItem(RECENT_KEY,JSON.stringify(list.slice(0,20)))}catch(e){}
    renderRecents();
  }

  function parseProduct(raw,requestedBarcode){
    let data;try{data=typeof raw==='string'?JSON.parse(raw):raw}catch(e){return null}
    if(!data||Number(data.status)===0||!data.product)return null;
    const p=data.product||{},n=p.nutriments||{};
    let kcal=num(n['energy-kcal_100g']);
    if(!kcal&&num(n.energy_100g))kcal=num(n.energy_100g)/4.184;
    const product={
      barcode:normalizeBarcode(p.code||requestedBarcode),
      name:String(p.product_name_pl||p.product_name||'Produkt').trim().slice(0,80),
      brand:String(p.brands||'').split(',')[0].trim().slice(0,60),
      quantity:String(p.quantity||'').trim().slice(0,40),
      servingSize:String(p.serving_size||'').trim().slice(0,40),
      servingQuantity:num(p.serving_quantity),
      kcal100:round(kcal,1),
      protein100:round(num(n.proteins_100g),2),
      carbs100:round(num(n.carbohydrates_100g),2),
      fat100:round(num(n.fat_100g),2),
      source:'Open Food Facts'
    };
    if(!product.barcode)return null;
    return product;
  }

  function scaled(product,grams){
    const factor=Math.max(0,num(grams))/100;
    return {
      kcal:round(product.kcal100*factor,0),
      protein:round(product.protein100*factor,1),
      carbs:round(product.carbs100*factor,1),
      fat:round(product.fat100*factor,1)
    };
  }

  function installCss(){
    if($('v0802OffStyle'))return;
    const s=document.createElement('style');s.id='v0802OffStyle';s.textContent=`
      #diet .v0802ScanBox{border:1px solid #333;border-radius:14px;padding:12px;margin:10px 0 14px;background:#0d0d0d}
      #diet .v0802ScanActions{display:grid;grid-template-columns:1.15fr .85fr;gap:8px}
      #diet .v0802ScanActions button{margin:0!important}
      #diet .v0802Manual{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:8px;align-items:end}
      #diet .v0802Manual button{margin:0!important;height:43px}
      #diet .v0802Status{font-size:10px;color:#999;line-height:1.4;margin-top:8px}
      #diet .v0802Result{margin-top:10px;padding:11px;border-radius:12px;background:#151515;border:1px solid #303030}
      #diet .v0802Result h3{margin:0 0 3px;font-size:15px}.v0802Meta{color:#999;font-size:9px;line-height:1.4}
      #diet .v0802Macros{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:10px 0}
      #diet .v0802Macro{background:#0d0d0d;border-radius:10px;padding:8px;border:1px solid #292929}
      #diet .v0802Macro span{display:block;color:#888;font-size:9px}.v0802Macro b{font-size:14px}
      #diet .v0802GramRow{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}
      #diet .v0802GramRow button{margin:0!important;height:43px}
      #diet .v0802Recent{display:flex;gap:7px;overflow-x:auto;padding:3px 0 2px;scrollbar-width:none}
      #diet .v0802Recent button{flex:0 0 auto;margin:0!important;padding:7px 9px!important;font-size:10px!important;max-width:190px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #diet .v0802Source{font-size:9px;color:#777;line-height:1.4;margin-top:8px}
      @media(max-width:390px){#diet .v0802ScanActions{grid-template-columns:1fr}#diet .v0802Macros{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(s);
  }

  function installUi(){
    if($('v0802OffBox'))return true;
    const addBtn=$('v076AddMeal');
    const card=addBtn?.closest?.('.card');
    const fields=card?.querySelector?.('.v076Fields');
    if(!card||!fields)return false;

    const box=document.createElement('div');box.id='v0802OffBox';box.className='v0802ScanBox';
    box.innerHTML=`
      <div class="eyebrow">SKAN PRODUKTU • OPEN FOOD FACTS</div>
      <div class="v0802ScanActions">
        <button id="v0802Scan" class="primary" type="button">📷 SKANUJ KOD</button>
        <button id="v0802Last" class="secondary" type="button">OSTATNIO SKANOWANE</button>
      </div>
      <div class="v0802Manual">
        <div><label>Kod kreskowy</label><input id="v0802Barcode" inputmode="numeric" maxlength="14" placeholder="np. 5901234123457"></div>
        <button id="v0802Lookup" class="secondary" type="button">SZUKAJ</button>
      </div>
      <div id="v0802Status" class="v0802Status">Zeskanuj EAN/UPC albo wpisz kod ręcznie.</div>
      <div id="v0802Recent" class="v0802Recent hidden"></div>
      <div id="v0802Result" class="v0802Result hidden"></div>
      <div class="v0802Source">Dane pochodzą ze społecznościowej bazy Open Food Facts. Po wstawieniu do formularza możesz poprawić każdą wartość według etykiety produktu.</div>`;
    card.insertBefore(box,fields);

    $('v0802Scan').onclick=scan;
    $('v0802Lookup').onclick=()=>lookup($('v0802Barcode')?.value||'');
    $('v0802Barcode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();lookup(e.target.value)}});
    $('v0802Last').onclick=()=>{$('v0802Recent')?.classList.toggle('hidden');renderRecents()};
    $('v0802Recent').addEventListener('click',ev=>{
      const b=ev.target.closest('[data-off-barcode]');if(!b)return;
      const p=recents().find(x=>x.barcode===b.dataset.offBarcode);if(p)showProduct(p);
    });
    $('v0802Result').addEventListener('input',ev=>{
      if(ev.target?.id==='v0802Grams'){state.grams=num(ev.target.value);renderProduct()}
    });
    $('v0802Result').addEventListener('click',ev=>{
      if(ev.target?.id==='v0802Use')useProduct();
    });
    renderRecents();
    return true;
  }

  function renderRecents(){
    const root=$('v0802Recent');if(!root)return;
    const list=recents().slice(0,8);
    root.innerHTML=list.length?list.map(p=>`<button class="secondary" type="button" data-off-barcode="${esc(p.barcode)}">${esc(p.name||p.barcode)}</button>`).join(''):'<span class="v0802Status">Brak ostatnio skanowanych produktów.</span>';
  }

  function setStatus(text,busy){
    const el=$('v0802Status');if(el)el.textContent=text;
    if($('v0802Scan'))$('v0802Scan').disabled=!!busy;
    if($('v0802Lookup'))$('v0802Lookup').disabled=!!busy;
  }

  function scan(){
    if(window.Android&&typeof Android.scanFoodBarcode==='function'){
      setStatus('Uruchamiam skaner…',true);
      try{Android.scanFoodBarcode()}catch(e){setStatus('Nie udało się uruchomić skanera.',false)}
      return;
    }
    setStatus('Skaner kodów jest dostępny w aplikacji Android.',false);
  }

  function lookup(raw){
    const barcode=normalizeBarcode(raw);
    if(!/^\d{8,14}$/.test(barcode)){setStatus('Kod powinien mieć 8–14 cyfr.',false);return}
    state.pendingBarcode=barcode;
    if($('v0802Barcode'))$('v0802Barcode').value=barcode;

    const cached=readCache()[barcode]?.product;
    if(cached){
      setStatus('Produkt wczytany z pamięci telefonu.',false);
      showProduct(cached);
      return;
    }

    setStatus('Szukam produktu w Open Food Facts…',true);
    if(window.Android&&typeof Android.lookupOpenFoodFacts==='function'){
      try{Android.lookupOpenFoodFacts(barcode);return}catch(e){}
    }
    fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(barcode)+'.json?fields=code,product_name,product_name_pl,brands,quantity,serving_size,serving_quantity,nutriments')
      .then(r=>r.ok?r.text():Promise.reject(new Error('HTTP '+r.status)))
      .then(rawJson=>window.TrenerOpenFoodFacts.nativeLookup('ok',rawJson))
      .catch(()=>window.TrenerOpenFoodFacts.nativeLookup('error','Nie udało się pobrać produktu.'));
  }

  function showProduct(product){
    state.product=product;
    const serving=num(product.servingQuantity);
    state.grams=serving>0&&serving<=1000?serving:100;
    remember(product);
    renderProduct();
  }

  function renderProduct(){
    const root=$('v0802Result'),p=state.product;if(!root||!p)return;
    const m=scaled(p,state.grams);
    const incomplete=!(p.kcal100||p.protein100||p.carbs100||p.fat100);
    root.classList.remove('hidden');
    root.innerHTML=`
      <h3>${esc(p.name)}</h3>
      <div class="v0802Meta">${esc([p.brand,p.quantity,'EAN '+p.barcode].filter(Boolean).join(' • '))}</div>
      <div class="v0802Macros">
        <div class="v0802Macro"><span>Kalorie</span><b>${m.kcal} kcal</b></div>
        <div class="v0802Macro"><span>Białko</span><b>${m.protein} g</b></div>
        <div class="v0802Macro"><span>Węglowodany</span><b>${m.carbs} g</b></div>
        <div class="v0802Macro"><span>Tłuszcze</span><b>${m.fat} g</b></div>
      </div>
      <div class="v0802GramRow">
        <div><label>Ilość [g]</label><input id="v0802Grams" type="number" min="1" max="5000" step="1" inputmode="decimal" value="${esc(state.grams)}"></div>
        <button id="v0802Use" class="primary" type="button" ${incomplete?'disabled':''}>WPISZ DO POSIŁKU</button>
      </div>
      <div class="v0802Source">Na 100 g: ${p.kcal100} kcal • B ${p.protein100} g • W ${p.carbs100} g • T ${p.fat100} g${incomplete?' • Brak danych odżywczych — wpisz je ręcznie z etykiety.':''}</div>`;
  }

  function useProduct(){
    const p=state.product;if(!p)return;
    const grams=Math.max(1,num($('v0802Grams')?.value||state.grams));
    const m=scaled(p,grams);
    const displayName=[p.name,p.brand].filter(Boolean).join(' • ').slice(0,60);
    if($('v076MealName'))$('v076MealName').value=displayName;
    if($('v076Kcal'))$('v076Kcal').value=m.kcal||'';
    if($('v076Protein'))$('v076Protein').value=m.protein||'';
    if($('v076Carbs'))$('v076Carbs').value=m.carbs||'';
    if($('v076Fat'))$('v076Fat').value=m.fat||'';
    if($('v077Portion'))$('v077Portion').value=round(grams,1)+' g';
    state.grams=grams;
    setStatus('Wartości wpisane do posiłku. Możesz je poprawić przed zapisaniem.',false);
    try{$('v076MealName')?.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){}
    toastSafe('Produkt wpisany do formularza.');
  }

  function nativeBarcode(raw){
    setStatus('Kod odczytany. Szukam produktu…',false);
    const code=normalizeBarcode(raw);
    if($('v0802Barcode'))$('v0802Barcode').value=code;
    lookup(code);
  }

  function nativeLookup(status,payload){
    if(status==='not_found'){
      state.product=null;
      $('v0802Result')?.classList.add('hidden');
      setStatus('Nie znaleziono produktu. Wpisz dane ręcznie z etykiety.',false);
      return;
    }
    if(status!=='ok'){
      state.product=null;
      $('v0802Result')?.classList.add('hidden');
      setStatus(String(payload||'Nie udało się pobrać produktu.'),false);
      return;
    }
    const product=parseProduct(payload,state.pendingBarcode);
    if(!product){
      state.product=null;
      $('v0802Result')?.classList.add('hidden');
      setStatus('Produkt nie istnieje w bazie albo nie ma danych. Wpisz go ręcznie.',false);
      return;
    }
    setStatus('Produkt znaleziony w Open Food Facts.',false);
    showProduct(product);
  }

  function boot(){
    installCss();
    let tries=0;
    const t=setInterval(()=>{tries++;if(installUi()||tries>60)clearInterval(t)},100);
  }

  window.TrenerOpenFoodFacts={nativeBarcode,nativeLookup,lookup,recents:()=>recents().slice()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();