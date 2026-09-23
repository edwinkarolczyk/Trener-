(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  let patching=false;

  function q(){try{return window.TrenerBeta070||null;}catch(e){return null;}}
  function group(){try{return window.TrenerGroup||null;}catch(e){return null;}}
  function control(){try{return window.TrenerSharedControl083||null;}catch(e){return null;}}
  function active(){const s=q();try{return !!(s&&s.active&&running&&net?.active&&net.sessionId);}catch(e){return false;}}
  function own(){try{return Number(net.localAthlete)||0;}catch(e){return 0;}}
  function participants(){
    try{
      const g=group();
      if(Array.isArray(g?.participants)&&g.participants.length)return [...g.participants].sort((a,b)=>Number(a.index)-Number(b.index));
      return (net?.names||[]).map((name,index)=>({index,name:name||('Osoba '+(index+1)),deviceId:''}));
    }catch(e){return [];}
  }
  function nameOf(a){const p=participants().find(x=>Number(x.index)===Number(a));return p?.name||net?.names?.[a]||('Osoba '+(Number(a)+1));}
  function ex(){try{return currentPlan?.ex?.[Number(q()?.exercise)||0]||null;}catch(e){return null;}}
  function count(a){try{return (records||[]).filter(r=>Number(r.athlete)===Number(a)&&Number(r.ex)===Number(q()?.exercise||0)).length;}catch(e){return 0;}}
  function extra(a,e){
    try{
      const p=participants().find(x=>Number(x.index)===Number(a));
      return Math.max(0,Math.min(3,Number(group()?.extraSets?.[p?.deviceId]?.[e?.id]||0)));
    }catch(err){return 0;}
  }
  function target(a,e){return Math.max(1,Number(e?.sets)||1)+extra(a,e);}
  function readyAt(a){try{return Number(q()?.readyAt?.[a]||0);}catch(e){return 0;}}
  function fmt(ms){const sec=Math.max(0,Math.ceil((Number(ms)||0)/1000));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
  function lastFor(a){
    try{return [...(records||[])].filter(r=>Number(r.athlete)===Number(a)).sort((x,y)=>(Number(y.at)||0)-(Number(x.at)||0))[0]||null;}catch(e){return null;}
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function statusFor(a,e){
    const s=q(),now=Date.now(),doneExercise=e&&count(a)>=target(a,e);
    if(s?.left?.[a])return {label:'OPUŚCIŁ TRENING',cls:'done',rest:0};
    if(net?.done?.[a])return {label:'TRENING ZAKOŃCZONY',cls:'done',rest:0};
    if(doneExercise)return {label:'ĆWICZENIE ZAKOŃCZONE — CZEKA',cls:'done',rest:0};
    const rest=Math.max(0,readyAt(a)-now);
    if(rest>0)return {label:'ODPOCZYWA',cls:'resting',rest};
    if(Number(s?.turn)===Number(a))return {label:'ĆWICZY TERAZ',cls:'active',rest:0};
    return {label:'CZEKA',cls:'',rest:0};
  }

  function installCss(){
    if($('v071SharedUiStyle'))return;
    const s=document.createElement('style');s.id='v071SharedUiStyle';s.textContent=`
      body.v071Group #v070Queue{padding:8px 10px!important;margin:4px 0 6px!important;border-radius:11px!important}
      body.v071Group #v070Queue .v070Hint,body.v071Group #v070Queue #v070People{display:none!important}
      body.v071Group #v070Queue .v070Top{margin:0!important}.v071Group #v070Queue .v070Top b{font-size:8px!important}
      body.v071Group #v070Queue .v070Turn{font-size:14px!important;line-height:1.15!important;margin-top:4px!important}
      body.v071Group #training #restBox.v071Hidden{display:none!important}
      body.v071Group #training #restBox{min-height:58px!important;flex:0 0 58px!important;padding:5px 10px!important}
      body.v071Group #training #restBox.v063RestActive{min-height:66px!important;flex-basis:66px!important}
      body.v071Group #training #restBox #restTime,body.v071Group #training #restBox.v063RestActive #restTime{font-size:28px!important;line-height:1!important}
      body.v071Group #training #restBox .small{font-size:9px!important}
      body.v071Group #training #restBox .v062RestTarget{font-size:8px!important}
      body.v071Group #v055People .v055PersonMeta{white-space:normal!important}
      body.v071Group #v055People .v055State{font-size:9px!important;line-height:1.15!important}
      body.v071Group #v055People .v055RestClock{font-size:17px!important}
    `;document.head.appendChild(s);
  }

  function patchPeople(){
    const box=$('v055People'),e=ex();if(!box||!e)return;
    const html=participants().map(p=>{
      const a=Number(p.index),st=statusFor(a,e),last=lastFor(a),done=count(a),total=target(a,e);
      const lastTxt=last?('Ostatnia: '+(Number(last.kg)?last.kg+' kg × ':'')+last.reps):'Brak zapisanej serii';
      const rest=st.rest>0?`<span class="v055RestClock">${fmt(st.rest)}</span>`:'';
      return `<div class="v055Person ${st.cls}"><div class="v055PersonName">${esc(nameOf(a))}</div><div class="v055State">${esc(st.label)}</div>${rest}<div class="v055PersonMeta">Wykonano ${done}/${total} • ${esc(lastTxt)}</div></div>`;
    }).join('');
    if(box.innerHTML!==html)box.innerHTML=html;
  }

  function patchMain(){
    const s=q(),e=ex();if(!s||!e)return;
    const me=own(),turn=Number(s.turn),turnName=nameOf(turn);
    const ctrl=control(),single=!!ctrl?.isSingleController?.(),controllerLocal=!!ctrl?.isLocalController?.();
    const inputAthlete=single&&controllerLocal?turn:me;
    const inputStatus=statusFor(inputAthlete,e);
    const save=$('saveSetBtn');
    if(save){
      const stale=net?.role==='guest'&&window.TrenerBeta070Sync?.health&&window.TrenerBeta070Sync.health().ageMs>8000;
      if(single){
        const controllerId=String(ctrl?.state?.controllerDeviceId||'');
        const controllerName=participants().find(p=>String(p.deviceId||'')===controllerId)?.name||'INNY TELEFON';
        if(!controllerLocal){save.disabled=true;save.textContent='STERUJE — '+String(controllerName).toUpperCase();}
        else if(net?.role==='guest'&&(stale||!net?.connected)){save.disabled=true;save.textContent='BRAK SYNCHRONIZACJI';}
        else if(ctrl?.state?.pending){save.disabled=true;save.textContent='CZEKAM NA HOSTA…';}
        else if(inputStatus.rest>0){save.disabled=true;save.textContent='ODPOCZYNEK '+fmt(inputStatus.rest);}
        else{save.disabled=!!paused;save.textContent=paused?'TRENING WSTRZYMANY':'ZAPISZ SERIĘ — '+nameOf(turn).toUpperCase();}
      }else{
        const myStatus=statusFor(me,e);
        if(stale||!net?.connected){save.disabled=true;save.textContent='BRAK SYNCHRONIZACJI';}
        else if(s.pending){save.disabled=true;save.textContent='CZEKAM NA POTWIERDZENIE…';}
        else if(turn!==me){save.disabled=true;save.textContent='CZEKAJ — '+turnName.toUpperCase();}
        else if(myStatus.rest>0){save.disabled=true;save.textContent='ODPOCZYNEK '+fmt(myStatus.rest);}
        else{save.disabled=!!paused;save.textContent=paused?'TRENING WSTRZYMANY':'ZAPISZ SERIĘ — '+nameOf(me).toUpperCase();}
      }
    }

    const queueTurn=$('v070Turn');
    if(queueTurn){
      if(single&&controllerLocal){
        if(inputStatus.rest>0)queueTurn.textContent=nameOf(turn)+' — ODPOCZYNEK '+fmt(inputStatus.rest);
        else if(ctrl?.state?.pending)queueTurn.textContent='ZAPISUJĘ SERIĘ U HOSTA…';
        else queueTurn.textContent='WPISZ SERIĘ — '+nameOf(turn);
      }else if(single){
        const controllerId=String(ctrl?.state?.controllerDeviceId||'');
        const controllerName=participants().find(p=>String(p.deviceId||'')===controllerId)?.name||'inny telefon';
        queueTurn.textContent='ĆWICZY '+turnName+' • wpisuje '+controllerName;
      }else{
        const myStatus=statusFor(me,e);
        if(turn===me&&myStatus.rest>0)queueTurn.textContent='ODPOCZYNEK '+fmt(myStatus.rest);
        else if(turn===me&&!s.pending)queueTurn.textContent='TWOJA KOLEJ — ĆWICZ TERAZ';
        else if(s.pending)queueTurn.textContent='ZAPISUJĘ SERIĘ…';
        else queueTurn.textContent='CZEKAJ — ĆWICZY '+turnName;
      }
    }

    const series=$('v062Series');
    if(series)series.textContent=(Math.min(count(inputAthlete)+1,target(inputAthlete,e)))+' / '+target(inputAthlete,e);
    const leftLabel=$('v062Summary')?.querySelector('.v062Stat.gold span');if(leftLabel)leftLabel.textContent='DO KOŃCA';
    const left=$('v062Left');
    if(left){
      let totalLeft=0;
      try{
        for(let i=Number(s.exercise)||0;i<(currentPlan?.ex?.length||0);i++){
          const ce=currentPlan.ex[i],base=target(inputAthlete,ce),done=(records||[]).filter(r=>Number(r.athlete)===inputAthlete&&Number(r.ex)===i).length;
          totalLeft+=Math.max(0,base-done);
        }
      }catch(err){}
      left.textContent=totalLeft+' serii';
    }

    if(single&&controllerLocal){
      if($('athlete'))$('athlete').textContent=nameOf(turn);
      if($('series'))$('series').textContent='Seria '+(Math.min(count(turn)+1,target(turn,e)))+'/'+target(turn,e)+' • '+nameOf(turn);
    }

    const rest=$('restBox');
    if(rest){
      const shownRest=Math.max(0,readyAt(inputAthlete)-Date.now());
      rest.classList.toggle('v071Hidden',shownRest<=0);
      rest.classList.toggle('v063RestActive',shownRest>0);
      const small=rest.querySelector('.small');
      if(small)small.textContent=single&&controllerLocal?(nameOf(inputAthlete).toUpperCase()+' — ODPOCZYNEK'):'TWÓJ ODPOCZYNEK';
      if($('restTime'))$('restTime').textContent=shownRest>0?fmt(shownRest):'';
      const targetEl=$('v062RestTarget');if(targetEl)targetEl.textContent='';
      if($('skipRestBtn'))$('skipRestBtn').classList.toggle('hidden',shownRest<=0||(single&&!controllerLocal));
    }
  }

  function patch(){
    if(patching)return;
    const focused=document.activeElement;
    const editing=!!(focused&&focused.matches&&focused.matches('#weight,#reps'));
    patching=true;
    try{
      installCss();
      const on=active();document.body?.classList.toggle('v071Group',on);
      if(!on)return;
      if(editing)return;
      patchPeople();patchMain();
    }finally{patching=false;}
  }

  document.addEventListener('click',ev=>{
    if(!ev.target?.closest?.('#saveSetBtn')||!active())return;
    setTimeout(()=>{const r=$('reps');if(r)r.value='';patch();},0);
    setTimeout(()=>{const r=$('reps');if(r)r.value='';patch();},180);
  });

  function boot(){
    installCss();
    setInterval(patch,250);
    document.addEventListener('focusout',ev=>{
      if(ev.target?.matches?.('#weight,#reps'))setTimeout(patch,0);
    },true);
    patch();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
