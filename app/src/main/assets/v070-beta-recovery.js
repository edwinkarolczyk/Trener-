(function(){
  'use strict';
  const KEY='trainer3.beta070.queue';
  let restoredFor='';
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}}
  function clear(){try{localStorage.removeItem(KEY);}catch(e){}restoredFor='';}
  function save(){
    try{
      const q=window.TrenerBeta070;if(!q||!q.active||!running||!net?.active||!net.sessionId)return;
      localStorage.setItem(KEY,JSON.stringify({version:1,savedAt:Date.now(),sessionId:String(q.sessionId||net.sessionId),rev:Number(q.rev)||0,exercise:Number(q.exercise)||0,turn:Number(q.turn)||0,waitUntil:Number(q.waitUntil)||0,readyAt:Object.assign({},q.readyAt||{}),left:Object.assign({},q.left||{})}));
    }catch(e){}
  }
  function restore(){
    try{
      if(!running||!net?.active||!net.sessionId||!window.TrenerBeta070)return false;
      const cp=load();if(!cp||String(cp.sessionId)!==String(net.sessionId))return false;
      if(!cp.savedAt||Date.now()-Number(cp.savedAt)>72*60*60*1000){clear();return false;}
      if(restoredFor===String(cp.sessionId))return true;
      const q=window.TrenerBeta070;
      q.active=true;q.sessionId=String(cp.sessionId);q.rev=Math.max(Number(q.rev)||0,Number(cp.rev)||0);q.exercise=Math.max(0,Number(cp.exercise)||0);q.turn=Number(cp.turn)||0;q.waitUntil=Math.max(0,Number(cp.waitUntil)||0);q.readyAt=Object.assign({},cp.readyAt||{});q.left=Object.assign({},cp.left||{});q.pending=null;q.lastStateAt=Date.now();restoredFor=String(cp.sessionId);
      try{if(typeof exIdx!=='undefined')exIdx=q.exercise;if(typeof athleteIdx!=='undefined')athleteIdx=Number(net.localAthlete)||0;if(typeof setIdx!=='undefined')setIdx=(records||[]).filter(r=>Number(r.athlete)===Number(net.localAthlete||0)&&Number(r.ex)===q.exercise).length;}catch(e){}
      try{toast('Przywrócono kolejkę wspólnego treningu.');}catch(e){}
      return true;
    }catch(e){return false;}
  }
  function tick(){
    try{
      if(running&&net?.active&&net.sessionId){if(!restoredFor)restore();save();}
      else if(!running)clear();
    }catch(e){}
  }
  window.TrenerBeta070Recovery={save,restore,clear};
  setInterval(tick,350);setTimeout(tick,300);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});
  window.addEventListener('pagehide',save);
})();
