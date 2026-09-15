(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function installCss(){
    if($('v058-style'))return;
    const s=document.createElement('style');s.id='v058-style';s.textContent=`
      .v058Quality{margin:10px 0 8px;border:1px solid #353535;border-radius:14px;padding:10px;background:#0c0c0c}
      .v058Title{font-size:10px;font-weight:900;letter-spacing:.09em;color:#ef4b4d;margin-bottom:8px}.v058Grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
      .v058Grid label{margin:0;font-size:10px;color:#aaa}.v058Grid select{margin-top:4px;width:100%;min-height:42px;background:#111;color:#fff;border:1px solid #3a3a3a;border-radius:10px;padding:7px}
      .v058Help{font-size:10px;color:#777;line-height:1.35;margin-top:7px}.v058Advice{margin-top:8px;border-left:3px solid #ef4b4d;background:#151010;border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.35}.v058Advice.good{border-left-color:#57d889}.v058Advice.warn{border-left-color:#ffd269}.v058Advice.stop{border-left-color:#ff5c62;color:#ffc2c4}
      .v058History{font-size:11px;color:#aaa;margin-top:7px;padding-top:7px;border-top:1px dashed #2f2f2f}
      @media(max-width:520px){.v058Grid{grid-template-columns:1fr}.v058Grid select{min-height:44px}}
    `;document.head.appendChild(s);
  }

  function installUi(){
    installCss();
    const save=$('saveSetBtn');if(!save||$('v058Quality'))return;
    const box=document.createElement('div');box.id='v058Quality';box.className='v058Quality';
    box.innerHTML=`<div class="v058Title">OCENA SERII</div><div class="v058Grid">
      <label>RIR — ile powtórzeń w zapasie<select id="v058Rir"><option value="4">4+</option><option value="3">3</option><option value="2" selected>2</option><option value="1">1</option><option value="0">0 — do granicy</option></select></label>
      <label>Technika<select id="v058Technique"><option value="good" selected>Dobra</option><option value="medium">Średnia</option><option value="bad">Zła</option></select></label>
      <label>Ból / dyskomfort<select id="v058Pain"><option value="none" selected>Brak</option><option value="mild">Lekki</option><option value="strong">Mocny</option></select></label>
    </div><div class="v058Help">RIR 2 oznacza, że po serii zostały Ci około 2 poprawne powtórzenia w zapasie. Mocny ból nie jest sygnałem do progresowania.</div><div id="v058Advice" class="v058Advice hidden"></div>`;
    save.insertAdjacentElement('beforebegin',box);
  }

  function quality(){
    return {
      rir:Math.max(0,Math.min(4,parseInt($('v058Rir')?.value||'2',10)||0)),
      technique:$('v058Technique')?.value||'good',
      pain:$('v058Pain')?.value||'none'
    };
  }

  function activeExercise(){try{return currentPlan?.ex?.[exIdx]||null}catch(e){return null}}
  function step(){const x=parseFloat(String($('stepKg')?.value||'2.5').replace(',','.'));return Number.isFinite(x)&&x>0?x:2.5}

  function adviceFor(rec,ex){
    if(!rec||!ex)return null;
    const rir=Number(rec.rir),reps=Number(rec.reps)||0;
    if(rec.pain==='strong')return {cls:'stop',text:'Mocny ból: nie zwiększaj obciążenia. Zakończ to ćwiczenie i nie wykonuj kolejnej serii, jeśli ból się utrzymuje.'};
    if(rec.pain==='mild')return {cls:'warn',text:'Lekki dyskomfort: nie dokładaj ciężaru. Pilnuj techniki i przerwij, jeśli ból narasta.'};
    if(rec.technique==='bad')return {cls:'warn',text:'Technika była zła: zmniejsz ciężar lub powtórz serię lżej. Najpierw popraw ruch, potem progresuj.'};
    if(rir===0 || reps<Number(ex.min||0))return {cls:'warn',text:'Seria była bardzo ciężka. Zostań na tym ciężarze; przy kolejnym spadku wyniku rozważ około 5% mniej.'};
    if(rec.technique==='good' && rir>=2 && reps>=Number(ex.max||0))return {cls:'good',text:'Bardzo dobra seria. Jeśli wszystkie serie będą podobne, następny trening: około +'+step().toLocaleString('pl-PL')+' kg.'};
    if(rec.technique==='good' && rir>=3 && reps>=Math.max(Number(ex.min||1),Number(ex.max||1)-1))return {cls:'good',text:'Masz wyraźny zapas. Możesz rozważyć mały wzrost ciężaru w następnej serii, jeśli ruch pozostaje czysty.'};
    return {cls:'',text:'Ciężar wygląda właściwie. Zostań na nim i próbuj utrzymać zakres z 1–2 RIR.'};
  }

  function showAdvice(rec,ex){
    const box=$('v058Advice');if(!box)return;
    const a=adviceFor(rec,ex);if(!a){box.classList.add('hidden');return;}
    box.className='v058Advice '+a.cls;box.textContent=a.text;
  }

  function patchRecord(){
    if(typeof makeRecord!=='function'||makeRecord.__v058)return;
    const base=makeRecord;
    const wrapped=function(){
      const rec=base.apply(this,arguments);const q=quality();
      rec.rir=q.rir;rec.technique=q.technique;rec.pain=q.pain;
      const ex=arguments[0]||activeExercise();
      setTimeout(()=>showAdvice(rec,ex),0);
      return rec;
    };
    wrapped.__v058=true;makeRecord=wrapped;
  }

  function patchHistory(){
    if(typeof groupHistory!=='function'||groupHistory.__v058)return;
    const base=groupHistory;
    const wrapped=function(h){
      const html=base.apply(this,arguments);
      const rows=(h?.records||[]).filter(r=>r.rir!==undefined||r.technique||r.pain);
      if(!rows.length)return html;
      const avg=rows.filter(r=>Number.isFinite(Number(r.rir))).reduce((a,r)=>a+Number(r.rir),0)/Math.max(1,rows.filter(r=>Number.isFinite(Number(r.rir))).length);
      const bad=rows.filter(r=>r.technique==='bad').length;
      const pain=rows.filter(r=>r.pain&&r.pain!=='none').length;
      return html+`<div class="v058History">Jakość: średni RIR ${avg.toFixed(1).replace('.',',')} • zła technika ${bad} • serie z dyskomfortem ${pain}</div>`;
    };
    wrapped.__v058=true;groupHistory=wrapped;
  }

  function resetForNext(){
    const t=$('v058Technique'),p=$('v058Pain');if(t)t.value='good';if(p)p.value='none';
  }

  function patchComplete(){
    if(typeof completeSet!=='function'||completeSet.__v058)return;
    const base=completeSet;
    const wrapped=function(){const before=(typeof records!=='undefined'?records.length:0);const r=base.apply(this,arguments);setTimeout(()=>{if(typeof records!=='undefined'&&records.length>before)resetForNext();},0);return r;};
    wrapped.__v058=true;completeSet=wrapped;
  }

  function boot(){installUi();patchRecord();patchHistory();patchComplete();setInterval(()=>{installUi();patchRecord();patchHistory();patchComplete();},1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.TrenerSmartSet={quality,adviceFor};
})();