(function(){
  'use strict';

  const ISSUE_URL='https://github.com/edwinkarolczyk/Trener-/issues/new';
  const DRAFT_KEY='trainer3.feedbackDraft';

  function version(){
    try{return window.Android&&Android.getAppVersion?String(Android.getAppVersion()):'nieznana';}
    catch(e){return 'nieznana';}
  }

  function modeLabel(){
    try{return mode===2?'2 osoby':'solo';}catch(e){return 'nieznany';}
  }

  function installUi(){
    if(document.getElementById('v0636FeedbackCard'))return;
    const settings=document.getElementById('settings');
    if(!settings)return;

    const card=document.createElement('div');
    card.id='v0636FeedbackCard';
    card.className='card';
    card.innerHTML=`
      <div class="eyebrow">UWAGI DO PROGRAMU</div>
      <h2>Wyślij uwagę</h2>
      <p class="hint">Opisz błąd, pomysł albo rzecz do poprawy. Po kliknięciu otworzy się GitHub z gotową treścią — zatwierdź wysłanie, a uwaga zostanie dopisana do pliku UWAGI_DO_PROGRAMU.md w repozytorium.</p>
      <label for="v0636FeedbackText">Treść uwagi</label>
      <textarea id="v0636FeedbackText" maxlength="1500" rows="5" placeholder="Np. podczas wspólnego treningu po rozłączeniu Wi‑Fi..." style="width:100%;box-sizing:border-box;resize:vertical"></textarea>
      <button id="v0636FeedbackSend" class="primary">WYŚLIJ UWAGĘ</button>
      <p class="hint">Nie zapisujemy w aplikacji żadnego tokenu GitHub. Wysłanie wymaga Twojego zatwierdzenia na stronie GitHub.</p>`;

    const cards=[...settings.querySelectorAll('.card')];
    const dataCard=cards.find(c=>c.querySelector('.eyebrow')?.textContent?.trim()==='DANE');
    if(dataCard&&dataCard.parentNode===settings)settings.insertBefore(card,dataCard);
    else settings.appendChild(card);

    const text=document.getElementById('v0636FeedbackText');
    try{text.value=localStorage.getItem(DRAFT_KEY)||'';}catch(e){}
    text.addEventListener('input',()=>{
      try{localStorage.setItem(DRAFT_KEY,text.value);}catch(e){}
    });
    document.getElementById('v0636FeedbackSend').addEventListener('click',sendFeedback);
  }

  function sendFeedback(){
    const text=document.getElementById('v0636FeedbackText');
    const note=(text?.value||'').trim();
    if(note.length<3){
      try{toast('Wpisz treść uwagi.');}catch(e){alert('Wpisz treść uwagi.');}
      return;
    }

    const title='[Trener 2] Uwaga z aplikacji';
    const body=[
      '<!-- trener2-app-feedback -->',
      '### Uwaga',
      note,
      '',
      '### Dane aplikacji',
      '- Wersja: '+version(),
      '- Tryb przy wysyłaniu: '+modeLabel(),
      '- Czas: '+new Date().toLocaleString('pl-PL'),
      '',
      '> Wysłano z przycisku „Wyślij uwagę” w aplikacji Trener 2.'
    ].join('\n');

    try{localStorage.setItem(DRAFT_KEY,note);}catch(e){}
    const url=ISSUE_URL+'?title='+encodeURIComponent(title)+'&body='+encodeURIComponent(body);
    window.location.assign(url);
  }

  function boot(){installUi();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
