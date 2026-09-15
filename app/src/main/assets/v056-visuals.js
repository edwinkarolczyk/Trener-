(function(){
  'use strict';

  const AI_IDS=['bench','closebench','pushups','row','deadlift','squat','curl','ohp','lunges','plank','onearmrow'];
  const AI_INDEX=Object.fromEntries(AI_IDS.map((id,i)=>[id,i]));
  const SPRITE='ai/exercises-v054.webp';
  const FOCUS={
    bench:['Klatka','Triceps','Przód barków'],incline:['Górna klatka','Triceps','Przód barków'],closebench:['Triceps','Klatka'],pushups:['Klatka','Triceps','Core'],
    pausebench:['Klatka','Triceps'],floorpress:['Klatka','Triceps'],feetpush:['Górna klatka','Triceps'],diamondpush:['Triceps','Klatka'],
    row:['Plecy','Biceps','Tył barków'],underrow:['Plecy','Biceps'],pendlay:['Plecy','Biceps'],reardeltrow:['Tył barków','Góra pleców'],onearmrow:['Plecy','Biceps'],
    curl:['Biceps','Przedramię'],seatedcurl:['Biceps'],reversecurl:['Przedramię','Biceps'],curl21:['Biceps'],iso90:['Biceps','Przedramię'],
    ohp:['Barki','Triceps','Core'],pushpress:['Barki','Triceps','Nogi'],platefront:['Przód barków'],shrug:['Kaptury'],skull:['Triceps'],overheadtri:['Triceps'],
    squat:['Czworogłowe','Pośladki','Core'],frontsquat:['Czworogłowe','Core'],lunges:['Nogi','Pośladki'],bulgarian:['Nogi','Pośladki'],
    deadlift:['Tył uda','Pośladki','Plecy'],rdl:['Tył uda','Pośladki'],goodmorning:['Tył uda','Pośladki'],hipthrust:['Pośladki','Tył uda'],calfraise:['Łydki'],
    plank:['Core','Brzuch'],sideplank:['Core','Skośne brzucha'],legraise:['Brzuch','Zginacze bioder'],deadbug:['Core'],crunch:['Brzuch']
  };
  const MOTION={
    bench:'Gryf w dół do klatki → płynnie w górę',incline:'Do górnej klatki → wyciskaj nad barki',closebench:'Łokcie blisko tułowia → pełny wyprost',pushups:'Całe ciało w dół → wypchnij podłoże',
    row:'Przyciągnij gryf do brzucha → opuść pod kontrolą',underrow:'Podchwyt, łokcie w tył → gryf do brzucha',curl:'Ugnij łokcie bez bujania → wolno opuść',reversecurl:'Nachwyt → ugnij łokcie → wolno opuść',
    ohp:'Gryf od barków pionowo nad głowę',squat:'Biodra w dół i lekko w tył → wstań przez całą stopę',lunges:'Krok → zejście pionowo → odepchnij podłoże',plank:'Utrzymuj jedną linię ciała i stałe napięcie',
    deadlift:'Zbuduj napięcie → odepchnij podłogę → wyprost bioder',rdl:'Cofnij biodra → gryf blisko nóg → wyprost bioder'
  };

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function getEx(id){try{return exerciseLibrary.find(x=>x.id===id)||null;}catch(e){return null;}}
  function currentEx(){try{return currentPlan?.ex?.[exIdx]||null;}catch(e){return null;}}
  function fmtRest(sec){sec=Number(sec)||0;return sec>=60?(Math.floor(sec/60)+' min'+(sec%60?' '+(sec%60)+' s':'')):sec+' s';}
  function focus(ex){return FOCUS[ex.id]||[ex.group||'Ćwiczenie'];}
  function movement(ex){return MOTION[ex.id]||ex.movement||ex.tip||'Wykonuj pełny ruch pod kontrolą.';}

  function schematic(ex){
    try{
      if(window.TrenerExerciseVisuals?.frames)return window.TrenerExerciseVisuals.frames(ex.id);
    }catch(e){}
    return '';
  }

  function hero(ex){
    if(AI_INDEX[ex.id]===undefined)return '';
    const pos=(AI_INDEX[ex.id]||0)*10;
    return `<div class="v056Hero"><div class="v056HeroImage" role="img" aria-label="${esc(ex.n)} — podgląd ruchu" style="background-image:url('${SPRITE}');background-position:center ${pos}%"></div><div class="v056HeroLabels"><span>START</span><b>→ KIERUNEK RUCHU →</b><span>KONIEC</span></div></div>`;
  }

  function visual(ex,compact=false){
    const chips=focus(ex).map(x=>`<span>${esc(x)}</span>`).join('');
    const h=hero(ex),scheme=schematic(ex);
    return `<div class="v056Pro ${compact?'v056Compact':''}">
      <div class="v056Chips">${chips}</div>
      ${h||''}
      ${scheme?`<div class="v056Scheme">${scheme}</div>`:''}
      <div class="v056MotionText"><span>TOR RUCHU</span><b>${esc(movement(ex))}</b></div>
    </div>`;
  }

  function installCss(){
    if(document.getElementById('v056-style'))return;
    const s=document.createElement('style');s.id='v056-style';s.textContent=`
      .v056Pro{background:linear-gradient(180deg,#0b0b0b,#060606);border-radius:14px;overflow:hidden}.v056Chips{display:flex;gap:6px;flex-wrap:wrap;padding:9px 9px 4px}.v056Chips span{font-size:9px;font-weight:900;letter-spacing:.04em;color:#ffb0b1;border:1px solid #492526;background:#160b0c;border-radius:999px;padding:4px 7px}
      .v056Hero{margin:5px 8px 8px;border:1px solid #352223;border-radius:13px;overflow:hidden;background:#030303}.v056HeroImage{width:100%;aspect-ratio:4/5;max-height:390px;background-repeat:no-repeat;background-size:100% 1100%;background-color:#050505}.v056HeroLabels{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;padding:7px 9px;background:#090909}.v056HeroLabels span{font-size:9px;font-weight:950;color:#ef4b4d;letter-spacing:.09em}.v056HeroLabels b{text-align:center;font-size:9px;color:#888;letter-spacing:.05em}
      .v056Scheme{margin:8px;border:1px solid #252525;border-radius:12px;padding:7px;background:#090909}.v056Scheme .v052Motion{margin:0!important;display:grid!important}.v056Scheme .v052Frame{background:#080808!important}.v056MotionText{margin:8px;padding:10px;border-left:3px solid #ef4b4d;background:#110b0b;border-radius:8px}.v056MotionText span{display:block;color:#ef4b4d;font-size:9px;font-weight:950;letter-spacing:.09em}.v056MotionText b{display:block;margin-top:3px;font-size:12px;line-height:1.35;color:#eee}
      .v056Compact .v056HeroImage{max-height:310px}.v056Compact .v056Scheme{margin-top:6px}.v056Compact .v056MotionText{margin-bottom:9px}
      .v056Overlay{position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,.93);display:flex;align-items:flex-end;justify-content:center;padding:8px}.v056Modal{width:min(760px,100%);max-height:95vh;overflow:auto;background:#0b0b0b;border:1px solid #4a292a;border-radius:20px;padding:13px;box-shadow:0 -12px 44px #000}.v056Top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.v056Top h2{margin:3px 0 4px;font-size:23px;line-height:1.08}.v056Top p{margin:0;color:#888;font-size:11px}.v056Close{padding:7px 10px!important}.v056Tabs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:12px 0}.v056Tab{border:1px solid #343434;background:#111;color:#aaa;border-radius:10px;padding:9px 5px;font-weight:900;font-size:10px}.v056Tab.active{border-color:#ef4b4d;color:#fff;background:#261011}.v056Panel{display:none}.v056Panel.active{display:block}.v056Detail{border-top:1px solid #252525;padding:12px 3px}.v056Detail:first-child{border-top:0}.v056Detail span{display:block;color:#ef4b4d;font-size:9px;font-weight:950;letter-spacing:.09em}.v056Detail b{display:block;margin-top:5px;font-size:13px;line-height:1.45}.v056Danger{color:#ff9b9d!important}.v056Safe{color:#8de5aa!important}.v056Version{display:inline-block;margin-top:8px;font-size:9px;color:#666}
      #v055Visual.v056Ready{border-color:#563032;background:#080707}#v055Visual.v056Ready .v055VisualTop span{color:#ff7779}#v055Visual.v056Ready .v055VisualBody{min-height:260px;background:#050505}#v055Visual.v056Ready .v055VisualTop button{border-color:#633537;color:#ff9b9d}
      @media(max-width:520px){.v056HeroImage{max-height:330px}.v056Compact .v056HeroImage{max-height:265px}.v056Scheme .v052Motion{grid-template-columns:minmax(0,1fr) 18px minmax(0,1fr)!important}.v056Top h2{font-size:20px}.v056Modal{padding:10px}.v056Tabs{position:sticky;top:-10px;background:#0b0b0b;padding:8px 0;z-index:2}}
    `;document.head.appendChild(s);
  }

  function open(id){
    const ex=getEx(id)||currentEx();if(!ex)return;
    document.getElementById('v056Overlay')?.remove();
    const o=document.createElement('div');o.id='v056Overlay';o.className='v056Overlay';
    o.innerHTML=`<div class="v056Modal">
      <div class="v056Top"><div><div class="eyebrow">TRENER 2 • INSTRUKCJA RUCHU</div><h2>${esc(ex.n)}</h2><p>${esc(ex.equipment||'')} • ${ex.sets||'—'} serie • przerwa ${esc(fmtRest(ex.rest))}</p></div><button class="secondary v056Close" data-close>✕</button></div>
      <div class="v056Tabs"><button class="v056Tab active" data-tab="graphic">GRAFIKA</button><button class="v056Tab" data-tab="tips">WSKAZÓWKI</button><button class="v056Tab" data-tab="errors">BŁĘDY</button></div>
      <div class="v056Panel active" data-panel="graphic">${visual(ex,false)}</div>
      <div class="v056Panel" data-panel="tips"><div class="v056Detail"><span>1. USTAWIENIE</span><b>${esc(ex.setup||ex.tip||'Ustaw stabilną pozycję i przygotuj napięcie całego ciała.')}</b></div><div class="v056Detail"><span>2. WYKONANIE</span><b>${esc(ex.movement||movement(ex))}</b></div><div class="v056Detail"><span>3. TEMPO I KONTROLA</span><b>${esc(ex.tip||'Nie przyspieszaj kosztem techniki. Kontroluj ruch w obu kierunkach.')}</b></div></div>
      <div class="v056Panel" data-panel="errors"><div class="v056Detail"><span>NAJCZĘSTSZY BŁĄD</span><b class="v056Danger">${esc(ex.mistake||'Utrata stabilnej pozycji i zbyt szybkie wykonywanie ruchu.')}</b></div><div class="v056Detail"><span>BEZPIECZNIE</span><b class="v056Safe">Jeżeli pojawia się ostry ból albo tracisz kontrolę nad ciężarem, przerwij serię i zmniejsz obciążenie.</b></div></div>
      <span class="v056Version">Grafiki ćwiczeń • v0.5.6</span>
    </div>`;
    document.body.appendChild(o);
    o.querySelector('[data-close]').onclick=()=>o.remove();
    o.addEventListener('click',e=>{if(e.target===o)o.remove();});
    o.querySelectorAll('.v056Tab').forEach(b=>b.addEventListener('click',()=>{
      o.querySelectorAll('.v056Tab').forEach(x=>x.classList.toggle('active',x===b));
      const tab=b.dataset.tab;o.querySelectorAll('.v056Panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===tab));
    }));
  }

  function upgradeInline(){
    const wrap=document.getElementById('v055Visual'),body=document.getElementById('v055VisualBody'),name=document.getElementById('v055VisualName'),btn=document.getElementById('v055VisualOpen');
    if(!wrap||!body)return;
    const ex=currentEx();if(!ex)return;
    if(body.dataset.v056===String(ex.id))return;
    body.dataset.ex=String(ex.id);body.dataset.v056=String(ex.id);
    if(name)name.textContent=ex.n||'Ćwiczenie';
    if(btn)btn.textContent='PEŁNA INSTRUKCJA';
    wrap.classList.add('v056Ready');
    body.innerHTML=visual(ex,true);
  }

  function hookPreview(){
    const previous=window.TrenerAiPreview||{};
    window.TrenerAiPreview=Object.assign({},previous,{open});
    window.TrenerProVisuals={open,upgradeInline};
  }

  function boot(){
    installCss();hookPreview();
    setInterval(()=>{
      hookPreview();
      try{if(typeof running!=='undefined'&&running)upgradeInline();}catch(e){}
    },300);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
