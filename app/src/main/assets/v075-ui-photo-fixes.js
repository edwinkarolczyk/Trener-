(function(){
  'use strict';
  const $=id=>document.getElementById(id);

  function installCss(){
    if($('v075Style'))return;
    const s=document.createElement('style');s.id='v075Style';s.textContent=`
      /* Jeden licznik czasu: stały pasek 0.7.2 na dole. */
      body.v072Running #v062Clock{display:none!important}

      /* Menu historii zawsze po prawej stronie karty i w granicach ekranu. */
      #historyContent .historyItem summary{
        display:grid!important;
        grid-template-columns:minmax(0,1fr) auto!important;
        grid-template-rows:auto auto!important;
        align-items:start!important;
        gap:3px 8px!important;
      }
      #historyContent .historyItem summary>.title{grid-column:1!important;grid-row:1!important;min-width:0}
      #historyContent .historyItem summary>.meta{grid-column:1!important;grid-row:2!important;min-width:0}
      #historyContent .v070HistoryMenu{
        grid-column:2!important;grid-row:1 / span 2!important;
        align-self:start!important;margin-left:0!important;position:relative!important;
      }
      #historyContent .v070HistoryPopup{
        left:auto!important;right:0!important;top:38px!important;
        min-width:150px!important;max-width:min(210px,calc(100vw - 42px))!important;
        box-shadow:0 12px 30px rgba(0,0,0,.55)!important;
      }

      /* Zakończenie ma być jednoznaczne i zawsze aktywne w trakcie sesji. */
      body.v072Running #stopBtn{opacity:1!important;filter:none!important}
    `;document.head.appendChild(s);
  }

  function fixWorkoutControls(){
    let runningNow=false;try{runningNow=!!running;}catch(e){}
    const stop=$('stopBtn');
    if(stop&&runningNow){
      stop.disabled=false;
      if(stop.textContent!=='ZAKOŃCZ')stop.textContent='ZAKOŃCZ';
      stop.setAttribute('aria-label','Zakończ trening i zapisz wykonane serie');
    }
  }

  function closeHistoryMenus(ev){
    if(ev?.target?.closest?.('.v070HistoryMenu'))return;
    document.querySelectorAll('.v070HistoryPopup').forEach(x=>x.classList.add('hidden'));
  }

  function improvePhotoUi(){
    const input=$('progressPhoto');if(!input)return;
    input.setAttribute('accept','image/*');
    const label=input.closest('.fileBtn');
    if(label&&!label.dataset.v075){
      label.dataset.v075='1';
      label.title='Wybierz zdjęcie z telefonu. Zdjęcie zostanie zapisane lokalnie w Trener 2.';
    }
  }

  function boot(){
    installCss();improvePhotoUi();fixWorkoutControls();
    document.addEventListener('click',closeHistoryMenus);
    setInterval(()=>{installCss();improvePhotoUi();fixWorkoutControls();},250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
