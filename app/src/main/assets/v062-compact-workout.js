(function(){
  'use strict';

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmt(ms){
    const sec=Math.max(0,Math.ceil((Number(ms)||0)/1000));
    const m=Math.floor(sec/60),s=sec%60;
    return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }
  function currentEx(){try{return currentPlan?.ex?.[exIdx]||null;}catch(e){return null;}}
  function activeAthlete(){try{return net.active?net.localAthlete:athleteIdx;}catch(e){return 0;}}
  function athleteLabel(i){try{return athleteName(i);}catch(e){return i===0?'Osoba 1':'Osoba 2';}}
  function completedFor(i){try{return records.filter(r=>Number(r.athlete||0)===i).length;}catch(e){return 0;}}
  function totalSets(){try{return (currentPlan?.ex||[]).reduce((n,e)=>n+(Number(e.sets)||0),0);}catch(e){return 0;}}
  function restLeft(i){
    const now=Date.now();
    try{
      if(i===activeAthlete() && Number(restEnd)>now)return Number(restEnd)-now;
      const list=records.filter(r=>Number(r.athlete||0)===i).sort((a,b)=>(Number(b.at)||0)-(Number(a.at)||0));
      const last=list[0];if(!last)return 0;
      const ex=currentPlan?.ex?.[Number(last.ex)||0];
      return Math.max(0,(Number(last.at)||0)+(Number(ex?.rest)||0)*1000-now);
    }catch(e){return 0;}
  }

  function installCss(){
    if(document.getElementById('v062-style'))return;
    const s=document.createElement('style');s.id='v062-style';s.textContent=`
      html.v062Active,html.v062Active body{overflow:hidden!important;overscroll-behavior:none!important;background:#050505}
      body.v062Active .appHeader,body.v062Active .tabs,body.v062Active #start>.compactTop{display:none!important}
      body.v062Active .app{min-height:100dvh!important}
      body.v062Active main{padding:0!important;margin:0!important;max-width:none!important}
      body.v062Active #start{display:block!important;padding:0!important;margin:0!important}
      body.v062Active #setup{display:none!important}
      body.v062Active #training.trainingCard{display:flex!important;flex-direction:column!important;position:fixed!important;inset:0!important;z-index:11500!important;height:100dvh!important;max-height:100dvh!important;box-sizing:border-box!important;margin:0!important;padding:calc(7px + env(safe-area-inset-top)) 10px calc(7px + env(safe-area-inset-bottom))!important;border:0!important;border-radius:0!important;overflow:hidden!important;background:linear-gradient(180deg,#090909 0%,#050505 100%)!important}
      body.v062Active #training .topline{order:1;min-height:22px;margin:0 0 2px!important;display:flex!important;align-items:center;gap:7px}
      body.v062Active #training #stateBadge{font-size:9px!important;padding:4px 7px!important}
      body.v062Active #training #planTitle{font-size:10px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
      .v062Clock{margin-left:auto;font-size:15px;font-weight:950;letter-spacing:.04em;color:#fff;white-space:nowrap}
      .v062Clock span{display:block;font-size:8px;color:#777;letter-spacing:.08em;text-align:right}

      body.v062Active #training #athlete{display:none!important}
      body.v062Active #training #exercise{order:2;margin:2px 104px 1px 0!important;font-size:21px!important;line-height:1.02!important;min-height:43px;display:flex;align-items:center}
      body.v062Active #training #series,body.v062Active #training #target,body.v062Active #training #technique{display:none!important}
      .v062Summary{order:3;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:2px 0 7px}
      .v062Stat{min-width:0;border:1px solid #2b2b2b;background:#0d0d0d;border-radius:11px;padding:6px 7px;text-align:center}
      .v062Stat span{display:block;color:#777;font-size:8px;font-weight:900;letter-spacing:.07em;white-space:nowrap}
      .v062Stat b{display:block;margin-top:2px;font-size:14px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .v062Stat.red b{color:#ff696b}.v062Stat.gold b{color:#ffd269}.v062Stat.green b{color:#70efa6}

      body.v062Active #training #v055Flow{order:4;margin:0 0 6px!important}
      body.v062Active #training #v055Flow .v055Rule{display:none!important}
      body.v062Active #training #v055People{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
      body.v062Active #training #v055People .v055Person{padding:7px 8px!important;border-radius:11px!important;min-height:54px!important}
      body.v062Active #training #v055People .v055PersonName{font-size:12px!important}
      body.v062Active #training #v055People .v055State{font-size:10px!important;margin-top:2px!important}
      body.v062Active #training #v055People .v055RestClock{font-size:20px!important;margin-top:1px!important;line-height:1!important}
      body.v062Active #training #v055People .v055PersonMeta{font-size:9px!important;margin-top:3px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      body.v062Active #training #v055People:has(.v055Person:only-child){grid-template-columns:1fr!important}

      body.v062Active #training #v055Visual{order:2;position:absolute!important;top:calc(34px + env(safe-area-inset-top))!important;right:10px!important;width:88px!important;height:88px!important;margin:0!important;padding:0!important;border-radius:13px!important;overflow:hidden!important;z-index:2;background:#080808!important}
      body.v062Active #training #v055Visual .v055VisualTop{display:none!important}
      body.v062Active #training #v055Visual #v055VisualBody{min-height:88px!important;height:88px!important;border-radius:12px!important}
      body.v062Active #training #v055Visual .v056Chips,body.v062Active #training #v055Visual .v056Scheme,body.v062Active #training #v055Visual .v056MotionText,body.v062Active #training #v055Visual .v056HeroLabels{display:none!important}
      body.v062Active #training #v055Visual .v056Hero{margin:0!important;border:0!important;border-radius:0!important;height:88px!important}
      body.v062Active #training #v055Visual .v056HeroImage,body.v062Active #training #v055Visual .v055Sprite{height:88px!important;max-height:88px!important;aspect-ratio:1/1!important;background-size:100% 1100%!important}
      body.v062Active #training #v055Visual .v055Fallback,body.v062Active #training #v055Visual .v056Pro{height:88px!important;overflow:hidden!important}

      body.v062Active #training .inputs{order:5;display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin:0 0 6px!important}
      body.v062Active #training .inputs label{font-size:9px!important;margin:0 0 3px!important;color:#999}
      body.v062Active #training .inputs input{height:48px!important;font-size:22px!important;font-weight:900!important;text-align:center!important;padding:6px 8px!important;border-radius:11px!important}
      body.v062Active #training #v055SaveNote{display:none!important}
      body.v062Active #training #saveSetBtn{order:6;min-height:60px!important;height:60px!important;margin:0 0 6px!important;border-radius:14px!important;font-size:16px!important;font-weight:950!important;letter-spacing:.025em!important;flex:0 0 60px!important}

      body.v062Active #training #restBox{order:7;min-height:68px!important;margin:0 0 6px!important;padding:7px 10px!important;border-radius:13px!important;display:grid!important;grid-template-columns:1fr auto!important;grid-template-rows:auto 1fr!important;align-items:center!important;gap:0 8px!important;flex:0 0 68px!important;box-sizing:border-box!important}
      body.v062Active #training #restBox .small{font-size:9px!important;grid-column:1!important;grid-row:1!important;margin:0!important}
      body.v062Active #training #restTime{font-size:30px!important;line-height:1!important;grid-column:1!important;grid-row:2!important;text-align:left!important;margin:0!important;font-weight:950!important}
      .v062RestTarget{font-size:10px;color:#8d8d8d;margin-left:6px;font-weight:800}
      body.v062Active #training #skipRestBtn{grid-column:2!important;grid-row:1 / span 2!important;min-height:44px!important;padding:7px 10px!important;margin:0!important;font-size:10px!important}

      body.v062Active #training #wifiLive,body.v062Active #training #coach{display:none!important}
      body.v062Active #training .controls{order:8;display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin:0!important;margin-top:auto!important;flex:0 0 50px!important}
      body.v062Active #training .controls button{height:50px!important;min-height:50px!important;font-size:13px!important;font-weight:950!important;border-radius:12px!important;margin:0!important}

      @media(max-height:720px){
        body.v062Active #training.trainingCard{padding-top:calc(5px + env(safe-area-inset-top))!important;padding-bottom:calc(5px + env(safe-area-inset-bottom))!important}
        body.v062Active #training #exercise{font-size:18px!important;min-height:36px!important}
        body.v062Active #training #v055Visual{width:72px!important;height:72px!important;top:calc(31px + env(safe-area-inset-top))!important}
        body.v062Active #training #v055Visual #v055VisualBody,body.v062Active #training #v055Visual .v056Hero,body.v062Active #training #v055Visual .v056HeroImage,body.v062Active #training #v055Visual .v055Sprite{height:72px!important;min-height:72px!important;max-height:72px!important}
        body.v062Active #training #exercise{margin-right:86px!important}
        .v062Summary{margin-bottom:4px!important}.v062Stat{padding:4px 5px!important}.v062Stat b{font-size:12px!important}
        body.v062Active #training #v055People .v055Person{min-height:47px!important;padding:5px 7px!important}.v055PersonMeta{display:none!important}
        body.v062Active #training .inputs input{height:42px!important;font-size:19px!important}
        body.v062Active #training #saveSetBtn{height:54px!important;min-height:54px!important;flex-basis:54px!important}
        body.v062Active #training #restBox{min-height:60px!important;flex-basis:60px!important}.v062RestTarget{font-size:9px!important}
        body.v062Active #training #restTime{font-size:26px!important}
        body.v062Active #training .controls{flex-basis:44px!important}.controls button{height:44px!important;min-height:44px!important}
      }
      @media(max-width:380px){body.v062Active #training #exercise{font-size:18px!important}.v062Stat span{font-size:7px!important}.v062Stat b{font-size:12px!important}}
    `;document.head.appendChild(s);
  }

  function ensureUi(){
    const training=document.getElementById('training');if(!training)return;
    if(!document.getElementById('v062Clock')){
      const c=document.createElement('div');c.id='v062Clock';c.className='v062Clock';c.innerHTML='<span>CZAS TRENINGU</span><b>00:00</b>';
      training.querySelector('.topline')?.appendChild(c);
    }
    if(!document.getElementById('v062Summary')){
      const x=document.createElement('div');x.id='v062Summary';x.className='v062Summary';
      x.innerHTML='<div class="v062Stat red"><span>SERIA</span><b id="v062Series">—</b></div><div class="v062Stat green"><span>CEL</span><b id="v062Target">—</b></div><div class="v062Stat gold"><span>ZOSTAŁO</span><b id="v062Left">—</b></div>';
      const exercise=document.getElementById('exercise');exercise?.insertAdjacentElement('afterend',x);
    }
    if(!document.getElementById('v062RestTarget')){
      const t=document.createElement('span');t.id='v062RestTarget';t.className='v062RestTarget';
      document.getElementById('restTime')?.insertAdjacentElement('afterend',t);
    }
  }

  function update(){
    let isRunning=false;try{isRunning=!!running;}catch(e){}
    document.documentElement.classList.toggle('v062Active',isRunning);
    document.body?.classList.toggle('v062Active',isRunning);
    if(!isRunning)return;
    ensureUi();
    const ex=currentEx();if(!ex)return;
    const a=activeAthlete();
    const clock=document.getElementById('v062Clock')?.querySelector('b');
    const source=document.getElementById('clock');if(clock&&source)clock.textContent=source.textContent||'00:00';
    const series=document.getElementById('v062Series');if(series)series.textContent=(Number(setIdx)+1)+' / '+(Number(ex.sets)||0);
    const target=document.getElementById('v062Target');if(target)target.textContent=(ex.min===ex.max?String(ex.min):(ex.min+'–'+ex.max))+(ex.time?' s':' powt.');
    const left=document.getElementById('v062Left');if(left)left.textContent=Math.max(0,totalSets()-completedFor(a))+' serii';
    const rt=document.getElementById('v062RestTarget');if(rt){
      const leftMs=restLeft(a),full=(Number(ex.rest)||0)*1000;
      rt.textContent=leftMs>0?('z '+fmt(full)):('przerwa '+fmt(full));
    }
    const save=document.getElementById('saveSetBtn');
    if(save && !save.disabled && !paused)save.textContent='ZAPISZ SERIĘ — '+athleteLabel(a).toUpperCase();
  }

  function boot(){
    installCss();ensureUi();
    setInterval(update,200);
    document.addEventListener('visibilitychange',update);
    window.addEventListener('resize',update);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
