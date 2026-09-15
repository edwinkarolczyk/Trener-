(function(){
  'use strict';

  const remoteState={};
  let lastHeartbeat=0;

  function byId(id){return document.getElementById(id)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function fmt(ms){
    const s=Math.max(0,Math.ceil((Number(ms)||0)/1000));
    return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
  }
  function trimKg(v){
    const n=Number(v)||0;
    if(!n)return '';
    return Number.isInteger(n)?String(n):String(Math.round(n*10)/10).replace('.',',');
  }

  function installCss(){
    if(byId('live053-style'))return;
    const s=document.createElement('style');
    s.id='live053-style';
    s.textContent=`
      #wifiLive.live053Wrap{border:1px solid #343434;border-radius:16px;padding:12px;background:#0b0b0b}
      #wifiLive .liveGrid{gap:10px}
      #wifiLive .livePerson.live053{position:relative;min-height:154px;padding:14px;border:2px solid #303030;border-radius:14px;background:#111;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;overflow:hidden}
      #wifiLive .livePerson.live053 strong{font-size:19px;line-height:1.15;color:#fff;margin-bottom:8px}
      .live053Who{position:absolute;right:10px;top:10px;font-size:10px;font-weight:900;letter-spacing:.08em;color:#8d8d8d;border:1px solid #343434;border-radius:999px;padding:4px 7px}
      .live053Phase{font-size:21px;font-weight:1000;letter-spacing:.02em;line-height:1.1;color:#d5d5d5}
      .live053Timer{font-size:36px;font-weight:1000;line-height:1;color:#ff5558;margin:7px 0 5px;font-variant-numeric:tabular-nums}
      .live053Exercise{font-size:14px;font-weight:850;color:#fff;margin-top:5px;line-height:1.25}
      .live053Series{font-size:13px;font-weight:800;color:#b8b8b8;margin-top:3px}
      .live053Last{font-size:12px;color:#8e8e8e;margin-top:auto;padding-top:8px;line-height:1.25}
      #wifiLive .livePerson.live053Rest{border-color:#7a292b;background:#170d0e}
      #wifiLive .livePerson.live053Rest.live053Partner{animation:live053Pulse 1.15s ease-in-out infinite}
      #wifiLive .livePerson.live053Training{border-color:#2e6042;background:#0d1510}
      #wifiLive .livePerson.live053Training .live053Phase{color:#74e39d}
      #wifiLive .livePerson.live053Done{border-color:#35503f;background:#101511;opacity:.88}
      #wifiLive .livePerson.live053Done .live053Phase{color:#79d899}
      #wifiLive .livePerson.live053Paused .live053Phase{color:#f4c96a}
      #wifiLive .livePerson.live053Offline{border-style:dashed;opacity:.72}
      @keyframes live053Pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,43,45,.08);transform:scale(1)}50%{box-shadow:0 0 0 5px rgba(239,43,45,.17);transform:scale(1.012)}}
      @media(max-width:520px){#wifiLive .liveGrid{grid-template-columns:1fr}.live053Timer{font-size:40px}#wifiLive .livePerson.live053{min-height:148px}.live053Phase{font-size:22px}}
      @media(prefers-reduced-motion:reduce){#wifiLive .livePerson.live053Rest.live053Partner{animation:none}}
    `;
    document.head.appendChild(s);
  }

  function inferFromRecords(a){
    const own=(typeof records!=='undefined'?records:[]).filter(r=>Number(r.athlete||0)===a).sort((x,y)=>(Number(y.at)||0)-(Number(x.at)||0));
    const last=own[0]||null;
    const cp=typeof currentPlan!=='undefined'?currentPlan:null;
    if(!cp||!Array.isArray(cp.ex)||!cp.ex.length){return {phase:'waiting',ex:0,set:0,exercise:'',sets:0,restEnd:0,last};}
    if(typeof net!=='undefined'&&net.done&&net.done[a])return {phase:'done',ex:cp.ex.length-1,set:0,exercise:'',sets:0,restEnd:0,last};
    if(!last){const e=cp.ex[0];return {phase:'training',ex:0,set:0,exercise:e?.n||'',sets:Number(e?.sets)||0,restEnd:0,last};}
    const prevEx=cp.ex[Number(last.ex)||0];
    let nx=Number(last.ex)||0,ns=(Number(last.set)||0)+1,breakMs=(Number(prevEx?.rest)||0)*1000;
    if(prevEx&&ns>=Number(prevEx.sets||0)){
      nx++;
      ns=0;
      if(nx<cp.ex.length)breakMs=90000;
    }
    if(nx>=cp.ex.length)return {phase:'done',ex:nx,set:0,exercise:'',sets:0,restEnd:0,last};
    const nextEx=cp.ex[nx];
    const end=(Number(last.at)||Date.now())+breakMs;
    return {phase:end>Date.now()?'rest':'training',ex:nx,set:ns,exercise:nextEx?.n||'',sets:Number(nextEx?.sets)||0,restEnd:end,last};
  }

  function localState(a){
    const cp=typeof currentPlan!=='undefined'?currentPlan:null;
    const done=typeof net!=='undefined'&&net.done?!!net.done[a]:false;
    const isLocal=typeof net!=='undefined'&&a===Number(net.localAthlete||0);
    if(!isLocal)return null;
    const x=typeof exIdx!=='undefined'?Number(exIdx)||0:0;
    const si=typeof setIdx!=='undefined'?Number(setIdx)||0:0;
    const e=cp?.ex?.[x];
    const re=typeof restEnd!=='undefined'?Number(restEnd)||0:0;
    const p=typeof paused!=='undefined'&&paused;
    return {
      phase:done?'done':(p?'paused':(re>Date.now()?'rest':'training')),
      ex:x,set:si,exercise:e?.n||'',sets:Number(e?.sets)||0,restEnd:re,last:null,online:true
    };
  }

  function stateFor(a){
    const own=localState(a);
    if(own)return own;
    const rs=remoteState[a];
    if(rs&&Date.now()-rs.receivedAt<5000){
      return {
        phase:rs.done?'done':(rs.paused?'paused':(rs.restEndLocal>Date.now()?'rest':'training')),
        ex:Number(rs.ex)||0,
        set:Number(rs.set)||0,
        exercise:String(rs.exercise||''),
        sets:Number(rs.sets)||0,
        restEnd:Number(rs.restEndLocal)||0,
        last:null,
        online:true
      };
    }
    const inferred=inferFromRecords(a);
    inferred.online=typeof net!=='undefined'?!!net.connected:false;
    return inferred;
  }

  function lastResult(a){
    const own=(typeof records!=='undefined'?records:[]).filter(r=>Number(r.athlete||0)===a).sort((x,y)=>(Number(y.at)||0)-(Number(x.at)||0));
    const r=own[0];
    if(!r)return 'Jeszcze bez zapisanej serii';
    const kg=trimKg(r.kg);
    return 'Ostatnio: '+esc(r.name||'seria')+' • '+(kg?kg+' kg × ':'')+esc(r.reps)+(r.time?' sek.':' powt.');
  }

  function totalSets(){return (typeof currentPlan!=='undefined'&&currentPlan?.ex||[]).reduce((s,e)=>s+(Number(e.sets)||0),0)}
  function doneSets(a){return (typeof records!=='undefined'?records:[]).filter(r=>Number(r.athlete||0)===a).length}

  function renderCard(a){
    const node=byId(a===0?'liveA':'liveB');
    if(!node||typeof net==='undefined')return;
    const st=stateFor(a),partner=a!==Number(net.localAthlete||0),name=(net.names&&net.names[a])||('Osoba '+(a+1));
    const total=totalSets(),done=doneSets(a),left=Math.max(0,(Number(st.restEnd)||0)-Date.now());
    let phase='ĆWICZY / GOTOWY',timer='',cls='live053Training';
    if(st.phase==='rest'&&left>0){phase='PRZERWA';timer=fmt(left);cls='live053Rest';}
    else if(st.phase==='done'){phase='TRENING GOTOWY';cls='live053Done';}
    else if(st.phase==='paused'){phase='PAUZA';cls='live053Paused';}
    else if(!st.online&&partner){phase='BRAK POŁĄCZENIA';cls='live053Offline';}
    const series=st.sets?('Seria '+Math.min(st.set+1,st.sets)+'/'+st.sets+' • postęp '+done+'/'+total):('Postęp '+done+'/'+total);
    node.className='livePerson live053 '+cls+(partner?' live053Partner':'');
    node.innerHTML='<span class="live053Who">'+(partner?'KUMPEL':'TY')+'</span>'+
      '<strong>'+esc(name)+'</strong>'+
      '<div class="live053Phase">'+phase+'</div>'+
      (timer?'<div class="live053Timer">'+timer+'</div>':'')+
      (st.exercise?'<div class="live053Exercise">'+esc(st.exercise)+'</div>':'')+
      '<div class="live053Series">'+esc(series)+'</div>'+
      '<div class="live053Last">'+lastResult(a)+'</div>';
  }

  function render(){
    if(typeof net==='undefined'||!net.active)return;
    const wrap=byId('wifiLive');
    if(!wrap)return;
    wrap.classList.add('live053Wrap');
    renderCard(0);renderCard(1);
    const link=byId('liveLink');
    if(link)link.textContent=net.connected?'NA ŻYWO • Wi‑Fi':'OFFLINE • zapis lokalny';
  }

  function heartbeat(){
    if(typeof net==='undefined'||typeof wifiSend!=='function'||!net.active||!net.connected)return;
    const a=Number(net.localAthlete||0),cp=typeof currentPlan!=='undefined'?currentPlan:null;
    const x=typeof exIdx!=='undefined'?Number(exIdx)||0:0,si=typeof setIdx!=='undefined'?Number(setIdx)||0:0,e=cp?.ex?.[x];
    const re=typeof restEnd!=='undefined'?Number(restEnd)||0:0;
    wifiSend({
      type:'LIVE',sessionId:net.sessionId,athlete:a,ex:x,set:si,
      exercise:e?.n||'',sets:Number(e?.sets)||0,
      restMs:Math.max(0,re-Date.now()),done:!!net.done[a],
      paused:typeof paused!=='undefined'&&!!paused,ts:Date.now()
    });
  }

  function hookMessages(){
    if(!window.TrenerWifi||window.TrenerWifi.__live053Hook)return;
    const original=window.TrenerWifi.nativeMessage;
    window.TrenerWifi.nativeMessage=function(raw){
      try{
        const m=typeof raw==='string'?JSON.parse(raw):raw;
        if(m&&m.type==='LIVE'&&typeof net!=='undefined'&&(!net.sessionId||m.sessionId===net.sessionId)){
          const a=Number(m.athlete)||0;
          remoteState[a]=Object.assign({},m,{receivedAt:Date.now(),restEndLocal:Date.now()+Math.max(0,Number(m.restMs)||0)});
        }
      }catch(e){}
      if(typeof original==='function')original(raw);
      render();
    };
    window.TrenerWifi.__live053Hook=true;
  }

  function boot(){
    installCss();
    hookMessages();
    setInterval(()=>{
      hookMessages();
      const now=Date.now();
      if(now-lastHeartbeat>=900){heartbeat();lastHeartbeat=now;}
      render();
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
