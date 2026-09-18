(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const state={
    booted:false,
    wrappedMessage:false,
    requests:[],
    activeRequest:null,
    pendingRequestId:'',
    pendingSince:0,
    acceptedTimer:0,
    timer:0
  };

  function log(event,data,important){
    try{window.TrenerSharedBlackbox0825?.log?.(event,data||{},!!important);}catch(e){}
  }
  function group(){try{return window.TrenerGroup||null;}catch(e){return null}}
  function role(){try{return String(net?.role||'')}catch(e){return ''}}
  function shared(){try{return !!(running&&net?.active&&net?.sessionId)}catch(e){return false}}
  function ownAthlete(){try{return Number(net?.localAthlete)||0}catch(e){return 0}}
  function ownDeviceId(){
    try{return String(group()?.deviceId||localStorage.getItem('trainer3.participantId')||'')}catch(e){return ''}
  }
  function participants(){
    try{
      const p=group()?.participants;
      if(Array.isArray(p)&&p.length)return p;
      return (net?.names||[]).map((name,index)=>({index,name,deviceId:''}));
    }catch(e){return []}
  }
  function ownName(){
    const a=ownAthlete(),id=ownDeviceId();
    const p=participants().find(x=>(id&&String(x?.deviceId||'')===id)||Number(x?.index)===a);
    try{return String(p?.name||net?.names?.[a]||$('nameA')?.value||('Osoba '+(a+1))).trim()||('Osoba '+(a+1))}catch(e){return 'Osoba '+(a+1)}
  }
  function requestId(){return 'fr-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
  function session(){try{return String(net?.sessionId||'')}catch(e){return ''}}

  function installCss(){
    if($('v0829Style'))return;
    const s=document.createElement('style');s.id='v0829Style';s.textContent=`
      #v0829HostFinishModal{position:fixed;inset:0;z-index:70000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.84)}
      #v0829HostFinishModal.hidden{display:none!important}
      .v0829Dialog{width:min(460px,100%);border:1px solid #74383b;border-radius:18px;background:#111;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.75)}
      .v0829Dialog .eyebrow{color:#ff686b;font-weight:950;letter-spacing:.08em;font-size:10px}
      .v0829Dialog h3{margin:8px 0 7px;font-size:22px;line-height:1.25}
      .v0829Dialog p{margin:0;color:#aaa;font-size:12px;line-height:1.5}
      .v0829Actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:17px}
      .v0829Actions button{min-height:52px;margin:0!important;font-weight:950}
      #v0829LeaveBtn{display:none}
      #v0829LeaveBtn.show{display:block}
      @media(max-width:430px){.v0829Actions{grid-template-columns:1fr}.v0829Dialog h3{font-size:19px}}
    `;document.head.appendChild(s);
  }

  function installUi(){
    installCss();
    if(!$('v0829HostFinishModal')){
      const d=document.createElement('div');d.id='v0829HostFinishModal';d.className='hidden';
      d.innerHTML='<div class="v0829Dialog"><div class="eyebrow">PROŚBA O ZAKOŃCZENIE</div><h3 id="v0829FinishTitle">Partner chce zakończyć wspólny trening.</h3><p>To HOST decyduje, czy zakończyć sesję wszystkim.</p><div class="v0829Actions"><button id="v0829RejectFinish" class="secondary" type="button">ODRZUĆ</button><button id="v0829AcceptFinish" class="danger" type="button">ZAKOŃCZ DLA WSZYSTKICH</button></div></div>';
      document.body.appendChild(d);
      $('v0829RejectFinish').addEventListener('click',()=>respondToActive(false));
      $('v0829AcceptFinish').addEventListener('click',()=>respondToActive(true));
    }
    if(!$('v0829LeaveBtn')){
      const b=document.createElement('button');b.id='v0829LeaveBtn';b.type='button';b.className='secondary';b.textContent='OPUŚĆ WSPÓLNY TRENING';
      const controls=$('training')?.querySelector('.controls');
      if(controls)controls.appendChild(b);
      else $('training')?.appendChild(b);
      b.addEventListener('click',leaveShared);
    }
  }

  function paint(){
    installUi();
    const guest=shared()&&role()==='guest';
    const leave=$('v0829LeaveBtn');
    if(leave)leave.classList.toggle('show',guest);
    const exit=$('v074ExitBtn');
    if(exit&&guest)exit.style.display='none';
    else if(exit)exit.style.display='';
    if(!shared()||role()!=='host'){
      const modal=$('v0829HostFinishModal');
      if(modal&&!state.activeRequest)modal.classList.add('hidden');
    }
  }

  function requestFinish(){
    if(!shared()||role()!=='guest')return false;
    if(!net?.connected){
      try{toast('Brak połączenia z HOSTEM. Nie mogę zakończyć treningu wszystkim — możesz użyć OPUŚĆ WSPÓLNY TRENING.')}catch(e){}
      log('FINISH_REQUEST_BLOCKED_OFFLINE',{sessionId:session()},true);
      return true;
    }
    if(state.pendingRequestId&&Date.now()-state.pendingSince<15000){
      try{toast('Prośba jest już u HOSTA — czekam na decyzję.')}catch(e){}
      return true;
    }
    if(!confirm('Wysłać prośbę do HOSTA o zakończenie wspólnego treningu?'))return true;

    const id=requestId();
    const msg={
      type:'V0829_FINISH_REQUEST',
      sessionId:session(),
      requestId:id,
      deviceId:ownDeviceId(),
      athlete:ownAthlete(),
      name:ownName(),
      at:Date.now()
    };
    const ok=!!wifiSend(msg);
    if(!ok){
      try{toast('Nie udało się wysłać prośby do HOSTA — sprawdź połączenie.')}catch(e){}
      log('FINISH_REQUEST_SEND_FAILED',msg,true);
      return true;
    }
    state.pendingRequestId=id;
    state.pendingSince=Date.now();
    try{toast('Prośba wysłana do HOSTA — czekam na decyzję.')}catch(e){}
    log('FINISH_REQUEST_SENT',msg,true);
    return true;
  }

  function enqueueRequest(m){
    if(role()!=='host'||!shared()||String(m.sessionId||'')!==session())return;
    if(!m.requestId)return;
    if(state.activeRequest?.requestId===m.requestId||state.requests.some(x=>x.requestId===m.requestId))return;
    const req={
      requestId:String(m.requestId),
      sessionId:String(m.sessionId),
      deviceId:String(m.deviceId||''),
      athlete:Number(m.athlete)||0,
      name:String(m.name||('Osoba '+((Number(m.athlete)||0)+1))),
      at:Number(m.at)||Date.now()
    };
    state.requests.push(req);
    log('FINISH_REQUEST_RECEIVED',req,true);
    showNextRequest();
  }

  function showNextRequest(){
    if(role()!=='host'||!shared()||state.activeRequest)return;
    const req=state.requests.shift();
    if(!req)return;
    state.activeRequest=req;
    installUi();
    $('v0829FinishTitle').textContent=req.name+' chce zakończyć wspólny trening.';
    $('v0829HostFinishModal').classList.remove('hidden');
    try{vibrate(180)}catch(e){}
  }

  function sendDecision(req,accepted){
    const msg={
      type:'V0829_FINISH_DECISION',
      sessionId:req.sessionId,
      requestId:req.requestId,
      targetDeviceId:req.deviceId,
      athlete:req.athlete,
      accepted:!!accepted,
      at:Date.now()
    };
    wifiSend(msg);
    log('FINISH_REQUEST_DECISION',{
      requestId:req.requestId,
      targetDeviceId:req.deviceId,
      athlete:req.athlete,
      name:req.name,
      accepted:!!accepted
    },true);
  }

  function respondToActive(accepted){
    if(role()!=='host'||!state.activeRequest)return;
    const req=state.activeRequest;
    state.activeRequest=null;
    $('v0829HostFinishModal')?.classList.add('hidden');
    sendDecision(req,accepted);
    if(accepted){
      try{toast('Kończę wspólny trening dla wszystkich.')}catch(e){}
      setTimeout(()=>{
        if(shared()&&role()==='host'){
          try{finishSharedForAll(true)}catch(e){
            log('HOST_FINISH_AFTER_APPROVAL_ERROR',{message:String(e?.message||e)},true);
          }
        }
      },180);
      return;
    }
    try{toast('Prośba '+req.name+' odrzucona — ćwiczymy dalej 😄')}catch(e){}
    setTimeout(showNextRequest,50);
  }

  function receiveDecision(m){
    if(role()!=='guest'||String(m.sessionId||'')!==session())return;
    const target=String(m.targetDeviceId||'');
    if(target&&target!==ownDeviceId())return;
    if(state.pendingRequestId&&String(m.requestId||'')!==state.pendingRequestId)return;
    state.pendingRequestId='';
    state.pendingSince=0;
    if(!m.accepted){
      try{toast('HOST odrzucił prośbę — ćwiczymy dalej 😄')}catch(e){}
      log('FINISH_REQUEST_REJECTED',{requestId:String(m.requestId||'')},true);
      return;
    }
    try{toast('HOST zaakceptował — kończę wspólny trening.')}catch(e){}
    log('FINISH_REQUEST_ACCEPTED',{requestId:String(m.requestId||'')},true);
    clearTimeout(state.acceptedTimer);
    const sid=session();
    state.acceptedTimer=setTimeout(()=>{
      state.acceptedTimer=0;
      if(shared()&&role()==='guest'&&session()===sid){
        log('HOST_FINISH_MESSAGE_MISSING_FALLBACK',{sessionId:sid},true);
        try{finishWorkout(true,true)}catch(e){}
      }
    },2500);
  }

  function leaveShared(){
    if(!shared()||role()!=='guest')return;
    if(!confirm('Opuścić wspólny trening? Twoje wykonane serie zostaną zapisane tylko na tym telefonie. Trening HOSTA i pozostałych osób będzie trwał dalej.'))return;
    const a=ownAthlete();
    const mine=(()=>{try{return (records||[]).filter(r=>Number(r.athlete)===a)}catch(e){return []}})();
    const msg={
      type:'LEAVE',
      sessionId:session(),
      athlete:a,
      deviceId:ownDeviceId(),
      name:ownName(),
      records:mine,
      interrupted:true,
      reason:'guest-left'
    };
    try{window.TrenerSyncHistory?.checkpoint?.()}catch(e){}
    try{wifiSend(msg)}catch(e){}
    log('GUEST_LEFT_SHARED_WORKOUT',{
      sessionId:msg.sessionId,
      athlete:a,
      deviceId:msg.deviceId,
      name:msg.name
    },true);
    state.pendingRequestId='';
    state.pendingSince=0;
    try{if(window.TrenerBeta070){window.TrenerBeta070.active=false;window.TrenerBeta070.pending=null}}catch(e){}
    try{finishWorkout(true,true)}catch(e){}
  }

  function handleMessage(m){
    if(!m||!m.type)return false;
    if(m.type==='V0829_FINISH_REQUEST'){
      log('RX_V0829_FINISH_REQUEST',{
        sessionId:String(m.sessionId||''),
        requestId:String(m.requestId||''),
        deviceId:String(m.deviceId||''),
        athlete:Number(m.athlete)||0,
        name:String(m.name||'')
      },true);
      enqueueRequest(m);
      return true;
    }
    if(m.type==='V0829_FINISH_DECISION'){
      log('RX_V0829_FINISH_DECISION',{
        sessionId:String(m.sessionId||''),
        requestId:String(m.requestId||''),
        targetDeviceId:String(m.targetDeviceId||''),
        accepted:!!m.accepted
      },true);
      receiveDecision(m);
      return true;
    }
    return false;
  }

  function wrapMessage(){
    if(state.wrappedMessage||!window.TrenerWifi?.nativeMessage)return false;
    const base=window.TrenerWifi.nativeMessage.bind(window.TrenerWifi);
    window.TrenerWifi.nativeMessage=function(raw){
      let m=null;try{m=JSON.parse(String(raw||''))}catch(e){}
      if(handleMessage(m))return;
      return base(raw);
    };
    state.wrappedMessage=true;
    return true;
  }

  function maintain(){
    installUi();
    wrapMessage();
    paint();
    if(state.pendingRequestId&&Date.now()-state.pendingSince>15000){
      log('FINISH_REQUEST_TIMEOUT',{requestId:state.pendingRequestId,sessionId:session()},true);
      state.pendingRequestId='';
      state.pendingSince=0;
      try{toast('HOST nie odpowiedział na prośbę. Możesz wysłać ją ponownie albo opuścić trening.')}catch(e){}
    }
    if(role()==='host'&&shared())showNextRequest();
    if(!shared()){
      state.requests=[];
      state.activeRequest=null;
      state.pendingRequestId='';
      state.pendingSince=0;
      $('v0829HostFinishModal')?.classList.add('hidden');
    }
  }

  function boot(){
    if(state.booted)return;
    state.booted=true;
    installUi();
    wrapMessage();
    state.timer=setInterval(maintain,500);
    maintain();
  }

  window.TrenerHostAuthority0829={
    requestFinish,
    leaveShared,
    status:()=>({
      pendingRequestId:state.pendingRequestId,
      hostRequest:state.activeRequest?{...state.activeRequest}:null,
      queuedRequests:state.requests.length
    })
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
