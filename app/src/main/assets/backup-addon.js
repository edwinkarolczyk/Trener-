(function(){
  'use strict';

  function toastMsg(msg){
    try{if(typeof window.toast==='function')window.toast(msg)}catch(e){}
  }

  function appVersion(){
    try{return window.Android&&Android.getAppVersion?String(Android.getAppVersion()):'—'}catch(e){return '—'}
  }

  function schemaVersion(){
    try{return Math.max(1,Number(localStorage.getItem('trainer3.schemaVersion')||1)||1)}catch(e){return 1}
  }

  function participantId(){
    try{return String(window.TrenerData070?.participantId?.()||localStorage.getItem('trainer3.participantId.v070')||localStorage.getItem('trainer3.deviceId.v064')||'')}catch(e){return ''}
  }

  function collectStorage(){
    const storage={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key)continue;
      if(!(key.startsWith('trainer3.')||key.startsWith('trainer2.')))continue;
      const value=localStorage.getItem(key);
      if(value!==null)storage[key]=value;
    }
    return storage;
  }

  function buildBackup(){
    return {
      format:'trener2-backup',
      version:6,
      schemaVersion:schemaVersion(),
      appVersion:appVersion(),
      participantId:participantId(),
      exportedAt:new Date().toISOString(),
      metadata:{forwardCompatibleStorage:true,preserveUnknownKeys:true},
      storage:collectStorage(),
      nativeHydration:(()=>{
        if(!window.TrenerHydration?.exportHydrationBackup)return null;
        const raw=String(window.TrenerHydration.exportHydrationBackup()||'');
        if(!raw)throw Error('Brak pełnej historii wody do kopii.');
        return JSON.parse(raw);
      })(),
      excludes:[],includesPhotos:true
    };
  }

  function exportNative(ev){
    if(ev){ev.preventDefault();ev.stopImmediatePropagation();}
    try{
      if(window.Android&&Android.exportBackup){
        const name='Trener2-kopia-'+new Date().toISOString().slice(0,10)+'.json';
        Android.exportBackup(JSON.stringify(buildBackup(),null,2),name);
        return;
      }
    }catch(e){
      toastMsg('Nie udało się rozpocząć eksportu.');
      return;
    }
    toastMsg('Eksport pliku działa w aplikacji Android.');
  }

  function importNative(ev){
    if(ev){ev.preventDefault();ev.stopImmediatePropagation();}
    try{
      if(window.Android&&Android.importBackup){Android.importBackup();return;}
    }catch(e){
      toastMsg('Nie udało się otworzyć importu.');
      return;
    }
    toastMsg('Import pliku działa w aplikacji Android.');
  }

  function legacyEntries(data){
    const pairs=[];
    for(const [key,field] of [['trainer3.settings','settings'],['trainer3.history','history'],
      ['trainer3.weights','weights'],['trainer3.customPlan','customPlan'],
      ['trainer3.reminders','reminders']]){
      const value=data[field];
      if(value&&(field!=='history'&&field!=='weights'||Array.isArray(value)))
        pairs.push([key,JSON.stringify(value)]);
    }
    return pairs;
  }

  function writeBackupEntries(entries){
    // Import is a multi-key write; take a snapshot before touching the first key.
    // If a later write reaches WebView storage quota, restore the previous values.
    const previous=new Map();
    try{
      for(const [key] of entries)previous.set(key,localStorage.getItem(key));
      for(const [key,value] of entries)localStorage.setItem(key,value);
      return true;
    }catch(e){
      let recovered=true;
      // Clear partially written keys first to free the space needed by the snapshot.
      for(const [key] of previous)try{localStorage.removeItem(key);}catch(err){recovered=false;}
      for(const [key,value] of previous){
        if(value!==null)try{localStorage.setItem(key,value);}catch(err){recovered=false;}
      }
      toastMsg(recovered?'Nie udało się zaimportować kopii. Przywrócono poprzednie dane.':
        'Błąd importu i przywracania danych — nie zamykaj aplikacji, wykonaj eksport i sprawdź kopię.');
      return false;
    }
  }

  function applyBackup(raw){
    let data;
    try{data=JSON.parse(raw)}catch(e){toastMsg('Nieprawidłowy plik kopii.');return;}
    if(!data||typeof data!=='object'||Array.isArray(data)){
      toastMsg('Nieprawidłowy plik kopii.');return;
    }
    let entries=[];
    try{
      if(data.format==='trener2-backup'){
        if(!data.storage||typeof data.storage!=='object'||Array.isArray(data.storage)){
          toastMsg('Nieprawidłowy format danych kopii.');return;
        }
        for(const [key,value] of Object.entries(data.storage)){
          if(!(key.startsWith('trainer3.')||key.startsWith('trainer2.'))||
            false)continue;
          if(typeof value!=='string'){toastMsg('Nieprawidłowa wartość w kopii danych.');return;}
          entries.push([key,value]);
        }
        if(entries.length&&data.schemaVersion&&
          !entries.some(([k])=>k==='trainer3.schemaVersion')&&
          !localStorage.getItem('trainer3.schemaVersion'))
          entries.push(['trainer3.schemaVersion',String(data.schemaVersion)]);
        if(entries.length&&data.participantId&&
          !entries.some(([k])=>k==='trainer3.participantId.v070')&&
          !localStorage.getItem('trainer3.participantId.v070'))
          entries.push(['trainer3.participantId.v070',String(data.participantId)]);
      }else entries=legacyEntries(data);
    }catch(e){toastMsg('Nie udało się odczytać danych kopii.');return;}
    if(!entries.length){toastMsg('Kopia nie zawiera danych.');return;}
    let previousNative=null;
    if(data.nativeHydration){
      const bridge=window.TrenerHydration;
      if(!bridge?.exportHydrationBackup||!bridge?.importHydrationBackup){
        toastMsg('Ta kopia wymaga nowszego Trenera do odtworzenia historii wody.');return;
      }
      try{
        previousNative=String(bridge.exportHydrationBackup()||'');
        if(!previousNative||!bridge.importHydrationBackup(JSON.stringify(data.nativeHydration)))
          throw Error('native hydration import failed');
      }catch(e){toastMsg('Nie udało się odtworzyć historii wody. Nie zmieniono danych Diety.');return;}
    }
    if(!writeBackupEntries(entries)){
      if(previousNative)try{window.TrenerHydration.importHydrationBackup(previousNative);}catch(e){}
      return;
    }
    toastMsg('Kopia danych wczytana. Uruchamiam ponownie aplikację…');
    setTimeout(()=>window.location.reload(),650);
  }

  function install(){
    const exportBtn=document.getElementById('exportBtn');
    if(exportBtn&&!exportBtn.dataset.nativeBackup){
      exportBtn.dataset.nativeBackup='1';
      exportBtn.addEventListener('click',exportNative,true);
    }

    const input=document.getElementById('importFile');
    const label=input?.closest('label');
    if(label&&!label.dataset.nativeBackup){
      label.dataset.nativeBackup='1';
      label.addEventListener('click',importNative,true);
    }
    if(input&&!input.dataset.nativeBackup){
      input.dataset.nativeBackup='1';
      input.addEventListener('click',importNative,true);
    }
  }

  window.TrenerBackup={nativeImport:applyBackup,exportNow:exportNative,importNow:importNative,buildBackup};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

(function(){
  if(document.getElementById('trener-live-status'))return;
  const s=document.createElement('script');
  s.id='trener-live-status';
  s.src='live-status.js';
  document.body.appendChild(s);
})();
