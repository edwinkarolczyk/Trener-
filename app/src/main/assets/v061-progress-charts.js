(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Number(n||0).toLocaleString('pl-PL',{maximumFractionDigits:1});

  function installCss(){if($('v061-style'))return;const s=document.createElement('style');s.id='v061-style';s.textContent=`
    .v061Card{overflow:hidden}.v061Toolbar{display:flex;gap:8px;align-items:end;flex-wrap:wrap}.v061Toolbar label{flex:1;min-width:190px;font-size:10px;color:#aaa}.v061Toolbar select{width:100%;margin-top:4px;background:#111;color:#fff;border:1px solid #353535;border-radius:10px;padding:9px}.v061Chart{margin-top:10px;border:1px solid #2e2e2e;border-radius:14px;background:#080808;padding:8px;overflow:hidden}.v061Chart svg{width:100%;height:auto;display:block}.v061Legend{display:flex;gap:10px;flex-wrap:wrap;color:#999;font-size:10px;margin-top:7px}.v061Stat{margin-top:8px;font-size:11px;color:#bbb;line-height:1.4}.v061Empty{padding:28px 12px;text-align:center;color:#777;font-size:11px}
  `;document.head.appendChild(s)}

  function installUi(){installCss();const p=$('progress');if(!p||$('v061Card'))return;const c=document.createElement('div');c.id='v061Card';c.className='card v061Card';c.innerHTML=`<div class="eyebrow">WYKRESY</div><h2>Trend masy i siły</h2><div class="v061Toolbar"><label>Ćwiczenie<select id="v061Exercise"></select></label></div><div id="v061Strength" class="v061Chart"></div><div id="v061Weight" class="v061Chart"></div>`;const ref=p.querySelector('.card:nth-child(2)');if(ref)ref.insertAdjacentElement('beforebegin',c);else p.appendChild(c);$('v061Exercise').addEventListener('change',renderStrength);populate()}

  function history(){try{return typeof getHistory==='function'?getHistory():JSON.parse(localStorage.getItem('trainer3.history')||'[]')}catch(e){return []}}
  function weights(){try{return JSON.parse(localStorage.getItem('trainer3.weights')||'[]')}catch(e){return []}}
  function parseDate(v){const t=Date.parse(v||'');return Number.isFinite(t)?t:0}

  function exercises(){const map=new Map();history().forEach(h=>(h.records||[]).forEach(r=>{const k=r.id||r.name;if(k&&!map.has(k))map.set(k,r.name||r.id)}));return [...map.entries()].sort((a,b)=>a[1].localeCompare(b[1],'pl'))}
  function populate(){const sel=$('v061Exercise');if(!sel)return;const ex=exercises(),old=sel.value;sel.innerHTML=ex.length?ex.map(([id,n])=>`<option value="${esc(id)}">${esc(n)}</option>`).join(''):'<option value="">Brak danych</option>';if(old&&ex.some(x=>x[0]===old))sel.value=old;renderStrength();renderWeight()}

  function svg(points,label,unit){
    if(points.length<2)return `<div class="v061Empty">Potrzeba co najmniej 2 pomiarów, aby narysować trend.</div>`;
    const W=640,H=250,pad=36,vals=points.map(x=>x.v),min=Math.min(...vals),max=Math.max(...vals),range=Math.max(.001,max-min),x=i=>pad+i*((W-2*pad)/Math.max(1,points.length-1)),y=v=>H-pad-((v-min)/range)*(H-2*pad);
    const poly=points.map((p,i)=>`${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' '),dots=points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.v)}" r="4" fill="currentColor"><title>${esc(p.d)}: ${fmt(p.v)} ${unit}</title></circle>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="#333"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="#333"/><polyline points="${poly}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${dots}<text x="${pad}" y="20" fill="#aaa" font-size="12">${esc(label)}</text><text x="${pad}" y="${H-8}" fill="#777" font-size="10">${esc(points[0].d)}</text><text x="${W-pad}" y="${H-8}" text-anchor="end" fill="#777" font-size="10">${esc(points[points.length-1].d)}</text><text x="${W-pad}" y="20" text-anchor="end" fill="#aaa" font-size="11">${fmt(max)} ${unit}</text></svg>`
  }

  function renderStrength(){const box=$('v061Strength'),sel=$('v061Exercise');if(!box||!sel)return;const id=sel.value;if(!id){box.innerHTML='<div class="v061Empty">Brak zapisanych ćwiczeń.</div>';return}const pts=[];history().slice().reverse().forEach(h=>{const own=Number(h.localAthlete??0)||0,recs=(h.records||[]).filter(r=>(r.id||r.name)===id&&Number(r.athlete||0)===own&&Number(r.kg)>0);if(!recs.length)return;const best=recs.reduce((a,r)=>Number(r.kg)>Number(a.kg)?r:a,recs[0]);pts.push({v:Number(best.kg),d:(h.date||'').split(',')[0]||new Date(h.iso||Date.now()).toLocaleDateString('pl-PL')})});box.innerHTML=svg(pts,'Najlepszy ciężar na trening','kg')+`<div class="v061Stat">${pts.length?`Pierwszy zapis: <b>${fmt(pts[0].v)} kg</b> • ostatni: <b>${fmt(pts[pts.length-1].v)} kg</b> • zmiana: <b>${pts[pts.length-1].v-pts[0].v>=0?'+':''}${fmt(pts[pts.length-1].v-pts[0].v)} kg</b>`:'Brak danych.'}</div>`}

  function movingAverage(arr,windowSize){return arr.map((p,i)=>{const start=Math.max(0,i-windowSize+1),part=arr.slice(start,i+1);return {v:part.reduce((a,x)=>a+x.v,0)/part.length,d:p.d}})}
  function renderWeight(){const box=$('v061Weight');if(!box)return;const raw=weights().map(w=>({v:Number(w.kg)||0,d:w.date||new Date(w.iso||Date.now()).toLocaleDateString('pl-PL'),t:parseDate(w.iso)})).filter(x=>x.v>0).sort((a,b)=>a.t-b.t),avg=movingAverage(raw,7);box.innerHTML=svg(avg,'Masa ciała — średnia krocząca z maks. 7 pomiarów','kg')+`<div class="v061Stat">Średnia wygładza skoki od wody, jedzenia i pory ważenia. ${avg.length?`Aktualny trend: <b>${fmt(avg[avg.length-1].v)} kg</b>.`:''}</div>`}

  function patch(){if(typeof renderProgress!=='function'||renderProgress.__v061)return;const base=renderProgress;const w=function(){const r=base.apply(this,arguments);setTimeout(()=>{populate()},0);return r};w.__v061=true;renderProgress=w}
  function boot(){installUi();patch();setInterval(()=>{installUi();patch()},1300)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.TrenerCharts={refresh:populate};
})();