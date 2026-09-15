(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const KEY='trainer3.readiness.last';
  let session=null;

  function installCss(){
    if($('v059-style'))return;
    const s=document.createElement('style');s.id='v059-style';s.textContent=`
      .v059Card{margin:12px 0;border:1px solid #343434;border-radius:15px;background:#0c0c0c;padding:11px}.v059Head{display:flex;align-items:center;justify-content:space-between;gap:8px}.v059Head b{font-size:11px;color:#ef4b4d;letter-spacing:.08em}.v059Score{font-size:12px;font-weight:900;color:#ddd}.v059Grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:9px}.v059Grid label{font-size:10px;color:#aaa}.v059Grid select{width:100%;margin-top:4px;min-height:40px;background:#111;color:#fff;border:1px solid #373737;border-radius:9px;padding:6px}.v059Advice{margin-top:9px;padding:9px 10px;border-left:3px solid #ef4b4d;background:#150d0e;border-radius:8px;font-size:11px;line-height:1.4}.v059Advice.good{border-left-color:#57d889}.v059Advice.warn{border-left-color:#ffd269}.v059Apply{display:flex;gap:8px;align-items:flex-start;margin-top:8px;color:#bbb;font-size:10px;line-height:1.35}.v059Apply input{margin-top:2px}.v059Badge{display:inline-block;margin-left:6px;padding:3px 6px;border-radius:999px;font-size:9px;background:#241516;color:#ff9b9d}
      @media(max-width:500px){.v059Grid{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(s);
  }

  function installUi(){
    installCss();const setup=$('setup');const start=$('startBtn');if(!setup||!start||$('v059Card'))return;
    const card=document.createElement('div');card.id='v059Card';card.className='v059Card';
    card.innerHTML=`<div class="v059Head"><b>GOTOWOŚĆ DO TRENINGU</b><span id="v059Score" class="v059Score">—</span></div><div class="v059Grid">
      <label>Sen<select id="v059Sleep"><option value="5">5 — bardzo dobry</option><option value="4">4 — dobry</option><option value="3" selected>3 — średni</option><option value="2">2 — słaby</option><option value="1">1 — bardzo słaby</option></select></label>
      <label>Energia<select id="v059Energy"><option value="5">5 — bardzo wysoka</option><option value="4">4 — dobra</option><option value="3" selected>3 — średnia</option><option value="2">2 — niska</option><option value="1">1 — bardzo niska</option></select></label>
      <label>Zmęczenie<select id="v059Fatigue"><option value="1">1 — brak</option><option value="2">2 — małe</option><option value="3" selected>3 — średnie</option><option value="4">4 — duże</option><option value="5">5 — bardzo duże</option></select></label>
      <label>Zakwasy / ból<select id="v059Soreness"><option value="1">1 — brak</option><option value="2">2 — lekkie</option><option value="3" selected>3 — średnie</option><option value="4">4 — duże</option><option value="5">5 — mocny ból</option></select></label>
    </div><div id="v059Advice" class="v059Advice">Ustaw samopoczucie przed startem.</div><label class="v059Apply"><input id="v059Apply" type="checkbox" checked><span>Zastosuj rekomendację automatycznie do sugerowanego ciężaru i objętości. W trybie dwóch telefonów nie zmieniam automatycznie liczby serii, żeby oba telefony pozostały zgodne.</span></label>`;
    start.insertAdjacentElement('beforebegin',card);
    ['v059Sleep','v059Energy','v059Fatigue','v059Soreness','v059Apply'].forEach(id=>$(id)?.addEventListener('change',render));
    try{const old=JSON.parse(localStorage.getItem(KEY)||'null');if(old){if(old.sleep)$('v059Sleep').value=old.sleep;if(old.energy)$('v059Energy').value=old.energy;if(old.fatigue)$('v059Fatigue').value=old.fatigue;if(old.soreness)$('v059Soreness').value=old.soreness;}}catch(e){}
    render();
  }

  function read(){
    const sleep=Number($('v059Sleep')?.value||3),energy=Number($('v059Energy')?.value||3),fatigue=Number($('v059Fatigue')?.value||3),soreness=Number($('v059Soreness')?.value||3);
    const score=Math.max(1,Math.min(5,(sleep+energy+(6-fatigue)+(6-soreness))/4));
    let level='normal',loadFactor=1,volumeFactor=1,restExtra=0,text='Gotowość średnia: wykonaj trening normalnie, ale nie wymuszaj progresu.';
    if(soreness>=5){level='red';loadFactor=.9;volumeFactor=.75;restExtra=30;text='Mocny ból: nie trenuj bolesnego ruchu na siłę. Wybierz lżejszy wariant lub pomiń ćwiczenie, jeśli ból się utrzymuje.';}
    else if(score>=4.2){level='good';loadFactor=1;volumeFactor=1;restExtra=0;text='Dobra gotowość: możesz realizować normalną progresję, jeśli rozgrzewka i technika są dobre.';}
    else if(score<2.8){level='low';loadFactor=.95;volumeFactor=.8;restExtra=30;text='Niska gotowość: około 5% lżej, mniej serii akcesoryjnych i dłuższe przerwy. Zostaw 2–3 RIR.';}
    else if(score<3.5){level='caution';loadFactor=1;volumeFactor=.9;restExtra=15;text='Słabszy dzień: nie dokładaj ciężaru na siłę. Zostaw większy zapas i skróć dodatki, jeśli forma spada.';}
    return {sleep,energy,fatigue,soreness,score,level,loadFactor,volumeFactor,restExtra,apply:$('v059Apply')?.checked!==false,text,at:Date.now()};
  }

  function render(){
    const r=read();const sc=$('v059Score'),a=$('v059Advice');if(sc)sc.textContent=r.score.toFixed(1).replace('.',',')+' / 5';if(a){a.textContent=r.text;a.className='v059Advice '+(r.level==='good'?'good':(r.level==='low'||r.level==='red'?'warn':''));}
  }

  function roundStep(v){const step=Math.max(.5,parseFloat(String($('stepKg')?.value||'2.5').replace(',','.'))||2.5);return Math.max(0,Math.round(v/step)*step)}

  function patchStart(){
    if(typeof startWorkout!=='function'||startWorkout.__v059)return;const base=startWorkout;
    const wrapped=function(){
      session=read();try{localStorage.setItem(KEY,JSON.stringify(session));}catch(e){}
      const out=base.apply(this,arguments);
      if(session.apply && typeof running!=='undefined'&&running){
        try{
          if(!(net?.active) && session.volumeFactor<1 && currentPlan?.ex){
            currentPlan=JSON.parse(JSON.stringify(currentPlan));
            currentPlan.ex=currentPlan.ex.map((ex,i)=>Object.assign({},ex,{sets:(i>=2&&Number(ex.sets)>2)?Math.max(2,Math.round(Number(ex.sets)*session.volumeFactor)):Number(ex.sets)}));
            if(typeof updateView==='function')updateView();
          }
          const coach=$('coach');if(coach)coach.innerHTML='<b>Gotowość '+session.score.toFixed(1).replace('.',',')+'/5:</b> '+session.text;
        }catch(e){}
      }
      return out;
    };wrapped.__v059=true;startWorkout=wrapped;
  }

  function patchPrefill(){
    if(typeof prefillWeight!=='function'||prefillWeight.__v059)return;const base=prefillWeight;
    const wrapped=function(){
      const out=base.apply(this,arguments);
      try{
        if(!session?.apply||session.loadFactor>=1)return out;
        const athlete=net?.active?Number(net.localAthlete||0):Number(athleteIdx||0);
        const already=(records||[]).some(r=>Number(r.ex)===Number(exIdx)&&Number(r.athlete||0)===athlete);
        if(already)return out;
        const input=$('weight'),w=parseFloat(String(input?.value||'').replace(',','.'));
        if(input&&Number.isFinite(w)&&w>0)input.value=roundStep(w*session.loadFactor);
      }catch(e){}
      return out;
    };wrapped.__v059=true;prefillWeight=wrapped;
  }

  function patchHistory(){
    if(typeof saveHistory!=='function'||saveHistory.__v059)return;const base=saveHistory;
    const wrapped=function(){const out=base.apply(this,arguments);try{const h=typeof getHistory==='function'?getHistory():[];if(h[0]&&session){h[0].readiness=session;localStorage.setItem('trainer3.history',JSON.stringify(h.slice(0,100)));}}catch(e){}return out;};wrapped.__v059=true;saveHistory=wrapped;
  }

  function boot(){installUi();patchStart();patchPrefill();patchHistory();setInterval(()=>{installUi();patchStart();patchPrefill();patchHistory();},1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.TrenerReadiness={read:()=>session||read(),current:()=>session};
})();