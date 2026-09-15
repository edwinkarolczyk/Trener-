(function(){
  'use strict';

  const TYPE_BY_ID={
    bench:'bench',pausebench:'bench',closebench:'bench',incline:'incline',floorpress:'floorpress',
    pushups:'pushup',feetpush:'feetpush',diamondpush:'pushup',
    row:'row',underrow:'row',pendlay:'pendlay',reardeltrow:'rowhigh',
    curl:'curl',reversecurl:'curl',curl21:'curl',seatedcurl:'seatedcurl',iso90:'curlhold',
    ohp:'press',pushpress:'pushpress',platefront:'platefront',shrug:'shrug',skull:'skull',overheadtri:'overheadtri',
    squat:'squat',frontsquat:'frontsquat',lunges:'lunge',bulgarian:'bulgarian',
    deadlift:'deadlift',rdl:'rdl',goodmorning:'goodmorning',hipthrust:'hipthrust',calfraise:'calfraise',
    plank:'plank',sideplank:'sideplank',legraise:'legraise',deadbug:'deadbug',crunch:'crunch'
  };

  const CAPTION_BY_ID={
    bench:['Gryf nad klatką','Ramiona wyprostowane'],pausebench:['Pauza na klatce','Wyciśnij po pauzie'],closebench:['Gryf przy klatce','Wyprostuj łokcie'],incline:['Gryf przy górnej klatce','Wyciśnij nad barki'],floorpress:['Łokcie przy podłodze','Wyprostuj ramiona'],
    pushups:['Klatka nisko','Pełny podpór'],feetpush:['Klatka nisko','Pełny podpór'],diamondpush:['Dłonie wąsko','Wyprostuj ramiona'],
    row:['Gryf pod kolanami','Przyciągnij do brzucha'],underrow:['Gryf nisko','Przyciągnij podchwytem'],pendlay:['Gryf na podłodze','Gryf do tułowia'],reardeltrow:['Gryf nisko','Łokcie szeroko do klatki'],
    curl:['Ramiona wyprostowane','Zegnij łokcie'],reversecurl:['Nachwyt, ręce w dół','Ugnij bez bujania'],curl21:['Dolny zakres','Górny zakres'],seatedcurl:['Ręce w dół','Ugnij siedząc'],iso90:['Ugnij do 90°','Trzymaj nieruchomo'],
    ohp:['Gryf przy barkach','Gryf nad głową'],pushpress:['Krótki dip nóg','Wyprost nad głową'],platefront:['Talerz przy udach','Talerz do barków'],shrug:['Barki nisko','Barki wysoko'],skull:['Ramiona pionowo','Gryf za czoło'],overheadtri:['Ramiona nad głową','Zegnij za głowę'],
    squat:['Pozycja stojąca','Przysiad'],frontsquat:['Sztanga z przodu','Przysiad pionowo'],lunges:['Stopy razem','Wykrok i zejście'],bulgarian:['Tylna noga na ławce','Zejdź w dół'],
    deadlift:['Gryf na podłodze','Wyprost bioder'],rdl:['Gryf przy udach','Biodra cofnięte'],goodmorning:['Tułów pionowo','Pochylenie z biodra'],hipthrust:['Biodra nisko','Biodra wysoko'],calfraise:['Pięty na podłodze','Wspięcie na palce'],
    plank:['Ustaw linię ciała','Utrzymaj napięcie'],sideplank:['Biodro niżej','Unieś biodro'],legraise:['Nogi nisko','Nogi w górze'],deadbug:['Pozycja 90°','Przeciwna ręka i noga'],crunch:['Łopatki na podłodze','Unieś łopatki']
  };

  function esc(s){return String(s??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));}

  const C={body:'#ef4b4d',equip:'#e8e8e8',muted:'#666',arrow:'#ff8f91',floor:'#343434'};
  const line=(x1,y1,x2,y2,stroke=C.body,w=5)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;
  const circle=(x,y,r=7,fill=C.body)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  const arrow=(x1,y1,x2,y2)=>`${line(x1,y1,x2,y2,C.arrow,3)}<path d="M ${x2-7} ${y2-4} L ${x2} ${y2} L ${x2-7} ${y2+4}" fill="none" stroke="${C.arrow}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  const bar=(x1,y,x2)=>`${line(x1,y,x2,y,C.equip,4)}${circle(x1+4,y,5,C.equip)}${circle(x2-4,y,5,C.equip)}`;
  const bench=(x1,y1,x2,y2)=>line(x1,y1,x2,y2,C.muted,7);
  const floor=()=>line(10,108,170,108,C.floor,3);

  function svgWrap(inner){return `<svg class="v052Svg" viewBox="0 0 180 120" role="img" aria-label="Schemat ruchu">${inner}</svg>`;}

  function draw(type,end){
    let s=floor();
    switch(type){
      case 'bench':{
        s+=bench(35,83,145,83)+circle(52,68)+line(58,70,105,77)+line(92,76,122,84)+line(122,84,145,101)+line(92,76,70,92)+line(70,92,52,101);
        const by=end?34:58;s+=line(82,75,82,by)+line(82,by,112,by)+bar(60,by,134)+arrow(145,62,145,35);break;
      }
      case 'incline':{
        s+=bench(42,88,125,52)+circle(68,65)+line(73,68,103,57)+line(101,58,130,83)+line(130,83,145,101)+line(100,58,91,91);
        const y=end?30:50;s+=bar(62,y,135)+line(88,59,88,y)+arrow(148,58,148,31);break;
      }
      case 'floorpress':{
        s+=circle(48,83)+line(55,84,105,88)+line(105,88,138,103)+line(105,88,82,104);
        const y=end?45:72;s+=bar(58,y,132)+line(88,84,88,y)+arrow(145,75,145,45);break;
      }
      case 'pushup':case 'feetpush':{
        const fy=type==='feetpush'?72:96;if(type==='feetpush')s+=bench(128,78,164,78);
        const sh=end?58:72,handX=55;s+=circle(92,sh-12)+line(88,sh-6,118,fy-8)+line(118,fy-8,146,fy)+line(88,sh-6,64,fy-5)+line(64,fy-5,handX,104)+line(118,fy-8,130,fy);
        s+=arrow(38,82,38,end?58:75);break;
      }
      case 'row':case 'rowhigh':case 'pendlay':{
        const handY=end?(type==='rowhigh'?58:70):95;s+=circle(84,40)+line(81,48,112,65)+line(112,65,132,100)+line(112,65,96,102)+line(83,50,72,76)+line(72,76,72,handY)+bar(48,handY,96)+arrow(38,96,38,65);break;
      }
      case 'curl':case 'curlhold':{
        s+=circle(90,24)+line(90,32,90,70)+line(90,70,75,104)+line(90,70,105,104)+line(90,42,68,60);
        const y=type==='curlhold'?61:(end?48:91);s+=line(68,60,68,y)+bar(50,y,86)+arrow(42,92,42,50);break;
      }
      case 'seatedcurl':{
        s+=bench(72,80,118,80)+circle(92,28)+line(92,35,92,70)+line(92,70,112,82)+line(112,82,126,103)+line(92,48,70,62);const y=end?52:90;s+=line(70,62,70,y)+bar(52,y,88)+arrow(43,92,43,53);break;
      }
      case 'press':case 'pushpress':{
        const knee=type==='pushpress'&&!end?78:70;s+=circle(90,22)+line(90,30,90,70)+line(90,70,74,knee+30)+line(90,70,106,knee+30);const y=end?20:48;s+=line(90,42,70,y)+line(90,42,110,y)+bar(54,y,126)+arrow(142,52,142,22);break;
      }
      case 'platefront':{
        s+=circle(90,24)+line(90,32,90,70)+line(90,70,75,104)+line(90,70,105,104);const py=end?50:88;s+=line(90,44,90,py)+circle(90,py,11,C.equip)+arrow(132,88,132,50);break;
      }
      case 'shrug':{
        const sy=end?38:46;s+=circle(90,24)+line(90,32,90,70)+line(90,70,75,104)+line(90,70,105,104)+line(90,sy,68,78)+line(90,sy,112,78)+bar(52,82,128)+arrow(142,63,142,38);break;
      }
      case 'skull':{
        s+=bench(34,86,145,86)+circle(52,70)+line(58,72,108,78)+line(108,78,137,102)+line(108,78,84,102);const by=end?54:35;s+=line(88,75,88,48)+line(88,48,112,by)+bar(88,by,138)+arrow(149,38,149,62);break;
      }
      case 'overheadtri':{
        s+=circle(90,26)+line(90,34,90,72)+line(90,72,75,105)+line(90,72,105,105);const hy=end?55:22;s+=line(90,42,75,33)+line(75,33,86,hy)+bar(70,hy,105)+arrow(135,24,135,58);break;
      }
      case 'squat':case 'frontsquat':{
        const hipY=end?78:58,headY=end?39:22;s+=circle(90,headY)+line(90,headY+8,90,hipY)+line(90,hipY,70,104)+line(90,hipY,110,104)+line(90,headY+22,68,50)+line(90,headY+22,112,50);s+=bar(62,type==='frontsquat'?headY+21:headY+14,120)+arrow(145,45,145,82);break;
      }
      case 'lunge':case 'bulgarian':{
        if(type==='bulgarian')s+=bench(122,82,160,82);const hy=end?72:60;s+=circle(82,24)+line(82,32,82,hy)+line(82,hy,end?55:70,104)+line(82,hy,end?(type==='bulgarian'?132:125):98,104)+line(82,43,63,62)+line(82,43,101,62)+arrow(39,55,39,82);break;
      }
      case 'deadlift':{
        if(end){s+=circle(90,23)+line(90,31,90,70)+line(90,70,74,104)+line(90,70,106,104)+line(90,44,70,80)+line(90,44,110,80)+bar(50,83,130);}else{s+=circle(94,45)+line(90,52,110,72)+line(110,72,126,103)+line(110,72,82,103)+line(91,55,72,91)+line(104,60,110,91)+bar(50,94,132);}s+=arrow(145,90,145,40);break;
      }
      case 'rdl':case 'goodmorning':{
        if(!end){s+=circle(90,23)+line(90,31,90,70)+line(90,70,74,104)+line(90,70,106,104);}else{s+=circle(110,45)+line(103,50,72,63)+line(72,63,64,103)+line(72,63,102,103);}if(type==='goodmorning')s+=bar(end?65:62,end?52:40,end?120:120);else s+=bar(48,end?86:82,122);s+=arrow(145,46,145,78);break;
      }
      case 'hipthrust':{
        s+=bench(38,70,78,70)+circle(56,59)+line(62,62,82,70);const hy=end?58:86;s+=line(82,70,110,hy)+line(110,hy,140,103)+line(110,hy,88,103)+bar(86,hy-2,130)+arrow(151,88,151,57);break;
      }
      case 'calfraise':{
        const y=end?91:101;s+=circle(90,24)+line(90,32,90,68)+line(90,68,76,y)+line(90,68,104,y)+line(62,103,118,103,C.muted,4)+arrow(140,101,140,87);break;
      }
      case 'plank':{
        s+=circle(52,60)+line(59,62,112,74)+line(112,74,148,95)+line(62,65,50,96)+line(50,96,32,96);s+=arrow(88,38,88,57);break;
      }
      case 'sideplank':{
        const hy=end?68:84;s+=circle(55,72)+line(62,73,105,hy)+line(105,hy,146,92)+line(68,77,48,96)+line(48,96,30,96)+arrow(116,91,116,66);break;
      }
      case 'legraise':{
        s+=circle(40,90)+line(47,90,92,94)+line(92,94,122,end?45:92)+line(92,94,133,end?32:92)+line(55,92,35,103)+arrow(148,92,148,48);break;
      }
      case 'deadbug':{
        s+=circle(55,92)+line(62,92,97,92)+line(72,90,72,58)+line(72,58,end?47:58,end?38:40)+line(90,92,110,end?62:72)+line(110,end?62:72,end?145:110,end?44:42)+arrow(145,83,145,52);break;
      }
      case 'crunch':{
        const hy=end?67:91;s+=circle(48,hy)+line(55,hy,92,92)+line(92,92,118,102)+line(118,102,142,102)+line(68,hy+5,52,102)+arrow(35,91,35,67);break;
      }
      default:{
        s+=circle(90,24)+line(90,32,90,70)+line(90,70,75,104)+line(90,70,105,104)+line(90,44,66,68)+line(90,44,114,68)+arrow(145,86,145,42);
      }
    }
    return svgWrap(s);
  }

  function framesFor(id){
    const type=TYPE_BY_ID[id]||'generic';const captions=CAPTION_BY_ID[id]||['Pozycja startowa','Pozycja końcowa'];
    return `<div class="v052Frame"><div class="v052FrameTitle">START</div>${draw(type,false)}<small>${esc(captions[0])}</small></div><div class="v052MidArrow">→</div><div class="v052Frame"><div class="v052FrameTitle">KONIEC</div>${draw(type,true)}<small>${esc(captions[1])}</small></div>`;
  }

  function findExercise(id){
    try{return exerciseLibrary.find(x=>x.id===id)||null;}catch(e){return null;}
  }

  function currentExercise(){
    try{if(typeof currentPlan!=='undefined'&&currentPlan&&currentPlan.ex&&currentPlan.ex[exIdx])return currentPlan.ex[exIdx];}catch(e){}
    const name=document.getElementById('exercise')?.textContent?.trim();
    try{return exerciseLibrary.find(x=>x.n===name)||null;}catch(e){return null;}
  }

  function renderIntoModal(id,root){
    const motion=root?.querySelector('.v050Motion');if(!motion)return;
    motion.classList.add('v052Motion');motion.innerHTML=framesFor(id);
  }

  function makeModal(ex){
    document.getElementById('v052Overlay')?.remove();
    const o=document.createElement('div');o.id='v052Overlay';o.className='v050Overlay';
    o.innerHTML=`<div class="v050Modal"><div class="v050ModalTop"><div><div class="eyebrow">JAK WYKONAĆ</div><h2>${esc(ex.n)}</h2></div><button id="v052Close" class="secondary">✕</button></div><div class="v050Tags"><span>${esc(ex.group||'Ćwiczenie')}</span><span>${esc(ex.equipment||'')}</span><span>${ex.sets} × ${ex.min}${ex.min===ex.max?'':'–'+ex.max}${ex.time?' sek.':' powt.'}</span></div><div class="v050Motion v052Motion">${framesFor(ex.id)}</div><div class="v050Detail"><span>1. Ustawienie</span><b>${esc(ex.setup||ex.tip||'Ustaw stabilną pozycję.')}</b></div><div class="v050Detail"><span>2. Wykonanie</span><b>${esc(ex.movement||ex.tip||'Wykonuj ruch pod kontrolą.')}</b></div><div class="v050Detail"><span>Wskazówka</span><b>${esc(ex.tip||'Kontroluj ruch i zakres.')}</b></div><div class="v050Detail"><span>Uważaj</span><b class="v050Danger">${esc(ex.mistake||'Nie przyspieszaj kosztem techniki.')}</b></div></div>`;
    document.body.appendChild(o);o.querySelector('#v052Close').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove();});
  }

  function installWorkoutButton(){
    if(document.getElementById('v052HowBtn'))return;
    const technique=document.getElementById('technique');if(!technique)return;
    const b=document.createElement('button');b.id='v052HowBtn';b.type='button';b.className='secondary v052HowBtn';b.textContent='JAK WYKONAĆ';
    technique.insertAdjacentElement('afterend',b);
    b.addEventListener('click',()=>{const ex=currentExercise();if(ex)makeModal(ex);else if(typeof toast==='function')toast('Nie znaleziono podglądu tego ćwiczenia.');});
  }

  function ensureCss(){
    if(document.getElementById('v052-style'))return;
    const s=document.createElement('style');s.id='v052-style';s.textContent=`
      .v052HowBtn{width:100%;margin:8px 0 14px;border-color:#5a2b2c!important;color:#ff9b9d!important}
      .v052Motion{grid-template-columns:minmax(0,1fr) 28px minmax(0,1fr)!important;gap:7px!important}
      .v052Frame{border:1px solid #343434;border-radius:13px;background:#0b0b0b;padding:8px;min-width:0;text-align:center}
      .v052FrameTitle{font-size:11px;font-weight:900;letter-spacing:.08em;color:#ef4b4d;margin-bottom:3px}
      .v052Frame small{display:block;color:#aaa;font-size:10px;line-height:1.25;margin-top:3px;min-height:24px}
      .v052Svg{width:100%;height:auto;max-height:135px;display:block;background:linear-gradient(180deg,#111,#0a0a0a);border-radius:9px}
      .v052MidArrow{display:flex;align-items:center;justify-content:center;color:#ef4b4d;font-size:26px;font-weight:900}
      @media(max-width:430px){.v052Motion{grid-template-columns:minmax(0,1fr) 20px minmax(0,1fr)!important}.v052Frame{padding:5px}.v052MidArrow{font-size:20px}.v052Frame small{font-size:9px}}
    `;document.head.appendChild(s);
  }

  let pendingPreviewId='';
  document.addEventListener('click',e=>{
    const p=e.target.closest?.('[data-preview]');if(p)pendingPreviewId=p.dataset.preview||'';
  },true);

  const observer=new MutationObserver(()=>{
    const existing=document.getElementById('v050Overlay');
    if(existing&&pendingPreviewId&&!existing.dataset.v052){existing.dataset.v052='1';renderIntoModal(pendingPreviewId,existing);pendingPreviewId='';}
    installWorkoutButton();
  });

  function boot(){ensureCss();installWorkoutButton();observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

  window.TrenerExerciseVisuals={open:id=>{const ex=findExercise(id);if(ex)makeModal(ex);},frames:framesFor};
})();
