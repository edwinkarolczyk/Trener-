(function(){
  'use strict';
  const KEY='trainer3.cardLayout.v085';
  const LEGACY='trainer3.dietLayout.v084';
  const HOLD_MS=1000;
  const TABS=['start','plan','history','progress','diet','settings'];
  const $=id=>document.getElementById(id);
  let press=null,drag=null,refreshTimer=null,autoScrollFrame=0,refreshing=false;

  function read(key,fallback){
    try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}
    catch(e){return fallback;}
  }
  function state(){
    const v=read(KEY,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  }
  function remember(tab,root){
    const layout=state();
    layout[tab]=layout[tab]||{};
    layout[tab].order=cards(root).map(c=>c.dataset.v085Key);
    try{localStorage.setItem(KEY,JSON.stringify(layout));}catch(e){}
    if(tab==='diet'){
      // v084 continues to restore its own saved order when Diet is reopened.
      const old=read(LEGACY,{}),data=old&&typeof old==='object'?old:{};
      data.order=layout[tab].order.slice();
      try{localStorage.setItem(LEGACY,JSON.stringify(data));}catch(e){}
    }
  }
  function rootFor(tab){
    return tab==='diet'?$('v076DietRoot'):$(tab);
  }
  function trainingActive(){
    const training=$('training');
    return !!(training&&!training.classList.contains('hidden'));
  }
  function canDrag(tab){
    return TABS.includes(tab)&&!trainingActive()&&!drag&&!press;
  }
  function movable(card,tab){
    if(!card||card.parentElement!==rootFor(tab)||!card.classList.contains('card'))return false;
    if(tab==='start'&&(card.id==='training'||card.contains($('training'))))return false;
    return !card.classList.contains('hidden')&&!card.classList.contains('v070LegacyHidden');
  }
  function cards(root){
    return Array.from(root?.children||[]).filter(c=>c.dataset.v085Key);
  }
  function stableKey(card,tab){
    if(tab==='diet')return card.dataset.v084Key||'';
    if(card.id)return card.id;
    if(card.dataset.v085Key)return card.dataset.v085Key;
    const siblings=Array.from(card.parentElement.children).filter(c=>c.classList.contains('card'));
    return tab+'-card-'+siblings.indexOf(card);
  }
  function order(actual,saved){
    const known=Array.isArray(saved)?saved:[];
    const rank=new Map(known.map((v,i)=>[v,i]));
    return actual.slice().sort((a,b)=>{
      const ai=rank.has(a)?rank.get(a):1000+actual.indexOf(a);
      const bi=rank.has(b)?rank.get(b):1000+actual.indexOf(b);
      return ai-bi;
    });
  }
  function applyOrder(root,keys){
    const existing=cards(root), map=new Map(existing.map(c=>[c.dataset.v085Key,c]));
    if(existing.length<2)return;
    const next=keys.map(k=>map.get(k)).filter(Boolean);
    if(next.length!==existing.length)return;
    const slots=existing.map(c=>{
      const marker=document.createComment('v085-slot');
      root.insertBefore(marker,c);
      return marker;
    });
    next.forEach((card,i)=>root.insertBefore(card,slots[i]));
    slots.forEach(x=>x.remove());
  }
  function css(){
    if($('v085LayoutCss'))return;
    const s=document.createElement('style');s.id='v085LayoutCss';
    s.textContent=`
      .v085Head{display:flex;align-items:center;gap:8px;min-width:0;margin-bottom:12px}
      .v085Toggle{flex:1 1 auto;min-width:0!important;display:flex!important;align-items:center;
        justify-content:space-between;text-align:left!important;padding:2px 0!important;margin:0!important;
        border:0!important;box-shadow:none!important;background:transparent!important;
        color:inherit!important;height:auto!important}
      .v085Text{min-width:0;display:flex;flex-direction:column;gap:4px}
      .v085Text small{font-size:10px;letter-spacing:.11em;color:#ef4444;text-transform:uppercase}
      .v085Text strong{font-size:21px;line-height:1.24;color:#f5f5f5;
        font-weight:900;overflow-wrap:anywhere;white-space:normal}
      .v085Chevron{font-size:22px;padding:0 5px;flex-shrink:0}
      .v085OldTitle{display:none!important}
      .v085Collapsed > :not(.v085Head){display:none!important}
      .v085Collapsed > .v085Head{margin-bottom:0}
      .v085Grip{flex:0 0 46px;min-width:46px!important;width:46px!important;height:46px!important;
        margin:0!important;padding:0!important;border:1px solid #434343!important;
        background:#292929!important;color:#e5e5e5!important;border-radius:11px!important;
        font-size:25px!important;line-height:1!important;cursor:grab;touch-action:none;
        user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
      .v085Grip:disabled{opacity:.26!important;cursor:default}
      .v085Grip.v085Holding{background:#43352a!important;border-color:#f1b766!important}
      .v085DragItem{position:relative;z-index:15!important;will-change:transform;
        box-shadow:0 17px 38px rgba(0,0,0,.62),0 0 0 2px #ef4444!important;
        border-color:#ef4444!important;pointer-events:none}
      .v085DragItem .v085Grip{cursor:grabbing}
      #v076DietRoot .v084MoveUp,#v076DietRoot .v084MoveDown{display:none!important}
      #v076DietRoot .v084Head{gap:8px}
      @media(max-width:390px){.v085Text strong{font-size:18px}.v085Grip{
        flex-basis:42px;min-width:42px!important;width:42px!important;height:42px!important}}
      @media(prefers-reduced-motion:reduce){.v085DragItem{transition:none!important}}
    `;
    document.head.appendChild(s);
  }
  function toggle(card,tab){
    const collapsed=!card.classList.contains('v085Collapsed');
    card.classList.toggle('v085Collapsed',collapsed);
    const button=card.querySelector('.v085Toggle'),arrow=card.querySelector('.v085Chevron');
    if(button)button.setAttribute('aria-expanded',String(!collapsed));
    if(arrow)arrow.textContent=collapsed?'▾':'▴';
    const layout=state();layout[tab]=layout[tab]||{};
    layout[tab].collapsed=layout[tab].collapsed||{};
    layout[tab].collapsed[card.dataset.v085Key]=collapsed;
    try{localStorage.setItem(KEY,JSON.stringify(layout));}catch(e){}
  }
  function addGrip(card,tab){
    if(card.querySelector(':scope > .v084Head > .v085Grip')||
       card.querySelector(':scope > .v085Head > .v085Grip'))return;
    const grip=document.createElement('button');
    grip.type='button';grip.className='v085Grip';grip.textContent='⠿';
    grip.setAttribute('aria-label','Przytrzymaj sekundę i przeciągnij: '+tab);
    grip.title='Przytrzymaj 1 sekundę i przeciągnij';
    const head=card.querySelector(':scope > .v084Head')||card.querySelector(':scope > .v085Head');
    if(!head)return;
    head.appendChild(grip);
    grip.addEventListener('pointerdown',e=>down(e,card,tab,grip));
    grip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
    grip.addEventListener('contextmenu',e=>e.preventDefault());
  }
  function enhance(card,tab){
    if(card.dataset.v085Key)return;
    const key=stableKey(card,tab);if(!key)return;
    card.dataset.v085Key=key;
    if(tab==='diet'){
      addGrip(card,tab);
      return;
    }
    const title=Array.from(card.children).find(c=>c.tagName==='H2');
    const eyebrow=Array.from(card.children).find(c=>c.classList.contains('eyebrow'));
    const label=title?.textContent?.trim()||eyebrow?.textContent?.trim()||'Kafel';
    const kicker=eyebrow?.textContent?.trim()||tab.toUpperCase();
    const head=document.createElement('div');head.className='v085Head';
    const toggleButton=document.createElement('button');toggleButton.type='button';
    toggleButton.className='v085Toggle';
    toggleButton.setAttribute('aria-label','Zwiń lub rozwiń: '+label);
    const txt=document.createElement('span');txt.className='v085Text';
    const sub=document.createElement('small');sub.textContent=kicker;
    const main=document.createElement('strong');main.textContent=label;
    txt.appendChild(sub);txt.appendChild(main);toggleButton.appendChild(txt);
    const ch=document.createElement('span');ch.className='v085Chevron';
    ch.setAttribute('aria-hidden','true');toggleButton.appendChild(ch);
    head.appendChild(toggleButton);
    card.insertBefore(head,card.firstChild);
    if(title)title.classList.add('v085OldTitle');
    if(eyebrow)eyebrow.classList.add('v085OldTitle');
    toggleButton.addEventListener('click',()=>toggle(card,tab));
    const collapsed=!!state()?.[tab]?.collapsed?.[key];
    card.classList.toggle('v085Collapsed',collapsed);
    ch.textContent=collapsed?'▾':'▴';
    toggleButton.setAttribute('aria-expanded',String(!collapsed));
    addGrip(card,tab);
  }
  function refreshTab(tab){
    const root=rootFor(tab);
    if(!root||refreshing||drag||press)return;
    refreshing=true;
    try{
      let added=false;
      Array.from(root.children).forEach(c=>{
        if(!movable(c,tab)||c.dataset.v085Key)return;
        enhance(c,tab);added=true;
      });
      const existing=cards(root);
      if(added&&existing.length>1){
        const current=existing.map(c=>c.dataset.v085Key);
        const previous=state()?.[tab]?.order||
          (tab==='diet'?read(LEGACY,{})?.order:[]);
        const desired=order(current,previous);
        if(desired.join('|')!==current.join('|'))applyOrder(root,desired);
      }
      if(trainingActive()){
        root.querySelectorAll('.v085Grip').forEach(g=>{g.disabled=true;});
      }else root.querySelectorAll('.v085Grip').forEach(g=>{g.disabled=false;});
    }finally{refreshing=false;}
  }
  function refresh(){
    TABS.forEach(refreshTab);
  }
  function clearListeners(){
    document.removeEventListener('pointermove',move);
    document.removeEventListener('pointerup',up);
    document.removeEventListener('pointercancel',cancel);
    window.removeEventListener('blur',cancel);
  }
  function down(e,card,tab,grip){
    if(e.button!==0||!canDrag(tab)||grip.disabled)return;
    const root=rootFor(tab);
    if(!root||cards(root).length<2)return;
    press={pointerId:e.pointerId,card,tab,grip,root,x:e.clientX,y:e.clientY,
      currentX:e.clientX,currentY:e.clientY,timer:0};
    grip.classList.add('v085Holding');
    try{grip.setPointerCapture(e.pointerId);}catch(err){}
    press.timer=setTimeout(activate,HOLD_MS);
    document.addEventListener('pointermove',move,{passive:false});
    document.addEventListener('pointerup',up);
    document.addEventListener('pointercancel',cancel);
    window.addEventListener('blur',cancel);
  }
  function activate(){
    if(!press||drag||trainingActive())return;
    drag={...press,offset:0,changed:false,initial:cards(press.root).map(c=>c.dataset.v085Key)};
    press.timer=0;
    drag.card.classList.add('v085DragItem');
    try{window.navigator?.vibrate?.(24);}catch(e){}
    paint();
    autoScrollFrame=requestAnimationFrame(autoScroll);
  }
  function move(e){
    if(!press||e.pointerId!==press.pointerId)return;
    press.currentX=e.clientX;press.currentY=e.clientY;
    if(!drag){
      if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>11){
        clearTimeout(press.timer);press.timer=0;
        // Gesture before one second cancels dragging.
        release(false);
      }
      return;
    }
    e.preventDefault();
    drag.currentY=e.clientY;drag.currentX=e.clientX;
    position(e.clientY);
  }
  function paint(){
    if(!drag)return;
    const dy=drag.currentY-drag.y+drag.offset;
    drag.card.style.transform='translate3d(0,'+dy+'px,0) scale(1.017)';
  }
  function animateOthers(before,active){
    before.forEach(([card,top])=>{
      if(card===active||!card.isConnected)return;
      const delta=top-card.getBoundingClientRect().top;
      if(Math.abs(delta)<1)return;
      try{card.animate([{transform:'translateY('+delta+'px)'},{transform:'translateY(0)'}],
        {duration:190,easing:'cubic-bezier(.2,.8,.2,1)'});}
      catch(e){}
    });
  }
  function position(y){
    if(!drag||trainingActive()){cancel();return;}
    const active=drag.card,root=drag.root,others=cards(root).filter(c=>c!==active);
    if(!others.length){paint();return;}
    const before=new Map(cards(root).map(c=>[c,c.getBoundingClientRect().top]));
    const current=cards(root),oldIndex=current.indexOf(active);
    let newIndex=others.filter(c=>y>=c.getBoundingClientRect().top+
      c.getBoundingClientRect().height/2).length;
    if(newIndex!==oldIndex){
      const target=others[newIndex]||null;
      const oldTop=active.getBoundingClientRect().top;
      if(target)root.insertBefore(active,target);
      else root.insertBefore(active,others[others.length-1].nextSibling);
      const newTop=active.getBoundingClientRect().top;
      drag.offset+=oldTop-newTop;
      drag.changed=true;
      animateOthers(before,active);
    }
    paint();
  }
  function autoScroll(){
    autoScrollFrame=0;
    if(!drag)return;
    const tabBar=document.querySelector('.tabs'),rect=tabBar?.getBoundingClientRect();
    const top=(rect?.bottom||70)+35,bottom=window.innerHeight-72,y=drag.currentY;
    let velocity=0;
    if(y<top)velocity=-Math.min(12,Math.ceil((top-y)/8));
    else if(y>bottom)velocity=Math.min(12,Math.ceil((y-bottom)/8));
    if(velocity){window.scrollBy(0,velocity);position(y);}
    autoScrollFrame=requestAnimationFrame(autoScroll);
  }
  function up(e){
    if(!press||e.pointerId!==press.pointerId)return;
    if(drag&&drag.changed&&!trainingActive())remember(drag.tab,drag.root);
    release(true);
  }
  function cancel(){
    if(drag&&drag.changed)applyOrder(drag.root,drag.initial);
    release(false);
  }
  function release(animate){
    const p=press,d=drag;
    if(p){
      clearTimeout(p.timer);
      p.grip.classList.remove('v085Holding');
      try{if(p.grip.hasPointerCapture(p.pointerId))p.grip.releasePointerCapture(p.pointerId);}catch(e){}
    }
    if(autoScrollFrame)cancelAnimationFrame(autoScrollFrame);
    autoScrollFrame=0;clearListeners();press=null;drag=null;
    if(d){
      const el=d.card;
      el.style.transition=animate?'transform 190ms ease':'';
      el.style.transform='';
      const clean=()=>{el.classList.remove('v085DragItem');el.style.transition='';el.style.transform='';};
      if(animate)setTimeout(clean,210);else clean();
    }
  }
  function boot(){
    css();
    refreshTimer=setInterval(refresh,1200);
    setTimeout(()=>{clearInterval(refreshTimer);refreshTimer=null;},22000);
    TABS.forEach(tab=>{
      document.querySelectorAll('.tab[data-tab="'+tab+'"]').forEach(button=>{
        button.addEventListener('click',()=>setTimeout(()=>refreshTab(tab),40));
      });
    });
    refresh();
  }
  window.TrenerCardLayout085={HOLD_MS,order,trainingActive,refreshTab};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
