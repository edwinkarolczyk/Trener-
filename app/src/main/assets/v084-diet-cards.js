(function(){
  'use strict';
  // Tylko ekran Diety. Nie przebudowujemy wnętrza istniejących kart ani ich listenerów.
  const KEY='trainer3.dietLayout.v084';
  const IDS=['summary','hydration','quick','catalog','add','meals','targets','history','shopping'];
  const LABELS={summary:'Bilans dnia',hydration:'Nawodnienie',quick:'Szybkie dodawanie',
    catalog:'Baza żywności',add:'Dodaj posiłek',meals:'Posiłki',targets:'Cel dzienny',
    history:'Historia diety',shopping:'Lista zakupów'};
  const $=id=>document.getElementById(id);
  function read(){try{
    const data=JSON.parse(localStorage.getItem(KEY)||'{}');
    return {order:Array.isArray(data.order)?data.order.filter(x=>IDS.includes(x)):[],
      collapsed:data.collapsed&&typeof data.collapsed==='object'?data.collapsed:{}};
  }catch(e){return {order:[],collapsed:{}};}}
  function save(s){try{localStorage.setItem(KEY,JSON.stringify(s));}catch(e){}}
  function keyOf(card){
    if(!card||!card.classList.contains('card'))return '';
    if(card.classList.contains('dietHero'))return 'summary';
    if(card.id==='v078HydrationCard')return 'hydration';
    if(card.id==='v077QuickCard')return 'quick';
    if(card.id==='v083FoodCard')return 'catalog';
    for(const [id,key] of [
      ['v076AddMeal','add'],['v076Meals','meals'],['v076SaveTargets','targets'],
      ['v076History','history'],['v076Shopping','shopping']
    ])if(card.querySelector('#'+id))return key;
    return '';
  }
  function orderedKeys(actual,saved){
    const rank=new Map(saved.map((k,i)=>[k,i]));
    return actual.slice().sort((a,b)=>{
      const x=rank.has(a)?rank.get(a):1000+actual.indexOf(a);
      const y=rank.has(b)?rank.get(b):1000+actual.indexOf(b);
      return x-y;
    });
  }
  function moveKeys(actual,key,direction){
    const next=actual.slice(),i=next.indexOf(key),j=i+direction;
    if(i<0||j<0||j>=next.length)return actual.slice();
    [next[i],next[j]]=[next[j],next[i]];return next;
  }
  function cards(root){return Array.from(root.children).filter(c=>c.dataset.v084Key);}
  function syncHead(card,collapsed){
    card.classList.toggle('v084Collapsed',!!collapsed);
    const toggle=card.querySelector('.v084Toggle'),arrow=card.querySelector('.v084Arrow');
    if(toggle)toggle.setAttribute('aria-expanded',collapsed?'false':'true');
    if(arrow)arrow.textContent=collapsed?'▾':'▴';
  }
  function updateArrows(root){
    const list=cards(root);
    list.forEach((card,i)=>{
      const up=card.querySelector('.v084MoveUp'),down=card.querySelector('.v084MoveDown');
      if(up)up.disabled=i===0;
      if(down)down.disabled=i===list.length-1;
    });
  }
  function reorder(root,keys){
    const map=new Map(cards(root).map(c=>[c.dataset.v084Key,c]));
    for(const key of keys){const card=map.get(key);if(card)root.appendChild(card);}
    updateArrows(root);
  }
  function move(root,key,delta){
    const current=cards(root).map(c=>c.dataset.v084Key);
    const next=moveKeys(current,key,delta);
    if(next.join('|')===current.join('|'))return;
    reorder(root,next);
    const state=read();state.order=next;save(state);
    const moved=cards(root).find(c=>c.dataset.v084Key===key);
    try{moved?.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e){}
  }
  function toggle(card){
    const key=card.dataset.v084Key,state=read(),collapsed=!card.classList.contains('v084Collapsed');
    state.collapsed[key]=collapsed;save(state);syncHead(card,collapsed);
  }
  function enhance(card,key){
    if(card.dataset.v084Key)return;
    card.dataset.v084Key=key;
    const title=card.querySelector('h2'),eyebrow=card.querySelector('.eyebrow');
    const label=title?.textContent?.trim()||LABELS[key];
    const kicker=eyebrow?.textContent?.trim()||'DIETA';
    const head=document.createElement('div');head.className='v084Head';
    const button=document.createElement('button');
    button.className='v084Toggle';button.type='button';
    button.setAttribute('aria-label','Zwiń lub rozwiń: '+label);
    const text=document.createElement('span');text.className='v084Name';
    const sub=document.createElement('small');sub.textContent=kicker;
    const main=document.createElement('strong');main.textContent=label;
    text.appendChild(sub);text.appendChild(main);button.appendChild(text);
    const arrow=document.createElement('span');arrow.className='v084Arrow';arrow.setAttribute('aria-hidden','true');
    button.appendChild(arrow);
    button.addEventListener('click',()=>toggle(card));
    head.appendChild(button);
    const up=document.createElement('button');up.className='v084MoveUp';up.type='button';
    up.textContent='↑';up.title='Przesuń wyżej';up.setAttribute('aria-label','Przesuń '+label+' wyżej');
    up.addEventListener('click',()=>move(card.parentElement,key,-1));
    const down=document.createElement('button');down.className='v084MoveDown';down.type='button';
    down.textContent='↓';down.title='Przesuń niżej';down.setAttribute('aria-label','Przesuń '+label+' niżej');
    down.addEventListener('click',()=>move(card.parentElement,key,1));
    head.appendChild(up);head.appendChild(down);
    card.insertBefore(head,card.firstChild);
    if(title)title.classList.add('v084DuplicateTitle');
    if(eyebrow)eyebrow.classList.add('v084DuplicateTitle');
    syncHead(card,!!read().collapsed[key]);
  }
  function refresh(){
    const root=$('v076DietRoot');if(!root)return false;
    let added=false;
    Array.from(root.children).forEach(card=>{
      const key=keyOf(card);if(!key||card.dataset.v084Key)return;
      enhance(card,key);added=true;
    });
    if(added){
      const actual=cards(root).map(c=>c.dataset.v084Key);
      const desired=orderedKeys(actual,read().order);
      if(desired.join('|')!==actual.join('|'))reorder(root,desired);
      updateArrows(root);
    }
    return cards(root).length>=IDS.length;
  }
  function css(){
    if($('v084DietCardStyle'))return;
    const s=document.createElement('style');s.id='v084DietCardStyle';
    s.textContent=`
      #v076DietRoot > .card[data-v084-key]{min-width:0}
      #v076DietRoot .v084Head{display:flex;align-items:center;gap:6px;min-width:0;margin-bottom:12px}
      #v076DietRoot .v084Toggle{flex:1 1 auto;min-width:0!important;display:flex!important;
        align-items:center;justify-content:space-between;text-align:left!important;
        border:0!important;box-shadow:none!important;background:transparent!important;
        padding:2px 0!important;margin:0!important;color:inherit!important;height:auto!important}
      #v076DietRoot .v084Name{display:flex;flex-direction:column;min-width:0;gap:4px}
      #v076DietRoot .v084Name small{font-size:10px;letter-spacing:.13em;color:#ef4444;
        text-transform:uppercase;white-space:normal}
      #v076DietRoot .v084Name strong{font-size:21px;font-weight:900;line-height:1.22;
        white-space:normal;overflow-wrap:anywhere;color:#f5f5f5}
      #v076DietRoot .v084Arrow{font-size:23px;padding:0 5px;flex:0 0 auto}
      #v076DietRoot .v084MoveUp,#v076DietRoot .v084MoveDown{
        flex:0 0 39px;min-width:39px!important;width:39px!important;height:39px!important;
        padding:0!important;margin:0!important;font-size:21px!important;border-radius:10px!important}
      #v076DietRoot .v084MoveUp:disabled,#v076DietRoot .v084MoveDown:disabled{
        opacity:.24!important}
      #v076DietRoot .v084DuplicateTitle{display:none!important}
      #v076DietRoot > .v084Collapsed > :not(.v084Head){display:none!important}
      #v076DietRoot > .v084Collapsed .v084Head{margin-bottom:0}
      #v083FoodCard .foodResults{max-height:min(36vh,320px)!important;overflow-y:auto!important}
      @media(max-width:390px){#v076DietRoot .v084Name strong{font-size:18px}
      #v076DietRoot .v084MoveUp,#v076DietRoot .v084MoveDown{
        flex-basis:34px;min-width:34px!important;width:34px!important}}
    `;
    document.head.appendChild(s);
  }
  function boot(){
    css();
    let attempts=0;
    const interval=setInterval(()=>{attempts++;if(refresh()||attempts>=90)clearInterval(interval);},150);
    document.querySelectorAll('.tab[data-tab="diet"]').forEach(tab=>{
      tab.addEventListener('click',()=>setTimeout(refresh,0));
    });
  }
  window.TrenerDietCards084={refresh,orderedKeys,moveKeys};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
