(function(){
  'use strict';

  const MODULE='0.8.3';
  const PROTOCOL_VERSION=2;
  const KEY='trainer3.sharedControl.v083';
  const $=id=>document.getElementById(id);
  const clone=(v,f=null)=>{try{return JSON.parse(JSON.stringify(v));}catch(e){return f;}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function group(){try{return window.TrenerGroup||null;}catch(e){return null;}}
  function queue(){try{return window.TrenerBeta070||null;}catch(e){return null;}}
  function localDeviceId(){try{return String(group()?.deviceId||'');}catch(e){return '';}}
  function participants(){try{return [...(group()?.participants||[])].sort((a,b)=>Number(a.index)-Number(b.index));}catch(e){return [];}}
  function participantById(id){return participants().find(p=>String(p.deviceId||'')===String(id||''))||null;}
  function participantByAthlete(a){return participants().find(p=>Number(p.index)===Number(a))||null;}
  function protocolOf(p){const n=Number(p?.protocolVersion);return Number.isFinite(n)&&n>0?n:1;}
  function supportsSingle(p){return !!p&&protocolOf(p)>=PROTOCOL_VERSION&&p?.capabilities?.singleController!==false;}
  function ownName(){return participantById(localDeviceId())?.name||'Ten telefon';}
  function toastMsg(msg){try{if(typeof toast==='function')toast(msg);}catch(e){}}
  function log(event,data){try{window.TrenerSharedBlackbox0825?.log?.(event,Object.assign({module:MODULE},data||{}),true);}catch(e){}}

  function loadCfg(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'null')||{};
      return {
        mode:raw.mode==='single-controller'?'single-controller':'per-device',
        controllerDeviceId:String(raw.controllerDeviceId||'')
      };
    }catch(e){return {mode:'per-device',controllerDeviceId:''};}
  }
  function saveCfg(){
    try{localStorage.setItem(KEY,JSON.stringify({mode:state.mode,controllerDeviceId:state.controllerDeviceId}));}catch(e){}
  }

  const cfg=loadCfg();
  const state={
    protocolVersion:PROTOCOL_VERSION,
    mode:cfg.mode,
    controllerDeviceId:cfg.controllerDeviceId,
    rev:0,
    pending:null,
    wrapped:false,
    booted:false,
    lastSessionId:'',
    lastBroadcastAt:0,
    lastTurnKey:'',
    ownedInputs:false
  };

  function allSupportSingle(){
    const list=participants();
    return list.length>0&&list.every(supportsSingle);
  }
  function hostParticipant(){return participants().find(p=>Number(p.index)===0)||participants()[0]||null;}
  function controllerParticipant(){return participantById(state.controllerDeviceId);}
  function ensureController(){
    let p=controllerParticipant();
    if(p&&supportsSingle(p))return p;
    const host=hostParticipant();
    if(host&&supportsSingle(host)){state.controllerDeviceId=String(host.deviceId||'');saveCfg();return host;}
    const first=participants().find(supportsSingle)||null;
    state.controllerDeviceId=String(first?.deviceId||'');
    saveCfg();
    return first;
  }
  function activeShared(){try{return !!(running&&net?.active&&group()?.groupSession&&queue()?.active);}catch(e){return false;}}
  function isSingleController(){return state.mode==='single-controller'&&activeShared();}
  function isLocalController(){return isSingleController()&&String(state.controllerDeviceId||'')===localDeviceId();}
  function canTransfer(){return isSingleController()&&(net?.role==='host'||isLocalController());}

  function statePayload(){
    return {
      type:'V083_CONTROL_STATE',
      sessionId:String(net?.sessionId||''),
      mode:state.mode,
      controllerDeviceId:String(state.controllerDeviceId||''),
      rev:Number(state.rev)||0,
      protocolVersion:PROTOCOL_VERSION
    };
  }
  function broadcast(force=false){
    if(net?.role!=='host'||!net?.connected)return false;
    if(!force&&Date.now()-state.lastBroadcastAt<2200)return false;
    state.lastBroadcastAt=Date.now();
    try{return !!wifiSend(statePayload());}catch(e){return false;}
  }
  function applyRemoteState(m){
    if(net?.role!=='guest')return;
    if(m.sessionId&&net?.sessionId&&String(m.sessionId)!==String(net.sessionId))return;
    const rev=Number(m.rev)||0;
    if(rev<state.rev)return;
    state.rev=rev;
    state.mode=m.mode==='single-controller'?'single-controller':'per-device';
    state.controllerDeviceId=String(m.controllerDeviceId||'');
    saveCfg();
    render();
  }
  function setModeHost(mode){
    if(net?.role!=='host')return false;
    const next=mode==='single-controller'?'single-controller':'per-device';
    if(next==='single-controller'&&!allSupportSingle()){
      state.mode='per-device';
      saveCfg();
      toastMsg('JEDEN TELEFON wymaga protokołu 2 na wszystkich telefonach. Starszy telefon może używać trybu KAŻDY NA SWOIM.');
      render();
      return false;
    }
    state.mode=next;
    if(next==='single-controller')ensureController();
    state.rev++;
    saveCfg();
    broadcast(true);
    log('V083_MODE_CHANGED',{mode:state.mode,controllerDeviceId:state.controllerDeviceId});
    render();
    return true;
  }
  function applyControllerHost(targetId,source){
    if(net?.role!=='host')return {ok:false,reason:'Tylko HOST zatwierdza zmianę sterowania'};
    if(state.mode!=='single-controller')return {ok:false,reason:'Tryb JEDEN TELEFON nie jest aktywny'};
    const p=participantById(targetId);
    if(!p)return {ok:false,reason:'Nie znaleziono telefonu uczestnika'};
    if(!supportsSingle(p))return {ok:false,reason:'Ten telefon nie obsługuje sterowania jednym telefonem'};
    state.controllerDeviceId=String(p.deviceId||'');
    state.rev++;
    state.pending=null;
    saveCfg();
    broadcast(true);
    log('V083_CONTROLLER_CHANGED',{controllerDeviceId:state.controllerDeviceId,name:p.name||'',source:String(source||'host')});
    render();
    return {ok:true};
  }
  function requestTransfer(targetId){
    const p=participantById(targetId);
    if(!p||!supportsSingle(p)){toastMsg('Ten telefon nie może przejąć sterowania.');return;}
    if(net?.role==='host'){
      const r=applyControllerHost(targetId,'host-ui');
      if(r.ok)toastMsg('Sterowanie: '+(p.name||'uczestnik')+'.');
      else toastMsg(r.reason);
      return;
    }
    if(!isLocalController()){toastMsg('Sterowanie może przekazać HOST albo aktualny kontroler.');return;}
    const ok=wifiSend({
      type:'V083_CONTROL_TRANSFER_REQUEST',
      sessionId:String(net?.sessionId||''),
      deviceId:localDeviceId(),
      targetDeviceId:String(targetId||''),
      at:Date.now()
    });
    toastMsg(ok?'Wysyłam zmianę sterowania do HOSTA…':'Nie udało się wysłać zmiany sterowania.');
  }

  function handleControlledSetHost(m){
    const q=queue();
    if(net?.role!=='host'||state.mode!=='single-controller'||!q?.active)return {ok:false,reason:'Sterowanie jednym telefonem nie jest aktywne'};
    if(String(m.sessionId||'')!==String(net?.sessionId||''))return {ok:false,reason:'Inna sesja'};
    if(String(m.deviceId||'')!==String(state.controllerDeviceId||''))return {ok:false,reason:'Ten telefon nie ma sterowania'};
    const athlete=Number(m.athlete)||0;
    if(athlete!==Number(q.turn))return {ok:false,reason:'Zmieniła się kolej ćwiczącej osoby'};
    const p=participantByAthlete(athlete);
    if(!p)return {ok:false,reason:'Nie znaleziono uczestnika'};
    return q.submitControlledRecord?.(athlete,m.kg,m.reps,String(p.deviceId||''))||{ok:false,reason:'Brak API kolejki'};
  }
  function handleControlledSkipHost(m){
    const q=queue();
    if(net?.role!=='host'||state.mode!=='single-controller'||!q?.active)return {ok:false,reason:'Sterowanie jednym telefonem nie jest aktywne'};
    if(String(m.sessionId||'')!==String(net?.sessionId||''))return {ok:false,reason:'Inna sesja'};
    if(String(m.deviceId||'')!==String(state.controllerDeviceId||''))return {ok:false,reason:'Ten telefon nie ma sterowania'};
    const athlete=Number(m.athlete)||0;
    if(athlete!==Number(q.turn))return {ok:false,reason:'Zmieniła się kolej ćwiczącej osoby'};
    return q.skipControlledRest?.(athlete)||{ok:false,reason:'Brak API przerwy'};
  }

  function wrapWifi(){
    const api=window.TrenerWifi;
    if(!api||typeof api.nativeMessage!=='function')return false;
    if(api.nativeMessage.__v083Controller)return true;
    const base=api.nativeMessage.bind(api);
    const wrapped=function(raw){
      let m=null;try{m=JSON.parse(String(raw||''));}catch(e){}
      if(!m||!m.type)return base(raw);
      try{
        if(m.type==='V083_CONTROL_STATE'){applyRemoteState(m);return;}
        if(m.type==='V083_CONTROL_TRANSFER_REQUEST'&&net?.role==='host'){
          const allowed=String(m.deviceId||'')===String(state.controllerDeviceId||'');
          const result=allowed?applyControllerHost(m.targetDeviceId,'controller-request'):{ok:false,reason:'Tylko aktualny kontroler może przekazać sterowanie'};
          wifiSend({type:result.ok?'V083_CONTROL_TRANSFER_ACK':'V083_CONTROL_TRANSFER_NACK',sessionId:String(net?.sessionId||''),targetDeviceId:String(m.deviceId||''),reason:result.reason||'',controllerDeviceId:state.controllerDeviceId});
          return;
        }
        if((m.type==='V083_CONTROL_TRANSFER_ACK'||m.type==='V083_CONTROL_TRANSFER_NACK')&&String(m.targetDeviceId||'')===localDeviceId()){
          if(m.type==='V083_CONTROL_TRANSFER_NACK')toastMsg(m.reason||'HOST odrzucił zmianę sterowania.');
          return;
        }
        if(m.type==='V083_CONTROLLED_SET_REQUEST'&&net?.role==='host'){
          const result=handleControlledSetHost(m);
          wifiSend({type:result.ok?'V083_CONTROLLED_SET_ACK':'V083_CONTROLLED_SET_NACK',sessionId:String(net?.sessionId||''),targetDeviceId:String(m.deviceId||''),requestId:String(m.requestId||''),reason:result.reason||'',record:result.record||null});
          return;
        }
        if((m.type==='V083_CONTROLLED_SET_ACK'||m.type==='V083_CONTROLLED_SET_NACK')&&String(m.targetDeviceId||'')===localDeviceId()){
          if(state.pending&&String(m.requestId||'')===String(state.pending.requestId||'')){
            if(m.type==='V083_CONTROLLED_SET_ACK'){
              state.pending=null;
              if($('reps'))$('reps').value='';
              toastMsg('Seria zapisana.');
            }else{
              state.pending=null;
              toastMsg(m.reason||'HOST odrzucił serię.');
            }
            render();
          }
          return;
        }
        if(m.type==='V083_CONTROLLED_SKIP_REQUEST'&&net?.role==='host'){
          const result=handleControlledSkipHost(m);
          wifiSend({type:result.ok?'V083_CONTROLLED_SKIP_ACK':'V083_CONTROLLED_SKIP_NACK',sessionId:String(net?.sessionId||''),targetDeviceId:String(m.deviceId||''),requestId:String(m.requestId||''),reason:result.reason||''});
          return;
        }
        if((m.type==='V083_CONTROLLED_SKIP_ACK'||m.type==='V083_CONTROLLED_SKIP_NACK')&&String(m.targetDeviceId||'')===localDeviceId()){
          toastMsg(m.type==='V083_CONTROLLED_SKIP_ACK'?'Przerwa pominięta.':(m.reason||'Nie można pominąć przerwy.'));
          return;
        }
      }catch(e){log('V083_MESSAGE_ERROR',{message:String(e?.message||e),type:m.type});}
      return base(raw);
    };
    wrapped.__v083Controller=true;
    wrapped.__v083Base=base;
    api.nativeMessage=wrapped;
    state.wrapped=true;
    return true;
  }

  function controllerOptions(){
    return participants().map(p=>`<option value="${esc(p.deviceId||'')}" ${supportsSingle(p)?'':'disabled'}>${esc(p.name||('Osoba '+(Number(p.index)+1)))}${p.deviceId===localDeviceId()?' — ten telefon':''}</option>`).join('');
  }
  function installUi(){
    if(!$('v083Style')){
      const s=document.createElement('style');s.id='v083Style';s.textContent=`
        #v083Setup{margin-top:10px;padding:10px;border:1px solid #303030;border-radius:10px;background:#0b0b0b}
        #v083Setup .v083Title,#v083ControlBar .v083Title{font-size:10px;font-weight:900;color:#ff6265;letter-spacing:.06em}
        .v083Row{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}
        .v083Row select{width:100%;min-height:38px}
        #v083SetupNote,#v083ControlNote{font-size:10px;color:#999;margin-top:6px;line-height:1.35}
        #v083ControlBar{margin:6px 0 8px;padding:9px 10px;border:1px solid #463032;border-radius:11px;background:#120b0c}
        #v083ControlBar.hidden{display:none!important}
        #v083ControlStatus{font-weight:900;margin-top:5px}
        @media(max-width:520px){.v083Row{grid-template-columns:1fr}}
      `;document.head.appendChild(s);
    }
    const gbox=$('v064GroupBox');
    if(gbox&&!$('v083Setup')){
      const box=document.createElement('div');box.id='v083Setup';
      box.innerHTML=`<div class="v083Title">WPISYWANIE DANYCH</div><div class="v083Row"><select id="v083Mode"><option value="per-device">KAŻDY NA SWOIM TELEFONIE</option><option value="single-controller">JEDEN TELEFON</option></select><select id="v083ControllerSetup"></select></div><div id="v083SetupNote"></div>`;
      gbox.appendChild(box);
      $('v083Mode').addEventListener('change',ev=>setModeHost(ev.target.value));
      $('v083ControllerSetup').addEventListener('change',ev=>requestTransfer(ev.target.value));
    }
    const training=$('training');
    if(training&&!$('v083ControlBar')){
      const box=document.createElement('div');box.id='v083ControlBar';box.className='hidden';
      box.innerHTML=`<div class="v083Title">WSPÓLNY TRENING • JEDEN TELEFON</div><div id="v083ControlStatus"></div><div class="v083Row"><select id="v083ControllerLive"></select><button id="v083TransferBtn" class="secondary">PRZEKAŻ STEROWANIE</button></div><div id="v083ControlNote"></div>`;
      const inputs=training.querySelector('.inputs');if(inputs)inputs.insertAdjacentElement('beforebegin',box);else training.prepend(box);
      $('v083TransferBtn').addEventListener('click',()=>requestTransfer($('v083ControllerLive')?.value||''));
    }
  }

  function render(){
    installUi();
    const list=participants();
    const allNew=allSupportSingle();
    const mode=$('v083Mode');
    if(mode){
      mode.value=state.mode;
      mode.disabled=net?.role!=='host'||!!running;
      const single=[...mode.options].find(o=>o.value==='single-controller');
      if(single)single.disabled=list.length>1&&!allNew;
    }
    const setupSel=$('v083ControllerSetup');
    if(setupSel){
      const html=controllerOptions();if(setupSel.innerHTML!==html)setupSel.innerHTML=html;
      if(state.controllerDeviceId)setupSel.value=state.controllerDeviceId;
      setupSel.disabled=state.mode!=='single-controller'||net?.role!=='host'||!!running;
    }
    const note=$('v083SetupNote');
    if(note){
      note.textContent=state.mode==='single-controller'
        ?(allNew?'Jedno urządzenie wpisuje kg i powtórzenia za wszystkich. Historia i progres pozostają osobne dla każdej osoby.':'Starszy uczestnik: dostępny pozostaje tryb KAŻDY NA SWOIM.')
        :'Każda osoba wpisuje swoją serię na własnym telefonie.';
    }

    const bar=$('v083ControlBar');
    if(!bar)return;
    const on=isSingleController();
    bar.classList.toggle('hidden',!on);
    if(!on)return;
    const controller=controllerParticipant();
    const status=$('v083ControlStatus');
    if(status)status.textContent='STEROWANIE: '+(controller?.name||'—')+(isLocalController()?' • TEN TELEFON':'');
    const live=$('v083ControllerLive');
    if(live){
      const html=controllerOptions();if(live.innerHTML!==html)live.innerHTML=html;
      live.value=state.controllerDeviceId;
      live.disabled=!canTransfer();
    }
    const transfer=$('v083TransferBtn');if(transfer)transfer.disabled=!canTransfer();
    const q=queue(),turn=participantByAthlete(Number(q?.turn)||0);
    const controlNote=$('v083ControlNote');
    if(controlNote)controlNote.textContent=isLocalController()
      ?'Wpisujesz teraz serię dla: '+(turn?.name||'uczestnika')+'.'
      :'Tryb podglądu. Dane wpisuje '+(controller?.name||'wybrany telefon')+'.';
  }

  function updateInputOwnership(){
    const weight=$('weight'),reps=$('reps');
    if(!weight||!reps)return;
    if(!isSingleController()){
      if(state.ownedInputs){weight.disabled=false;reps.disabled=false;state.ownedInputs=false;}
      state.lastTurnKey='';
      return;
    }
    const mine=isLocalController();
    weight.disabled=!mine;
    reps.disabled=!mine;
    state.ownedInputs=true;
    if(!mine)return;
    const q=queue();
    const key=String(net?.sessionId||'')+':'+String(q?.exercise??'')+':'+String(q?.turn??'');
    if(key===state.lastTurnKey)return;
    state.lastTurnKey=key;
    const focused=document.activeElement;
    if(focused===weight||focused===reps)return;
    const athlete=Number(q?.turn)||0,ex=Number(q?.exercise)||0;
    const last=[...(records||[])].filter(r=>Number(r.athlete)===athlete&&Number(r.ex)===ex).sort((a,b)=>(Number(b.at)||0)-(Number(a.at)||0))[0];
    weight.value=last&&Number(last.kg)>0?String(last.kg):'';
    reps.value='';
  }

  function submitControlledSet(){
    if(!isSingleController()){return false;}
    if(!isLocalController()){toastMsg('Dane wpisuje '+(controllerParticipant()?.name||'inny telefon')+'.');return true;}
    if(state.pending){toastMsg('Czekam na potwierdzenie HOSTA.');return true;}
    if(paused){toastMsg('Trening jest wstrzymany.');return true;}
    const q=queue(),athlete=Number(q?.turn)||0,p=participantByAthlete(athlete);
    if(!q?.active||!p){toastMsg('Brak aktywnej kolejki.');return true;}
    const reps=parseInt(String($('reps')?.value||''),10);
    if(!Number.isFinite(reps)||reps<=0){toastMsg('Wpisz liczbę powtórzeń albo sekund.');return true;}
    const kg=Number(String($('weight')?.value||'0').replace(',','.'))||0;
    if(net?.role==='host'){
      const result=q.submitControlledRecord?.(athlete,kg,reps,String(p.deviceId||''))||{ok:false,reason:'Brak API kolejki'};
      if(result.ok){$('reps').value='';log('V083_CONTROLLED_SET_SAVED',{athlete,participantId:p.deviceId,kg,reps,by:localDeviceId()});}
      else toastMsg(result.reason||'Nie można zapisać serii.');
      render();
      return true;
    }
    if(!net?.connected){toastMsg('Brak połączenia z HOSTEM.');return true;}
    const requestId='c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const ok=wifiSend({type:'V083_CONTROLLED_SET_REQUEST',sessionId:String(net.sessionId||''),deviceId:localDeviceId(),requestId,athlete,participantId:String(p.deviceId||''),kg,reps,knownRev:Number(q.rev)||0});
    if(ok){state.pending={requestId,athlete,kg,reps,at:Date.now()};log('V083_CONTROLLED_SET_SENT',{athlete,participantId:p.deviceId,requestId});}
    else toastMsg('Nie udało się wysłać serii do HOSTA.');
    render();
    return true;
  }

  function skipControlledRest(){
    if(!isSingleController())return false;
    if(!isLocalController()){toastMsg('Przerwę obsługuje '+(controllerParticipant()?.name||'inny telefon')+'.');return true;}
    const q=queue(),athlete=Number(q?.turn)||0;
    if(net?.role==='host'){
      const result=q.skipControlledRest?.(athlete)||{ok:false,reason:'Brak API przerwy'};
      toastMsg(result.ok?'Przerwa pominięta.':(result.reason||'Nie można pominąć przerwy.'));
      return true;
    }
    const requestId='r'+Date.now().toString(36);
    const ok=wifiSend({type:'V083_CONTROLLED_SKIP_REQUEST',sessionId:String(net?.sessionId||''),deviceId:localDeviceId(),requestId,athlete});
    if(!ok)toastMsg('Nie udało się wysłać pominięcia przerwy.');
    return true;
  }

  function captureActions(){
    document.addEventListener('click',ev=>{
      const save=ev.target?.closest?.('#saveSetBtn');
      if(save&&isSingleController()){
        ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
        submitControlledSet();return;
      }
      const skip=ev.target?.closest?.('#skipRestBtn,#v072Skip');
      if(skip&&isSingleController()){
        ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
        skipControlledRest();
      }
    },true);
  }

  function maintain(){
    installUi();wrapWifi();
    if(net?.role==='host'){
      if(state.mode==='single-controller'&&participants().length>1&&!allSupportSingle()){
        state.mode='per-device';state.rev++;saveCfg();broadcast(true);
        toastMsg('Wykryto starszy telefon — wracam do KAŻDY NA SWOIM.');
      }
      if(state.mode==='single-controller')ensureController();
      if(state.mode==='single-controller'&&!net?.connected&&state.controllerDeviceId&&state.controllerDeviceId!==localDeviceId()){
        const host=hostParticipant();
        if(host&&supportsSingle(host))applyControllerHost(host.deviceId,'controller-offline-fallback');
      }
      const sid=String(net?.sessionId||'');
      if(sid&&sid!==state.lastSessionId){state.lastSessionId=sid;state.rev++;broadcast(true);}
      else broadcast(false);
    }else if(net?.role==='guest'&&state.mode==='single-controller'){
      const list=participants();
      if(list.length&&list.some(p=>protocolOf(p)<PROTOCOL_VERSION)){
        state.mode='per-device';state.controllerDeviceId='';state.pending=null;saveCfg();
      }
    }
    updateInputOwnership();
    render();
  }

  function boot(){
    if(state.booted)return;
    state.booted=true;
    installUi();wrapWifi();captureActions();
    setInterval(maintain,250);
    maintain();
  }

  window.TrenerSharedControl083={
    protocolVersion:PROTOCOL_VERSION,
    state,
    isSingleController,
    isLocalController,
    canTransfer,
    supportsSingle,
    allSupportSingle,
    submitControlledSet,
    skipControlledRest,
    setModeHost,
    requestTransfer
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
