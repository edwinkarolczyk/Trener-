(function(){
  'use strict';

  const AI_IDS=['bench','closebench','pushups','row','deadlift','squat','curl','ohp','lunges','plank','onearmrow'];
  const AI_FILES=AI_IDS.map(id=>'ai-exercise-'+id+'.js');
  let activeId='';
  let touchX=0;

  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtRest(sec){sec=Number(sec)||0;return sec>=60?(sec%60?Math.floor(sec/60)+' min '+(sec%60)+' s':Math.floor(sec/60)+' min'):sec+' s';}
  function getEx(id){try{return exerciseLibrary.find(x=>x.id===id)||null;}catch(e){return null;}}

  function ensureOneArmRow(){
    try{
      if(exerciseLibrary.some(x=>x.id==='onearmrow'))return;
      exerciseLibrary.push({
        id:'onearmrow',n:'Wiosłowanie hantlem jednorącz',sets:3,min:8,max:12,rest:90,
        group:'Plecy',equipment:'Hantel + ławka',
        tip:'Oprzyj wolną rękę i kolano o ławkę. Prowadź łokieć w stronę biodra.',
        setup:'Ustaw stabilne podparcie na ławce, plecy neutralnie, brzuch napięty.',
        movement:'Przyciągnij hantel w stronę biodra bez skręcania tułowia, a następnie opuść go pod kontrolą.',
        mistake:'Skręcanie tułowia, szarpanie ciężaru i unoszenie barku do ucha.'
      });
      if(typeof renderBuilder==='function')renderBuilder();
    }catch(e){console.warn('onearmrow:',e);}
  }

  function neutralizePlanNames(){
    try{
      if(typeof plans!=='undefined'){
        if(plans.mon)plans.mon.title='Trening A — klatka + triceps';
        if(plans.wed)plans.wed.title='Trening B — plecy + biceps';
        if(plans.fri)plans.fri.title='Trening C — barki + nogi + brzuch';
        if(plans.biceps)plans.biceps.title='Trening dodatkowy — biceps';
      }
      const select=document.getElementById('planSelect');
      if(select){
        const labels={mon:'Trening A — klatka + triceps',wed:'Trening B — plecy + biceps',fri:'Trening C — barki + nogi + brzuch',biceps:'Trening dodatkowy — biceps'};
        [...select.options].forEach(o=>{if(labels[o.value])o.textContent=labels[o.value];});
      }
      const mini=[...document.querySelectorAll('#start .miniCard')].find(x=>x.querySelector('span')?.textContent.trim()==='Plan');
      if(mini){const b=mini.querySelector('b');if(b)b.textContent='DOWOLNE DNI';}
      const base=document.querySelector('#plan .card:not(#v050ScheduleCard)');
      if(base){
        const eyebrow=base.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='PLANY BAZOWE';
        const h=base.querySelector('h2');if(h)h.textContent='Trening A / B / C';
        const cards=[...base.querySelectorAll('.dayCard')];
        ['A','B','C'].forEach((x,i)=>{const b=cards[i]?.querySelector('b');if(b)b.textContent=x;});
      }
    }catch(e){console.warn('neutral names:',e);}
  }

  function neutralizeReminderDefault(){
    try{
      if(localStorage.getItem('trainer3.reminders')!==null)return;
      let nativeEnabled=false;
      try{if(window.Android&&Android.getReminderConfig)nativeEnabled=!!JSON.parse(Android.getReminderConfig()).enabled;}catch(e){}
      if(nativeEnabled)return;
      localStorage.setItem('trainer3.reminders',JSON.stringify({enabled:false,days:'',hour:18,minute:0}));
      document.querySelectorAll('.dayCheck').forEach(c=>c.checked=false);
      const status=document.getElementById('reminderStatus');if(status)status.textContent='Powiadomienia są wyłączone. Wybierz własne dni, jeśli chcesz je włączyć.';
    }catch(e){console.warn('neutral reminders:',e);}
  }

  function difficulty(ex){
    if(ex.time&&ex.id==='plank')return 'ŁATWA / ŚREDNIA';
    const r=Number(ex.rest)||0,s=Number(ex.sets)||0;
    if(r>=150||s>=4)return 'ŚREDNIA / TRUDNA';
    if(r<=75&&s<=3)return 'ŁATWA / ŚREDNIA';
    return 'ŚREDNIA';
  }

  function currentExercise(){
    try{if(typeof currentPlan!=='undefined'&&currentPlan?.ex?.[exIdx])return currentPlan.ex[exIdx];}catch(e){}
    const name=document.getElementById('exercise')?.textContent?.trim();
    try{return exerciseLibrary.find(x=>x.n===name)||null;}catch(e){return null;}
  }

  function availableIds(){return AI_IDS.filter(id=>window.TrenerAiImages?.[id]&&getEx(id));}

  function close(){document.getElementById('v054Overlay')?.remove();activeId='';}

  function move(delta){
    const ids=availableIds();if(!ids.length)return;
    let i=ids.indexOf(activeId);if(i<0)i=0;
    i=(i+delta+ids.length)%ids.length;
    open(ids[i]);
  }

  function open(id){
    const ex=getEx(id);const src=window.TrenerAiImages?.[id];
    if(!ex||!src){
      if(window.TrenerExerciseVisuals?.open)window.TrenerExerciseVisuals.open(id);
      else if(typeof toast==='function')toast('Dla tego ćwiczenia jest jeszcze podgląd schematyczny.');
      return;
    }
    activeId=id;
    document.getElementById('v054Overlay')?.remove();
    const ids=availableIds(),idx=ids.indexOf(id);
    const reps=ex.min===ex.max?String(ex.min):(ex.min+'–'+ex.max);
    const o=document.createElement('div');o.id='v054Overlay';o.className='v054Overlay';
    o.innerHTML=`<div class="v054Modal">
      <div class="v054Top"><div><div class="eyebrow">PODGLĄD AI • JAK WYKONAĆ</div><h2>${esc(ex.n)}</h2></div><button class="secondary" data-close>✕</button></div>
      <div class="v054Tags"><span>${esc(ex.group||'Ćwiczenie')}</span><span>${esc(ex.equipment||'')}</span><span>${ex.sets} × ${esc(reps)}${ex.time?' sek.':' powt.'}</span><span>Przerwa ${esc(fmtRest(ex.rest))}</span><span>${difficulty(ex)}</span></div>
      <div class="v054ImageWrap"><img class="v054Image" src="${src}" alt="${esc(ex.n)} — instrukcja AI"><div class="v054Tap">DOTKNIJ GRAFIKI, ABY POWIĘKSZYĆ</div></div>
      <div class="v054Nav"><button class="secondary" data-prev ${ids.length<2?'disabled':''}>‹ POPRZEDNIE</button><b>${idx+1} / ${ids.length}</b><button class="secondary" data-next ${ids.length<2?'disabled':''}>NASTĘPNE ›</button></div>
      <div class="v054Detail"><span>USTAWIENIE</span><b>${esc(ex.setup||ex.tip||'Ustaw stabilną pozycję.')}</b></div>
      <div class="v054Detail"><span>WYKONANIE</span><b>${esc(ex.movement||ex.tip||'Wykonuj ruch pod kontrolą.')}</b></div>
      <div class="v054Detail"><span>WSKAZÓWKA</span><b>${esc(ex.tip||'Kontroluj pełny zakres ruchu.')}</b></div>
      <div class="v054Detail"><span>NAJCZĘSTSZY BŁĄD</span><b class="v054Danger">${esc(ex.mistake||'Nie przyspieszaj kosztem techniki.')}</b></div>
    </div>`;
    document.body.appendChild(o);
    o.querySelector('[data-close]').onclick=close;
    o.querySelector('[data-prev]').onclick=()=>move(-1);
    o.querySelector('[data-next]').onclick=()=>move(1);
    const img=o.querySelector('.v054Image');img.onclick=()=>img.classList.toggle('v054Zoomed');
    o.querySelector('.v054ImageWrap').addEventListener('touchstart',e=>{touchX=e.changedTouches?.[0]?.clientX||0;},{passive:true});
    o.querySelector('.v054ImageWrap').addEventListener('touchend',e=>{const x=e.changedTouches?.[0]?.clientX||0,d=x-touchX;if(Math.abs(d)>70)move(d<0?1:-1);},{passive:true});
    o.addEventListener('click',e=>{if(e.target===o)close();});
  }

  function interceptPreviewClicks(){
    document.addEventListener('click',e=>{
      const preview=e.target.closest?.('[data-preview]');
      if(preview&&window.TrenerAiImages?.[preview.dataset.preview]){
        e.preventDefault();e.stopImmediatePropagation();open(preview.dataset.preview);return;
      }
      const how=e.target.closest?.('#v052HowBtn');
      if(how){const ex=currentExercise();if(ex&&window.TrenerAiImages?.[ex.id]){e.preventDefault();e.stopImmediatePropagation();open(ex.id);}}
    },true);
  }

  function ensureCss(){
    if(document.getElementById('v054-style'))return;
    const s=document.createElement('style');s.id='v054-style';s.textContent=`
      .v054Overlay{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.9);display:flex;align-items:flex-end;justify-content:center;padding:10px}
      .v054Modal{width:min(720px,100%);max-height:94vh;overflow:auto;background:#0d0d0d;border:1px solid #442223;border-radius:20px;padding:15px;box-shadow:0 -10px 40px #000}
      .v054Top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.v054Top h2{font-size:24px;line-height:1.05;margin:3px 0 8px}.v054Top button{padding:7px 10px}
      .v054Tags{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0 12px}.v054Tags span{font-size:10px;border:1px solid #393939;border-radius:999px;padding:5px 8px;color:#bbb}
      .v054ImageWrap{overflow:auto;border-radius:15px;border:1px solid #352020;background:#050505;text-align:center;touch-action:pan-x pan-y pinch-zoom}.v054Image{display:block;width:100%;height:auto;margin:auto;transition:width .18s ease}.v054Image.v054Zoomed{width:165%;max-width:none}.v054Tap{font-size:9px;letter-spacing:.08em;color:#777;padding:7px}
      .v054Nav{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin:10px 0}.v054Nav button:last-child{justify-self:stretch}.v054Nav b{font-size:11px;color:#aaa;white-space:nowrap}
      .v054Detail{border-top:1px solid #292929;padding:10px 2px}.v054Detail span{display:block;color:#ef4b4d;font-size:10px;font-weight:900;letter-spacing:.08em}.v054Detail b{display:block;margin-top:4px;font-size:13px;line-height:1.4}.v054Danger{color:#ff9b9d!important}
      @media(max-width:430px){.v054Top h2{font-size:21px}.v054Modal{padding:11px}.v054Nav button{font-size:10px;padding:8px 5px}}
    `;document.head.appendChild(s);
  }

  function loadScript(src){return new Promise(resolve=>{const id='v054-'+src;if(document.getElementById(id)){resolve();return;}const s=document.createElement('script');s.id=id;s.src=src;s.onload=resolve;s.onerror=resolve;document.body.appendChild(s);});}

  async function loadImages(){for(const f of AI_FILES)await loadScript(f);}

  async function boot(){
    ensureCss();ensureOneArmRow();neutralizePlanNames();neutralizeReminderDefault();interceptPreviewClicks();
    await loadImages();
    neutralizePlanNames();
    if(typeof renderBuilder==='function')try{renderBuilder();}catch(e){}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
  window.TrenerAiPreview={open};
})();
