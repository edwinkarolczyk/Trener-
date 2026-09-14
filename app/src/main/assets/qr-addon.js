(function(){
  const $=id=>document.getElementById(id);

  function toastSafe(message){
    if(typeof window.toast==='function') window.toast(message);
    else alert(message);
  }

  function setBranding(){
    const subtitle=document.querySelector('.appHeader p');
    if(subtitle) subtitle.textContent='Idea by Edwin';

    const partnerWrap=$('partnerWrap');
    if(partnerWrap){
      const label=partnerWrap.querySelector('label');
      if(label) label.textContent='Kumpel z siłowni';
    }

    const nameB=$('nameB');
    if(nameB && ['Partner','Osoba 2',''].includes((nameB.value||'').trim())){
      nameB.value='Kumpel z siłowni';
      try{if(typeof window.saveSettings==='function')window.saveSettings();}catch(e){}
    }

    const wifiPartner=$('wifiPartner');
    if(wifiPartner){
      const label=wifiPartner.parentElement&&wifiPartner.parentElement.querySelector('span');
      if(label)label.textContent='Kumpel z siłowni';
    }

    const panes=document.querySelectorAll('.wifiPane');
    if(panes.length>1){
      const h3=panes[1].querySelector('h3');
      if(h3)h3.textContent='2. Kumpel z siłowni';
      const hint=panes[1].querySelector('.hint');
      if(hint)hint.textContent='Najprościej zeskanuj kod QR z telefonu gospodarza. IP i kod możesz też wpisać ręcznie.';
    }
  }

  function installStyles(){
    if($('qr-pairing-style'))return;
    const style=document.createElement('style');
    style.id='qr-pairing-style';
    style.textContent=`
      .qrPairBox{margin-top:10px;background:#0d0d0d;border:1px solid #303030;border-radius:14px;padding:12px;text-align:center}
      .qrPairBox img{display:block;width:min(230px,80%);aspect-ratio:1/1;object-fit:contain;background:#fff;border-radius:12px;margin:8px auto}
      .qrPairBox .hint{margin:4px 0 0}
      .qrScanBtn{width:100%;margin-top:8px;background:#f4f4f4!important;color:#111!important}
      .brandBy{font-size:11px;color:#999;margin-top:2px}
    `;
    document.head.appendChild(style);
  }

  function installQrUi(){
    const panes=document.querySelectorAll('.wifiPane');
    if(panes.length<2)return;

    if(!$('hostQrBox')){
      const box=document.createElement('div');
      box.id='hostQrBox';
      box.className='qrPairBox hidden';
      box.innerHTML='<b>Połącz przez QR</b><img id="hostQrImg" alt="Kod QR do połączenia"><p class="hint">Kumpel z siłowni skanuje ten kod swoim telefonem.</p>';
      panes[0].appendChild(box);
    }

    if(!$('scanQrBtn')){
      const btn=document.createElement('button');
      btn.id='scanQrBtn';
      btn.className='secondary qrScanBtn';
      btn.textContent='ZESKANUJ QR';
      btn.addEventListener('click',scanQr);
      panes[1].appendChild(btn);
    }

    const hostBtn=$('hostBtn');
    if(hostBtn&&!hostBtn.dataset.qrHook){
      hostBtn.dataset.qrHook='1';
      hostBtn.addEventListener('click',()=>setTimeout(refreshHostQr,250));
    }
  }

  function qrPayload(ip,code){
    return 'trener2://join?ip='+encodeURIComponent(ip)+'&code='+encodeURIComponent(code);
  }

  function refreshHostQr(){
    const code=($('hostCode')?.value||'').trim();
    let ip=($('localIp')?.textContent||'').trim();
    try{if(window.Android&&Android.wifiLocalIp)ip=Android.wifiLocalIp()||ip;}catch(e){}
    if(!/^\d{6}$/.test(code)||!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip))return;
    try{
      if(!(window.Android&&Android.wifiQr))return;
      const src=Android.wifiQr(qrPayload(ip,code));
      if(src){
        $('hostQrImg').src=src;
        $('hostQrBox').classList.remove('hidden');
      }
    }catch(e){}
  }

  function scanQr(){
    try{
      if(window.Android&&Android.scanWifiQr){
        Android.scanWifiQr();
        return;
      }
    }catch(e){}
    toastSafe('Skanowanie QR działa w aplikacji Android.');
  }

  function parseQr(raw){
    try{
      const u=new URL(String(raw||''));
      if(u.protocol!=='trener2:'||u.hostname!=='join')return null;
      const ip=(u.searchParams.get('ip')||'').trim();
      const code=(u.searchParams.get('code')||'').trim();
      if(!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)||!/^\d{6}$/.test(code))return null;
      return {ip,code};
    }catch(e){return null;}
  }

  function nativeScan(raw){
    const data=parseQr(raw);
    if(!data){toastSafe('To nie jest kod QR z aplikacji Trener 2.');return;}
    if($('joinIp'))$('joinIp').value=data.ip;
    if($('joinCode'))$('joinCode').value=data.code;
    toastSafe('Kod QR odczytany — łączę z kumplem z siłowni.');
    setTimeout(()=>{
      if(typeof window.joinWifiSession==='function')window.joinWifiSession();
      else $('joinBtn')?.click();
    },100);
  }

  function hookWifiStatus(){
    if(!window.TrenerWifi||window.TrenerWifi.__qrHook)return;
    const original=window.TrenerWifi.nativeStatus;
    window.TrenerWifi.nativeStatus=function(status,detail){
      if(typeof original==='function')original(status,detail);
      setBranding();
      if(status==='waiting'||(status==='connected'&&detail==='host'))setTimeout(refreshHostQr,100);
    };
    window.TrenerWifi.__qrHook=true;
  }

  function init(){
    installStyles();
    setBranding();
    installQrUi();
    hookWifiStatus();
    window.TrenerQr={nativeScan};
    setTimeout(()=>{setBranding();installQrUi();},250);
  }

  init();
})();
