(function(){
  'use strict';

  const IMAGE_BY_ID={
    row:'ai/workout-row.webp',
    underrow:'ai/workout-underrow.webp',
    curl:'ai/workout-curl.webp',
    seatedcurl:'ai/workout-seatedcurl.webp',
    reversecurl:'ai/workout-reversecurl.webp'
  };
  let pendingId='';

  function currentId(){
    try{
      if(typeof currentPlan!=='undefined'&&currentPlan&&Array.isArray(currentPlan.ex)&&currentPlan.ex[exIdx])return String(currentPlan.ex[exIdx].id||'');
    }catch(e){}
    const name=document.getElementById('exercise')?.textContent?.trim();
    if(!name)return '';
    try{return String((exerciseLibrary.find(x=>x.n===name)||{}).id||'');}catch(e){return '';}
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function installCss(){
    if(document.getElementById('v0634-ai-style'))return;
    const s=document.createElement('style');
    s.id='v0634-ai-style';
    s.textContent=`
      .v0634AiCard{margin:4px 0 2px;padding:4px;background:#050505;border:1px solid #352223;border-radius:15px;overflow:hidden}
      .v0634AiCard img{display:block;width:100%;height:auto;max-height:68vh;object-fit:contain;border-radius:11px;background:#050505}
      #v055VisualBody .v0634AiInline{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#050505}
      #v055VisualBody .v0634AiInline img{display:block;width:100%;height:100%;object-fit:contain;border-radius:10px}
    `;
    document.head.appendChild(s);
  }

  function applyOverlay(id){
    const src=IMAGE_BY_ID[id];
    if(!src)return false;
    const overlay=document.getElementById('v056Overlay');
    const panel=overlay?.querySelector('[data-panel="graphic"]');
    if(!panel||panel.dataset.v0634)return false;
    let name='Ćwiczenie';
    try{name=(exerciseLibrary.find(x=>x.id===id)||{}).n||name;}catch(e){}
    panel.dataset.v0634=id;
    panel.innerHTML=`<div class="v0634AiCard"><img src="${src}" alt="${esc(name)} — instrukcja ćwiczenia"></div>`;
    return true;
  }

  function applyInline(){
    const id=currentId(),src=IMAGE_BY_ID[id];
    if(!src)return;
    const body=document.getElementById('v055VisualBody');
    if(!body||body.dataset.v0634===id)return;
    let name='Ćwiczenie';
    try{name=(exerciseLibrary.find(x=>x.id===id)||{}).n||name;}catch(e){}
    body.dataset.v0634=id;
    body.innerHTML=`<div class="v0634AiInline"><img src="${src}" alt="${esc(name)} — podgląd"></div>`;
  }

  document.addEventListener('click',e=>{
    const target=e.target.closest?.('#v055VisualOpen,#v0631HowTo,#v052HowBtn,[data-preview]');
    if(!target)return;
    const id=String(target.dataset.preview||currentId()||'');
    if(!IMAGE_BY_ID[id])return;
    pendingId=id;
    setTimeout(()=>{if(applyOverlay(id))pendingId='';},0);
    setTimeout(()=>{if(applyOverlay(id))pendingId='';},80);
  });

  function boot(){
    installCss();
    const observer=new MutationObserver(()=>{
      const id=pendingId||currentId();
      if(id&&IMAGE_BY_ID[id]&&applyOverlay(id))pendingId='';
      applyInline();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(applyInline,450);
    applyInline();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
