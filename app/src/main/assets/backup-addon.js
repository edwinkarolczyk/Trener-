(function(){
  'use strict';

  function toastMsg(msg){
    try{if(typeof window.toast==='function')window.toast(msg)}catch(e){}
  }

  function appVersion(){
    try{return window.Android&&Android.getAppVersion?String(Android.getAppVersion()):'—'}catch(e){return '—'}
  }

  function collectStorage(){
    const storage={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key)continue;
      if(!(key.startsWith('trainer3.')||key.startsWith('trainer2.')))continue;
      if(key==='trainer3.photos')continue;
      const value=localStorage.getItem(key);
      if(value!==null)storage[key]=value;
    }
    return storage;
  }

  function buildBackup(){
    return {
      format:'trener2-backup',
      version:5,
      appVersion:appVersion(),
      exportedAt:new Date().toISOString(),
      storage:collectStorage(),
      excludes:['trainer3.photos']
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

  function applyLegacy(data){
    if(data.settings)localStorage.setItem('trainer3.settings',JSON.stringify(data.settings));
    if(Array.isArray(data.history))localStorage.setItem('trainer3.history',JSON.stringify(data.history));
    if(Array.isArray(data.weights))localStorage.setItem('trainer3.weights',JSON.stringify(data.weights));
    if(data.customPlan)localStorage.setItem('trainer3.customPlan',JSON.stringify(data.customPlan));
    if(data.reminders)localStorage.setItem('trainer3.reminders',JSON.stringify(data.reminders));
  }

  function applyBackup(raw){
    let data;
    try{data=JSON.parse(raw)}catch(e){toastMsg('Nieprawidłowy plik kopii.');return;}
    try{
      if(data&&data.format==='trener2-backup'&&data.storage&&typeof data.storage==='object'){
        const entries=Object.entries(data.storage);
        if(!entries.length){toastMsg('Kopia nie zawiera danych.');return;}
        for(const [key,value] of entries){
          if(!(key.startsWith('trainer3.')||key.startsWith('trainer2.')))continue;
          if(key==='trainer3.photos')continue;
          if(typeof value==='string')localStorage.setItem(key,value);
        }
      }else if(data&&typeof data==='object'){
        applyLegacy(data);
      }else{
        toastMsg('Nieprawidłowy plik kopii.');
        return;
      }
      toastMsg('Kopia danych wczytana. Uruchamiam ponownie aplikację…');
      setTimeout(()=>window.location.reload(),650);
    }catch(e){
      toastMsg('Nie udało się wczytać kopii danych.');
    }
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

  window.TrenerBackup={nativeImport:applyBackup,exportNow:exportNative,importNow:importNative};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
