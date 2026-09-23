(function(){
  'use strict';

  const UPDATE_STORAGE='trainer3.updateSettings';
  const WEEKLY_SCHEDULE_STORAGE='trainer3.schedule.v050';
  let updateInfo=null;
  let checking=false;
  let downloadStartedFor='';
  let backupPreparedFor='';

  function el(id){return document.getElementById(id)}
  function safeJson(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
  function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function config(){return Object.assign({auto:true,autoInstall:true},safeJson(localStorage.getItem(UPDATE_STORAGE),{}))}
  function saveConfig(patch){localStorage.setItem(UPDATE_STORAGE,JSON.stringify(Object.assign(config(),patch||{})))}

  function versionParts(v){
    const core=String(v||'0').replace(/^v/i,'').split('-')[0];
    return core.split('.').slice(0,4).map(x=>parseInt(x,10)||0);
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
        <label class="switchRow updateSwitch"><input id="autoInstallCheck" type="checkbox"><span>Pobieraj aktualizację automatycznie i otwieraj instalator</span></label>
        <p id="updateStatus" class="hint">Jeszcze nie sprawdzano aktualizacji.</p>
        <div id="updateNotes" class="updateNotes hidden"></div>
        <div class="updateActions">
          <button id="checkUpdateBtn" class="secondary">SPRAWDŹ TERAZ</button>
          <button id="downloadUpdateBtn" class="primary hidden">ZAINSTALUJ AKTUALIZACJĘ</button>
        </div>
        <div id="preUpdateBackupActions" class="updateActions hidden">
          <button id="restorePreUpdateBtn" class="secondary">PRZYWRÓĆ KOPIĘ SPRZED AKTUALIZACJI</button>
          <button id="exportPreUpdateBtn" class="secondary">EKSPORTUJ TĘ KOPIĘ</button>
        </div>
        <p class="hint updateFoot">Przed pobraniem nowej wersji Trener 2 zapisuje automatyczną kopię danych. APK jest podpisane i sprawdzane przez SHA-256, jeśli serwer udostępnia sumę.</p>`;
      settings.insertBefore(card,settings.firstChild);

      const cfg=config();
      el('autoUpdateCheck').checked=cfg.auto!==false;
      el('autoInstallCheck').checked=cfg.autoInstall!==false;
      el('autoUpdateCheck').addEventListener('change',()=>{
        saveConfig({auto:el('autoUpdateCheck').checked});
        if(el('autoUpdateCheck').checked)checkForUpdate(false);
      });
      el('autoInstallCheck').addEventListener('change',()=>saveConfig({autoInstall:el('autoInstallCheck').checked}));
      el('checkUpdateBtn').addEventListener('click',()=>checkForUpdate(true));
      el('downloadUpdateBtn').addEventListener('click',()=>downloadUpdate(false));
      el('restorePreUpdateBtn').addEventListener('click',()=>{
        if(!confirm('Przywrócić ostatnią kopię sprzed aktualizacji? Bieżące dane o tych samych kluczach zostaną zastąpione.'))return;
        try{if(window.Android&&Android.importLatestPreUpdateBackup)Android.importLatestPreUpdateBackup();}catch(e){}
      });
      el('exportPreUpdateBtn').addEventListener('click',()=>{
        try{if(window.Android&&Android.exportLatestPreUpdateBackup)Android.exportLatestPreUpdateBackup();}catch(e){}
      });
      refreshPreUpdateBackupUi();
    }else{
      refreshPreUpdateBackupUi();
    }
  }

  function refreshPreUpdateBackupUi(){
    const row=el('preUpdateBackupActions');if(!row)return;
    let has=false;
    try{has=!!(window.Android&&Android.hasPreUpdateBackup&&Android.hasPreUpdateBackup())}catch(e){}
    row.classList.toggle('hidden',!has);
  }

  function fallbackBackup(){
    const storage={};
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(!key||(!(key.startsWith('trainer3.')||key.startsWith('trainer2.'))))continue;
        const value=localStorage.getItem(key);
        if(value!==null)storage[key]=value;
      }
    }catch(e){}
    return {
      format:'trener2-backup',
      version:6,
      schemaVersion:Math.max(1,Number(localStorage.getItem('trainer3.schemaVersion')||1)||1),
      appVersion:currentVersion(),
      exportedAt:new Date().toISOString(),
      metadata:{forwardCompatibleStorage:true,preserveUnknownKeys:true,automaticPreUpdate:true},
      storage,
      nativeHydration:(()=>{
        if(!window.TrenerHydration?.exportHydrationBackup)return null;
        const raw=String(window.TrenerHydration.exportHydrationBackup()||'');
        if(!raw)throw Error('Brak historii wody w kopii przed aktualizacją.');
        return JSON.parse(raw);
      })(),
      excludes:[],includesPhotos:true
    };
  }

  function preparePreUpdateBackup(version){
    if(backupPreparedFor===version)return true;
    try{
      const data=window.TrenerBackup&&typeof window.TrenerBackup.buildBackup==='function'
        ?window.TrenerBackup.buildBackup()
        :fallbackBackup();
      if(!window.Android||typeof Android.savePreUpdateBackup!=='function')return false;
      const ok=!!Android.savePreUpdateBackup(JSON.stringify(data),version);
      if(ok){backupPreparedFor=version;refreshPreUpdateBackupUi();}
      return ok;
    }catch(e){return false;}
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

  function canAutoInstallNow(){
    try{if(typeof running!=='undefined'&&running)return false}catch(e){}
    return true;
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
      el('updateStatus').innerHTML='<b>Dostępna nowa wersja '+esc(info.version)+'.</b> '+(config().autoInstall!==false?'Pobieram ją automatycznie…':'Możesz zainstalować ją tutaj.');
      const notes=Array.isArray(info.notes)?info.notes:[];
      if(notes.length){
        el('updateNotes').classList.remove('hidden');
        el('updateNotes').innerHTML='<strong>Co nowego:</strong><ul>'+notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>';
      }else el('updateNotes').classList.add('hidden');
      try{if(window.Android&&Android.vibrate)Android.vibrate(100)}catch(e){}
      if(config().autoInstall!==false&&canAutoInstallNow())setTimeout(()=>downloadUpdate(true),500);
    }else{
      el('updateStatus').textContent='Masz najnowszą wersję Trener 2.';
      el('updateNotes').classList.add('hidden');
    }
  }

  function downloadUpdate(auto){
    if(!updateInfo){checkForUpdate(!auto);return;}
    const url=String(updateInfo.apkUrl||updateInfo.pageUrl||'');
    if(!url){
      if(typeof window.toast==='function')window.toast('Brak adresu aktualizacji.');
      return;
    }
    const version=String(updateInfo.version||'');
    if(auto&&downloadStartedFor===version)return;
    downloadStartedFor=version;
    const b=el('downloadUpdateBtn');if(b){b.disabled=true;b.textContent='TWORZĘ KOPIĘ…';}
    if(el('updateStatus'))el('updateStatus').textContent='Tworzę kopię danych przed aktualizacją…';
    if(!preparePreUpdateBackup(version)){
      downloadStartedFor='';
      if(b){b.disabled=false;b.textContent='ZAINSTALUJ AKTUALIZACJĘ';}
      if(el('updateStatus'))el('updateStatus').textContent='Aktualizacja zatrzymana: nie udało się utworzyć kopii danych.';
      if(typeof window.toast==='function')window.toast('Nie instaluję aktualizacji bez kopii danych.');
      return;
    }
    if(b){b.disabled=true;b.textContent='POBIERAM…';}
    if(el('updateStatus'))el('updateStatus').textContent='Kopia gotowa. Pobieram Trener 2 '+version+'…';
    try{
      if(window.Android&&Android.downloadAndInstallUpdate){
        Android.downloadAndInstallUpdate(url,String(updateInfo.sha256||''));
      }else if(window.Android&&Android.openUpdateUrl){
        Android.openUpdateUrl(url);
      }else window.location.href=url;
    }catch(e){
      downloadStartedFor='';
      if(b){b.disabled=false;b.textContent='ZAINSTALUJ AKTUALIZACJĘ';}
      if(typeof window.toast==='function')window.toast('Nie udało się rozpocząć aktualizacji.');
    }
  }

  function nativeDownloadStatus(status,message){
    installUi();
    const text=String(message||'');
    const b=el('downloadUpdateBtn');
    if(el('updateStatus'))el('updateStatus').textContent=text||'Aktualizacja…';
    if(status==='downloading'){
      if(b){b.disabled=true;b.textContent='POBIERAM…';}
      return;
    }
    if(status==='ready'){
      if(b){b.disabled=true;b.textContent='OTWIERAM INSTALATOR…';}
      return;
    }
    if(status==='permission'){
      if(b){b.disabled=true;b.textContent='ZEZWÓL W ANDROIDZIE';}
      if(typeof window.toast==='function')window.toast('Zezwól na instalację z Trener 2 i wróć do aplikacji.');
      return;
    }
    if(status==='installer'){
      if(b){b.disabled=true;b.textContent='POTWIERDŹ INSTALACJĘ';}
      return;
    }
    if(status==='error'){
      downloadStartedFor='';
      if(b){b.disabled=false;b.textContent='SPRÓBUJ PONOWNIE';}
      if(typeof window.toast==='function')window.toast(text||'Aktualizacja nie powiodła się.');
    }
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

  window.TrenerUpdate={
    nativeResult:renderResult,
    nativeDownloadStatus,
    check:()=>checkForUpdate(true)
  };

  function boot(){
    installUi();
    ensureNeutralScheduleDefault();
    loadProgressionAddon();
    const cfg=config();
    if(cfg.auto!==false)setTimeout(()=>checkForUpdate(false),900);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
