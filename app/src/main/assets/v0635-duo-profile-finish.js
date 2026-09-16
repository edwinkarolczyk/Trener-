(function(){
  'use strict';

  const state={partnerReady:false,wrapped:false,nameTimer:null};
  window.TrenerDuoProfile=state;

  function ownName(){
    const el=document.getElementById('nameA');
    return (el&&el.value.trim())||'Osoba';
  }

  function partnerName(){
    try{
      if(net&&Array.isArray(net.names))return String(net.names[net.role==='guest'?0:1]||'').trim();
    }catch(e){}
    return '';
  }

  function sendOwnProfile(){
    try{
      if(!net.connected)return;
      if(net.role==='guest'){
        wifiSend({type:'PROFILE',name:ownName()});
      }else if(net.role==='host'){
        net.names[0]=ownName();
        wifiSend({type:'PROFILE_STATE',names:[...net.names]});
        if(net.active)broadcastSnapshot();
      }
    }catch(e){}
  }

  function updateIdentityUi(){
    const box=document.getElementById('v0635PartnerIdentity');
    if(!box)return;
    try{
      box.classList.toggle('hidden',mode!==2);
      if(mode!==2)return;
      if(net.role==='host'){
        if(!net.connected){box.textContent='Połącz drugi telefon w Ustawieniach. Imię partnera zostanie pobrane automatycznie.';return;}
        if(!state.partnerReady){box.textContent='Połączono • czekam na profil i imię partnera…';return;}
        box.textContent='Partner: '+(partnerName()||'—')+' • gotowy do wspólnego treningu.';
        return;
      }
      if(net.role==='guest'){
        if(!net.connected){box.textContent='Połącz się z gospodarzem w Ustawieniach.';return;}
        box.textContent='Gospodarz: '+(partnerName()||'—')+' • trening rozpoczyna gospodarz.';
        return;
      }
      box.textContent='W trybie 2 osób gospodarz tworzy sesję, a partner dołącza ze swojego telefonu.';
    }catch(e){}
  }

  function resetPartnerProfile(){
    state.partnerReady=false;
    updateIdentityUi();
  }

  function normalizeGuestNames(){
    try{
      if(net.role==='guest'&&Array.isArray(net.names)&&net.names.length>=2){
        net.names[1]=ownName();
      }
    }catch(e){}
  }

  function wrapWifi(){
    if(state.wrapped||!window.TrenerWifi||typeof window.TrenerWifi.nativeMessage!=='function'||typeof window.TrenerWifi.nativeStatus!=='function')return false;
    state.wrapped=true;

    const originalMessage=window.TrenerWifi.nativeMessage.bind(window.TrenerWifi);
    const originalStatus=window.TrenerWifi.nativeStatus.bind(window.TrenerWifi);

    window.TrenerWifi.nativeMessage=function(raw){
      let msg=null;
      try{msg=JSON.parse(raw);}catch(e){}

      if(msg&&msg.type==='START'&&net.role==='guest'){
        if(!Array.isArray(msg.names))msg.names=[];
        msg.names[1]=ownName();
        raw=JSON.stringify(msg);
      }

      originalMessage(raw);

      try{
        if(msg&&msg.type==='PROFILE'&&net.role==='host'){
          const guest=String(msg.name||'').trim();
          state.partnerReady=!!guest;
        }
        if(msg&&msg.type==='PROFILE_STATE'&&net.role==='guest')normalizeGuestNames();
        if(msg&&msg.type==='SNAPSHOT'&&net.role==='guest')normalizeGuestNames();
        if(msg&&msg.type==='PROFILE_REQUEST'&&net.role==='guest')sendOwnProfile();
      }catch(e){}

      try{renderLivePanel();updateWifiUi();}catch(e){}
      updateIdentityUi();
    };

    window.TrenerWifi.nativeStatus=function(status,detail){
      originalStatus(status,detail);
      try{
        if(status==='connected'){
          if(net.role==='host'){
            state.partnerReady=false;
            setTimeout(()=>wifiSend({type:'PROFILE_REQUEST'}),80);
            setTimeout(()=>wifiSend({type:'PROFILE_REQUEST'}),350);
          }else if(net.role==='guest'){
            setTimeout(sendOwnProfile,80);
            setTimeout(sendOwnProfile,350);
          }
        }else if(status==='waiting'||status==='disconnected'||status==='offline'||status==='error'||status==='denied'){
          state.partnerReady=false;
        }
      }catch(e){}
      updateIdentityUi();
    };

    return true;
  }

  function installUi(){
    if(!document.getElementById('v0635-duo-style')){
      const style=document.createElement('style');
      style.id='v0635-duo-style';
      style.textContent='#partnerWrap{display:none!important}#v0635PartnerIdentity{margin:7px 0 12px;padding:9px 11px;border:1px solid #303030;border-radius:10px;background:#0d0d0d;color:#aaa;font-size:11px;line-height:1.35}#v0635PartnerIdentity.hidden{display:none!important}';
      document.head.appendChild(style);
    }

    const name=document.getElementById('nameA');
    if(name){
      const label=name.previousElementSibling;
      if(label&&label.tagName==='LABEL')label.textContent='Twoje imię';
      if(!document.getElementById('v0635PartnerIdentity')){
        const info=document.createElement('div');
        info.id='v0635PartnerIdentity';
        info.className='hidden';
        name.insertAdjacentElement('afterend',info);
      }
      const onNameChange=function(){
        clearTimeout(state.nameTimer);
        state.nameTimer=setTimeout(function(){
          try{saveSettings();}catch(e){}
          sendOwnProfile();
          updateIdentityUi();
        },150);
      };
      name.addEventListener('input',onNameChange);
      name.addEventListener('change',onNameChange);
    }
  }

  function guardStart(ev){
    const target=ev.target&&ev.target.closest?ev.target.closest('#startBtn'):null;
    if(!target)return;
    try{
      if(mode!==2)return;
      if(!net.connected)return;
      if(net.role==='guest'){
        ev.preventDefault();ev.stopImmediatePropagation();
        toast('Wspólny trening rozpoczyna gospodarz.');
        return;
      }
      if(net.role!=='host'){
        ev.preventDefault();ev.stopImmediatePropagation();
        toast('Najpierw utwórz sesję jako gospodarz.');
        return;
      }
      if(!state.partnerReady){
        ev.preventDefault();ev.stopImmediatePropagation();
        toast('Poczekaj, aż aplikacja pobierze imię partnera z drugiego telefonu.');
      }
    }catch(e){}
  }

  function finishFromStop(ev){
    const target=ev.target&&ev.target.closest?ev.target.closest('#stopBtn'):null;
    if(!target)return;
    try{
      if(!running)return;
      ev.preventDefault();ev.stopImmediatePropagation();

      if(net.active&&net.role==='guest'){
        if(!confirm('Zakończyć swój trening? Wykonane serie zostaną zapisane jako zakończony trening.'))return;
        const own=records.filter(r=>r.athlete===net.localAthlete);
        net.done[net.localAthlete]=true;
        wifiSend({type:'DONE',sessionId:net.sessionId,athlete:net.localAthlete,records:own});
        finishWorkout(false,true);
        return;
      }

      const msg=net.active
        ?'Zakończyć wspólny trening na obu telefonach? Wykonane serie zostaną zapisane jako zakończony trening.'
        :'Zakończyć trening? Wykonane serie zostaną zapisane jako zakończony trening.';
      if(!confirm(msg))return;
      if(net.active&&net.role==='host')finishSharedForAll(false);
      else finishWorkout(false);
    }catch(e){}
  }

  function beforeHostCreate(ev){
    const target=ev.target&&ev.target.closest?ev.target.closest('#hostBtn'):null;
    if(!target)return;
    resetPartnerProfile();
    const partner=document.getElementById('nameB');
    if(partner)partner.value='';
    try{if(Array.isArray(net.names))net.names=[ownName(),'Partner'];}catch(e){}
  }

  function boot(){
    installUi();
    wrapWifi();
    document.addEventListener('click',beforeHostCreate,true);
    document.addEventListener('click',guardStart,true);
    document.addEventListener('click',finishFromStop,true);
    setInterval(function(){wrapWifi();updateIdentityUi();},400);
    updateIdentityUi();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
