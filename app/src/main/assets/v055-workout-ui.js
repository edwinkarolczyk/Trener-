(function(){
  'use strict';

  const AI_IDS=['bench','closebench','pushups','row','deadlift','squat','curl','ohp','lunges','plank','onearmrow'];
  const AI_INDEX=Object.fromEntries(AI_IDS.map((id,i)=>[id,i]));
  const SPRITE='ai/exercises-v054.webp';

  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmt(ms){
    const sec=Math.max(0,Math.ceil((Number(ms)||0)/1000));
    const m=Math.floor(sec/60),s=sec%60;
    return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }
  function currentEx(){
    try{return currentPlan?.ex?.[exIdx]||null;}catch(e){return null;}
  }
  function personName(i){
    try{return athleteName(i);}catch(e){return i===0?'Osoba 1':'Osoba 2';}
  }
  function totalSets(){
    try{return (currentPlan?.ex||[]).reduce((n,x)=>n+(Number(x.sets)||0),0);}catch(e){return 0;}
  }
  function completedFor(i){
    try{return records.filter(r=>Number(r.athlete||0)===i).length;}catch(e){return 0;}
  }
  function lastFor(i){
    try{
      const list=records.filter(r=>Number(r.athlete||0)===i).sort((a,b)=>(Number(b.at)||0)-(Number(a.at)||0));
      return list[0]||null;
    }catch(e){return null;}
  }
  function restRemaining(i){
    const now=Date.now();
    try{
      if(!net.active){return Math.max(0,(Number(readyAt?.[i])||0)-now);}
      const last=net.last?.[i]||lastFor(i);
      if(!last)return 0;
      const ex=currentPlan?.ex?.[Number(last.ex)||0];
      const rest=(Number(ex?.rest)||0)*1000;
      return Math.max(0,(Number(last.at)||0)+rest-now);
    }catch(e){return 0;}
  }
  function isFinished(i){
    try{
      if(net.active&&net.done?.[i])return true;
      const total=totalSets();
      return total>0&&completedFor(i)>=total;
    }catch(e){return false;}
  }

  function installUi(){
    const training=document.getElementById('training');
    if(!training||document.getElementById('v055Flow'))return;

    const athlete=document.getElementById('athlete');
    const flow=document.createElement('div');
    flow.id='v055Flow';flow.className='v055Flow';
    flow.innerHTML='<div class="v055Rule"><b>KOLEJNOŚĆ SERII</b><span>1. Wykonaj serię → 2. Wpisz wynik → 3. Zapisz serię</span></div><div id="v055People" class="v055People"></div>';
    athlete?.insertAdjacentElement('beforebegin',flow);

    const target=document.getElementById('target');
    const visual=document.createElement('div');
    visual.id='v055Visual';visual.className='v055Visual';
    visual.innerHTML='<div class="v055VisualTop"><div><span>PODGLĄD ĆWICZENIA</span><b id="v055VisualName">—</b></div><button id="v055VisualOpen" class="secondary" type="button">JAK WYKONAĆ</button></div><div id="v055VisualBody" class="v055VisualBody"></div>';
    target?.insertAdjacentElement('afterend',visual);

    const save=document.getElementById('saveSetBtn');
    const note=document.createElement('div');
    note.id='v055SaveNote';note.className='v055SaveNote';
    note.textContent='Zapisujesz serię PO jej wykonaniu — wpisz faktyczny ciężar i liczbę powtórzeń.';
    save?.insertAdjacentElement('beforebegin',note);

    document.getElementById('v055VisualOpen')?.addEventListener('click',()=>{
      const ex=currentEx();if(!ex)return;
      if(window.TrenerAiPreview?.open)window.TrenerAiPreview.open(ex.id);
      else if(window.TrenerExerciseVisuals?.open)window.TrenerExerciseVisuals.open(ex.id);
    });
    document.getElementById('v055VisualBody')?.addEventListener('click',()=>{
      const ex=currentEx();if(!ex)return;
      if(window.TrenerAiPreview?.open)window.TrenerAiPreview.open(ex.id);
      else if(window.TrenerExerciseVisuals?.open)window.TrenerExerciseVisuals.open(ex.id);
    });
  }

  function installCss(){
    if(document.getElementById('v055-style'))return;
    const s=document.createElement('style');s.id='v055-style';s.textContent=`
      .v055Flow{margin:12px 0 14px}.v055Rule{border:1px solid #4a292a;background:#140c0c;border-radius:14px;padding:10px 12px;margin-bottom:10px}.v055Rule b{display:block;color:#ef4b4d;font-size:10px;letter-spacing:.1em}.v055Rule span{display:block;margin-top:4px;font-size:13px;font-weight:800;line-height:1.35}
      .v055People{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v055Person{border:1px solid #303030;background:#0c0c0c;border-radius:14px;padding:10px;min-width:0}.v055Person.active{border-color:#ef4b4d;box-shadow:0 0 0 1px rgba(239,75,77,.16) inset}.v055Person.resting{border-color:#6a5328}.v055Person.done{opacity:.7}.v055PersonName{font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v055State{margin-top:4px;font-size:11px;font-weight:900;letter-spacing:.05em}.v055Person.active .v055State{color:#68f1a1}.v055Person.resting .v055State{color:#ffd269}.v055PersonMeta{margin-top:5px;color:#9b9b9b;font-size:10px;line-height:1.35}.v055RestClock{display:block;margin-top:4px;font-size:20px;font-weight:950;color:#ffd269}
      .v055Visual{border:1px solid #342223;background:#090909;border-radius:16px;padding:10px;margin:12px 0}.v055VisualTop{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.v055VisualTop span{display:block;color:#ef4b4d;font-size:9px;font-weight:900;letter-spacing:.09em}.v055VisualTop b{display:block;margin-top:2px;font-size:13px}.v055VisualTop button{font-size:10px;padding:7px 9px}.v055VisualBody{min-height:165px;border-radius:12px;overflow:hidden;background:#050505;cursor:pointer}.v055Sprite{width:100%;height:220px;background-repeat:no-repeat;background-size:100% 1100%;background-color:#060606}.v055Fallback{padding:8px}.v055Fallback .v052Motion{margin:0!important}.v055Empty{min-height:165px;display:flex;align-items:center;justify-content:center;color:#777;font-size:12px;text-align:center;padding:16px}
      .v055SaveNote{margin:7px 0 8px;color:#aaa;font-size:11px;line-height:1.35;text-align:center}.trainingCard #saveSetBtn{font-weight:950}.trainingCard #athlete{margin-top:8px}
      @media(max-width:560px){.v055People{grid-template-columns:1fr}.v055Sprite{height:190px}.v055Rule span{font-size:12px}}
    `;document.head.appendChild(s);
  }

  function renderVisual(){
    const body=document.getElementById('v055VisualBody'),name=document.getElementById('v055VisualName');
    if(!body||!name)return;
    const ex=currentEx();
    if(!ex){name.textContent='—';body.innerHTML='<div class="v055Empty">Brak podglądu.</div>';return;}
    if(body.dataset.ex===String(ex.id))return;
    body.dataset.ex=String(ex.id);name.textContent=ex.n||'Ćwiczenie';
    if(AI_INDEX[ex.id]!==undefined){
      const pos=(AI_INDEX[ex.id]||0)*10;
      body.innerHTML=`<div class="v055Sprite" role="img" aria-label="${esc(ex.n)}" style="background-image:url('${SPRITE}');background-position:center ${pos}%"></div>`;
      return;
    }
    try{
      if(window.TrenerExerciseVisuals?.frames){
        body.innerHTML='<div class="v055Fallback">'+window.TrenerExerciseVisuals.frames(ex.id)+'</div>';
        return;
      }
    }catch(e){}
    body.innerHTML='<div class="v055Empty">Dla tego ćwiczenia dostępna jest instrukcja tekstowa.</div>';
  }

  function renderPeople(){
    const box=document.getElementById('v055People');if(!box)return;
    let count=1;try{count=(net.active||mode===2)?2:1;}catch(e){}
    let active=0;try{active=net.active?net.localAthlete:athleteIdx;}catch(e){}
    const html=[];
    for(let i=0;i<count;i++){
      const done=isFinished(i),rest=restRemaining(i),last=lastFor(i);
      const localActive=i===active;
      let state='',cls='';
      if(done){state='TRENING ZAKOŃCZONY';cls='done';}
      else if(paused){state='PAUZA';cls='resting';}
      else if(localActive&&restEnd>0){state='ODPOCZYWA';cls='resting';}
      else if(localActive){state='ĆWICZY TERAZ';cls='active';}
      else if(rest>0){state='ODPOCZYWA';cls='resting';}
      else if(net.active){state='TRENUJE NA 2. TELEFONIE';cls='';}
      else{state='CZEKA / ASEKURUJE';cls='';}
      const lastTxt=last?('Ostatnia seria: '+(Number(last.kg)?last.kg+' kg × ':'')+last.reps):'Brak zapisanej serii';
      const restLine=rest>0?`<span class="v055RestClock">${fmt(rest)}</span>`:'';
      html.push(`<div class="v055Person ${cls}"><div class="v055PersonName">${esc(personName(i))}</div><div class="v055State">${state}</div>${restLine}<div class="v055PersonMeta">${esc(lastTxt)}</div></div>`);
    }
    box.innerHTML=html.join('');
  }

  function refresh(){
    try{if(typeof running!=='undefined'&&!running)return;}catch(e){return;}
    installUi();renderVisual();
    let sharedAuthority=false;
    try{sharedAuthority=!!(window.TrenerBeta070?.active&&net?.active&&window.TrenerGroup?.groupSession);}catch(e){}
    if(sharedAuthority)return;
    renderPeople();
    const ex=currentEx();
    let active=0;try{active=net.active?net.localAthlete:athleteIdx;}catch(e){}
    const name=personName(active);
    const save=document.getElementById('saveSetBtn');
    if(save){
      if(paused)save.textContent='TRENING WSTRZYMANY';
      else if(restEnd>0)save.textContent='ODPOCZYNEK — '+name.toUpperCase();
      else save.textContent='ZAPISZ SERIĘ — '+name.toUpperCase();
    }
    const athlete=document.getElementById('athlete');
    if(athlete&&ex)athlete.textContent=(restEnd>0?'ODPOCZYWA: ':'ĆWICZY: ')+name;
    const restLabel=document.querySelector('#restBox .small');
    if(restLabel)restLabel.textContent=restEnd>0?('PRZERWA — '+name.toUpperCase()):('KOLEJKA — '+name.toUpperCase());
  }

  function wrapRuntime(){
    try{
      const baseUpdate=updateView;
      updateView=function(){const r=baseUpdate.apply(this,arguments);setTimeout(refresh,0);return r;};
    }catch(e){}
    try{
      const baseTick=tick;
      tick=function(){const r=baseTick.apply(this,arguments);refresh();return r;};
    }catch(e){}
    try{
      const baseOpen=openTrainingUi;
      openTrainingUi=function(){const r=baseOpen.apply(this,arguments);setTimeout(refresh,0);return r;};
    }catch(e){}
  }

  function boot(){installCss();installUi();wrapRuntime();setTimeout(refresh,250);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();