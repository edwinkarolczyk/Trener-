(function(){
  'use strict';

  const UPDATE_STORAGE='trainer3.updateSettings';
  const UPDATE_BACKUP_STORAGE='trainer3.updateBackup.v070';
  const WEEKLY_SCHEDULE_STORAGE='trainer3.schedule.v050';
  let updateInfo=null;
  let checking=false;
  let waitingForBackup=false;

  function el(id){return document.getElementById(id)}
  function safeJson(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
  function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  function versionParts(v){
    return String(v||'0').replace(/^v/i,'').split('.').map(x=>parseInt(x,10)||0);
  }
  function isNewer(remote,current){
    const a=versionParts(remote),b=versionParts(current),n=Math.max(a.length,b.length);
    for(let i=0;i<n;i++){
      const x=a[i]||0,y=b[i]||0;
      if(x>y)return true;
      if(x<y)return false;
    }
    return false;
  }

  function currentVersion(){
    try{return window.Android&&Android.getAppVersion?String(Android.getAppVersion()):'—'}catch(e){return '—'}
  }

  function injectCss(){
    if(document.getElementById('update-addon-style'))return;
    const link=document.createElement('link');
    link.id='update-addon-style';link.rel='stylesheet';link.href='update.css';
    document.head.appendChild(link);
  }

  function installUi(){
    injectCss();
    const header=document.querySelector('.appHeader');
    const clock=el('clock');
    if(header&&clock&&!el('updateHeader')){
      const badge=document.createElement('button');
      badge.id='updateHeader';badge.className='updateHeader hidden';badge.type='button';
      badge.innerHTML='<span class="updateDot"></span><span>NOWA WERSJA</span>';
      badge.addEventListener('click',()=>{
        if(typeof window.showTab==='function')window.showTab('settings');
        setTimeout(()=>el('updatesCard')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
      });
      header.insertBefore(badge,clock);
    }

    const settings=el('settings');
    if(settings&&!el('updatesCard')){
      const card=document.createElement('div');
      card.id='updatesCard';card.className='card updatesCard';
      card.innerHTML=`
        <div class="eyebrow">AKTUALIZACJE</div>
        <h2>Aktualizacje Trener 2</h2>
        <div class="updateVersions">
          <div><span>Ta wersja</span><b id="updateCurrent">${esc(currentVersion())}</b></div>
          <div><span>Najnowsza</span><b id="updateLatest">—</b></div>
        </div>
        <label class="switchRow updateSwitch"><input id="autoUpdateCheck" type="checkbox"><span>Sprawdzaj automatycznie przy uruchomieniu</span></label>
        <p id="updateStatus" class="hint">Jeszcze nie sprawdzano aktualizacji.</p>
        <div id="updateNotes" class="updateNotes hidden"></div>
        <div class="updateActions">
          <button id="checkUpdateBtn" class="secondary">SPRAWDŹ TERAZ</button>
          <button id="downloadUpdateBtn" class="primary hidden">POBIERZ AKTUALIZACJĘ</button>
        </div>
        <p class="hint updateFoot">Aplikacja może sama wykryć i pobrać nową wersję. Android pokaże własne potwierdzenie instalacji aktualizacji.</p>`;
      settings.insertBefore(card,settings.firstChild);

      const cfg=safeJson(localStorage.getItem(UPDATE_STORAGE),{});
      el('autoUpdateCheck').checked=cfg.auto!==false;
      el('autoUpdateCheck').addEventListener('change',()=>{
        localStorage.setItem(UPDATE_STORAGE,JSON.stringify({auto:el('autoUpdateCheck').checked}));
        if(el('autoUpdateCheck').checked)checkForUpdate(false);
      });
      el('checkUpdateBtn').addEventListener('click',()=>checkForUpdate(true));
      el('downloadUpdateBtn').addEventListener('click',downloadUpdate);
    }
  }

  function setChecking(on){
    checking=on;
    const b=el('checkUpdateBtn');
    if(b){b.disabled=on;b.textContent=on?'SPRAWDZAM…':'SPRAWDŹ TERAZ';}
  }

  function checkForUpdate(manual){
    if(checking)return;
    installUi();
    setChecking(true);
    if(el('updateStatus'))el('updateStatus').textContent='Sprawdzam najnowszą wersję…';
    try{
      if(window.Android&&Android.checkForUpdate){
        Android.checkForUpdate();
      }else{
        setChecking(false);
        if(el('updateStatus'))el('updateStatus').textContent='Sprawdzanie aktualizacji działa w aplikacji Android.';
      }
    }catch(e){
      setChecking(false);
      if(el('updateStatus'))el('updateStatus').textContent='Nie udało się rozpocząć sprawdzania aktualizacji.';
    }
    if(manual&&typeof window.toast==='function')window.toast('Sprawdzam aktualizacje…');
  }

  function renderResult(status,raw){
    installUi();setChecking(false);
    const current=currentVersion();
    el('updateCurrent').textContent=current;
    if(status!=='ok'){
      el('updateStatus').textContent=raw||'Nie udało się sprawdzić aktualizacji. Sprawdź internet.';
      return;
    }
    const info=safeJson(raw,null);
    if(!info||!info.version){
      el('updateStatus').textContent='Serwer aktualizacji zwrócił nieprawidłowe dane.';
      return;
    }
    updateInfo=info;
    el('updateLatest').textContent=info.version;
    const newer=isNewer(info.version,current);
    el('updateHeader')?.classList.toggle('hidden',!newer);
    el('downloadUpdateBtn')?.classList.toggle('hidden',!newer);
    if(newer){
      el('updateStatus').innerHTML='<b>Dostępna nowa wersja '+esc(info.version)+'.</b> Dotknij migającego komunikatu w nagłówku albo pobierz ją tutaj.';
      const notes=Array.isArray(info.notes)?info.notes:[];
      if(notes.length){
        el('updateNotes').classList.remove('hidden');
        el('updateNotes').innerHTML='<strong>Co nowego:</strong><ul>'+notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>';
      }
      try{if(window.Android&&Android.vibrate)Android.vibrate(100)}catch(e){}
    }else{
      el('updateStatus').textContent='Masz najnowszą wersję Trener 2.';
      el('updateNotes').classList.add('hidden');
    }
  }

  function updateUrl(){
    return updateInfo?String(updateInfo.apkUrl||updateInfo.pageUrl||''):'';
  }

  function openUpdate(){
    const url=updateUrl();
    if(!url){
      if(typeof window.toast==='function')window.toast('Brak adresu aktualizacji.');
      return;
    }
    try{
      if(window.Android&&Android.openUpdateUrl)Android.openUpdateUrl(url);
      else window.location.href=url;
    }catch(e){
      if(typeof window.toast==='function')window.toast('Nie udało się otworzyć aktualizacji.');
    }
  }

  function backupAlreadySaved(version){
    const x=safeJson(localStorage.getItem(UPDATE_BACKUP_STORAGE),{});
    return !!(x&&x.version===String(version||'')&&Number(x.at)>0);
  }

  function downloadUpdate(){
    if(!updateInfo){checkForUpdate(true);return;}
    if(backupAlreadySaved(updateInfo.version)){openUpdate();return;}
    if(waitingForBackup)return;
    if(!window.TrenerBackup||typeof window.TrenerBackup.exportBeforeUpdate!=='function'){
      if(typeof window.toast==='function')window.toast('Najpierw zapisz kopię danych w Ustawienia → Dane.');
      return;
    }
    waitingForBackup=true;
    const btn=el('downloadUpdateBtn');
    if(btn){btn.disabled=true;btn.textContent='ZAPISZ KOPIĘ…';}
    if(el('updateStatus'))el('updateStatus').innerHTML='<b>Najpierw kopia danych.</b> Wybierz miejsce zapisu. Aktualizacja ruszy dopiero po poprawnym zapisaniu pliku.';
    const started=window.TrenerBackup.exportBeforeUpdate(updateInfo.version);
    if(!started){
      waitingForBackup=false;
      if(btn){btn.disabled=false;btn.textContent='POBIERZ AKTUALIZACJĘ';}
    }
  }

  function onBackupExportResult(ev){
    if(!waitingForBackup)return;
    waitingForBackup=false;
    const btn=el('downloadUpdateBtn');
    if(btn){btn.disabled=false;btn.textContent='POBIERZ AKTUALIZACJĘ';}
    const ok=!!ev?.detail?.success;
    if(!ok){
      if(el('updateStatus'))el('updateStatus').textContent='Aktualizacja wstrzymana — kopia danych nie została zapisana.';
      return;
    }
    if(updateInfo?.version){
      localStorage.setItem(UPDATE_BACKUP_STORAGE,JSON.stringify({version:String(updateInfo.version),at:Date.now()}));
    }
    if(el('updateStatus'))el('updateStatus').textContent='Kopia zapisana. Otwieram aktualizację…';
    openUpdate();
  }

  function ensureNeutralScheduleDefault(){
    if(localStorage.getItem(WEEKLY_SCHEDULE_STORAGE)!==null)return;
    localStorage.setItem(WEEKLY_SCHEDULE_STORAGE,JSON.stringify({'0':'','1':'','2':'','3':'','4':'','5':'','6':''}));
  }

  function loadV050Addon(){
    if(document.getElementById('trener-v050-addon'))return;
    const script=document.createElement('script');
    script.id='trener-v050-addon';script.src='v050-addon.js';document.body.appendChild(script);
  }

  function loadProgressionAddon(){
    if(document.getElementById('trener-progression-addon')){loadV050Addon();return;}
    const script=document.createElement('script');
    script.id='trener-progression-addon';
    script.src='progression-addon.js';
    script.onload=loadV050Addon;
    script.onerror=loadV050Addon;
    document.body.appendChild(script);
  }

  window.TrenerUpdate={nativeResult:renderResult,check:()=>checkForUpdate(true)};

  function boot(){
    installUi();
    ensureNeutralScheduleDefault();
    loadProgressionAddon();
    window.addEventListener('trener:backup-export-result',onBackupExportResult);
    const cfg=safeJson(localStorage.getItem(UPDATE_STORAGE),{});
    if(cfg.auto!==false)setTimeout(()=>checkForUpdate(false),900);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
