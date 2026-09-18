(function(){
  'use strict';

  const KEY='trainer3.soundHaptics.v077';
  const $=id=>document.getElementById(id);
  let audioCtx=null;
  let hadRest=false;
  let prevRunning=false;
  let prevRecords=0;

  function safe(raw,fallback){try{return JSON.parse(raw||'')||fallback}catch(e){return fallback}}
  function cfg(){return Object.assign({sound:true,vibration:true,sets:true,rest:true,finish:true,volume:'normal'},safe(localStorage.getItem(KEY),{}));}
  function save(v){localStorage.setItem(KEY,JSON.stringify(v));}
  function volume(){const v=cfg().volume;return v==='quiet'?0.035:v==='loud'?0.11:0.07;}
  function unlock(){try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();}catch(e){}}
  function tone(freq,duration,delay=0,gain=1){
    const c=cfg();if(!c.sound)return;unlock();if(!audioCtx)return;
    try{
      const t=audioCtx.currentTime+delay;
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.type='sine';o.frequency.setValueAtTime(freq,t);
      g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(0.001,volume()*gain),t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+duration);
      o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+duration+0.03);
    }catch(e){}
  }
  function nativeVibrate(ms){const c=cfg();if(!c.vibration)return;try{if(window.Android&&Android.vibrate)Android.vibrate(ms);else if(navigator.vibrate)navigator.vibrate(ms);}catch(e){}}
  function feedback(type){
    const c=cfg();
    if(type==='set'&&c.sets){tone(620,0.07);nativeVibrate(45);}
    if(type==='rest'&&c.rest){tone(740,0.09);tone(980,0.12,0.11);nativeVibrate(180);}
    if(type==='finish'&&c.finish){tone(620,0.10);tone(780,0.11,0.12);tone(1040,0.18,0.25);nativeVibrate(260);}
    if(type==='exercise'){tone(540,0.09);tone(760,0.11,0.11);tone(1080,0.16,0.25);nativeVibrate(360);}
    if(type==='water'){tone(520,0.08,0,0.7);tone(660,0.10,0.10,0.75);nativeVibrate(70);}
  }

  function installVibrateGuard(){
    try{window.vibrate=function(ms){nativeVibrate(ms);};}catch(e){}
  }

  function installUi(){
    if($('v077FeedbackCard'))return;
    const settings=$('settings');if(!settings)return;
    const card=document.createElement('div');card.id='v077FeedbackCard';card.className='card';
    card.innerHTML=`<div class="eyebrow">DŹWIĘK I WIBRACJE</div><h2>Sygnały Trenera</h2>
      <label class="switchRow"><input id="v077Sound" type="checkbox"><span>Dźwięki w aplikacji</span></label>
      <label class="switchRow"><input id="v077Vibration" type="checkbox"><span>Wibracje</span></label>
      <div class="twoCols"><div><label>Głośność sygnałów</label><select id="v077Volume"><option value="quiet">Cicho</option><option value="normal">Normalnie</option><option value="loud">Głośno</option></select></div><div class="alignEnd"><button id="v077TestFeedback" class="secondary" type="button">TEST</button></div></div>
      <div style="margin-top:10px">
        <label class="switchRow"><input id="v077SetSignal" type="checkbox"><span>Po zapisaniu serii</span></label>
        <label class="switchRow"><input id="v077RestSignal" type="checkbox"><span>Po zakończeniu przerwy</span></label>
        <label class="switchRow"><input id="v077FinishSignal" type="checkbox"><span>Po zakończeniu treningu</span></label>
      </div>
      <p class="hint">Sygnał nie blokuje treningu. Ustawienia dźwięku i wibracji są niezależne. Nawodnienie korzysta z tych samych ustawień.</p>`;
    const feedback=$('v0636FeedbackCard');
    if(feedback&&feedback.parentNode===settings)settings.insertBefore(card,feedback);else settings.appendChild(card);
    const c=cfg();
    $('v077Sound').checked=!!c.sound;$('v077Vibration').checked=!!c.vibration;$('v077Volume').value=c.volume||'normal';
    $('v077SetSignal').checked=!!c.sets;$('v077RestSignal').checked=!!c.rest;$('v077FinishSignal').checked=!!c.finish;
    const persist=()=>{save({sound:$('v077Sound').checked,vibration:$('v077Vibration').checked,volume:$('v077Volume').value,sets:$('v077SetSignal').checked,rest:$('v077RestSignal').checked,finish:$('v077FinishSignal').checked});};
    ['v077Sound','v077Vibration','v077Volume','v077SetSignal','v077RestSignal','v077FinishSignal'].forEach(id=>$(id).addEventListener('change',persist));
    $('v077TestFeedback').addEventListener('click',()=>{persist();unlock();feedback('rest');});
  }

  function readRunning(){try{return !!running}catch(e){return false}}
  function readRest(){try{return Number(restEnd)||0}catch(e){return 0}}
  function recordCount(){try{return Array.isArray(records)?records.length:0}catch(e){return 0}}

  function monitor(){
    const nowRun=readRunning(),rest=readRest(),count=recordCount();
    if(rest>Date.now()+150)hadRest=true;
    if(hadRest&&nowRun&&rest<=0){hadRest=false;const c=cfg();if(c.rest){tone(740,0.09);tone(980,0.12,0.11);}}
    if(count>prevRecords&&nowRun)feedback('set');
    if(prevRunning&&!nowRun)feedback('finish');
    prevRunning=nowRun;prevRecords=count;
  }

  function boot(){
    installVibrateGuard();installUi();
    prevRunning=readRunning();prevRecords=recordCount();
    document.addEventListener('click',unlock,{passive:true});
    document.addEventListener('touchstart',unlock,{passive:true,once:true});
    setInterval(monitor,250);
  }

  window.TrenerFeedback077={feedback,config:cfg};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
