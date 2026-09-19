(function(){
'use strict';
const ENABLED='trainer3.nearby.enabled.v087';
const PEOPLE='trainer3.nearby.people.v087';
const SELECT='trainer3.nearby.selection.v087';
const OUTBOX='trainer3.nearby.outbox.v087';
const SENT='trainer3.nearby.sent.v087';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch(e){return f;}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const ownId=()=>String(window.TrenerData070?.participantId?.()||localStorage.getItem('trainer3.participantId.v070')||'');
const ownName=()=>String($('nameA')?.value||'Osoba 1').trim().slice(0,40)||'Osoba 1';
const safeId=x=>typeof x==='string'&&/^[a-zA-Z0-9:_-]{5,128}$/.test(x);
const native=()=>!!(window.Android&&typeof Android.nearbyStart==='function'&&
  typeof Android.nearbyPair==='function'&&typeof Android.nearbySend==='function');
const state={peers:[],pairs:[],pairIntent:{},sending:null,started:false,lastName:'',
  lastMessage:'',refreshing:false};
const pairedIds=()=>new Set(state.pairs.map(p=>p.id));
const personList=()=>{const x=read(PEOPLE,[]);return Array.isArray(x)?x.filter(p=>safeId(p.id)):[];};
function nativePairs(){
 if(!native())return [];
 try{const list=JSON.parse(Android.nearbyPairs()||'[]');
  return Array.isArray(list)?list.filter(p=>safeId(p.id)&&safeId(p.alias)):[];
 }catch(e){return [];}
}
function status(txt){
 state.lastMessage=String(txt||'');
 if($('v087Status'))$('v087Status').textContent=state.lastMessage;
 if($('v087SendStatus'))$('v087SendStatus').textContent=state.lastMessage;
}
function diagnosticsText(){
 let nativeState='';
 try{nativeState=Android.nearbyDiagnostics?.()||'';}catch(e){}
 let version='';
 try{version=Android.getAppVersion?.()||'';}catch(e){}
 return 'Trener 2 '+version+' • Nearby LAN\n'+nativeState+
  '\nOstatni komunikat: '+state.lastMessage+
  '\nUwaga: zwykły log wspólnego treningu Wi-Fi nie obejmuje powiązania profili.';
}
function refreshDiagnostics(){
 if($('v087DiagText'))$('v087DiagText').textContent=diagnosticsText();
}
function installDiagnostics(container){
 if(!container||container.querySelector('[data-v087-diag]'))return;
 const details=document.createElement('details');
 details.setAttribute('data-v087-diag','1');
 details.id='v087Trouble';
 details.innerHTML='<summary>Nie łączy? Diagnostyka połączenia</summary>'+
   '<p class="v087Help">Włącz wykrywanie na obu telefonach. Sprawdź, czy oba mają wersję 0.8.7.1 i działają w tej samej sieci. Sieć gościnna, izolacja klientów lub VPN mogą blokować połączenie.</p>'+
   '<button class="secondary" type="button" data-v087-restart>PONÓW WYKRYWANIE</button>'+
   '<button class="secondary" type="button" data-v087-copy>KOPIUJ DIAGNOSTYKĘ LAN</button>'+
   '<pre class="v087Diag" id="v087DiagText"></pre>';
 container.appendChild(details);
 details.ontoggle=()=>{if(details.open)refreshDiagnostics();};
 details.querySelector('[data-v087-restart]').onclick=beginDiscovery;
 details.querySelector('[data-v087-copy]').onclick=()=>{
  const content=diagnosticsText();
  try{
   if(Android.copyText?.(content)){status('Skopiowano diagnostykę LAN.');return;}
  }catch(e){}
  status('Nie udało się skopiować diagnostyki.');
 };
}
function known(){
 const main={id:ownId(),name:ownName(),owner:true};
 const old=window.TrenerOnePhone086?.getStored?.()||[];
 const merged=new Map();
 for(const p of [...old,...personList()]){
  if(!safeId(p.id)||p.id===main.id)continue;
  merged.set(p.id,{...p,owner:false});
 }
 return [main,...merged.values()];
}
function chosenIds(){
 const selection=read(SELECT,[]);
 return Array.isArray(selection)?selection.filter(safeId):[];
}
function selectedRoster(){
 const people=known(),choices=new Set(chosenIds());
 const list=people.filter(p=>p.owner||choices.has(p.id)).slice(0,4);
 return list.map((p,index)=>({index,id:p.id,name:p.owner?ownName():p.name}));
}
function savePerson(p){
 if(!safeId(p.id)||p.id===ownId())return;
 const old=personList().filter(x=>x.id!==p.id);
 write(PEOPLE,[...old,{id:p.id,name:String(p.name||'Osoba').slice(0,40),
  peerId:p.peerId||'',paired:!!p.peerId}].slice(0,100));
}
function updatePairNames(){
 let changed=false;
 for(const p of personList()){
  if(!p.peerId)continue;
  const remote=state.peers.find(x=>x.id===p.peerId);
  if(remote&&remote.name!==p.name){
   savePerson({...p,name:remote.name});changed=true;
  }
 }
 if(changed)renderPeople();
}
function renderPeople(){
 const root=$('v087Profiles');if(!root)return;
 const sel=new Set(chosenIds()),people=known();
 root.innerHTML=people.map(p=>{
  const pair=p.peerId&&state.pairs.some(x=>x.id===p.peerId);
  return '<label class="v087Person"><input type="checkbox" data-v087-person="'+esc(p.id)+
    '" '+(p.owner||sel.has(p.id)?'checked ':'')+(p.owner?'disabled ':'')+'/>'+
    '<span><b>'+esc(p.name)+'</b><small>'+(p.owner?'Twój profil':
       pair?'Telefon powiązany':'Zapamiętany profil bez telefonu')+'</small></span></label>';
 }).join('');
 root.querySelectorAll('[data-v087-person]').forEach(el=>el.onchange=()=>{
  const chosen=new Set(chosenIds());
  if(el.checked&&chosen.size>=3){el.checked=false;status('Maksymalnie 4 osoby łącznie.');return;}
  if(el.checked)chosen.add(el.dataset.v087Person);else chosen.delete(el.dataset.v087Person);
  write(SELECT,[...chosen]);status('Wybór uczestników zapisany.');
 });
 const count=selectedRoster().length;
 if($('v087SelectedCount'))$('v087SelectedCount').textContent=
  'Wybrano '+count+' z 4 osób • podczas treningu nie wpisujesz imion.';
}
function renderOnline(){
 for(const [id,button] of [['v087Online','v087Online2']]){
  const box=$(id);if(!box)continue;
  box.innerHTML=state.peers.length?state.peers.map(p=>{
   const paired=pairedIds().has(p.id);
   const opts=known().filter(k=>!k.owner&&!k.peerId).map(k=>
    '<option value="'+esc(k.id)+'">Powiąż zapisany profil: '+esc(k.name)+'</option>').join('');
   return '<div class="v087Peer"><div><b>'+esc(p.name)+
      '</b><small>'+ (paired?'Profil powiązany':'Trener 2 • w tej samej sieci')+
      '</small></div><div>'+
      (!paired?'<select data-v087-alias="'+esc(p.id)+'"><option value="'+esc(p.id)+
        '">Dodaj profil automatycznie</option>'+opts+'</select>'+
        '<button class="secondary" data-v087-pair="'+esc(p.id)+'" type="button">POŁĄCZ</button>':
        '<span class="v087Ok">POWIĄZANY</span>')+
      '</div></div>';
  }).join(''):'<p class="hint">Brak wykrytych telefonów. Otwórz Trenera 2 na obu urządzeniach i połącz je z tą samą siecią lub hotspotem.</p>';
  box.querySelectorAll('[data-v087-pair]').forEach(button=>button.onclick=()=>{
   const id=button.dataset.v087Pair,alias=box.querySelector(
    '[data-v087-alias="'+id+'"]')?.value||id;
   state.pairIntent[id]=alias;
   button.disabled=true;
   status('Porównaj kod na obu telefonach i zatwierdź powiązanie.');
   try{Android.nearbyPair(id,alias);}catch(e){button.disabled=false;status('Nie udało się połączyć.');}
  });
 }
}
function refreshPairs(){
 state.pairs=nativePairs();
 const peers=state.pairs;
 for(const pair of peers){
  const alias=state.pairIntent[pair.id]||personList().find(p=>p.peerId===pair.id)?.id||
    (pair.outgoing&&safeId(pair.alias)&&pair.alias!==ownId()?pair.alias:pair.id);
  if(alias===ownId())continue;
  const existing=personList().find(p=>p.id===alias);
  savePerson({id:alias,name:pair.name||existing?.name||'Osoba',peerId:pair.id});
 }
 renderPeople();renderOnline();renderQueue();
}
function beginDiscovery(){
 if(!native()){status('Automatyczne wykrywanie działa na telefonie z wersją 0.8.7.');return;}
 const id=ownId();
 if(!safeId(id)){status('Brak identyfikatora profilu. Uruchom aplikację ponownie.');return;}
 localStorage.setItem(ENABLED,'1');state.started=true;state.lastName=ownName();
 try{Android.nearbyStart(id,state.lastName);state.pairs=nativePairs();
  refreshPairs();status('Szukam Trenera 2 w tej samej sieci…');}
 catch(e){status('Nie udało się włączyć wyszukiwania.');}
}
function stopDiscovery(){
 localStorage.removeItem(ENABLED);state.started=false;state.peers=[];
 try{Android.nearbyStop();}catch(e){}
 renderOnline();status('Wykrywanie telefonów wyłączone.');
}
function jobKey(peer,session,source){return peer+'|'+session+'|'+source;}
function queueFor(h,people,pairs,already){
 const result=[];
 if(!h?.onePhone||!Array.isArray(h.onePhone.participants))return result;
 for(const p of h.onePhone.participants){
  const person=people.find(x=>x.id===p.id&&x.peerId&&x.id!==ownId());
  if(!person||!pairs.some(x=>x.id===person.peerId))continue;
  const bundle=window.TrenerOnePhone086?.transferFor?.(h,p);
  if(!bundle?.session?.records?.length)continue;
  const key=jobKey(person.peerId,h.sessionId,p.id);
  if(already.has(key))continue;
  result.push({key,peerId:person.peerId,sessionId:h.sessionId,
    sourceId:p.id,createdAt:Date.now(),bundle});
 }
 return result;
}
function pending(){const q=read(OUTBOX,[]);return Array.isArray(q)?q:[];}
function sessionSaved(h){
 renderQueue();
 if(!h?.onePhone)return;
 const waiting=queueFor(h,personList(),state.pairs,new Set(read(SENT,[])));
 if(!waiting.length)return;
 const root=$('v086Setup');if(!root)return;
 let banner=$('v087Finished');
 if(!banner){
  banner=document.createElement('div');banner.id='v087Finished';
  banner.className='v087Finished';
  root.insertBefore(banner,root.firstChild);
 }
 banner.innerHTML='<b>Trening zapisany</b><p>'+waiting.length+
  ' wyników uczestników do przekazania na ich telefony.</p>'+
  '<button id="v087SendFinished" class="primary" type="button">WYŚLIJ WYNIKI</button> '+
  '<button id="v087Later" class="secondary" type="button">PÓŹNIEJ</button>';
 $('v087SendFinished').onclick=()=>{scheduleSession(h);banner.remove();};
 $('v087Later').onclick=()=>banner.remove();
}
function renderQueue(){
 const q=pending();
 if($('v087Pending'))$('v087Pending').textContent=q.length?('Do przesłania: '+q.length):'Brak oczekujących transferów.';
 if($('v087Send'))$('v087Send').disabled=!native()||
   !(window.TrenerOnePhone086?.getStored||window.TrenerOnePhone086?.transferFor);
 if($('v087Cancel'))$('v087Cancel').classList.toggle('hidden',!q.length);
}
function scheduleFromSelected(){
 const id=$('v086Session')?.value;
 const history=read('trainer3.history',[]);
 const h=Array.isArray(history)?history.find(x=>x.sessionId===id):null;
 scheduleSession(h);
}
function scheduleSession(h){
 if(!h){status('Najpierw wybierz trening.');return;}
 const sent=new Set(read(SENT,[]));
 const items=queueFor(h,personList(),state.pairs,sent);
 if(!items.length){
  status('Nie ma nowych wyników dla powiązanych uczestników tej sesji.');return;
 }
 const old=pending(),keys=new Set(old.map(j=>j.key));
 const added=items.filter(j=>!keys.has(j.key));
 if(!added.length){status('Wyniki już oczekują na wysłanie.');flush();return;}
 if(old.length+added.length>100){status('Kolejka jest pełna. Zrób kopię danych.');return;}
 write(OUTBOX,[...old,...added]);
 status('Zlecono '+added.length+' wyników. Wyślę, gdy połączone telefony będą w tej samej sieci.');
 renderQueue();flush();
}
function flush(){
 if(state.sending||!native()||!state.started)return;
 const online=new Set(state.peers.map(p=>p.id));
 const next=pending().find(x=>online.has(x.peerId)&&
   (!x.retryAfter||x.retryAfter<=Date.now()));
 if(!next)return;
 state.sending=next.key;
 const jobId='job:'+Math.random().toString(36).slice(2)+Date.now().toString(36);
 state.sendingJob=jobId;
 try{Android.nearbySend(next.peerId,JSON.stringify(next.bundle),jobId);}
 catch(e){state.sending=null;state.sendingJob='';}
}
function nativeEvent(raw){
 let event;try{event=JSON.parse(raw);}catch(e){return;}
 if(event.type==='status'){
  status(event.text||'Stan sieci zmieniony.');
  if(/Nie powiązano|Nie połączono|Nie udało|sieć lokaln/i.test(String(event.text||''))){
   renderOnline();
   const details=$('v087Trouble');
   if(details){details.open=true;refreshDiagnostics();}
  }
  return;
 }
 if(event.type==='online'){
  state.peers=Array.isArray(event.peers)?event.peers.filter(p=>safeId(p.id)&&p.id!==ownId()):[];
  updatePairNames();renderOnline();flush();return;
 }
 if(event.type==='paired'){
  const id=event.id,alias=state.pairIntent[id]||id;
  delete state.pairIntent[id];
  if(safeId(id)&&safeId(alias)&&alias!==ownId()){
   const older=personList().find(p=>p.id===alias);
   savePerson({id:alias,name:event.name||older?.name||'Osoba',peerId:id});
   if(chosenIds().length===0||chosenIds().length<3){
    const selected=new Set(chosenIds());selected.add(alias);write(SELECT,[...selected]);
   }
  }
  refreshPairs();
  status('Powiązano profil '+(event.name||'uczestnika')+'. Od teraz nie wpisujesz jego imienia.');
  return;
 }
 if(event.type==='incoming'){
  const job=event.jobId,peer=state.pairs.find(x=>x.id===event.peerId);
  let ok=false;
  try{
   if(!peer||!safeId(peer.alias))throw Error('Nieznany profil źródłowy.');
   if(peer.outgoing&&peer.alias!==ownId())throw Error('To nie jest wynik właściciela tego telefonu.');
   const result=window.TrenerOnePhone086?.receive?.(event.bundle,
     {trustedSourceId:peer.id,expectedOriginId:peer.alias});
   if(!result||result.cancelled)throw Error('Import anulowany.');
   ok=true;
   status('Odebrano trening od '+(peer.name||'uczestnika')+
     ' — zapisano '+result.sets+' serii.');
  }catch(e){status('Nie zapisano odebranego treningu: '+String(e.message||e));}
  try{Android.nearbyAck(job,ok);}catch(e){}
  return;
 }
 if(event.type==='sent'){
  if(state.sendingJob!==event.jobId)return;
  const key=state.sending;state.sending=null;state.sendingJob='';
  if(event.ok){
   write(OUTBOX,pending().filter(j=>j.key!==key));
   const old=read(SENT,[]);if(!old.includes(key))write(SENT,[...old,key].slice(-600));
   status('Wynik odebrany i zapisany na drugim telefonie.');
  }else{
   write(OUTBOX,pending().map(j=>j.key===key?{...j,retryAfter:Date.now()+20000}:j));
   status(event.reason||'Wynik czeka na drugi telefon.');
  }
  renderQueue();if(event.ok)flush();
 }
}
function installUi(){
 const setup=$('v086Setup');
 if(setup&&!$('v087Profiles')){
  const box=document.createElement('div');box.id='v087RosterBox';
  box.innerHTML='<div class="eyebrow">KTO DZIŚ ĆWICZY?</div>'+
   '<p class="v087Help">Wybierz zapamiętane profile. Imiona pobieramy z aplikacji Trener 2.</p>'+
   '<div id="v087Profiles"></div><p id="v087SelectedCount" class="v087Help"></p>'+
   '<button id="v087AddOffline" type="button" class="secondary">+ OSOBA BEZ TELEFONU</button>'+
   '<div class="eyebrow" style="margin-top:14px">TELEFONY W TEJ SAMEJ SIECI</div>'+
   '<button id="v087Enable" type="button" class="primary">SZUKAJ TELEFONÓW</button>'+
   '<button id="v087Disable" type="button" class="secondary">WYŁĄCZ WYKRYWANIE</button>'+
   '<div id="v087Online"></div><p id="v087Status" class="v087Help">Otwórz Trenera 2 na drugim telefonie.</p>';
  setup.insertBefore(box,setup.firstChild);
  installDiagnostics(box);
  $('v087Enable').onclick=beginDiscovery;
  $('v087Disable').onclick=stopDiscovery;
  $('v087AddOffline').onclick=()=>{
   const name=prompt('Imię osoby bez własnego telefonu (tylko pierwszy raz):');
   if(!name?.trim())return;
   const id='offline:'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
   savePerson({id,name:name.trim().slice(0,40)});
   const selected=new Set(chosenIds());if(selected.size<3)selected.add(id);
   write(SELECT,[...selected]);renderPeople();
  };
  renderPeople();renderOnline();
 }
 if(setup&&$('v086Count')){
  setup.querySelectorAll(':scope > .v086Note').forEach((note,i)=>{
   note.textContent=i===0
    ?'Jedna kolejka, osobne serie i odpoczynek każdej osoby. Wyniki wyślesz z aplikacji, bez pliku JSON.'
    :'Osoby bez telefonu pozostają na liście. Powiązany profil nie zależy od imienia.';
  });
  if($('v086Count').previousElementSibling?.tagName==='LABEL')
   $('v086Count').previousElementSibling.classList.add('v087Legacy');
  $('v086Count').classList.add('v087Legacy');
  $('v086People')?.classList.add('v087Legacy');
  $('v086SavePeople')?.classList.add('v087Legacy');
 }
 const settings=$('settings');
 if(settings&&!$('v087Settings')){
  const card=document.createElement('div');card.id='v087Settings';card.className='card';
  card.innerHTML='<div class="eyebrow">POWIĄZANE PROFILE</div><h2>Telefony Trenera 2</h2>'+
   '<p class="hint">Raz zaakceptuj identyczny kod na dwóch telefonach. '+
   'Dalej aplikacje rozpoznają się po ID, a nie po imieniu lub adresie IP.</p>'+
   '<button id="v087Enable2" type="button" class="primary">WŁĄCZ WYKRYWANIE</button>'+
   '<button id="v087Disable2" type="button" class="secondary">WYŁĄCZ WYKRYWANIE</button>'+
   '<div id="v087Online2"></div>';
  settings.appendChild(card);
  $('v087Enable2').onclick=beginDiscovery;
  $('v087Disable2').onclick=stopDiscovery;
  renderOnline();
 }
 const transfer=$('v086Transfer');
 if(transfer&&!$('v087Send')){
  transfer.querySelector('h2').textContent='Wyślij wyniki uczestnikom';
  const paragraph=transfer.querySelector('.hint');
  if(paragraph)paragraph.textContent='Połącz telefony raz. Po treningu zleć wysłanie wyników; jeśli telefon osoby jest offline, transfer poczeka.';
  const button=document.createElement('button');button.id='v087Send';button.type='button';
  button.className='primary bigBtn';button.textContent='WYŚLIJ WYNIKI POWIĄZANYM OSOBOM';
  $('v086Session')?.insertAdjacentElement('afterend',button);
  const pendingText=document.createElement('p');pendingText.id='v087Pending';
  pendingText.className='v087Help';button.insertAdjacentElement('afterend',pendingText);
  const cancel=document.createElement('button');cancel.id='v087Cancel';
  cancel.className='secondary hidden';cancel.textContent='ANULUJ OCZEKUJĄCE WYSYŁKI';
  pendingText.insertAdjacentElement('afterend',cancel);
  cancel.onclick=()=>{if(confirm('Anulować oczekujące transfery?')){
   write(OUTBOX,[]);renderQueue();status('Wysyłki anulowane.');}};
  const text=document.createElement('p');text.id='v087SendStatus';text.className='v087Help';
  cancel.insertAdjacentElement('afterend',text);
  const advanced=document.createElement('details');advanced.id='v087Advanced';
  advanced.innerHTML='<summary>Ręczne przesłanie pliku JSON (awaryjnie)</summary>';
  for(const el of [$('v086Person')?.previousElementSibling,$('v086Person'),$('v086Export'),
    $('v086Import')?.closest('label'),$('v086TransferStatus')])if(el)advanced.appendChild(el);
  transfer.appendChild(advanced);
  button.onclick=scheduleFromSelected;
  renderQueue();
 }
}
function boot(){
 const s=document.createElement('style');s.id='v087Styles';
 s.textContent='.v087Legacy{display:none!important}.v087Help{font-size:11px;color:#aaa;line-height:1.45;margin:9px 0}'+
  '.v087Person{display:flex;align-items:center;gap:10px;border:1px solid #323232;border-radius:10px;padding:10px;margin:7px 0}'+
  '.v087Person input{width:20px;flex-shrink:0}.v087Person span{display:flex;flex-direction:column;gap:3px}'+
  '.v087Person small{font-size:10px;color:#888}.v087Peer{border:1px solid #373737;border-radius:10px;padding:10px;margin:8px 0}'+
  '.v087Peer small{display:block;color:#aaa;font-size:10px;margin-top:4px}'+
  '.v087Peer select{font-size:11px}.v087Peer button{margin-top:7px}.v087Ok{color:#44d28a;font-size:11px}'+
  '#v087Advanced{border-top:1px solid #383838;padding:10px 0;margin-top:10px}'+
  '.v087Finished{border:1px solid #277c4c;border-radius:12px;background:#10241a;padding:12px;margin:10px 0}'+
  '.v087Finished p{font-size:12px;color:#c9d6cf}.v087Finished button{margin:4px 5px 2px 0}';
 s.textContent+='.v087Help{overflow-wrap:anywhere;word-break:break-word}'+
   '.v087Diag{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;'+
   'font-size:11px;line-height:1.45;padding:9px;border-radius:8px;background:#101010;color:#ddd}'+
   '#v087Trouble{border-top:1px solid #383838;margin-top:12px;padding-top:10px}';
 document.head.appendChild(s);
 installUi();refreshPairs();
 document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setTimeout(installUi,40)));
 $('nameA')?.addEventListener('change',()=>{
  renderPeople();
  if(state.started&&state.lastName!==ownName())beginDiscovery();
 });
 setInterval(()=>{if(state.started)flush();},10000);
 if(localStorage.getItem(ENABLED)==='1')setTimeout(beginDiscovery,150);
}
window.TrenerNearby087={nativeEvent,selectedRoster,queueFor,jobKey,sessionSaved,
 get diagnostics(){return diagnosticsText();},
 get people(){return known();},get pairs(){return state.pairs.slice();}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
