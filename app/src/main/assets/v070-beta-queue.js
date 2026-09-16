(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const state={
    active:false,sessionId:'',rev:0,exercise:0,turn:0,waitUntil:0,
    readyAt:{},left:{},pending:null,lastStateAt:0,lastAckAt:0,
    baseComplete:null,baseRender:null,baseFinishShared:null,wifiWrapped:false,
    booted:false,timer:null
  };
  window.TrenerBeta070=state;

  function group(){try{return window.TrenerGroup||null;}catch(e){return null;}}
  function clone(v,f){try{return JSON.parse(JSON.stringify(v));}catch(e){return f;}}
  function participants(){
    const g=group();
    if(g&&Array.isArray(g.participants)&&g.participants.length){return [...g.participants].sort((a,b)=>Number(a.index)-Number(b.index));}
    const names=(net&&Array.isArray(net.names)?net.names:[]);
    return names.map((name,index)=>({index,name:name||('Osoba '+(index+1)),deviceId:''}));
  }
  function athleteName(a){const p=participants().find(x=>Number(x.index)===Number(a));return p?.name||net?.names?.[a]||('Osoba '+(Number(a)+1));}
  function ownAthlete(){try{return Number(net.localAthlete)||0;}catch(e){return 0;}}
  function currentEx(){try{return currentPlan?.ex?.[state.exercise]||null;}catch(e){return null;}}
  function extraFor(a,ex){
    const g=group(),p=participants().find(x=>Number(x.index)===Number(a));
    if(!g||!p||!ex)return 0;
    return Math.max(0,Math.min(3,Number(g.extraSets?.[p.deviceId]?.[ex.id]||0)));
  }
  function targetSets(a,ex){return Math.max(1,Number(ex?.sets)||1)+extraFor(a,ex);}
  function setCount(a,exIndex){
    try{return (records||[]).filter(r=>Number(r.athlete)===Number(a)&&Number(r.ex)===Number(exIndex)).length;}catch(e){return 0;}
  }
  function participantDoneExercise(a){const ex=currentEx();return !ex||setCount(a,state.exercise)>=targetSets(a,ex);}
  function participantActive(a){return !state.left[a]&&!net?.done?.[a];}
  function allDoneExercise(){return participants().filter(p=>participantActive(Number(p.index))).every(p=>participantDoneExercise(Number(p.index)));}
  function allWorkoutDone(){return state.exercise>=Number(currentPlan?.ex?.length||0);}
  function nextCandidate(after){
    const list=participants().map(p=>Number(p.index)).filter(participantActive);
    if(!list.length)return null;
    const start=Math.max(0,list.indexOf(Number(after)));
    const ordered=list.slice(start+1).concat(list.slice(0,start+1));
    const need=ordered.filter(a=>!participantDoneExercise(a));
    if(!need.length)return null;
    const now=Date.now();
    const ready=need.find(a=>Number(state.readyAt[a]||0)<=now);
    if(ready!==undefined)return {athlete:ready,waitUntil:0};
    let best=need[0],when=Number(state.readyAt[best]||0);
    need.forEach(a=>{const t=Number(state.readyAt[a]||0);if(t<when){best=a;when=t;}});
    return {athlete:best,waitUntil:when};
  }
  function syncLocalPosition(){
    if(!state.active||!running||!currentPlan)return;
    exIdx=Math.max(0,Math.min(state.exercise,currentPlan.ex.length-1));
    athleteIdx=ownAthlete();
    setIdx=setCount(ownAthlete(),exIdx);
  }
  function ownTurn(){return state.active&&Number(state.turn)===ownAthlete()&&!state.left[ownAthlete()]&&!net?.done?.[ownAthlete()];}
  function turnReady(){return ownTurn()&&Date.now()>=Number(state.waitUntil||0)&&!state.pending;}

  function installUi(){
    if(!$('v070BetaStyle')){
      const s=document.createElement('style');s.id='v070BetaStyle';s.textContent=`
      #v070Queue{margin:8px 0 10px;padding:11px;border:1px solid #493032;border-radius:13px;background:#120b0c}
      #v070Queue.hidden{display:none!important}.v070Top{display:flex;justify-content:space-between;gap:8px;align-items:center}.v070Top b{font-size:11px;color:#ff6265;letter-spacing:.07em}.v070Top span{font-size:10px;color:#999}
      .v070Turn{font-size:18px;font-weight:900;color:#fff;margin-top:7px}.v070Turn.mine{color:#72e69c}.v070Hint{font-size:11px;color:#aaa;margin-top:4px;line-height:1.4}.v070Grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.v070Person{border:1px solid #303030;border-radius:10px;padding:8px;background:#0c0c0c}.v070Person.active{border-color:#7f3739}.v070Person.done{border-color:#31583f}.v070Person strong{display:block}.v070Person span{display:block;font-size:10px;color:#999;margin-top:2px}
      @media(max-width:520px){.v070Grid{grid-template-columns:1fr}}
      `;document.head.appendChild(s);
    }
    const training=$('training');
    if(training&&!$('v070Queue')){
      const box=document.createElement('div');box.id='v070Queue';box.className='hidden';
      box.innerHTML='<div class="v070Top"><b>0.7.0 BETA • TRENING NA ZMIANĘ</b><span id="v070Sync">—</span></div><div id="v070Turn" class="v070Turn"></div><div id="v070Hint" class="v070Hint"></div><div id="v070People" class="v070Grid"></div>';
      const inputs=training.querySelector('.inputs');if(inputs)inputs.insertAdjacentElement('beforebegin',box);else training.prepend(box);
    }
    const gbox=$('v064GroupBox');if(gbox){
      const cb=$('v064SharedEquipment');if(cb){cb.checked=false;cb.disabled=true;const label=cb.closest('label');if(label)label.style.display='none';}
      const head=gbox.querySelector('.v064Head b');if(head)head.textContent='WSPÓLNY TRENING 2–4 • NA ZMIANĘ';
    }
    const mini=[...document.querySelectorAll('.miniCard')].find(x=>x.querySelector('span')?.textContent==='Sprzęt');
    if(mini){const b=mini.querySelector('b');if(b)b.textContent='1 WSPÓLNE STANOWISKO • CIĘŻARY OSOBNE';}
    if($('duoBtn'))$('duoBtn').textContent='WSPÓLNY 2–4';
  }

  function render(){
    installUi();
    const box=$('v070Queue');if(!box)return;
    const active=!!(state.active&&running&&net.active&&group()?.groupSession);
    box.classList.toggle('hidden',!active);if(!active)return;
    syncLocalPosition();
    const ex=currentEx(),turn=Number(state.turn),mine=turn===ownAthlete();
    const left=Math.max(0,Number(state.waitUntil||0)-Date.now());
    const turnEl=$('v070Turn');turnEl.classList.toggle('mine',mine);
    if(allWorkoutDone())turnEl.textContent='TRENING ZAKOŃCZONY';
    else if(mine&&left<=0&&!state.pending)turnEl.textContent='TWOJA KOLEJ — ĆWICZ TERAZ';
    else if(mine&&state.pending)turnEl.textContent='ZAPISUJĘ SERIĘ U HOSTA…';
    else if(mine&&left>0)turnEl.textContent='TWOJA KOLEJ ZA '+formatTime(left);
    else turnEl.textContent='CZEKAJ — ĆWICZY '+athleteName(turn);
    $('v070Hint').textContent=ex?`${ex.n} • każdy ma własny ciężar i własny wynik. Następne ćwiczenie dopiero gdy wszyscy skończą to.`:'Kończę wspólną sesję.';
    $('v070Sync').textContent=net.connected?('sync '+Math.max(0,Math.round((Date.now()-state.lastStateAt)/1000))+' s'):'OFFLINE';
    $('v070People').innerHTML=participants().map(p=>{
      const a=Number(p.index),done=state.left[a]||participantDoneExercise(a),cnt=ex?setCount(a,state.exercise):0,total=ex?targetSets(a,ex):0;
      const status=state.left[a]?'opuścił trening':(done?'gotowy':(a===turn?(Number(state.waitUntil||0)>Date.now()?'odpoczywa':'ćwiczy teraz'):'czeka'));
      return `<div class="v070Person ${a===turn?'active':''} ${done?'done':''}"><strong>${escapeHtml(p.name||('Osoba '+(a+1)))}</strong><span>${cnt}/${total} serii • ${status}</span></div>`;
    }).join('');
    const save=$('saveSetBtn');if(save){save.disabled=!turnReady();save.textContent=turnReady()?'ZAPISZ SERIĘ':(state.pending?'CZEKAM NA POTWIERDZENIE…':'CZEKAJ NA SWOJĄ KOLEJ');}
    if($('series')&&ex)$('series').textContent=`Seria ${Math.min(setCount(ownAthlete(),state.exercise)+1,targetSets(ownAthlete(),ex))}/${targetSets(ownAthlete(),ex)} • ${athleteName(ownAthlete())}`;
    if($('athlete'))$('athlete').textContent=athleteName(ownAthlete());
    restEnd=0;transitionRest=false;
    if($('restTime'))$('restTime').textContent=mine&&left>0?('ODPOCZYNEK '+formatTime(left)):(mine?'GOTOWY':'CZEKAJ NA '+athleteName(turn));
    if($('skipRestBtn'))$('skipRestBtn').classList.add('hidden');
  }

  function snapshot(){
    return {type:'BETA070_STATE',sessionId:state.sessionId,rev:state.rev,exercise:state.exercise,turn:state.turn,waitUntil:state.waitUntil,readyAt:clone(state.readyAt,{}),left:clone(state.left,{}),records:clone(records||[],[]),done:clone(net.done||[],[]),extraSets:clone(group()?.extraSets||{},{}),participants:clone(participants(),[]),elapsed:typeof elapsedMs==='function'?elapsedMs():0};
  }
  function sendState(){if(net.role!=='host'||!state.active)return false;state.lastStateAt=Date.now();return !!wifiSend(snapshot());}

  function startHostQueue(){
    if(net.role!=='host'||!running||!net.active||!group()?.groupSession||!net.sessionId)return false;
    if(state.active&&state.sessionId===String(net.sessionId))return true;
    state.active=true;state.sessionId=String(net.sessionId);state.rev=1;state.exercise=0;state.readyAt={};state.left={};state.pending=null;state.lastStateAt=Date.now();
    const first=participants().map(p=>Number(p.index)).find(a=>participantActive(a));state.turn=first??0;state.waitUntil=0;
    const g=group();if(g)g.sharedEquipment=false;
    sendState();render();return true;
  }
  function applyState(m){
    if(!m||m.sessionId!==String(net.sessionId||''))return;
    if(state.active&&Number(m.rev||0)<state.rev)return;
    state.active=true;state.sessionId=String(m.sessionId);state.rev=Number(m.rev)||0;state.exercise=Math.max(0,Number(m.exercise)||0);state.turn=Number(m.turn)||0;state.waitUntil=Math.max(0,Number(m.waitUntil)||0);state.readyAt=Object.assign({},m.readyAt||{});state.left=Object.assign({},m.left||{});state.lastStateAt=Date.now();
    if(Array.isArray(m.records))m.records.forEach(mergeRecord);if(Array.isArray(m.done))net.done=m.done.map(Boolean);
    const g=group();if(g){g.sharedEquipment=false;if(m.extraSets)g.extraSets=clone(m.extraSets,{});if(Array.isArray(m.participants))g.participants=clone(m.participants,[]);}
    if(state.pending&&records.some(r=>r.uid===state.pending.uid))state.pending=null;
    syncLocalPosition();try{prefillWeight();updateView();}catch(e){}render();
  }

  function advanceHost(after){
    if(net.role!=='host'||!state.active)return;
    if(allDoneExercise()){
      state.exercise++;
      state.readyAt={};state.waitUntil=0;
      if(allWorkoutDone()){
        participants().forEach(p=>{if(!state.left[Number(p.index)])net.done[Number(p.index)]=true;});state.rev++;sendState();render();setTimeout(()=>finishSharedForAll(false),250);return;
      }
      const first=participants().map(p=>Number(p.index)).find(a=>participantActive(a));state.turn=first??0;
    }else{
      const n=nextCandidate(after);if(n){state.turn=n.athlete;state.waitUntil=n.waitUntil||0;}
    }
    state.rev++;sendState();syncLocalPosition();try{prefillWeight();updateView();}catch(e){}render();
  }

  function acceptRecord(rec,deviceId){
    if(!rec||!state.active||net.role!=='host')return {ok:false,reason:'Sesja nieaktywna'};
    const a=Number(rec.athlete)||0;
    if(records.some(r=>r.uid&&r.uid===rec.uid))return {ok:true,duplicate:true};
    const p=participants().find(x=>Number(x.index)===a);
    if(deviceId&&p?.deviceId&&String(deviceId)!==String(p.deviceId))return {ok:false,reason:'Telefon nie pasuje do uczestnika'};
    if(a!==Number(state.turn))return {ok:false,reason:'To nie jest kolej tej osoby'};
    if(Number(rec.ex)!==Number(state.exercise))return {ok:false,reason:'Telefon jest na innym ćwiczeniu'};
    if(Date.now()<Number(state.waitUntil||0))return {ok:false,reason:'Przerwa jeszcze trwa'};
    const ex=currentEx();if(!ex||setCount(a,state.exercise)>=targetSets(a,ex))return {ok:false,reason:'Wszystkie serie tej osoby są już wykonane'};
    rec.set=setCount(a,state.exercise);rec.uid=rec.uid||(`${state.sessionId}:${a}:${state.exercise}:${rec.set}`);mergeRecord(rec);net.last[a]=rec;state.readyAt[a]=Date.now()+Math.max(0,Number(ex.rest)||0)*1000;return {ok:true};
  }

  function completeBetaSet(){
    if(!state.active)return state.baseComplete?.apply(this,arguments);
    if(!turnReady()){toast(state.pending?'Czekam na potwierdzenie hosta.':'Teraz ćwiczy '+athleteName(state.turn)+'.');return;}
    const ex=currentEx();if(!ex)return;const reps=readReps();if(reps===null)return;const kg=readKg(),a=ownAthlete(),idx=setCount(a,state.exercise);
    const rec=makeRecord(ex,state.exercise,idx,a,kg,reps);rec.uid=`${state.sessionId}:${a}:${state.exercise}:${idx}`;$('reps').value='';
    if(net.role==='host'){
      const result=acceptRecord(rec,group()?.deviceId||'');if(!result.ok){toast(result.reason||'Nie można zapisać serii.');return;}lastCompletedExercise=state.exercise;advanceHost(a);try{window.TrenerSyncHistory?.checkpoint?.();}catch(e){}return;
    }
    mergeRecord(rec);state.pending={uid:rec.uid,record:clone(rec,null),sentAt:Date.now(),tries:1};
    wifiSend({type:'BETA070_SET_REQUEST',sessionId:state.sessionId,deviceId:group()?.deviceId||'',athlete:a,record:rec,knownRev:state.rev});
    lastCompletedExercise=state.exercise;try{window.TrenerSyncHistory?.checkpoint?.();}catch(e){}render();
  }

  function handleBetaMessage(m){
    if(!m||!m.type)return false;
    if(m.type==='BETA070_STATE'){
      if(net.role==='guest'&&m.sessionId===String(net.sessionId||'')){applyState(m);return true;}return net.role==='host';
    }
    if(m.type==='BETA070_SET_REQUEST'&&net.role==='host'&&state.active&&m.sessionId===state.sessionId){
      const result=acceptRecord(clone(m.record,null),String(m.deviceId||''));
      wifiSend({type:result.ok?'BETA070_SET_ACK':'BETA070_SET_NACK',sessionId:state.sessionId,targetDeviceId:String(m.deviceId||''),uid:m.record?.uid||'',reason:result.reason||''});
      if(result.ok&&!result.duplicate)advanceHost(Number(m.athlete)||0);else sendState();return true;
    }
    if((m.type==='BETA070_SET_ACK'||m.type==='BETA070_SET_NACK')&&net.role==='guest'&&m.sessionId===state.sessionId){
      const ownId=String(group()?.deviceId||'');if(m.targetDeviceId&&String(m.targetDeviceId)!==ownId)return true;
      if(state.pending&&m.uid===state.pending.uid){
        if(m.type==='BETA070_SET_ACK'){state.pending=null;state.lastAckAt=Date.now();}
        else{const uid=state.pending.uid;records=records.filter(r=>r.uid!==uid);state.pending=null;toast(m.reason||'Host odrzucił serię — spróbuj ponownie.');}
      }
      render();return true;
    }
    if(m.type==='BETA070_FINISH'&&m.sessionId===state.sessionId){
      if(Array.isArray(m.records))m.records.forEach(mergeRecord);state.active=false;finishWorkout(!!m.interrupted,true);return true;
    }
    return false;
  }

  function wrapWifi(){
    if(state.wifiWrapped||!window.TrenerWifi?.nativeMessage)return false;
    const base=window.TrenerWifi.nativeMessage.bind(window.TrenerWifi);
    window.TrenerWifi.nativeMessage=function(raw){
      let m=null;try{m=JSON.parse(raw);}catch(e){}
      if(m&&handleBetaMessage(m))return;
      if(state.active&&m&&['SET','GROUP_POSITION','GROUP_RESYNC','GROUP_SNAPSHOT'].includes(m.type))return;
      if(state.active&&m&&m.type==='DONE'&&net.role==='host'){
        if(Array.isArray(m.records))m.records.forEach(mergeRecord);const a=Number(m.athlete)||1;state.left[a]=true;net.done[a]=true;if(Number(state.turn)===a)advanceHost(a);else{state.rev++;sendState();render();}return;
      }
      const out=base(raw);
      setTimeout(()=>{if(net.role==='host')startHostQueue();render();},0);
      return out;
    };
    state.wifiWrapped=true;return true;
  }

  function wrapCore(){
    if(!state.baseComplete&&typeof completeNetworkSet==='function'){state.baseComplete=completeNetworkSet;completeNetworkSet=completeBetaSet;}
    if(!state.baseRender&&typeof renderLivePanel==='function'){state.baseRender=renderLivePanel;renderLivePanel=function(){const out=state.baseRender.apply(this,arguments);render();return out;};}
    if(!state.baseFinishShared&&typeof finishSharedForAll==='function'){
      state.baseFinishShared=finishSharedForAll;
      finishSharedForAll=function(interrupted){
        if(state.active&&running&&net.active&&net.role==='host'){
          wifiSend({type:'BETA070_FINISH',sessionId:state.sessionId,interrupted:!!interrupted,records:clone(records||[],[])});
          state.active=false;finishWorkout(!!interrupted,true);return;
        }
        return state.baseFinishShared.apply(this,arguments);
      };
    }
  }

  function maintain(){
    installUi();wrapWifi();wrapCore();
    const g=group();if(g&&g.groupSession)g.sharedEquipment=false;
    if(running&&net.active&&g?.groupSession){
      if(net.role==='host')startHostQueue();
      if(state.active&&state.sessionId!==String(net.sessionId||'')){state.active=false;state.pending=null;}
      if(state.active&&net.role==='host'){
        if(state.waitUntil&&Date.now()>=state.waitUntil){state.waitUntil=0;state.rev++;sendState();}
        if(Date.now()-state.lastStateAt>1200)sendState();
      }
      if(state.active&&net.role==='guest'&&state.pending&&Date.now()-state.pending.sentAt>1800&&net.connected){
        if(state.pending.tries<4){state.pending.sentAt=Date.now();state.pending.tries++;wifiSend({type:'BETA070_SET_REQUEST',sessionId:state.sessionId,deviceId:group()?.deviceId||'',athlete:ownAthlete(),record:state.pending.record,knownRev:state.rev});}
        else{toast('Brak potwierdzenia hosta — sprawdź Wi‑Fi. Seria jest zachowana lokalnie.');state.pending.sentAt=Date.now();}
      }
    }else if(state.active){state.active=false;state.pending=null;}
    render();
  }

  function boot(){if(state.booted)return;state.booted=true;installUi();wrapWifi();wrapCore();state.timer=setInterval(maintain,250);maintain();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
