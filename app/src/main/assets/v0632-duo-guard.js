(function(){
  'use strict';

  let saveTimer=null;

  function persistOwnName(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){
      try{saveSettings();}catch(e){}
    },120);
  }

  function blockUnconnectedDuoStart(ev){
    const target=ev.target&&ev.target.closest?ev.target.closest('#startBtn'):null;
    if(!target)return;
    try{
      if(mode===2&&!net.connected){
        ev.preventDefault();
        ev.stopImmediatePropagation();
        try{saveSettings();}catch(e){}
        toast(net.role==='host'
          ?'Poczekaj, aż druga osoba połączy się z sesją Wi‑Fi.'
          :'Tryb 2 osoby wymaga połączenia drugiego telefonu przez Wi‑Fi.');
      }
    }catch(e){}
  }

  function boot(){
    document.addEventListener('click',blockUnconnectedDuoStart,true);

    const name=document.getElementById('nameA');
    if(name){
      name.addEventListener('input',persistOwnName);
      name.addEventListener('change',function(){
        clearTimeout(saveTimer);
        try{saveSettings();}catch(e){}
      });
    }

    window.addEventListener('pagehide',function(){
      clearTimeout(saveTimer);
      try{saveSettings();}catch(e){}
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
