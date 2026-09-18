(function(){
  'use strict';

  const DIET_KEY='trainer3.diet.v070';
  const FOODS_KEY='trainer3.foods.v070';

  const presets=[
    {id:'chicken-breast',name:'Pierś z kurczaka (surowa)',kcal:120,p:22.5,c:0,f:2.6},
    {id:'egg-m',name:'Jajko kurze M',kcal:143,p:12.6,c:0.7,f:9.5,pieceGrams:55},
    {id:'rice-cooked',name:'Ryż biały ugotowany',kcal:130,p:2.7,c:28.2,f:0.3},
    {id:'oats',name:'Płatki owsiane',kcal:379,p:13.2,c:67.7,f:6.5},
    {id:'banana',name:'Banan',kcal:89,p:1.1,c:22.8,f:0.3,pieceGrams:120},
    {id:'skyr',name:'Skyr naturalny',kcal:63,p:11,c:3.8,f:0.2},
    {id:'bread',name:'Chleb pszenny',kcal:265,p:9,c:49,f:3.2,pieceGrams:35}
  ];

  let selectedId='chicken-breast';

  function $(id){return document.getElementById(id)}
  function safeJson(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function num(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0}
  function round(v,d=1){const p=10**d;return Math.round((Number(v)||0)*p)/p}
  function localDate(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+day}
  function toastMsg(msg){try{if(typeof window.toast==='function')window.toast(msg)}catch(e){}}

  function customFoods(){
    const list=safeJson(localStorage.getItem(FOODS_KEY),[]);
    return Array.isArray(list)?list:[];
  }
  function foods(){return [...presets,...customFoods()]}
  function getFood(id){return foods().find(x=>x.id===id)||foods()[0]}
  function entries(){
    const data=safeJson(localStorage.getItem(DIET_KEY),{entries:[]});
    return Array.isArray(data?.entries)?data.entries:[];
  }
  function saveEntries(list){
    localStorage.setItem(DIET_KEY,JSON.stringify({version:1,entries:list.slice(-1500)}));
  }
  function macroFor(food,amount,unit){
    const grams=unit==='piece'&&food.pieceGrams?amount*food.pieceGrams:amount;
    const k=grams/100;
    return {grams,amount,unit,kcal:food.kcal*k,p:food.p*k,c:food.c*k,f:food.f*k};
  }
  function totalsFor(list){
    return list.reduce((a,e)=>{
      a.kcal+=num(e.kcal);a.p+=num(e.p);a.c+=num(e.c);a.f+=num(e.f);return a;
    },{kcal:0,p:0,c:0,f:0});
  }

  function injectCss(){
    if($('v070DietStyle'))return;
    const s=document.createElement('style');s.id='v070DietStyle';s.textContent=`
      #diet .v070Top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      #diet .v070Ready{display:inline-block;background:#153825;color:#63e59a;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:900}
      #diet .v070SearchList{display:grid;gap:7px;margin-top:8px}
      #diet .v070FoodBtn{width:100%;text-align:left;background:#101010;color:#eee;border:1px solid #303030;border-radius:12px;padding:10px}
      #diet .v070FoodBtn.active{border-color:#ef2b2d;background:#1b1010}
      #diet .v070FoodBtn small{display:block;color:#999;margin-top:2px}
      #diet .v070Preview{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:10px 0}
      #diet .v070Preview>div{background:#101010;border:1px solid #303030;border-radius:12px;padding:10px}
      #diet .v070Preview span{display:block;color:#888;font-size:10px}
      #diet .v070Preview b{display:block;margin-top:2px}
      #diet .v070Entry{display:grid;grid-template-columns:1fr auto;gap:10px;border-top:1px solid #2b2b2b;padding:10px 0}
      #diet .v070Entry:first-child{border-top:0}
      #diet .v070Entry small{display:block;color:#999;margin-top:3px}
      #diet .v070Entry button{border:0;border-radius:10px;background:#4b1c1f;color:#fff;padding:8px 10px}
      #diet .v070Custom{margin-top:12px;padding-top:12px;border-top:1px solid #303030}
      #diet .v070CustomGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
      #diet .v070UnitRow{display:grid;grid-template-columns:2fr 1fr;gap:8px}
      #diet .v070Source{font-size:10px;color:#777;line-height:1.4;margin-top:8px}
      @media(max-width:600px){#diet .v070Preview{grid-template-columns:1fr 1fr}#diet .v070CustomGrid{grid-template-columns:1fr}#diet .v070UnitRow{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(s);
  }

  function installUi(){
    const root=$('diet');if(!root)return;
    injectCss();
    root.innerHTML=`
      <div class="card dietHero">
        <div class="v070Top"><div><span class="v070Ready">LICZENIE AKTYWNE</span><h2 style="margin-top:8px">Dieta</h2></div><div class="small">0.7.0</div></div>
        <p class="hint">Dodaj produkt ręcznie, nawet bez kodu. Dla mięsa, ryżu itd. wpisujesz gramy; dla produktów takich jak jajka możesz wybrać sztuki.</p>
        <div class="macroGrid">
          <div><span>Kalorie</span><b id="v070TotalKcal">0 kcal</b></div>
          <div><span>Białko</span><b id="v070TotalP">0 g</b></div>
          <div><span>Węglowodany</span><b id="v070TotalC">0 g</b></div>
          <div><span>Tłuszcze</span><b id="v070TotalF">0 g</b></div>
        </div>
      </div>

      <div class="card">
        <div class="eyebrow">DODAJ PRODUKT</div>
        <h2>Co zjadłeś?</h2>
        <label>Szukaj produktu</label>
        <input id="v070FoodSearch" placeholder="np. kurczak, jajko, ryż">
        <div id="v070FoodList" class="v070SearchList"></div>
        <div class="v070UnitRow">
          <div><label>Ilość</label><input id="v070Amount" type="number" min="0.1" step="0.1" value="100"></div>
          <div><label>Jednostka</label><select id="v070Unit"><option value="g">gramy</option><option value="piece">sztuki</option></select></div>
        </div>
        <div class="v070Preview">
          <div><span>Kalorie</span><b id="v070Kcal">—</b></div>
          <div><span>Białko</span><b id="v070P">—</b></div>
          <div><span>Węgle</span><b id="v070C">—</b></div>
          <div><span>Tłuszcz</span><b id="v070F">—</b></div>
        </div>
        <button id="v070Add" class="primary bigBtn">DODAJ DO DZISIAJ</button>
        <p id="v070PortionInfo" class="hint"></p>

        <div class="v070Custom">
          <div class="eyebrow">BRAK NA LIŚCIE?</div>
          <h3>Dodaj własny produkt</h3>
          <div class="v070CustomGrid">
            <div><label>Nazwa</label><input id="v070CustomName" placeholder="np. Twaróg półtłusty"></div>
            <div><label>kcal / 100 g</label><input id="v070CustomKcal" type="number" min="0" step="0.1"></div>
            <div><label>Białko / 100 g</label><input id="v070CustomP" type="number" min="0" step="0.1"></div>
            <div><label>Węgle / 100 g</label><input id="v070CustomC" type="number" min="0" step="0.1"></div>
            <div><label>Tłuszcz / 100 g</label><input id="v070CustomF" type="number" min="0" step="0.1"></div>
            <div><label>g / sztukę (opcjonalnie)</label><input id="v070CustomPiece" type="number" min="0" step="0.1" placeholder="np. 55"></div>
          </div>
          <button id="v070SaveFood" class="secondary bigBtn">ZAPISZ PRODUKT</button>
          <p class="v070Source">Wartości produktów bazowych są orientacyjne i mogą różnić się zależnie od producenta oraz sposobu przygotowania. Dla produktów pakowanych najlepiej przepisać dane z etykiety.</p>
        </div>
      </div>

      <div class="card">
        <div class="eyebrow">DZISIAJ</div>
        <h2>Dzisiejsze posiłki</h2>
        <div id="v070Entries" class="hint">Brak produktów.</div>
      </div>`;
  }

  function renderFoods(query=''){
    const box=$('v070FoodList');if(!box)return;
    const q=String(query||'').trim().toLowerCase();
    const list=foods().filter(x=>!q||x.name.toLowerCase().includes(q)).slice(0,8);
    if(!list.length){box.innerHTML='<div class="hint">Brak wyniku — dodaj własny produkt niżej.</div>';return;}
    box.innerHTML=list.map(f=>`<button class="v070FoodBtn ${f.id===selectedId?'active':''}" data-food="${esc(f.id)}"><b>${esc(f.name)}</b><small>${round(f.kcal,0)} kcal • B ${round(f.p)} • W ${round(f.c)} • T ${round(f.f)} / 100 g${f.pieceGrams?' • 1 szt. ≈ '+round(f.pieceGrams,0)+' g':''}</small></button>`).join('');
    box.querySelectorAll('[data-food]').forEach(b=>b.addEventListener('click',()=>selectFood(b.dataset.food)));
  }

  function selectFood(id){
    selectedId=id;const f=getFood(id);
    const unit=$('v070Unit');
    if(unit){
      [...unit.options].forEach(o=>{if(o.value==='piece')o.disabled=!f.pieceGrams;});
      if(!f.pieceGrams&&unit.value==='piece')unit.value='g';
    }
    const amount=$('v070Amount');
    if(amount)amount.value=unit?.value==='piece'?'1':'100';
    renderFoods($('v070FoodSearch')?.value||'');
    renderPreview();
  }

  function renderPreview(){
    const f=getFood(selectedId),amount=Math.max(0,num($('v070Amount')?.value)),unit=$('v070Unit')?.value||'g';
    if(!f)return;
    if(unit==='piece'&&!f.pieceGrams){$('v070Unit').value='g';return renderPreview();}
    const m=macroFor(f,amount,unit);
    $('v070Kcal').textContent=round(m.kcal,0)+' kcal';
    $('v070P').textContent=round(m.p)+' g';
    $('v070C').textContent=round(m.c)+' g';
    $('v070F').textContent=round(m.f)+' g';
    $('v070PortionInfo').textContent=unit==='piece'
      ? amount+' szt. = około '+round(m.grams,0)+' g'
      : 'Porcja: '+round(m.grams,0)+' g';
  }

  function addToday(){
    const f=getFood(selectedId),amount=num($('v070Amount')?.value),unit=$('v070Unit')?.value||'g';
    if(!f||amount<=0){toastMsg('Wpisz ilość większą od zera.');return;}
    if(unit==='piece'&&!f.pieceGrams){toastMsg('Ten produkt nie ma ustawionej masy jednej sztuki.');return;}
    const m=macroFor(f,amount,unit);
    const list=entries();
    list.push({
      id:'d'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
      date:localDate(),at:Date.now(),foodId:f.id,name:f.name,
      amount:round(amount,2),unit,grams:round(m.grams,1),
      kcal:round(m.kcal,1),p:round(m.p,1),c:round(m.c,1),f:round(m.f,1)
    });
    saveEntries(list);renderDay();toastMsg('Dodano do dzisiejszej diety.');
  }

  function removeEntry(id){
    saveEntries(entries().filter(e=>e.id!==id));renderDay();
  }

  function renderDay(){
    const day=localDate(),list=entries().filter(e=>e.date===day).sort((a,b)=>b.at-a.at);
    const total=totalsFor(list);
    $('v070TotalKcal').textContent=round(total.kcal,0)+' kcal';
    $('v070TotalP').textContent=round(total.p)+' g';
    $('v070TotalC').textContent=round(total.c)+' g';
    $('v070TotalF').textContent=round(total.f)+' g';
    const box=$('v070Entries');if(!box)return;
    if(!list.length){box.className='hint';box.innerHTML='Brak produktów na dziś.';return;}
    box.className='';
    box.innerHTML=list.map(e=>`<div class="v070Entry"><div><b>${esc(e.name)}</b><small>${e.unit==='piece'?round(e.amount,2)+' szt.':round(e.grams,0)+' g'} • ${round(e.kcal,0)} kcal • B ${round(e.p)} • W ${round(e.c)} • T ${round(e.f)}</small></div><button data-del="${esc(e.id)}">USUŃ</button></div>`).join('');
    box.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>removeEntry(b.dataset.del)));
  }

  function saveCustom(){
    const name=$('v070CustomName')?.value.trim()||'';
    const kcal=num($('v070CustomKcal')?.value),p=num($('v070CustomP')?.value),c=num($('v070CustomC')?.value),f=num($('v070CustomF')?.value),piece=num($('v070CustomPiece')?.value);
    if(!name){toastMsg('Wpisz nazwę produktu.');return;}
    if(kcal<=0){toastMsg('Wpisz kalorie na 100 g.');return;}
    const list=customFoods();
    const id='custom-'+Date.now().toString(36);
    const item={id,name,kcal:round(kcal,1),p:round(p,1),c:round(c,1),f:round(f,1)};
    if(piece>0)item.pieceGrams=round(piece,1);
    list.push(item);localStorage.setItem(FOODS_KEY,JSON.stringify(list.slice(-300)));
    selectedId=id;
    ['v070CustomName','v070CustomKcal','v070CustomP','v070CustomC','v070CustomF','v070CustomPiece'].forEach(x=>{if($(x))$(x).value='';});
    if($('v070FoodSearch'))$('v070FoodSearch').value=name;
    renderFoods(name);selectFood(id);toastMsg('Produkt zapisany.');
  }

  function bind(){
    $('v070FoodSearch')?.addEventListener('input',e=>renderFoods(e.target.value));
    $('v070Amount')?.addEventListener('input',renderPreview);
    $('v070Unit')?.addEventListener('change',()=>{const a=$('v070Amount');if(a)a.value=$('v070Unit').value==='piece'?'1':'100';renderPreview();});
    $('v070Add')?.addEventListener('click',addToday);
    $('v070SaveFood')?.addEventListener('click',saveCustom);
  }

  function boot(){
    installUi();bind();renderFoods();selectFood(selectedId);renderDay();
  }

  window.TrenerDiet={foods,entries,macroFor,addToday,removeEntry,render:renderDay};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();