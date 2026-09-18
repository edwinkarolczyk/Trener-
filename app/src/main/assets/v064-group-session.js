(function(){
  'use strict';

  const MAX_PARTICIPANTS=4;
  const DEVICE_KEY='trainer3.deviceId.v064';
  const CFG_KEY='trainer3.groupCfg.v064';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function randomId(){
    try{if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();}catch(e){}
    return 'd'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
  }
  function loadDeviceId(){
    try{let id=localStorage.getItem(DEVICE_KEY);if(!id){id=randomId();localStorage.setItem(DEVICE_KEY,id);}return id;}catch(e){return randomId();}
  }
  function loadCfg(){try{return Object.assign({sharedEquipment:true},JSON.parse(localStorage.getItem(CFG_KEY)||'null')||{});}catch(e){return {sharedEquipment:true};}}
  function saveCfg(){try{localStorage.setItem(CFG_KEY,JSON.stringify({sharedEquipment:!!state.sharedEquipment}));}catch(e){}}
  function appVersion(){try{return window.Android&&Android.getAppVersion?String(Android.getAppVersion()):'0.6.4';}catch(e){return '0.6.4';}}
  function ownName(){return ($('nameA')?.value||'').trim()||'Osoba';}

  const cfg=loadCfg();
  const state={deviceId:loadDeviceId(),assignedIndex:0,participants:[],sharedEquipment:!!cfg.sharedEquipment,sharedLoads:{},extraSets:{},positions:{},readiness:null,groupSession:false,settleUntil:0,weightTimer:null,wrapped:false,baseRender:null,baseUpdateView:null,basePrefill:null,baseSaveHistory:null,baseCompleteNetworkSet:null};
  window.TrenerGroup=state;

  function participantById(id){return state.participants.find(p=>p.deviceId===id)||null;}
  function participantByIndex(index){return state.participants.find(p=>Number(p.index)===Number(index))||null;}
  function ensureHostParticipant(){
    let p=participantById(state.deviceId);
    if(!p){p={deviceId:state.deviceId,index:0,name:ownName(),version:appVersion()};state.participants.unshift(p);}
    p.index=0;p.name=ownName();p.version=appVersion();state.assignedIndex=0;return p;
  }
  function sortedParticipants(){return [...state.participants].sort((a,b)=>Number(a.index)-Number(b.index));}
  function nextIndex(){const used=new Set(state.participants.map(p=>Number(p.index)));for(let i=1;i<MAX_PARTICIPANTS;i++)if(!used.has(i))return i;return -1;}
  function syncCoreParticipants(){
    try{
      const list=sortedParticipants();const max=Math.max(1,...list.map(p=>Number(p.index)||0));
      const names=Array.from({length:max+1},(_,i)=>net.names?.[i]||('Osoba '+(i+1)));
      const done=Array.from({length:max+1},(_,i)=>!!net.done?.[i]);const last=Array.from({length:max+1},(_,i)=>net.last?.[i]||null);
      list.forEach(p=>{names[p.index]=p.name||('Osoba '+(Number(p.index)+1));});net.names=names;net.done=done;net.last=last;
      const own=participantById(state.deviceId);if(own){state.assignedIndex=Number(own.index)||0;net.localAthlete=state.assignedIndex;}
      if(window.TrenerDuoProfile&&list.length>1)window.TrenerDuoProfile.partnerReady=true;
    }catch(e){}
  }

  function installCss(){
    if($('v064Style'))return;const s=document.createElement('style');s.id='v064Style';s.textContent=`
      #v064GroupBox{margin:9px 0 12px;padding:10px;border:1px solid #343434;border-radius:12px;background:#0d0d0d}#v064GroupBox.hidden{display:none!important}.v064Head{display:flex;justify-content:space-between;gap:8px;align-items:center}.v064Head b{font-size:11px;color:#ef4b4d;letter-spacing:.06em}.v064Head span{font-size:10px;color:#888}.v064Switch{display:flex;gap:8px;align-items:flex-start;margin-top:9px;font-size:11px;color:#bbb;line-height:1.35}.v064Switch input{margin-top:2px}.v064Roster{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.v064Roster div{border:1px solid #2c2c2c;border-radius:9px;padding:7px 8px;background:#101010;font-size:10px;color:#aaa}.v064Roster b{display:block;color:#fff;font-size:11px;margin-bottom:2px}
      #v064Workout{margin:8px 0 10px;padding:10px;border:1px solid #3a2d2e;border-radius:12px;background:#110b0c;font-size:11px;line-height:1.45}.v064Target{font-weight:900;color:#fff;margin-bottom:5px}.v064Target em{font-style:normal;color:#61d990}.v064Note{color:#aaa}.v064Sets{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}.v064Sets .buttons{display:flex;gap:6px}.v064Sets button{min-width:42px;min-height:34px;padding:4px 9px}.v064Shared{color:#ffd269;margin-top:5px}.v064PersonGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.v064Person{border:1px solid #303030;border-radius:10px;padding:8px;background:#0c0c0c}.v064Person.done{border-color:#2e6b49}.v064Person strong{display:block;color:#fff}.v064Person span{display:block;color:#999;font-size:10px;margin-top:2px}.v064Person .now{color:#ddd}html.v064SharedMode #v060Calc{display:none!important}@media(max-width:520px){.v064Roster,.v064PersonGrid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function installUi(){
    installCss();if($('duoBtn'))$('duoBtn').textContent='WSPÓLNY 2–4';
    const name=$('nameA');
    if(name&&!$('v064GroupBox')){
      const box=document.createElement('div');box.id='v064GroupBox';box.className='hidden';
      box.innerHTML=`<div class="v064Head"><b>WSPÓLNY TRENING 2–4</b><span>maks. ${MAX_PARTICIPANTS} osoby</span></div><label class="v064Switch"><input id="v064SharedEquipment" type="checkbox"><span><b>Wspólny sprzęt</b><br>Jedno obciążenie dla danego ćwiczenia, ale osobny cel powtórzeń i osobna rekomendacja dla każdej osoby.</span></label><div id="v064Roster" class="v064Roster"></div>`;
      const anchor=$('v0635PartnerIdentity')||name;anchor.insertAdjacentElement('afterend',box);const cb=$('v064SharedEquipment');cb.checked=state.sharedEquipment;cb.addEventListener('change',()=>{state.sharedEquipment=cb.checked;saveCfg();refreshAll();});
    }
    const training=$('training');
    if(training&&!$('v064Workout')){
      const box=document.createElement('div');box.id='v064Workout';box.className='hidden';
      box.innerHTML=`<div id="v064Target" class="v064Target"></div><div id="v064Note" class="v064Note"></div><div id="v064Shared" class="v064Shared"></div><div class="v064Sets"><span id="v064SetInfo">Serie</span><div class="buttons"><button id="v064MinusSet" class="secondary">−1</button><button id="v064PlusSet" class="secondary">+1 SERIA</button></div></div>`;
      const inputs=training.querySelector('.inputs');if(inputs)inputs.insertAdjacentElement('beforebegin',box);else training.appendChild(box);$('v064PlusSet').addEventListener('click',()=>changeExtraSet(1));$('v064MinusSet').addEventListener('click',()=>changeExtraSet(-1));
    }
    const w=$('weight');if(w&&!w.dataset.v064){w.dataset.v064='1';w.addEventListener('change',syncSharedLoadFromInput);w.addEventListener('input',()=>{clearTimeout(state.weightTimer);state.weightTimer=setTimeout(syncSharedLoadFromInput,500);});}
    const settings=$('settings');const wifiCard=settings?[...settings.querySelectorAll('.card')].find(c=>c.querySelector('.eyebrow')?.textContent?.includes('DWA TELEFONY')):null;
    if(wifiCard){const eyebrow=wifiCard.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='2+ TELEFONY';const h=wifiCard.querySelector('h2');if(h)h.textContent='Wspólna sesja 2–4 osoby';}
    const panes=[...document.querySelectorAll('.wifiPane')];if(panes[1]){const h=panes[1].querySelector('h3');if(h)h.textContent='2. Partnerzy';const p=panes[1].querySelector('.hint');if(p)p.textContent='Każda kolejna osoba wpisuje to samo IP i ten sam 6-cyfrowy kod gospodarza.';}
  }

  function renderRoster(){
    const box=$('v064GroupBox'),roster=$('v064Roster');if(!box||!roster)return;let m=1;try{m=mode;}catch(e){}box.classList.toggle('hidden',m!==2);if(m!==2)return;
    const cb=$('v064SharedEquipment');if(cb){cb.checked=state.sharedEquipment;cb.disabled=!!(net?.role==='guest'&&net?.connected);}
    const list=sortedParticipants();if(!list.length){roster.innerHTML='<div><b>Ty</b>Utwórz sesję albo dołącz do gospodarza.</div>';return;}
    roster.innerHTML=list.map(p=>`<div><b>${esc(p.name||('Osoba '+(Number(p.index)+1)))}</b>#${Number(p.index)+1}${p.deviceId===state.deviceId?' • ten telefon':''}</div>`).join('');
  }
  function resetForHost(){state.participants=[];state.assignedIndex=0;state.sharedLoads={};state.extraSets={};state.positions={};state.groupSession=false;ensureHostParticipant();syncCoreParticipants();renderRoster();}
  function resetForGuest(){state.participants=[];state.assignedIndex=1;state.sharedLoads={};state.extraSets={};state.positions={};state.groupSession=false;renderRoster();}
  function send(obj){try{return wifiSend(obj);}catch(e){return false;}}
  function sendOwnGroupProfile(){
    try{if(!net.connected||net.role!=='guest')return;send({type:'GROUP_PROFILE',deviceId:state.deviceId,name:ownName(),version:appVersion()});if(net.active&&state.groupSession)send({type:'GROUP_RESYNC',sessionId:net.sessionId,deviceId:state.deviceId,athlete:net.localAthlete,done:!!net.done[net.localAthlete],records:records.filter(r=>r.athlete===net.localAthlete),extraSets:state.extraSets[state.deviceId]||{},position:state.positions[net.localAthlete]||null});}catch(e){}
  }
  function sendGroupState(){if(net.role==='host')send({type:'GROUP_STATE',participants:sortedParticipants(),sharedEquipment:state.sharedEquipment});}
  function sendGroupSnapshot(targetDeviceId){if(net.role!=='host'||!net.connected)return;send({type:'GROUP_SNAPSHOT',targetDeviceId:targetDeviceId||null,active:!!(running&&net.active&&state.groupSession),sessionId:net.sessionId,planKey,plan:currentPlan,participants:sortedParticipants(),names:[...net.names],done:[...net.done],records:[...records],sharedEquipment:state.sharedEquipment,sharedLoads:{...state.sharedLoads},extraSets:JSON.parse(JSON.stringify(state.extraSets)),positions:JSON.parse(JSON.stringify(state.positions)),paused:!!paused,elapsed:running?elapsedMs():0});}

  function receiveGroupProfile(m){
    if(net.role!=='host')return;ensureHostParticipant();const id=String(m.deviceId||'').trim();if(!id||id===state.deviceId)return;let p=participantById(id);
    if(!p){const idx=nextIndex();if(idx<0){send({type:'GROUP_REJECT',targetDeviceId:id,reason:'Sesja jest pełna — maksymalnie 4 osoby.'});return;}p={deviceId:id,index:idx,name:String(m.name||'Partner').trim()||'Partner',version:String(m.version||'')};state.participants.push(p);}else{p.name=String(m.name||p.name||'Partner').trim()||'Partner';p.version=String(m.version||p.version||'');}
    state.settleUntil=Date.now()+350;syncCoreParticipants();sendGroupState();if(running&&net.active&&state.groupSession)setTimeout(()=>sendGroupSnapshot(id),80);renderRoster();renderLivePanel();
  }
  function receiveGroupState(m){
    if(net.role!=='guest'||!Array.isArray(m.participants))return;state.participants=m.participants.slice(0,MAX_PARTICIPANTS).map(p=>({deviceId:String(p.deviceId||''),index:Number(p.index)||0,name:String(p.name||'Osoba'),version:String(p.version||'')}));
    const own=participantById(state.deviceId);if(own){state.assignedIndex=Number(own.index)||1;net.localAthlete=state.assignedIndex;}if(typeof m.sharedEquipment==='boolean')state.sharedEquipment=m.sharedEquipment;syncCoreParticipants();renderRoster();refreshAll();
  }
  function beginGuestGroup(m){
    if(m.targetDeviceId&&m.targetDeviceId!==state.deviceId)return;if(!Array.isArray(m.participants))return;state.participants=m.participants.slice(0,MAX_PARTICIPANTS);const own=participantById(state.deviceId);if(!own){toast('Gospodarz nie przypisał jeszcze tego telefonu do sesji.');return;}
    if(running&&(!net.active||net.sessionId!==m.sessionId))finishWorkout(false,true);resetWorkoutState();currentPlan=m.plan;planKey=m.planKey||'shared';if(!currentPlan||!Array.isArray(currentPlan.ex)){toast('Nieprawidłowy plan od gospodarza.');return;}
    state.groupSession=true;state.sharedEquipment=!!m.sharedEquipment;state.sharedLoads=Object.assign({},m.sharedLoads||{});state.extraSets=JSON.parse(JSON.stringify(m.extraSets||{}));state.positions=JSON.parse(JSON.stringify(m.positions||{}));net.active=true;net.sessionId=m.sessionId;net.localAthlete=Number(own.index)||1;state.assignedIndex=net.localAthlete;syncCoreParticipants();
    if(Array.isArray(m.done))net.done=m.done.map(Boolean);records=[];(m.records||[]).forEach(mergeRecord);mode=2;athleteIdx=net.localAthlete;startedAt=Date.now()-Math.max(0,Number(m.elapsed)||0);running=true;paused=false;const pos=deriveGroupPosition();exIdx=pos.ex;setIdx=pos.set;net.done[net.localAthlete]=net.done[net.localAthlete]||pos.done;openTrainingUi();showTab('start');if(m.paused)setPausedState(true);
    send({type:'GROUP_RESYNC',sessionId:net.sessionId,deviceId:state.deviceId,athlete:net.localAthlete,done:!!net.done[net.localAthlete],records:records.filter(r=>r.athlete===net.localAthlete),extraSets:state.extraSets[state.deviceId]||{},position:state.positions[net.localAthlete]||{ex:exIdx,set:setIdx,done:!!net.done[net.localAthlete]}});toast('Dołączono do wspólnego treningu.');refreshAll();
  }
  function applyGroupSnapshot(m){
    if(m.targetDeviceId&&m.targetDeviceId!==state.deviceId)return;if(!m.active){receiveGroupState(m);return;}if(!net.active||net.sessionId!==m.sessionId){beginGuestGroup(m);return;}
    if(Array.isArray(m.participants))state.participants=m.participants.slice(0,MAX_PARTICIPANTS);if(typeof m.sharedEquipment==='boolean')state.sharedEquipment=m.sharedEquipment;state.sharedLoads=Object.assign({},m.sharedLoads||state.sharedLoads);state.extraSets=JSON.parse(JSON.stringify(m.extraSets||state.extraSets||{}));state.positions=JSON.parse(JSON.stringify(m.positions||state.positions||{}));syncCoreParticipants();(m.records||[]).forEach(mergeRecord);if(Array.isArray(m.done))net.done=m.done.map(Boolean);const pos=deriveGroupPosition();exIdx=pos.ex;setIdx=pos.set;net.done[net.localAthlete]=net.done[net.localAthlete]||pos.done;if(m.paused&&!paused)setPausedState(true);if(!m.paused&&paused)setPausedState(false);prefillWeight();updateView();renderLivePanel();refreshAll();
  }

  function wrapWifi(){
    if(state.wrapped||!window.TrenerWifi?.nativeMessage||!window.TrenerWifi?.nativeStatus)return false;state.wrapped=true;const originalMessage=window.TrenerWifi.nativeMessage.bind(window.TrenerWifi),originalStatus=window.TrenerWifi.nativeStatus.bind(window.TrenerWifi);
    window.TrenerWifi.nativeStatus=function(status,detail){
      originalStatus(status,detail);try{if(status==='connected'){state.settleUntil=Date.now()+450;if(net.role==='host'){ensureHostParticipant();syncCoreParticipants();if(window.TrenerDuoProfile&&state.participants.length>1)window.TrenerDuoProfile.partnerReady=true;sendGroupState();}else if(net.role==='guest'){setTimeout(sendOwnGroupProfile,100);setTimeout(sendOwnGroupProfile,420);}}}catch(e){}renderRoster();refreshAll();
    };
    window.TrenerWifi.nativeMessage=function(raw){
      let m=null;try{m=JSON.parse(raw);}catch(e){}if(!m||!m.type){originalMessage(raw);return;}
      try{
        if(m.type==='GROUP_PROFILE'){receiveGroupProfile(m);return;}if(m.type==='GROUP_STATE'){receiveGroupState(m);return;}if(m.type==='GROUP_SNAPSHOT'&&net.role==='guest'){applyGroupSnapshot(m);return;}if(m.type==='GROUP_REJECT'&&m.targetDeviceId===state.deviceId){const reason=m.reason||'Nie można dołączyć do sesji.';toast(reason);try{net.lastError=reason;net.detail=reason;net.status='error';if(typeof updateWifiUi==='function')updateWifiUi();setTimeout(()=>{if(typeof disconnectWifi==='function')disconnectWifi(true);},80);}catch(e){}return;}
        if(m.type==='GROUP_LOAD'&&(!m.sessionId||m.sessionId===net.sessionId)){state.sharedLoads[m.exId]=Number(m.kg)||0;if(net.role==='host'&&!m.relayed)send(Object.assign({},m,{relayed:true}));applySharedLoadToCurrent();refreshWorkoutUi();return;}
        if(m.type==='GROUP_EXTRA'&&(!m.sessionId||m.sessionId===net.sessionId)){if(!state.extraSets[m.deviceId])state.extraSets[m.deviceId]={};state.extraSets[m.deviceId][m.exId]=Math.max(0,Math.min(3,Number(m.extra)||0));if(net.role==='host'&&!m.relayed)send(Object.assign({},m,{relayed:true}));refreshWorkoutUi();renderLivePanel();return;}
        if(m.type==='GROUP_POSITION'&&m.sessionId===net.sessionId){state.positions[Number(m.athlete)||0]={ex:Number(m.ex)||0,set:Number(m.set)||0,done:!!m.done};if(net.role==='host'&&!m.relayed)send(Object.assign({},m,{relayed:true}));renderLivePanel();return;}
        if(m.type==='GROUP_RESYNC'&&net.role==='host'&&net.active&&m.sessionId===net.sessionId){(m.records||[]).forEach(mergeRecord);const a=Number(m.athlete)||1;net.done[a]=!!m.done;if(m.deviceId&&m.extraSets)state.extraSets[m.deviceId]=Object.assign({},m.extraSets);if(m.position)state.positions[a]=m.position;sendGroupSnapshot(m.deviceId||null);renderLivePanel();return;}
        if(state.groupSession&&net.active&&m.sessionId===net.sessionId&&m.type==='SET'&&m.record){mergeRecord(m.record);net.last[m.record.athlete]=m.record;if(net.role==='host'&&!m.relayed)send(Object.assign({},m,{relayed:true}));renderLivePanel();return;}
        if(state.groupSession&&net.active&&m.sessionId===net.sessionId&&m.type==='DONE'){(m.records||[]).forEach(mergeRecord);const a=Number(m.athlete)||0;net.done[a]=true;if(net.role==='host'&&!m.relayed)send(Object.assign({},m,{relayed:true}));if(net.role==='host'&&allParticipantsDone())setTimeout(()=>finishSharedForAll(false),300);renderLivePanel();return;}
        if(state.groupSession&&net.active&&m.sessionId===net.sessionId&&m.type==='LEAVE'){const a=Number(m.athlete)||1;net.done[a]=true;if(net.role==='host'&&!m.relayed)send(Object.assign({},m,{relayed:true}));if(net.role==='host'&&allParticipantsDone())setTimeout(()=>finishSharedForAll(false),300);renderLivePanel();return;}
      }catch(e){}
      originalMessage(raw);if(m.type==='PROFILE_STATE'||m.type==='PROFILE'){syncCoreParticipants();renderRoster();}
    };return true;
  }

  function captureSessionButtons(){
    document.addEventListener('click',ev=>{
      const host=ev.target&&ev.target.closest?ev.target.closest('#hostBtn'):null;if(host){resetForHost();return;}const join=ev.target&&ev.target.closest?ev.target.closest('#joinBtn'):null;if(join){resetForGuest();return;}const start=ev.target&&ev.target.closest?ev.target.closest('#startBtn'):null;if(!start)return;
      try{if(mode!==2)return;if(net.role!=='host'||!net.connected)return;if(Date.now()<state.settleUntil){ev.preventDefault();ev.stopImmediatePropagation();toast('Chwila — kończę pobieranie profili osób z telefonów.');return;}ensureHostParticipant();if(state.participants.length<2){ev.preventDefault();ev.stopImmediatePropagation();toast('Brak profilu partnera. Zaktualizuj drugi telefon do Trener 2 0.6.4 i połącz ponownie.');return;}ev.preventDefault();ev.stopImmediatePropagation();startGroupAsHost();}catch(e){console.error(e);}
    },true);
  }
  function startGroupAsHost(){
    saveSettings();planKey=$('planSelect').value;const p=getPlan(planKey);if(!p){toast('Najpierw zbuduj trening mieszany.');return;}currentPlan=JSON.parse(JSON.stringify(p));resetWorkoutState();ensureHostParticipant();state.groupSession=true;state.sharedEquipment=$('v064SharedEquipment')?.checked!==false;saveCfg();state.sharedLoads={};state.extraSets={};state.positions={};try{state.readiness=window.TrenerReadiness?.read?.()||null;}catch(e){state.readiness=null;}syncCoreParticipants();net.active=true;net.sessionId='g'+Date.now();net.localAthlete=0;state.assignedIndex=0;net.done=Array.from({length:Math.max(2,...state.participants.map(p=>Number(p.index)+1))},()=>false);net.last=Array.from({length:net.done.length},()=>null);athleteIdx=0;startedAt=Date.now();running=true;paused=false;state.positions[0]={ex:0,set:0,done:false};openTrainingUi();send({type:'GROUP_SNAPSHOT',active:true,sessionId:net.sessionId,planKey,plan:currentPlan,participants:sortedParticipants(),names:[...net.names],done:[...net.done],records:[],sharedEquipment:state.sharedEquipment,sharedLoads:{},extraSets:{},positions:state.positions,paused:false,elapsed:0});setTimeout(()=>sendGroupSnapshot(null),250);refreshAll();
  }

  function currentParticipant(){return participantById(state.deviceId)||participantByIndex(net.localAthlete)||{deviceId:state.deviceId,index:net.localAthlete,name:ownName()};}
  function ownExtraFor(ex){const p=currentParticipant();return Math.max(0,Math.min(3,Number(state.extraSets[p.deviceId]?.[ex.id]||0)));}
  function effectiveSets(ex){return Math.max(1,Number(ex.sets)||1)+ownExtraFor(ex);}
  function participantExtra(p,ex){return Math.max(0,Math.min(3,Number(state.extraSets[p.deviceId]?.[ex.id]||0)));}
  function totalSetsFor(p){return (currentPlan?.ex||[]).reduce((sum,ex)=>sum+Math.max(1,Number(ex.sets)||1)+participantExtra(p,ex),0);}
  function changeExtraSet(delta){
    if(!running||!state.groupSession||!currentPlan?.ex?.[exIdx]||net.done[net.localAthlete])return;const ex=currentPlan.ex[exIdx],p=currentParticipant();if(!state.extraSets[p.deviceId])state.extraSets[p.deviceId]={};const current=ownExtraFor(ex),minNeeded=Math.max(0,(setIdx+1)-Math.max(1,Number(ex.sets)||1)),next=Math.max(minNeeded,Math.min(3,current+delta));state.extraSets[p.deviceId][ex.id]=next;send({type:'GROUP_EXTRA',sessionId:net.sessionId,deviceId:p.deviceId,athlete:net.localAthlete,exId:ex.id,extra:next});updateView();renderLivePanel();refreshWorkoutUi();
  }
  function deriveGroupPosition(){
    const a=net.localAthlete;for(let e=0;e<(currentPlan?.ex||[]).length;e++){const ex=currentPlan.ex[e],total=Math.max(1,Number(ex.sets)||1)+ownExtraFor(ex);for(let s=0;s<total;s++)if(!records.some(r=>Number(r.athlete)===Number(a)&&Number(r.ex)===e&&Number(r.set)===s))return {ex:e,set:s,done:false};}return {ex:Math.max(0,(currentPlan?.ex?.length||1)-1),set:0,done:true};
  }
  function readinessNow(){if(state.readiness)return state.readiness;try{return window.TrenerReadiness?.read?.()||null;}catch(e){return null;}}
  function localReferenceWeight(ex){try{for(const h of getHistory()){const a=h.localAthlete??0,rr=(h.records||[]).filter(r=>(r.id===ex.id||r.name===ex.n)&&Number(r.athlete||0)===Number(a)&&Number(r.kg)>0);if(rr.length)return Number(rr[0].kg)||0;}}catch(e){}return 0;}
  function personalTarget(ex,kg){
    const min=Number(ex.min)||1,max=Number(ex.max)||min;if(ex.time)return {min,max,note:'Cel czasu pozostaje indywidualny.'};const ref=localReferenceWeight(ex);if(!state.sharedEquipment||!kg||!ref)return {min,max,note:ref?'Osobny ciężar — rekomendacja tylko z Twojej historii.':'Brak historii ciężaru — zacznij od bazowego zakresu.'};const ratio=kg/ref;let add=0,note='Wspólny ciężar jest blisko Twojego ostatniego obciążenia.';
    if(ratio<0.72){add=4;note='Wspólny ciężar jest dużo lżejszy od Twojego ostatniego. Nie dokładam więcej niż 4 powtórzenia — przy większej różnicy lepiej zmienić ciężar dla Ciebie.';}else if(ratio<0.88){add=4;note='Lżej niż zwykle: zamiast przekładać talerze możesz zrobić około 4 powtórzenia więcej.';}else if(ratio<0.96){add=2;note='Trochę lżej niż zwykle: około 2 powtórzenia więcej.';}else if(ratio>1.18){add=-2;note='Wspólny ciężar jest wyraźnie cięższy niż Twój ostatni. Zmniejszam cel, ale bezpieczniej będzie zmienić ciężar, jeśli technika lub RIR spada.';}else if(ratio>1.08){add=-1;note='Trochę ciężej niż zwykle: mniejszy cel powtórzeń.';}
    const r=readinessNow();if(r&&Number(r.score)<2.8&&add>0){add=Math.max(0,add-1);note+=' Słabsza gotowość: nie dokładam pełnej liczby powtórzeń.';}return {min:Math.max(4,min+add),max:Math.max(5,max+add),note,ref};
  }
  function syncSharedLoadFromInput(){try{if(!running||!state.groupSession||!state.sharedEquipment||!currentPlan?.ex?.[exIdx])return;const kg=Number(String($('weight')?.value||'').replace(',','.'));if(!Number.isFinite(kg)||kg<=0)return;const ex=currentPlan.ex[exIdx];state.sharedLoads[ex.id]=kg;send({type:'GROUP_LOAD',sessionId:net.sessionId,exId:ex.id,kg,athlete:net.localAthlete});refreshWorkoutUi();}catch(e){}}
  function applySharedLoadToCurrent(){if(!running||!state.groupSession||!state.sharedEquipment||!currentPlan?.ex?.[exIdx])return;const kg=Number(state.sharedLoads[currentPlan.ex[exIdx].id]||0);if(kg>0&&$('weight'))$('weight').value=kg;}

  function groupCompleteNetworkSet(){
    if(!state.groupSession)return state.baseCompleteNetworkSet?.();const ex=currentPlan.ex[exIdx],reps=readReps();if(reps===null)return;let kg=readKg();if(state.sharedEquipment&&kg>0){state.sharedLoads[ex.id]=kg;send({type:'GROUP_LOAD',sessionId:net.sessionId,exId:ex.id,kg,athlete:net.localAthlete});}if(state.sharedEquipment&&state.sharedLoads[ex.id])kg=Number(state.sharedLoads[ex.id]);const athlete=net.localAthlete,finishedExIdx=exIdx,finishedSetIdx=setIdx,rec=makeRecord(ex,finishedExIdx,finishedSetIdx,athlete,kg,reps);rec.uid=net.sessionId+':'+athlete+':'+finishedExIdx+':'+finishedSetIdx;mergeRecord(rec);net.last[athlete]=rec;$('reps').value='';send({type:'SET',group:true,sessionId:net.sessionId,record:rec});lastCompletedExercise=finishedExIdx;
    const total=effectiveSets(ex);setIdx++;let exerciseChanged=false,finished=false;if(setIdx>=total){setIdx=0;exIdx++;exerciseChanged=true;if(exIdx>=currentPlan.ex.length)finished=true;}state.positions[athlete]={ex:finished?Math.max(0,currentPlan.ex.length-1):exIdx,set:setIdx,done:finished};send({type:'GROUP_POSITION',sessionId:net.sessionId,athlete,ex:state.positions[athlete].ex,set:state.positions[athlete].set,done:finished});
    if(finished){net.done[athlete]=true;send({type:'DONE',group:true,sessionId:net.sessionId,athlete,records:records.filter(r=>r.athlete===athlete)});$('restTime').textContent='TWÓJ TRENING GOTOWY — INNI MOGĄ ĆWICZYĆ DALEJ';$('saveSetBtn').disabled=true;$('skipRestBtn').classList.add('hidden');$('coach').textContent='Twoje serie są zapisane. Możesz obserwować postęp pozostałych osób.';renderLivePanel();updateView();if(net.role==='host'&&allParticipantsDone())setTimeout(()=>finishSharedForAll(false),300);return;}
    if(exerciseChanged)$('coach').innerHTML=exerciseAdvice(finishedExIdx);prefillWeight();updateView();renderLivePanel();let wait=exerciseChanged?90000:ex.rest*1000;const ready=readinessNow();if(ready&&Number(ready.restExtra)>0)wait+=Number(ready.restExtra)*1000;if(wait>1000)startRest(wait);
  }
  function allParticipantsDone(){return state.participants.length>0&&state.participants.every(p=>!!net.done[Number(p.index)]);}

  function wrapCore(){
    if(!state.baseCompleteNetworkSet&&typeof completeNetworkSet==='function'){state.baseCompleteNetworkSet=completeNetworkSet;completeNetworkSet=groupCompleteNetworkSet;}
    if(!state.baseRender&&typeof renderLivePanel==='function'){state.baseRender=renderLivePanel;renderLivePanel=function(){if(state.groupSession&&net.active)return renderGroupLivePanel();return state.baseRender.apply(this,arguments);};}
    if(!state.baseUpdateView&&typeof updateView==='function'){state.baseUpdateView=updateView;updateView=function(){const out=state.baseUpdateView.apply(this,arguments);if(state.groupSession&&running)refreshWorkoutUi();return out;};}
    if(!state.basePrefill&&typeof prefillWeight==='function'){state.basePrefill=prefillWeight;prefillWeight=function(){const out=state.basePrefill.apply(this,arguments);if(state.groupSession&&running){if(state.sharedEquipment){const ex=currentPlan?.ex?.[exIdx],known=ex?Number(state.sharedLoads[ex.id]||0):0;if(known>0&&$('weight'))$('weight').value=known;else if(net.role==='host'&&ex){const kg=Number($('weight')?.value||0);if(kg>0){state.sharedLoads[ex.id]=kg;send({type:'GROUP_LOAD',sessionId:net.sessionId,exId:ex.id,kg,athlete:net.localAthlete});}}}refreshWorkoutUi();}return out;};}
    if(!state.baseSaveHistory&&typeof saveHistory==='function'){state.baseSaveHistory=saveHistory;saveHistory=function(){const out=state.baseSaveHistory.apply(this,arguments);try{if(state.groupSession){const h=getHistory();if(h[0]){h[0].group={participants:sortedParticipants(),sharedEquipment:state.sharedEquipment,sharedLoads:{...state.sharedLoads},extraSets:JSON.parse(JSON.stringify(state.extraSets)),deviceId:state.deviceId,readiness:readinessNow()};localStorage.setItem('trainer3.history',JSON.stringify(h.slice(0,100)));}}}catch(e){}return out;};}
  }
  function renderGroupLivePanel(){
    const live=$('wifiLive');if(!live)return;live.classList.remove('hidden');const list=sortedParticipants();live.innerHTML=`<div class="wifiLiveHead"><b>WSPÓLNA SESJA 2+</b><span>${net.connected?'Wi‑Fi: połączono':'Wi‑Fi: offline'}</span></div><div class="v064PersonGrid">${list.map(p=>{const a=Number(p.index),own=records.filter(r=>Number(r.athlete)===a),total=totalSetsFor(p),pos=state.positions[a],ex=pos&&!pos.done?currentPlan?.ex?.[Number(pos.ex)]:null,now=net.done[a]?'GOTOWY':(ex?`${esc(ex.n)} • seria ${Number(pos.set)+1}/${Math.max(1,Number(ex.sets)||1)+participantExtra(p,ex)}`:(own.length?'w trakcie':'start'));return `<div class="v064Person ${net.done[a]?'done':''}"><strong>${esc(p.name||('Osoba '+(a+1)))}</strong><span>${own.length}/${total} serii</span><span class="now">${now}</span></div>`;}).join('')}</div>`;
  }
  function refreshWorkoutUi(){
    const box=$('v064Workout');if(!box)return;const active=!!(state.groupSession&&running&&net.active);box.classList.toggle('hidden',!active);document.documentElement.classList.toggle('v064SharedMode',active&&state.sharedEquipment);if(!active)return;
    if(net.done[net.localAthlete]){$('v064Target').textContent='Twój trening zakończony';$('v064Note').textContent='Pozostałe osoby mogą nadal wykonywać własne serie i ćwiczenia.';$('v064Shared').textContent='';return;}
    const ex=currentPlan?.ex?.[exIdx];if(!ex)return;const kg=Number(state.sharedLoads[ex.id]||$('weight')?.value||0),t=personalTarget(ex,kg);$('v064Target').innerHTML=`Twoja rekomendacja: <em>${t.min}${t.min===t.max?'':'–'+t.max} ${ex.time?'sek.':'powt.'}</em>`;$('v064Note').textContent=t.note||'';$('v064Shared').textContent=state.sharedEquipment?(kg>0?`Wspólny sprzęt • ${kg.toLocaleString('pl-PL',{maximumFractionDigits:2})} kg dla tego ćwiczenia`:'Wspólny sprzęt • ustaw ciężar dla tego ćwiczenia'):'Osobny sprzęt • każdy wpisuje własny ciężar';const total=effectiveSets(ex),extra=ownExtraFor(ex);$('v064SetInfo').textContent=`Twoje serie: ${setIdx+1}/${total}${extra?' • +'+extra+' dodatk.':''}`;const base=Math.max(1,Number(ex.sets)||1),minNeeded=Math.max(0,(setIdx+1)-base);$('v064MinusSet').disabled=extra<=minNeeded;$('v064PlusSet').disabled=extra>=3;if($('series'))$('series').textContent='Seria '+(setIdx+1)+'/'+total+' • '+athleteName(net.localAthlete);if($('target'))$('target').textContent=ex.time?`Cel: ${t.min}${t.min===t.max?'':'–'+t.max} sekund`:`Cel dla Ciebie: ${t.min}${t.min===t.max?'':'–'+t.max} powtórzeń`;
  }
  function refreshAll(){installUi();renderRoster();if(state.groupSession&&net.active){syncCoreParticipants();refreshWorkoutUi();renderLivePanel();}}
  function boot(){
    installUi();wrapCore();wrapWifi();captureSessionButtons();const n=$('nameA');if(n)n.addEventListener('change',()=>{const p=participantById(state.deviceId);if(p){p.name=ownName();syncCoreParticipants();if(net.role==='guest')sendOwnGroupProfile();else if(net.role==='host')sendGroupState();}renderRoster();});setInterval(()=>{installUi();wrapCore();wrapWifi();refreshAll();},700);refreshAll();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
