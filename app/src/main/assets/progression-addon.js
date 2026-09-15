(function(){
  'use strict';

  function el(id){return document.getElementById(id)}
  function kg(v){return Number(v||0).toLocaleString('pl-PL',{maximumFractionDigits:2})}
  function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function sameExercise(r,ex){return !!r&&!!ex&&(r.id===ex.id||r.name===ex.n)}
  function currentStep(){
    const value=parseFloat(String(el('stepKg')?.value||'2.5').replace(',','.'));
    return Number.isFinite(value)&&value>0?value:2.5;
  }
  function roundToStep(value,step){
    if(!Number.isFinite(value)||value<=0)return 0;
    const s=Number.isFinite(step)&&step>0?step:2.5;
    return Math.round((value/s)+Number.EPSILON)*s;
  }

  function primaryWeight(recordsForExercise){
    const stats=new Map();
    recordsForExercise.forEach((r,index)=>{
      const value=Number(r.kg)||0;
      if(value<=0)return;
      const key=value.toFixed(3);
      const prev=stats.get(key)||{kg:value,count:0,last:-1};
      prev.count++;
      prev.last=index;
      stats.set(key,prev);
    });
    let best=null;
    for(const item of stats.values()){
      if(!best||item.count>best.count||(item.count===best.count&&item.last>best.last))best=item;
    }
    return best?best.kg:0;
  }

  function decideLoad(reps,ex){
    const values=(reps||[]).map(Number).filter(Number.isFinite);
    if(!values.length)return 'KEEP';
    const planned=Math.max(1,Number(ex?.sets)||values.length);
    if(values.length>=planned&&values.every(r=>r>=Number(ex.max)))return 'ADD';
    if(values.filter(r=>r<Number(ex.min)).length>=2)return 'REDUCE';
    return 'KEEP';
  }

  function targetWeight(base,decision,step){
    const current=Number(base)||0;
    if(current<=0)return 0;
    if(decision==='ADD')return Math.round((current+step)*100)/100;
    if(decision==='REDUCE'){
      let next=roundToStep(current*0.95,step);
      if(next>=current)next=current-step;
      return Math.round(Math.max(0,next)*100)/100;
    }
    return Math.round(current*100)/100;
  }

  function historyAthleteIndex(historyItem,athlete){
    if(historyItem?.shared)return Number(historyItem.localAthlete??0)||0;
    return Number(athlete)||0;
  }

  function latestHistoryFor(ex,athlete){
    const history=typeof getHistory==='function'?getHistory():[];
    for(const h of history){
      const a=historyAthleteIndex(h,athlete);
      const matches=(h.records||[]).filter(r=>sameExercise(r,ex)&&(Number(r.athlete)||0)===a&&Number(r.kg)>0);
      if(matches.length)return {history:h,records:matches};
    }
    return null;
  }

  function resultFromHistory(ex,athlete){
    if(!ex||ex.time)return null;
    const found=latestHistoryFor(ex,athlete);
    if(!found)return null;
    const base=primaryWeight(found.records);
    if(base<=0)return null;
    const work=found.records.filter(r=>Math.abs((Number(r.kg)||0)-base)<0.001);
    const reps=work.map(r=>Number(r.reps)||0).filter(r=>r>0);
    const decision=decideLoad(reps,ex);
    const step=currentStep();
    const target=targetWeight(base,decision,step);
    return {base,target,decision,reps,step,history:found.history};
  }

  function decisionLabel(result){
    if(!result)return '';
    if(result.decision==='ADD')return `<span class="historyDecision add">DOŁÓŻ: ${kg(result.base)} → ${kg(result.target)} kg</span>`;
    if(result.decision==='REDUCE')return `<span class="historyDecision reduce">ODEJMIJ: ${kg(result.base)} → ${kg(result.target)} kg</span><small> około −5%, zaokrąglone do skoku ${kg(result.step)} kg</small>`;
    return `<span class="historyDecision keep">ZOSTAW: ${kg(result.base)} kg</span>`;
  }

  function ensureUi(){
    if(!document.getElementById('progression-addon-style')){
      const style=document.createElement('style');
      style.id='progression-addon-style';
      style.textContent=`
        .historyLoadCard{margin-top:12px;background:#101010;border:1px solid #343434;border-left:4px solid #ef2b2d;border-radius:12px;padding:11px 12px;color:#ddd}
        .historyLoadCard .historyTop{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.05em}
        .historyLoadCard .historyMain{font-size:15px;font-weight:800;margin-top:5px}
        .historyLoadCard .historyReps{font-size:12px;color:#aaa;margin-top:3px}
        .historyLoadCard .historySuggestion{margin-top:8px;font-weight:900}
        .historyDecision.add{color:#5ef0a0}.historyDecision.keep{color:#ffd269}.historyDecision.reduce{color:#ff7f86}
        .historyLoadCard small{display:block;color:#888;font-weight:500;margin-top:2px}
      `;
      document.head.appendChild(style);
    }
    const training=el('training');
    const inputs=training?.querySelector('.inputs');
    if(training&&inputs&&!el('historyLoadCard')){
      const box=document.createElement('div');
      box.id='historyLoadCard';
      box.className='historyLoadCard hidden';
      inputs.parentNode.insertBefore(box,inputs);
    }
  }

  function activeAthlete(){
    try{return net?.active?Number(net.localAthlete)||0:Number(athleteIdx)||0}catch(e){return 0}
  }

  function renderSuggestion(ex,athlete){
    ensureUi();
    const box=el('historyLoadCard');
    if(!box)return null;
    if(!ex||ex.time){box.classList.add('hidden');return null;}
    const result=resultFromHistory(ex,athlete);
    box.classList.remove('hidden');
    if(!result){
      box.innerHTML='<div class="historyTop"><b>HISTORIA CIĘŻARU</b><span>pierwszy zapis</span></div><div class="historyMain">Brak wcześniejszego ciężaru dla tego ćwiczenia.</div><div class="historyReps">Wpisz ciężar ręcznie. Po treningu Trener 2 zapamięta wynik i następnym razem zasugeruje obciążenie.</div>';
      return null;
    }
    const when=result.history?.date||'';
    box.innerHTML=`<div class="historyTop"><b>WG OSTATNIEGO TRENINGU</b><span>${esc(when)}</span></div>
      <div class="historyMain">Ostatnio: ${kg(result.base)} kg</div>
      <div class="historyReps">Serie przy tym ciężarze: ${result.reps.map(r=>esc(r)).join(' / ')||'—'}</div>
      <div class="historySuggestion">Sugerowany ciężar na dziś: ${kg(result.target)} kg<br>${decisionLabel(result)}</div>`;
    return result;
  }

  const originalPrefill=typeof prefillWeight==='function'?prefillWeight:null;
  prefillWeight=function(){
    if(!currentPlan||exIdx>=currentPlan.ex.length)return;
    const ex=currentPlan.ex[exIdx];
    const athlete=activeAthlete();
    const current=(records||[]).filter(r=>r.ex===exIdx&&(Number(r.athlete)||0)===athlete&&Number(r.kg)>0);
    if(current.length){
      el('weight').value=current[current.length-1].kg;
      renderSuggestion(ex,athlete);
      return;
    }
    const suggestion=renderSuggestion(ex,athlete);
    if(suggestion&&suggestion.target>0){
      el('weight').value=suggestion.target;
      return;
    }
    if(originalPrefill){
      try{originalPrefill();return}catch(e){}
    }
    el('weight').value='';
  };

  exerciseAdvice=function(index){
    const ex=currentPlan?.ex?.[index];
    if(!ex)return 'Trener: brak danych.';
    const athletes=net?.active?[Number(net.localAthlete)||0]:Array.from({length:mode},(_,i)=>i);
    const lines=[];
    for(const athlete of athletes){
      const own=(records||[]).filter(r=>r.ex===index&&(Number(r.athlete)||0)===athlete);
      const repsAll=own.map(r=>Number(r.reps)||0).filter(r=>r>0);
      const name=typeof athleteName==='function'?athleteName(athlete):('Osoba '+(athlete+1));
      if(ex.time||!own.some(r=>Number(r.kg)>0)){
        const below=repsAll.filter(r=>r<Number(ex.min)).length;
        const good=repsAll.length>=Number(ex.sets||1)&&repsAll.every(r=>r>=Number(ex.max));
        const text=good?'wynik w górnym zakresie — możesz utrudnić wariant.':(below>=2?'wynik poniżej celu — ułatw wariant lub wydłuż przerwę.':'zostaw wariant i spróbuj poprawić wynik.');
        lines.push(`<span class="title">${esc(name)}:</span> ${text}`);
        continue;
      }
      const base=primaryWeight(own);
      const work=own.filter(r=>Math.abs((Number(r.kg)||0)-base)<0.001);
      const reps=work.map(r=>Number(r.reps)||0).filter(r=>r>0);
      const decision=decideLoad(reps,ex);
      const result={base,target:targetWeight(base,decision,currentStep()),decision,reps,step:currentStep()};
      lines.push(`<span class="title">${esc(name)}:</span> ${decisionLabel(result)} <span style="color:#999">(${reps.join('/')||'—'})</span>`);
    }
    return 'Trener:<br>'+lines.join('<br>');
  };

  window.TrenerProgression={
    suggestForCurrent:()=>{
      try{return resultFromHistory(currentPlan?.ex?.[exIdx],activeAthlete())}catch(e){return null}
    },
    decideLoad,
    targetWeight
  };

  ensureUi();
})();
