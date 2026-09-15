(function(){
  'use strict';

  const CUSTOM_KEY='trainer3.customPlans.v050';
  const SCHEDULE_KEY='trainer3.schedule.v050';
  const DAYS=[['Nd',0],['Pon',1],['Wt',2],['Śr',3],['Czw',4],['Pt',5],['Sob',6]];
  let editingPlanId='';

  const extraExercises=[
    {id:'pausebench',n:'Wyciskanie z pauzą na klatce',sets:4,min:5,max:8,rest:150,group:'Klatka',equipment:'Sztanga + ławka',tip:'Zatrzymaj sztangę na 1–2 sekundy na klatce. Nie rozluźniaj łopatek.',setup:'Pozycja jak do zwykłego wyciskania. Łopatki ściągnięte, stopy mocno w podłodze.',movement:'Opuść gryf pod kontrolą, zatrzymaj na klatce i wyciśnij bez odbicia.',mistake:'Odbijanie gryfu albo tracenie napięcia podczas pauzy.'},
    {id:'floorpress',n:'Wyciskanie sztangi z podłogi',sets:3,min:8,max:12,rest:120,group:'Klatka',equipment:'Sztanga',tip:'Łokcie zatrzymują się na podłodze. Nie odbijaj ramion od podłoża.',setup:'Połóż się na plecach z ugiętymi nogami. Ustaw sztangę bezpiecznie nad klatką.',movement:'Opuszczaj do lekkiego kontaktu tricepsów z podłogą, potem wyciśnij pionowo.',mistake:'Uderzanie łokciami o podłogę i utrata kontroli.'},
    {id:'feetpush',n:'Pompki z nogami na ławce',sets:3,min:8,max:15,rest:90,group:'Klatka',equipment:'Ławka',tip:'Ciało w jednej linii. Im wyżej nogi, tym trudniej.',setup:'Stopy na ławce, dłonie nieco szerzej niż barki, brzuch napięty.',movement:'Opuść klatkę między dłonie i wypchnij ciało bez zapadania bioder.',mistake:'Opuszczone biodra i skracanie zakresu ruchu.'},
    {id:'diamondpush',n:'Pompki wąskie / diamentowe',sets:3,min:8,max:15,rest:75,group:'Triceps',equipment:'Masa ciała',tip:'Dłonie ustaw wąsko, ale bez bólu nadgarstków. Łokcie prowadź blisko tułowia.',setup:'Pozycja pompki, dłonie pod mostkiem w wygodnym wąskim ustawieniu.',movement:'Schodź całym ciałem w dół i prostuj łokcie bez rozjeżdżania ich na boki.',mistake:'Zbyt wąskie ustawienie dłoni powodujące ból nadgarstków.'},
    {id:'pendlay',n:'Wiosłowanie Pendlay',sets:4,min:6,max:8,rest:150,group:'Plecy',equipment:'Sztanga',tip:'Każde powtórzenie zaczyna się z podłogi. Plecy trzymaj neutralnie.',setup:'Tułów prawie równolegle do podłogi, gryf nad śródstopiem, brzuch mocno napięty.',movement:'Dynamicznie przyciągnij gryf do dolnej klatki/brzucha i odłóż go pod kontrolą.',mistake:'Prostowanie tułowia i zamienianie ruchu w szarpane podciąganie.'},
    {id:'deadlift',n:'Martwy ciąg klasyczny',sets:3,min:4,max:6,rest:180,group:'Plecy / nogi',equipment:'Sztanga',tip:'Gryf blisko nóg, napięty brzuch. Najpierw zbuduj napięcie, potem oderwij sztangę.',setup:'Stopy pod biodrami, gryf nad śródstopiem, plecy neutralne, łopatki nad gryfem.',movement:'Odepchnij podłogę nogami i wyprostuj biodra, prowadząc gryf blisko ciała.',mistake:'Zaokrąglanie lędźwi i odrywanie gryfu daleko od nóg.'},
    {id:'rdl',n:'Martwy ciąg rumuński',sets:3,min:8,max:10,rest:120,group:'Nogi / tył uda',equipment:'Sztanga',tip:'Biodra cofaj do tyłu. Gryf prowadź blisko nóg.',setup:'Stań prosto z gryfem, kolana lekko ugięte, brzuch napięty.',movement:'Cofaj biodra, opuszczając gryf wzdłuż ud i piszczeli do wyraźnego rozciągnięcia tyłu uda.',mistake:'Robienie przysiadu zamiast zawiasu biodrowego i odrywanie gryfu od nóg.'},
    {id:'goodmorning',n:'Good morning ze sztangą',sets:3,min:8,max:12,rest:105,group:'Nogi / tył uda',equipment:'Sztanga',tip:'Lekki ciężar. Ruch z biodra, nie przez zaokrąglanie pleców.',setup:'Sztanga stabilnie na górze pleców, stopy na szerokość bioder, brzuch napięty.',movement:'Cofnij biodra i pochyl tułów przy neutralnym kręgosłupie, potem wróć przez wyprost bioder.',mistake:'Za duży ciężar i zginanie kręgosłupa zamiast bioder.'},
    {id:'shrug',n:'Szrugsy ze sztangą',sets:3,min:10,max:15,rest:75,group:'Plecy / kaptury',equipment:'Sztanga',tip:'Unoś barki pionowo. Nie kręć ramionami.',setup:'Stań prosto z gryfem przed udami, ramiona wyprostowane.',movement:'Unieś barki wysoko w stronę uszu, zatrzymaj na moment i opuść.',mistake:'Krążenie barkami i bujanie całym ciałem.'},
    {id:'skull',n:'Francuskie wyciskanie leżąc',sets:3,min:8,max:12,rest:90,group:'Triceps',equipment:'Sztanga + ławka',tip:'Łokcie utrzymuj możliwie nieruchomo. Użyj lekkiego ciężaru.',setup:'Połóż się na ławce i ustaw gryf nad barkami na wyprostowanych rękach.',movement:'Zginaj łokcie, opuszczając gryf w stronę czoła/za głowę, następnie wyprostuj ramiona.',mistake:'Rozjeżdżanie łokci i zbyt ciężki gryf.'},
    {id:'overheadtri',n:'Prostowanie sztangi zza głowy',sets:3,min:10,max:12,rest:90,group:'Triceps',equipment:'Sztanga',tip:'Brzuch napięty, łokcie skierowane do przodu. Nie wyginaj mocno pleców.',setup:'Usiądź lub stań ze sztangą nad głową, chwyt umiarkowanie wąski.',movement:'Zegnij łokcie i opuść gryf za głowę, potem wyprostuj ramiona.',mistake:'Duże przeprosty lędźwi i rozchodzenie łokci na boki.'},
    {id:'pushpress',n:'Push press',sets:4,min:5,max:8,rest:150,group:'Barki',equipment:'Sztanga',tip:'Krótki dip nóg pomaga rozpocząć ruch. Kończ stabilnie nad głową.',setup:'Sztanga na górze klatki, stopy stabilnie, łokcie lekko przed gryfem.',movement:'Zrób krótki ugięcie kolan, dynamicznie wyprostuj nogi i dokończ wyciskanie rękami.',mistake:'Głęboki przysiad i utrata kontroli nad gryfem nad głową.'},
    {id:'reardeltrow',n:'Wiosłowanie szeroko do klatki',sets:3,min:10,max:15,rest:90,group:'Barki / tył',equipment:'Sztanga',tip:'Lekki ciężar, łokcie szerzej. Celuj gryfem wyżej niż w zwykłym wiosłowaniu.',setup:'Pochyl tułów, utrzymuj neutralny kręgosłup i szeroki chwyt.',movement:'Przyciągnij gryf do dolnej części klatki, prowadząc łokcie szeroko.',mistake:'Szarpanie i zamienianie ćwiczenia w zwykłe ciężkie wiosłowanie.'},
    {id:'platefront',n:'Unoszenie talerza przed siebie',sets:3,min:10,max:15,rest:75,group:'Barki',equipment:'Talerz',tip:'Nie unoś barków do uszu. Wybierz lekki talerz.',setup:'Trzymaj talerz oburącz przed udami, łokcie lekko ugięte.',movement:'Unieś talerz do wysokości barków i opuść bez bujania tułowiem.',mistake:'Zamach biodrami i unoszenie ciężaru zbyt wysoko.'},
    {id:'frontsquat',n:'Przysiad przedni',sets:4,min:6,max:10,rest:150,group:'Nogi',equipment:'Sztanga',tip:'Łokcie wysoko, tułów możliwie pionowo. Zacznij od lekkiego ciężaru.',setup:'Sztanga z przodu barków, stopy stabilnie, łokcie wysoko.',movement:'Usiądź biodrami między nogi, utrzymując klatkę wysoko, potem wstań przez całą stopę.',mistake:'Opadające łokcie i zapadanie tułowia do przodu.'},
    {id:'bulgarian',n:'Przysiad bułgarski',sets:3,min:8,max:12,rest:90,group:'Nogi',equipment:'Ławka + masa/sztanga',tip:'Najpierw opanuj bez ciężaru. Kolano prowadź zgodnie ze stopą.',setup:'Tylna stopa na ławce, przednia ustawiona tak, by zachować równowagę.',movement:'Opuszczaj biodra pionowo w dół i wstań naciskając całą przednią stopą.',mistake:'Zbyt wąskie ustawienie nóg i uciekanie kolana do środka.'},
    {id:'hipthrust',n:'Hip thrust ze sztangą',sets:4,min:8,max:12,rest:120,group:'Pośladki',equipment:'Sztanga + ławka',tip:'Na górze dopnij pośladki, nie przeprostuj lędźwi.',setup:'Górna część pleców oparta o ławkę, gryf zabezpieczony na biodrach.',movement:'Wyprostuj biodra do linii barki–biodra–kolana, zatrzymaj i opuść kontrolowanie.',mistake:'Przeprost kręgosłupa zamiast pełnego wyprostu bioder.'},
    {id:'calfraise',n:'Wspięcia na palce stojąc',sets:4,min:12,max:20,rest:60,group:'Łydki',equipment:'Masa / sztanga',tip:'Pełny zakres i krótka pauza na górze.',setup:'Stań stabilnie, w razie obciążenia trzymaj sztangę bezpiecznie.',movement:'Unieś pięty maksymalnie wysoko, zatrzymaj i powoli opuść.',mistake:'Sprężynowanie bez pełnego zakresu.'},
    {id:'sideplank',n:'Plank bokiem',sets:3,min:20,max:60,rest:60,time:true,group:'Brzuch',equipment:'Masa ciała',tip:'Biodra utrzymuj wysoko i w jednej linii z tułowiem.',setup:'Oprzyj się na przedramieniu i boku stopy, bark nad łokciem.',movement:'Utrzymuj ciało w prostej linii przez zaplanowany czas.',mistake:'Opadanie bioder i zapadanie barku.'},
    {id:'legraise',n:'Unoszenie nóg leżąc',sets:3,min:10,max:20,rest:60,group:'Brzuch',equipment:'Masa ciała',tip:'Lędźwie utrzymuj przy podłożu. Ruch wykonuj bez zamachu.',setup:'Połóż się na plecach, nogi wyprostowane lub lekko ugięte.',movement:'Unieś nogi do góry i powoli opuść tylko tak nisko, jak utrzymasz lędźwie stabilnie.',mistake:'Odrywanie lędźwi i szybkie rzucanie nogami.'},
    {id:'deadbug',n:'Dead bug',sets:3,min:8,max:12,rest:60,group:'Brzuch',equipment:'Masa ciała',tip:'Lędźwie przy podłodze. Ruch wolny i naprzemienny.',setup:'Leżenie na plecach, biodra i kolana około 90°, ręce w górze.',movement:'Wyprostuj przeciwną rękę i nogę bez utraty kontaktu lędźwi z podłogą.',mistake:'Wyginanie pleców w łuk przy opuszczaniu kończyn.'},
    {id:'crunch',n:'Spięcia brzucha',sets:3,min:12,max:20,rest:60,group:'Brzuch',equipment:'Masa ciała',tip:'Unoś łopatki, nie ciągnij głowy rękami.',setup:'Połóż się na plecach z ugiętymi kolanami i stopami na podłodze.',movement:'Napnij brzuch i unieś łopatki kilka centymetrów, potem wróć powoli.',mistake:'Szarpanie szyją i robienie pełnego siadu zamiast spięcia.'}
  ];

  const metadata={
    bench:['Klatka','Sztanga + ławka','Ustaw stopy stabilnie, ściągnij łopatki i ustaw gryf nad barkami.','Opuść gryf do dolnej części klatki i wyciśnij po lekkim łuku do góry.','Odbijanie od klatki i odrywanie pośladków od ławki.'],
    incline:['Klatka','Sztanga + ławka','Ławka 20–30°, łopatki ściągnięte, stopy stabilnie.','Opuść gryf do górnej części klatki i wyciśnij bez tracenia ustawienia barków.','Zbyt pionowa ławka i wypychanie barków do przodu.'],
    closebench:['Triceps','Sztanga + ławka','Chwyt trochę węższy niż przy zwykłym wyciskaniu, łopatki stabilnie.','Opuść gryf do klatki z łokciami bliżej tułowia i wyciśnij.','Zbyt wąski chwyt i rozchodzenie łokci.'],
    pushups:['Klatka','Masa ciała','Dłonie pod barkami lub trochę szerzej, ciało w jednej linii.','Opuść klatkę między dłonie i wypchnij ciało bez utraty napięcia.','Zapadanie bioder i skrócony zakres.'],
    row:['Plecy','Sztanga','Pochyl tułów, napnij brzuch i trzymaj plecy neutralnie.','Przyciągnij gryf do dolnej części brzucha, potem opuść pod kontrolą.','Szarpanie tułowiem i zaokrąglanie pleców.'],
    underrow:['Plecy','Sztanga','Chwyt podchwytem, tułów stabilny i brzuch napięty.','Przyciągaj gryf do brzucha prowadząc łokcie w tył.','Bujanie biodrami i nadmierne prostowanie tułowia.'],
    curl:['Biceps','Sztanga','Stań prosto, łokcie przy ciele, nadgarstki neutralne.','Ugnij łokcie bez przesuwania ich do przodu i opuszczaj 2–3 sekundy.','Bujanie biodrami i zarzucanie ciężaru.'],
    seatedcurl:['Biceps','Sztanga + ławka','Usiądź stabilnie, barki cofnięte, łokcie przy tułowiu.','Ugnij przedramiona i opuść gryf wolno do pełnego rozciągnięcia.','Odchylanie pleców i skracanie ruchu.'],
    reversecurl:['Biceps / przedramię','Sztanga','Chwyt nachwytem, nadgarstki proste, łokcie przy ciele.','Ugnij łokcie i opuszczaj gryf bez łamania nadgarstków.','Zginanie nadgarstków i bujanie tułowiem.'],
    curl21:['Biceps','Sztanga','Lekki ciężar i stabilne łokcie przy tułowiu.','7 dolnych połówek + 7 górnych połówek + 7 pełnych ruchów.','Zbyt ciężki gryf i utrata zakresu.'],
    iso90:['Biceps','Sztanga','Ugnij łokcie około 90° i ustaw barki neutralnie.','Utrzymaj pozycję bez ruchu przez zadany czas.','Opadanie łokci i odchylanie tułowia.'],
    ohp:['Barki','Sztanga','Sztanga na górze klatki, brzuch i pośladki mocno napięte.','Wyciśnij pionowo nad głowę, przepuszczając głowę pod gryf po jego minięciu.','Duży przeprost lędźwi i prowadzenie gryfu daleko od ciała.'],
    squat:['Nogi','Sztanga','Sztanga stabilnie na plecach, stopy pewnie, brzuch napięty.','Zejdź do kontrolowanej głębokości i wstań prowadząc kolana zgodnie ze stopami.','Kolana uciekające do środka i utrata napięcia tułowia.'],
    lunges:['Nogi','Masa / sztanga','Stań stabilnie i zostaw miejsce na pełny krok.','Zrób krok, zejdź kolanem w dół i wróć przez nacisk przedniej stopy.','Zbyt krótki krok i chwiejne kolano.'],
    plank:['Brzuch','Masa ciała','Łokcie pod barkami, pośladki i brzuch napięte.','Utrzymuj prostą linię od głowy do pięt przez zadany czas.','Opadanie bioder albo wypychanie ich zbyt wysoko.']
  };

  function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function safe(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
  function uid(){return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  function clone(v){return JSON.parse(JSON.stringify(v))}
  function customPlans(){return safe(localStorage.getItem(CUSTOM_KEY),[])}
  function saveCustomPlans(list){localStorage.setItem(CUSTOM_KEY,JSON.stringify(list.slice(0,30)))}
  function planKey(id){return 'custom:'+id}

  function enrichLibrary(){
    for(const ex of exerciseLibrary){
      const m=metadata[ex.id];
      if(m){ex.group=m[0];ex.equipment=m[1];ex.setup=m[2];ex.movement=m[3];ex.mistake=m[4];}
      ex.group=ex.group||'Inne';ex.equipment=ex.equipment||'—';ex.setup=ex.setup||ex.tip||'';ex.movement=ex.movement||ex.tip||'';ex.mistake=ex.mistake||'Przerwij, jeśli ruch powoduje ostry ból.';
    }
    const ids=new Set(exerciseLibrary.map(x=>x.id));
    for(const ex of extraExercises)if(!ids.has(ex.id)){exerciseLibrary.push(ex);ids.add(ex.id);}
  }

  function migrateOldCustom(){
    const list=customPlans();
    if(list.length)return;
    const old=safe(localStorage.getItem('trainer3.customPlan'),null);
    if(old&&Array.isArray(old.ex)&&old.ex.length){
      saveCustomPlans([{id:uid(),title:old.title||'Mój trening mieszany',ex:old.ex.map(x=>x.id||x.name).filter(Boolean)}]);
    }
  }

  const originalGetPlan=typeof getPlan==='function'?getPlan:null;
  getPlan=function(key){
    if(String(key||'').startsWith('custom:')){
      const id=String(key).slice(7),p=customPlans().find(x=>x.id===id);
      if(!p)return null;
      const ex=(p.ex||[]).map(id=>{
        const found=exerciseLibrary.find(x=>x.id===id||x.n===id);return found?clone(found):null;
      }).filter(Boolean);
      return {title:p.title||'Mój trening',ex};
    }
    if(key==='custom'){
      const first=customPlans()[0];return first?getPlan(planKey(first.id)):(originalGetPlan?originalGetPlan(key):null);
    }
    return originalGetPlan?originalGetPlan(key):plans[key];
  };

  function allPlanOptions(){
    const base=[['mon','Poniedziałek — klatka + triceps'],['wed','Środa — plecy + biceps'],['fri','Piątek — barki + nogi + brzuch'],['biceps','Dodatkowo — biceps']];
    return base.concat(customPlans().map(p=>[planKey(p.id),p.title]));
  }

  function refreshPlanSelect(preserve){
    const select=document.getElementById('planSelect');if(!select)return;
    const current=preserve||select.value;
    [...select.querySelectorAll('.v050CustomOption')].forEach(x=>x.remove());
    const old=document.getElementById('customOption');if(old)old.classList.add('hidden');
    for(const p of customPlans()){
      const o=document.createElement('option');o.className='v050CustomOption';o.value=planKey(p.id);o.textContent='Własny — '+p.title;select.appendChild(o);
    }
    if([...select.options].some(o=>o.value===current))select.value=current;
  }

  refreshCustomOption=function(){refreshPlanSelect();refreshEditorSelect();renderSchedule();};

  function ensureCss(){
    if(document.getElementById('v050-style'))return;
    const s=document.createElement('style');s.id='v050-style';s.textContent=`
      .v050Version{font-size:11px;color:#999;margin-top:3px}.v050Version b{color:#ef4b4d}
      .v050Manager{display:grid;grid-template-columns:1fr auto auto;gap:8px;margin:12px 0}.v050Manager select{min-width:0}
      .v050Search{margin:10px 0}.v050Exercise{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1px solid #2b2b2b;border-radius:12px;padding:10px;margin:8px 0;background:#101010}.v050Exercise small{display:block;color:#999;margin-top:3px}.v050Exercise button{padding:8px 10px;font-size:11px}.v050Group{font-size:11px;color:#ef4b4d;font-weight:900;margin:15px 0 5px;text-transform:uppercase;letter-spacing:.05em}
      .v050ScheduleRow{display:grid;grid-template-columns:54px 1fr;gap:10px;align-items:center;margin:8px 0}.v050ScheduleRow b{font-size:12px}.v050Today{border-left:3px solid #ef2b2d;padding-left:8px}.v050TodayHint{margin-top:10px;padding:10px 12px;border:1px solid #3a2525;background:#151010;border-radius:10px;font-size:12px;color:#ddd}.v050TodayHint b{color:#ff686a}
      .v050Overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.82);display:flex;align-items:flex-end;justify-content:center;padding:14px}.v050Modal{width:min(620px,100%);max-height:88vh;overflow:auto;background:#111;border:1px solid #3a3a3a;border-radius:18px;padding:18px}.v050ModalTop{display:flex;justify-content:space-between;gap:10px;align-items:start}.v050ModalTop button{padding:7px 10px}.v050Tags{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0}.v050Tags span{font-size:11px;border:1px solid #333;border-radius:999px;padding:5px 8px;color:#bbb}.v050Motion{display:grid;grid-template-columns:1fr 45px 1fr;align-items:center;gap:8px;margin:14px 0}.v050Pose{min-height:95px;border:1px solid #333;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:10px}.v050Pose b{font-size:25px;color:#ef4b4d}.v050Arrow{text-align:center;font-size:28px;color:#ef4b4d}.v050Detail{border-top:1px solid #292929;padding:10px 0}.v050Detail span{display:block;color:#888;font-size:11px;text-transform:uppercase}.v050Detail b{display:block;margin-top:4px;font-size:13px;line-height:1.4}.v050Danger{color:#ff8f91!important}
      @media(max-width:520px){.v050Manager{grid-template-columns:1fr 1fr}.v050Manager select{grid-column:1/-1}.v050Exercise{grid-template-columns:auto 1fr}.v050Exercise button{grid-column:2}.v050Motion{grid-template-columns:1fr 30px 1fr}}
    `;document.head.appendChild(s);
  }

  function appVersion(){try{return window.Android&&Android.getAppVersion?Android.getAppVersion():'0.5.0'}catch(e){return '0.5.0'}}
  function showVersion(){
    const h=document.querySelector('.appHeader>div');if(!h||document.getElementById('v050Version'))return;
    const p=document.createElement('div');p.id='v050Version';p.className='v050Version';p.innerHTML='Idea by Edwin • wersja <b>'+esc(appVersion())+'</b>';h.appendChild(p);
  }

  function ensureMixedUi(){
    const builder=document.getElementById('exerciseBuilder');if(!builder)return;
    if(!document.getElementById('v050Manager')){
      const mgr=document.createElement('div');mgr.id='v050Manager';mgr.className='v050Manager';mgr.innerHTML='<select id="v050PlanEditSelect"><option value="">Nowy trening</option></select><button id="v050New" class="secondary">NOWY</button><button id="v050Delete" class="danger">USUŃ</button>';
      const name=document.getElementById('customName');name.parentNode.insertBefore(mgr,name);
      mgr.querySelector('#v050PlanEditSelect').addEventListener('change',e=>loadPlanEditor(e.target.value));
      mgr.querySelector('#v050New').addEventListener('click',()=>loadPlanEditor(''));
      mgr.querySelector('#v050Delete').addEventListener('click',deleteEditingPlan);
    }
    if(!document.getElementById('v050Search')){
      const search=document.createElement('input');search.id='v050Search';search.className='v050Search';search.placeholder='Szukaj ćwiczenia, np. klatka, sztanga, brzuch…';builder.parentNode.insertBefore(search,builder);search.addEventListener('input',renderBuilder);
    }
    const old=document.getElementById('saveCustomBtn');
    if(old&&!old.dataset.v050){
      const fresh=old.cloneNode(true);fresh.dataset.v050='1';old.replaceWith(fresh);fresh.textContent='ZAPISZ TEN TRENING';fresh.addEventListener('click',saveCustomPlan);
    }
    if(!builder.dataset.v050){builder.dataset.v050='1';builder.addEventListener('click',e=>{const b=e.target.closest('[data-preview]');if(b){e.preventDefault();showPreview(b.dataset.preview);}});}
  }

  function refreshEditorSelect(){
    const s=document.getElementById('v050PlanEditSelect');if(!s)return;
    const val=editingPlanId;s.innerHTML='<option value="">Nowy trening</option>'+customPlans().map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+'</option>').join('');
    s.value=customPlans().some(p=>p.id===val)?val:'';
  }

  function loadPlanEditor(id){
    editingPlanId=id||'';const p=customPlans().find(x=>x.id===editingPlanId);
    document.getElementById('customName').value=p?.title||'Mój trening';
    refreshEditorSelect();renderBuilder();
  }

  renderBuilder=function(){
    ensureMixedUi();
    const p=customPlans().find(x=>x.id===editingPlanId);const selected=new Set(p?.ex||[]);
    const q=(document.getElementById('v050Search')?.value||'').trim().toLowerCase();
    const visible=exerciseLibrary.filter(ex=>!q||[ex.n,ex.group,ex.equipment].join(' ').toLowerCase().includes(q));
    const groups=[...new Set(visible.map(x=>x.group||'Inne'))].sort((a,b)=>a.localeCompare(b,'pl'));
    document.getElementById('exerciseBuilder').innerHTML=groups.map(group=>'<div class="v050Group">'+esc(group)+'</div>'+visible.filter(x=>(x.group||'Inne')===group).map(ex=>`<label class="v050Exercise"><input type="checkbox" class="builderCheck" value="${esc(ex.id)}" ${selected.has(ex.id)?'checked':''}><div><strong>${esc(ex.n)}</strong><small>${ex.sets} serie • ${ex.min}${ex.min===ex.max?'':'–'+ex.max} ${ex.time?'sek.':'powt.'} • ${esc(ex.equipment)}</small></div><button type="button" class="secondary" data-preview="${esc(ex.id)}">PODGLĄD</button></label>`).join('')).join('')||'<p class="hint">Brak ćwiczeń pasujących do wyszukiwania.</p>';
  };

  saveCustomPlan=function(){
    const ids=[...document.querySelectorAll('.builderCheck:checked')].map(x=>x.value);
    if(ids.length<2){if(typeof toast==='function')toast('Wybierz co najmniej 2 ćwiczenia.');return;}
    const title=(document.getElementById('customName').value||'').trim()||'Mój trening';
    const list=customPlans();let id=editingPlanId;
    if(id){const p=list.find(x=>x.id===id);if(p){p.title=title;p.ex=ids;}}
    else{id=uid();list.push({id,title,ex:ids});editingPlanId=id;}
    saveCustomPlans(list);refreshPlanSelect(planKey(id));refreshEditorSelect();renderSchedule();document.getElementById('planSelect').value=planKey(id);if(typeof saveSettings==='function')saveSettings();if(typeof toast==='function')toast('Trening zapisany: '+title);
  };

  function deleteEditingPlan(){
    if(!editingPlanId){if(typeof toast==='function')toast('Wybierz zapisany trening do usunięcia.');return;}
    const p=customPlans().find(x=>x.id===editingPlanId);if(!p)return;
    if(!confirm('Usunąć trening „'+p.title+'”? Historia wykonanych treningów zostanie.'))return;
    saveCustomPlans(customPlans().filter(x=>x.id!==editingPlanId));
    const schedule=getSchedule();for(const k of Object.keys(schedule))if(schedule[k]===planKey(editingPlanId))schedule[k]='';saveSchedule(schedule);
    editingPlanId='';document.getElementById('customName').value='Mój trening';refreshPlanSelect('mon');refreshEditorSelect();renderBuilder();renderSchedule();
  }

  function showPreview(id){
    const ex=exerciseLibrary.find(x=>x.id===id);if(!ex)return;
    document.getElementById('v050Overlay')?.remove();
    const o=document.createElement('div');o.id='v050Overlay';o.className='v050Overlay';o.innerHTML=`<div class="v050Modal"><div class="v050ModalTop"><div><div class="eyebrow">PODGLĄD ĆWICZENIA</div><h2>${esc(ex.n)}</h2></div><button id="v050Close" class="secondary">✕</button></div><div class="v050Tags"><span>${esc(ex.group)}</span><span>${esc(ex.equipment)}</span><span>${ex.sets} × ${ex.min}${ex.min===ex.max?'':'–'+ex.max}${ex.time?' sek.':' powt.'}</span></div><div class="v050Motion"><div class="v050Pose"><b>①</b><strong>START</strong><small>ustaw stabilną pozycję</small></div><div class="v050Arrow">→</div><div class="v050Pose"><b>②</b><strong>RUCH</strong><small>kontroluj pełny zakres</small></div></div><div class="v050Detail"><span>Ustawienie</span><b>${esc(ex.setup)}</b></div><div class="v050Detail"><span>Wykonanie</span><b>${esc(ex.movement)}</b></div><div class="v050Detail"><span>Wskazówka trenera</span><b>${esc(ex.tip)}</b></div><div class="v050Detail"><span>Najczęstszy błąd</span><b class="v050Danger">${esc(ex.mistake)}</b></div></div>`;
    document.body.appendChild(o);o.querySelector('#v050Close').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove();});
  }

  function defaultSchedule(){return {'0':'','1':'mon','2':'','3':'wed','4':'','5':'fri','6':''}}
  function getSchedule(){return Object.assign(defaultSchedule(),safe(localStorage.getItem(SCHEDULE_KEY),{}))}
  function saveSchedule(v){localStorage.setItem(SCHEDULE_KEY,JSON.stringify(v))}

  function ensureScheduleCard(){
    const plan=document.getElementById('plan');if(!plan||document.getElementById('v050ScheduleCard'))return;
    const card=document.createElement('div');card.id='v050ScheduleCard';card.className='card';card.innerHTML='<div class="eyebrow">TWÓJ TYDZIEŃ</div><h2>Trening w dowolne dni</h2><p class="hint">Przypisz dowolny plan do każdego dnia. Po otwarciu aplikacji Trener 2 automatycznie podpowie plan na dziś.</p><div id="v050ScheduleRows"></div><button id="v050SaveSchedule" class="primary">ZAPISZ PLAN TYGODNIA</button>';
    plan.insertBefore(card,plan.children[1]||null);card.querySelector('#v050SaveSchedule').onclick=()=>{const m={};card.querySelectorAll('[data-day]').forEach(s=>m[s.dataset.day]=s.value);saveSchedule(m);applyTodayPlan(true);if(typeof toast==='function')toast('Plan tygodnia zapisany.');};
  }

  function renderSchedule(){
    ensureScheduleCard();const wrap=document.getElementById('v050ScheduleRows');if(!wrap)return;
    const schedule=getSchedule(),opts=allPlanOptions();const today=new Date().getDay();
    wrap.innerHTML=DAYS.map(([label,day])=>`<div class="v050ScheduleRow ${day===today?'v050Today':''}"><b>${label}${day===today?' • dziś':''}</b><select data-day="${day}"><option value="">Wolne / bez planu</option>${opts.map(([k,n])=>`<option value="${esc(k)}" ${schedule[day]===k?'selected':''}>${esc(n)}</option>`).join('')}</select></div>`).join('');
  }

  function ensureTodayHint(){
    const setup=document.getElementById('setup'),start=document.getElementById('startBtn');if(!setup||!start||document.getElementById('v050TodayHint'))return;
    const d=document.createElement('div');d.id='v050TodayHint';d.className='v050TodayHint';start.parentNode.insertBefore(d,start);start.parentNode.insertBefore(document.createElement('br'),start);
  }

  function applyTodayPlan(showToast){
    ensureTodayHint();const day=new Date().getDay(),key=getSchedule()[day],hint=document.getElementById('v050TodayHint'),sel=document.getElementById('planSelect');
    if(key&&getPlan(key)){
      const p=getPlan(key);refreshPlanSelect(key);sel.value=key;hint.innerHTML='<b>DZIŚ WG PLANU:</b> '+esc(p.title);if(typeof saveSettings==='function')saveSettings();if(showToast&&typeof toast==='function')toast('Wybrano plan na dziś: '+p.title);
    }else hint.innerHTML='<b>DZIŚ:</b> brak przypisanego treningu — możesz wybrać dowolny ręcznie.';
  }

  function replaceStaticWeekTitle(){
    const plan=document.getElementById('plan');const first=plan?.querySelector('.card');if(!first)return;
    const h=first.querySelector('h2');if(h)h.textContent='Plan bazowy + własny kalendarz';
  }

  function boot(){
    try{
      ensureCss();enrichLibrary();migrateOldCustom();ensureMixedUi();showVersion();refreshPlanSelect();refreshEditorSelect();renderBuilder();renderSchedule();replaceStaticWeekTitle();applyTodayPlan(false);
    }catch(e){console.error('Trener 0.5 addon:',e);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
