(function(){
  'use strict';
  const $=id=>document.getElementById(id),KEY='trainer3.equipment.v060';
  const defaults={bars:[{name:'Gryf 1',kg:20,plates:'20:2,10:2,5:2,2.5:2,1.25:2'},{name:'Gryf 2',kg:20,plates:'20:2,10:2,5:2,2.5:2,1.25:2'}]};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function load(){try{return Object.assign({},defaults,JSON.parse(localStorage.getItem(KEY)||'null')||{})}catch(e){return JSON.parse(JSON.stringify(defaults))}}
  function save(c){localStorage.setItem(KEY,JSON.stringify(c))}
  function parsePlates(raw){return String(raw||'').split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const p=x.split(':');return {kg:Number(String(p[0]).replace(',','.'))||0,count:Math.max(0,parseInt(p[1]||'0',10)||0)}}).filter(x=>x.kg>0&&x.count>=2).sort((a,b)=>b.kg-a.kg)}
  function pairs(raw){return parsePlates(raw).map(x=>({kg:x.kg,pairs:Math.floor(x.count/2)}))}
  function fmt(n){return Number(n||0).toLocaleString('pl-PL',{maximumFractionDigits:2})}

  function best(target,bar){
    target=Number(target)||0;const barKg=Number(bar?.kg)||0;if(target<=barKg)return {total:barKg,delta:barKg-target,side:[],exact:Math.abs(barKg-target)<.001};
    const need=(target-barKg)/2,items=pairs(bar?.plates),units=[];items.forEach(p=>{for(let i=0;i<p.pairs;i++)units.push(p.kg)});
    let best={sum:0,chosen:[]};
    function rec(i,sum,chosen){if(Math.abs(sum-need)<Math.abs(best.sum-need)||(Math.abs(sum-need)===Math.abs(best.sum-need)&&chosen.length<best.chosen.length))best={sum,chosen:[...chosen]};if(i>=units.length||sum>need+10)return;rec(i+1,sum+units[i],[...chosen,units[i]]);rec(i+1,sum,chosen)}
    rec(0,0,[]);const grouped={};best.chosen.forEach(k=>grouped[k]=(grouped[k]||0)+1);const side=Object.keys(grouped).map(Number).sort((a,b)=>b-a).map(k=>({kg:k,count:grouped[k]}));const total=barKg+2*best.sum;return {total,delta:total-target,side,exact:Math.abs(total-target)<.001};
  }

  function installCss(){if($('v060-style'))return;const s=document.createElement('style');s.id='v060-style';s.textContent=`.v060Cfg{display:grid;grid-template-columns:1fr 1fr;gap:10px}.v060Bar{border:1px solid #333;border-radius:12px;padding:10px;background:#0d0d0d}.v060Bar input{width:100%;margin-top:4px}.v060Bar label{font-size:10px;color:#aaa}.v060Calc{margin:8px 0;border:1px solid #3b2b2c;border-radius:12px;padding:9px 10px;background:#100a0b;font-size:11px;line-height:1.45}.v060Calc b{color:#fff}.v060Calc .ok{color:#70e49c}.v060Calc .near{color:#ffd269}.v060Pills{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}.v060Pills span{border:1px solid #443031;border-radius:999px;padding:3px 7px;color:#ffb0b1}@media(max-width:520px){.v060Cfg{grid-template-columns:1fr}}`;document.head.appendChild(s)}
  function installSettings(){installCss();const settings=$('settings');if(!settings||$('v060Settings'))return;const c=load(),card=document.createElement('div');card.id='v060Settings';card.className='card';card.innerHTML=`<div class="eyebrow">SPRZĘT</div><h2>Gryfy i talerze</h2><p class="hint">Wpisuj talerze jako masa:liczba sztuk, np. 20:2,10:4,5:4. Kalkulator używa tylko par talerzy.</p><div class="v060Cfg">${[0,1].map(i=>`<div class="v060Bar"><label>Nazwa<input id="v060Name${i}" value="${esc(c.bars?.[i]?.name||('Gryf '+(i+1)))}"></label><label>Masa gryfu [kg]<input id="v060Kg${i}" type="number" step="0.5" value="${Number(c.bars?.[i]?.kg)||20}"></label><label>Talerze — kg:liczba<input id="v060Plates${i}" value="${esc(c.bars?.[i]?.plates||'')}"></label></div>`).join('')}</div><button id="v060Save" class="primary">ZAPISZ SPRZĘT</button>`;settings.appendChild(card);$('v060Save').onclick=()=>{const cfg={bars:[0,1].map(i=>({name:$('v060Name'+i).value.trim()||('Gryf '+(i+1)),kg:Number($('v060Kg'+i).value)||20,plates:$('v060Plates'+i).value.trim()}))};save(cfg);renderCalc();if(typeof toast==='function')toast('Sprzęt zapisany.')}}
  function installCalc(){const inputs=$('training')?.querySelector('.inputs');if(!inputs||$('v060Calc'))return;const box=document.createElement('div');box.id='v060Calc';box.className='v060Calc';inputs.insertAdjacentElement('afterend',box);$('weight')?.addEventListener('input',renderCalc)}
  function athlete(){try{return net?.active?Number(net.localAthlete||0):Number(athleteIdx||0)}catch(e){return 0}}
  function renderCalc(){const box=$('v060Calc');if(!box)return;const target=Number($('weight')?.value)||0;if(target<=0){box.innerHTML='Wpisz ciężar, a pokażę układ talerzy.';return}const cfg=load(),idx=Math.min(1,athlete()),bar=cfg.bars?.[idx]||cfg.bars?.[0]||defaults.bars[0],r=best(target,bar);box.innerHTML=`<b>${esc(bar.name)}:</b> cel ${fmt(target)} kg → <span class="${r.exact?'ok':'near'}">${r.exact?'dokładnie':'najbliżej'} ${fmt(r.total)} kg</span>${r.exact?'':` (${r.delta>0?'+':''}${fmt(r.delta)} kg)`}<div class="v060Pills">${r.side.length?r.side.map(x=>`<span>na stronę: ${fmt(x.kg)} kg × ${x.count}</span>`).join(''):'<span>sam gryf</span>'}</div>`}
  function boot(){installSettings();installCalc();setInterval(()=>{installSettings();installCalc();try{if(typeof running!=='undefined'&&running)renderCalc()}catch(e){}},700)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.TrenerPlates={best,load};
})();