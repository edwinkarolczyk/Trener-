(function(){
  'use strict';

  const KEY='trainer3.logs.v0823';
  const SHARED_KEY='trainer3.sharedErrors.v082';
  const MAX=240;
  let booted=false;
  let resizeTimer=0;
  let lastBeat=performance.now();
  let wifiWrapped=false;

  function byId(id){return document.getElementById(id)}
  function safe(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
  function appVersion(){try{return window.Android&&Android.getAppVersion?String(Android.getAppVersion()):'web'}catch(e){return 'unknown'}}
  function now(){return new Date().toISOString()}
  function clean(v,max=600){
    if(v===undefined||v===null)return '';
    let s='';
    try{s=typeof v==='string'?v:JSON.stringify(v)}catch(e){s=String(v)}
    return s.length>max?s.slice(0,max)+'…':s;
  }

  function state(){
    let shared=false,run=false,role='',status='',connected=false,exercise='',turn='';
    try{run=!!running}catch(e){}
    try{role=String(net?.role||'');status=String(net?.status||'');connected=!!net?.connected}catch(e){}
    try{shared=!!(run&&net?.active&&window.TrenerGroup?.groupSession)}catch(e){}
    try{exercise=String(currentPlan?.ex?.[exIdx]?.n||'')}catch(e){}
    try{turn=String(window.TrenerBeta070?.turn??'')}catch(e){}
    const vv=window.visualViewport;
    return {
      version:appVersion(),
      running:run,
      shared,
      role,
      status,
      connected,
      exercise,
      turn,
      innerHeight:window.innerHeight,
      vvHeight:vv?Math.round(vv.height):null,
      scrollY:Math.round(window.scrollY||0),
      focus:document.activeElement?.id||document.activeElement?.tagName||''
    };
  }

  function rows(){
    const r=safe(localStorage.getItem(KEY),[]);
    return Array.isArray(r)?r:[];
  }

  function write(type,message,extra){
    try{
      const list=rows();
      list.push({
        at:now(),
        type:String(type||'INFO'),
        message:clean(message,900),
        state:state(),
        extra:extra||null
      });
      localStorage.setItem(KEY,JSON.stringify(list.slice(-MAX)));
      if(byId('v0823LogBody')&&byId('history')?.classList.contains('show'))render();
    }catch(e){}
  }

  function exportText(){
    const list=rows();
    const shared=safe(localStorage.getItem(SHARED_KEY),[]);
    const head=[
      'Trener 2 — logi diagnostyczne',
      'Eksport: '+now(),
      'Wersja: '+appVersion(),
      ''
    ];
    const body=list.map(x=>{
      const st=x.state||{};
      const stateTxt='role='+clean(st.role,40)+' status='+clean(st.status,60)+' connected='+!!st.connected+
        ' shared='+!!st.shared+' running='+!!st.running+' focus='+clean(st.focus,40)+
        ' h='+clean(st.innerHeight,20)+' vv='+clean(st.vvHeight,20)+' y='+clean(st.scrollY,20)+
        (st.exercise?' ex='+clean(st.exercise,80):'')+(st.turn!==''?' turn='+clean(st.turn,20):'');
      return '['+x.at+'] '+x.type+' | '+x.message+' | '+stateTxt+(x.extra?' | '+clean(x.extra,900):'');
    });
    if(Array.isArray(shared)&&shared.length){
      body.push('','--- BŁĘDY WSPÓLNEJ SESJI ---');
      shared.slice(0,30).forEach(x=>body.push(clean(x,1200)));
    }
    let out=head.concat(body).join('\n');
    try{
      const sharedBox=window.TrenerSharedBlackbox0825?.exportLatest?.();
      if(sharedBox)out+='\n\n--- BLACK BOX WSPÓLNEJ SESJI ---\n'+sharedBox;
    }catch(e){}
    return out;
  }

  async function copyLogs(){
    const txt=exportText();
    let ok=false;
    try{
      if(window.Android&&typeof Android.copyText==='function')ok=!!Android.copyText(txt);
    }catch(e){}
    if(!ok){
      try{await navigator.clipboard.writeText(txt);ok=true}catch(e){}
    }
    if(!ok){
      try{
        const ta=document.createElement('textarea');
        ta.value=txt;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';
        document.body.appendChild(ta);ta.select();ok=document.execCommand('copy');ta.remove();
      }catch(e){}
    }
    try{if(typeof toast==='function')toast(ok?'Logi skopiowane.':'Nie udało się skopiować logów.')}catch(e){}
    write('ACTION',ok?'COPY_LOGS_OK':'COPY_LOGS_FAIL');
  }

  function clearLogs(){
    if(!confirm('Wyczyścić logi diagnostyczne?'))return;
    localStorage.removeItem(KEY);
    localStorage.removeItem(SHARED_KEY);
    try{window.TrenerSharedBlackbox0825?.clear?.()}catch(e){}
    write('ACTION','LOGS_CLEARED');
    render();
    try{if(typeof toast==='function')toast('Logi wyczyszczone.')}catch(e){}
  }

  function installCss(){
    if(byId('v0823DiagStyle'))return;
    const s=document.createElement('style');s.id='v0823DiagStyle';s.textContent=`
      #v0823DiagCard .v0823DiagHead{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
      #v0823DiagCard .v0823DiagButtons{display:flex;gap:8px;flex-wrap:wrap}
      #v0823DiagCard .v0823DiagButtons button{width:auto;margin:0}
      #v0823LogBody{margin-top:10px;max-height:360px;overflow:auto;padding:10px;border:1px solid #2d2d2d;border-radius:12px;background:#080808;color:#cfcfcf;font:10px/1.45 monospace;white-space:pre-wrap;overflow-wrap:anywhere}
      #v0823DiagCount{color:#888;font-size:10px}
    `;document.head.appendChild(s);
  }

  function ensureUi(){
    installCss();
    const history=byId('history');if(!history||byId('v0823DiagCard'))return;
    const card=document.createElement('div');
    card.id='v0823DiagCard';card.className='card';
    card.innerHTML=`
      <div class="eyebrow">DIAGNOSTYKA</div>
      <div class="v0823DiagHead">
        <div><h2 style="margin-bottom:4px">Logi aplikacji</h2><div id="v0823DiagCount">0 wpisów</div></div>
        <div class="v0823DiagButtons">
          <button id="v0823CopyLogs" class="secondary" type="button">KOPIUJ LOGI</button>
          <button id="v0823ClearLogs" class="danger" type="button">WYCZYŚĆ LOGI</button>
        </div>
      </div>
      <p class="hint">Logi zapisują błędy, połączenie Wi‑Fi, wejście w pola kg/powt., zmianę rozmiaru ekranu po otwarciu klawiatury i wykryte zatrzymania UI.</p>
      <pre id="v0823LogBody">Brak logów.</pre>
    `;
    history.appendChild(card);
    byId('v0823CopyLogs')?.addEventListener('click',copyLogs);
    byId('v0823ClearLogs')?.addEventListener('click',clearLogs);
  }

  function render(){
    ensureUi();
    const list=rows(),body=byId('v0823LogBody'),count=byId('v0823DiagCount');
    if(count)count.textContent=list.length+' wpisów';
    if(!body)return;
    if(!list.length){body.textContent='Brak logów.';return}
    body.textContent=list.slice(-80).reverse().map(x=>{
      const t=(x.at||'').replace('T',' ').replace('Z','');
      return t+'  '+x.type+'  '+x.message;
    }).join('\n');
  }

  function wrapWifi(){
    if(wifiWrapped)return;
    const api=window.TrenerWifi;
    if(!api||typeof api.nativeStatus!=='function')return;
    if(api.nativeStatus.__v0823Diag){wifiWrapped=true;return}
    const base=api.nativeStatus.bind(api);
    const wrapped=function(status,detail){
      const out=base(status,detail);
      write('WIFI',String(status||''),{detail:clean(detail,500)});
      return out;
    };
    wrapped.__v0823Diag=true;
    api.nativeStatus=wrapped;
    wifiWrapped=true;
  }

  function installEvents(){
    window.addEventListener('error',ev=>{
      write('JS_ERROR',ev.message||'window.error',{
        file:clean(ev.filename,180),line:ev.lineno||0,col:ev.colno||0,
        error:clean(ev.error?.stack||ev.error,900)
      });
    });
    window.addEventListener('unhandledrejection',ev=>{
      write('PROMISE_ERROR','Unhandled promise rejection',{reason:clean(ev.reason?.stack||ev.reason,900)});
    });

    document.addEventListener('focusin',ev=>{
      const id=ev.target?.id;
      if(id==='weight'||id==='reps')write('FOCUS_IN',id);
    },true);
    document.addEventListener('focusout',ev=>{
      const id=ev.target?.id;
      if(id==='weight'||id==='reps')write('FOCUS_OUT',id,{value:clean(ev.target?.value,80)});
    },true);

    document.addEventListener('click',ev=>{
      const id=ev.target?.closest?.('button')?.id;
      if(['startBtn','saveSetBtn','hostBtn','joinBtn','disconnectWifiBtn','stopBtn'].includes(id)){
        write('CLICK',id);
      }
      if(ev.target?.closest?.('.tab[data-tab="history"]'))setTimeout(render,0);
    },true);

    const logResize=()=>{
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>write('RESIZE','viewport changed'),180);
    };
    window.addEventListener('resize',logResize);
    window.visualViewport?.addEventListener('resize',logResize);

    setInterval(()=>{
      wrapWifi();
      const p=performance.now();
      const delta=p-lastBeat;
      lastBeat=p;
      if(!document.hidden&&delta>1800){
        write('UI_STALL','Pętla UI była opóźniona o '+Math.round(delta-1000)+' ms',{deltaMs:Math.round(delta)});
      }
    },1000);
  }

  function boot(){
    if(booted)return;booted=true;
    ensureUi();
    installEvents();
    wrapWifi();
    write('BOOT','Diagnostyka 0.8.2.3 uruchomiona');
    render();
  }

  window.TrenerDiagnostics={
    log:write,
    rows,
    exportText,
    render,
    clear:clearLogs
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();