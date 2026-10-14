(function(){
'use strict';
var core=window.TrenerLiteFireCore;
if(!core)return;
var doc=document,rosterNodes={},lastSession='',lastNativeActive=null,restSeen={},restAnnounced={};
function $(id){return doc.getElementById(id);}
function box(tag,cls,text){
 var e=doc.createElement(tag);if(cls)e.className=cls;
 if(text!==undefined)e.textContent=text;
 return e;
}
function hasActiveTraining(){
 try{return typeof running!=='undefined'&&!!running;}catch(e){return false;}
}
function snapshot(){
 var group=window.TrenerOnePhone086;
 try{return group&&group.active&&group.tabletState||null;}catch(e){return null;}
}
function addRoster(container){
 var wrap=box('section','liteFireRoster');wrap.id='liteFireRoster';
 wrap.setAttribute('aria-label','Postęp uczestników i liczniki odpoczynku');
 var head=box('div','liteFireRosterTitle');
 head.appendChild(box('strong','', 'KOLEJKA I PRZERWY'));
 var count=box('span','liteFireCount');count.id='liteFireCount';head.appendChild(count);
 wrap.appendChild(head);
 var items=box('div','liteFirePeople');items.id='liteFirePeople';
 wrap.appendChild(items);container.appendChild(wrap);
}
function addStatus(container){
 var bar=box('div','liteFireHeadline');bar.id='liteFireHeadline';
 bar.appendChild(box('strong','', 'AKTUALNIE ĆWICZY'));
 var chip=box('span','liteFireChip','TRENING GRUPOWY');chip.id='liteFireState';
 bar.appendChild(chip);
 container.appendChild(bar);
}
function install(){
 if($('liteFireRoster'))return;
 var panel=$('v086Workout');
 if(!panel)return;
 addStatus(panel);
 addRoster(panel);
 var extra=doc.createElement('details');extra.id='liteFireMore';extra.className='liteFireMore';
 var summary=box('summary','', 'Wskazówki i szczegóły treningu');
 extra.appendChild(summary);
 var info=box('div','liteFireExtra','Szczegóły techniki i wskazówki pozostają dostępne podczas treningu.');
 extra.appendChild(info);
 var holder=$('coach');if(holder)holder.insertAdjacentElement('afterend',extra);
 extra.addEventListener('toggle',function(){
  doc.body.classList.toggle('liteFireMoreOpen',!!extra.open);
 });
 var save=$('saveSetBtn');
 if(save){save.setAttribute('aria-label','Zapisz wykonaną serię aktualnej osoby');}
 var pause=$('pauseBtn'),stop=$('stopBtn');
 if(pause)pause.setAttribute('aria-label','Wstrzymaj lub wznów trening');
 if(stop)stop.setAttribute('aria-label','Zakończ trening');
}
function makePerson(p){
 var item=box('div','liteFirePerson'),index=String(p.index);
 item.setAttribute('data-index',index);
 var head=box('div','liteFirePersonHead');
 var name=box('b','liteFirePersonName',core.name(p));
 head.appendChild(name);
 var pill=box('span','liteFirePill','GOTOWY');
 pill.setAttribute('data-field','status');
 head.appendChild(pill);
 var ex=box('div','liteFirePersonExercise');ex.setAttribute('data-field','exercise');
 var progress=box('div','liteFirePersonMeta');progress.setAttribute('data-field','progress');
 var rest=box('strong','liteFireRest');rest.setAttribute('data-field','rest');
 item.appendChild(head);item.appendChild(ex);
 var foot=box('div','liteFirePersonFoot');foot.appendChild(progress);foot.appendChild(rest);
 item.appendChild(foot);
 return item;
}
function writeText(el,t){if(el&&el.textContent!==t)el.textContent=t;}
function installSignals(){
 if($('liteFireSignals'))return;
 var settings=$('settings');if(!settings)return;
 var card=box('div','card');card.id='liteFireSignals';
 var title=box('h2','', 'Sygnał końca odpoczynku');
 var note=box('p','hint','Na tablecie kolor i licznik pozostają zawsze widoczne. Możesz wyłączyć dźwięk albo włączyć krótką wibrację.');
 card.appendChild(title);card.appendChild(note);
 var configs=[
  {id:'liteFireBeep',key:'trainer3.lite.fire.sound.v035',label:'Dźwięk na koniec przerwy',def:true},
  {id:'liteFireVibrate',key:'trainer3.lite.fire.vibrate.v035',label:'Krótka wibracja (opcjonalna)',def:false}
 ];
 configs.forEach(function(cfg){
  var label=box('label','liteFireSwitch'),input=box('input');
  input.type='checkbox';input.id=cfg.id;
  input.checked=(localStorage.getItem(cfg.key)===null?cfg.def:localStorage.getItem(cfg.key)==='yes');
  input.addEventListener('change',function(){
   try{localStorage.setItem(cfg.key,input.checked?'yes':'no');}catch(e){}
  });
  label.appendChild(input);label.appendChild(box('span','',cfg.label));card.appendChild(label);
 });
 settings.insertBefore(card,settings.firstChild);
}
function restSignal(){
 var sound=localStorage.getItem('trainer3.lite.fire.sound.v035')!=='no';
 var vibration=localStorage.getItem('trainer3.lite.fire.vibrate.v035')==='yes';
 if(!sound&&!vibration)return;
 try{
  if(window.LiteBridge&&typeof LiteBridge.restFinishedSignal==='function')
   LiteBridge.restFinishedSignal(sound,vibration);
 }catch(e){}
}
function signalCompletedRest(group,now){
 if(group.paused)return;
 group.participants.forEach(function(p){
  if(p.done)return;
  var due=Number(p.readyAt||0),key=String(p.id)+':'+due;
  if(due<=0)return;
  if(due>now){restSeen[p.id]=key;return;}
  if(restSeen[p.id]===key&&!restAnnounced[key]){
   restAnnounced[key]=true;
   restSignal();
  }
 });
}
function syncRoster(group){
 var people=$('liteFirePeople');if(!people)return;
 if(lastSession!==group.sessionId){
  rosterNodes={};restSeen={};restAnnounced={};lastSession=group.sessionId;
  while(people.firstChild)people.removeChild(people.firstChild);
 }
 var now=Date.now(),live={};
 group.participants.forEach(function(p){
  var key=String(p.index),node=rosterNodes[key];
  if(!node){node=makePerson(p);rosterNodes[key]=node;people.appendChild(node);}
  live[key]=true;
  var stat=core.state(p,now,group.paused),selected=group.personIndex===p.index;
  node.className='liteFirePerson liteFire'+stat.code+(selected?' liteFireCurrent':'');
  writeText(node.querySelector('.liteFirePersonName'),core.name(p));
  writeText(node.querySelector('[data-field=status]'),stat.label);
  writeText(node.querySelector('[data-field=exercise]'),p.done?'Ćwiczenia zakończone':
    core.safeText(p.exerciseName));
  writeText(node.querySelector('[data-field=progress]'),
    p.done?(p.completedSets+' / '+p.totalSets+' serii — gotowe'):
      'Seria '+(p.seriesDone+1)+'/'+p.seriesTotal+' • '+p.completedSets+'/'+p.totalSets+' łącznie');
  writeText(node.querySelector('[data-field=rest]'),
    stat.code==='rest'||stat.code==='later'?stat.detail:
    stat.code==='done'?'✓':stat.code==='pause'?'❚❚':'●');
 });
 Object.keys(rosterNodes).forEach(function(key){
  if(!live[key]){var elem=rosterNodes[key];elem.parentNode&&elem.parentNode.removeChild(elem);delete rosterNodes[key];}
 });
 signalCompletedRest(group,now);
 var s=core.summary(group,now);
 writeText($('liteFireCount'),s.total+' osób • '+s.ready+' gotowe • '+s.done+' zakończone');
 writeText($('liteFireState'),group.paused?'PAUZA':s.ready?'GOTOWI: '+s.ready:'TRWA ODPOCZYNEK');
 var p=group.participants.filter(function(x){return x.index===group.personIndex;})[0];
 if(p){
  var m=$('v086Status');
  if(m&&m.getAttribute('role')!=='status')m.setAttribute('role','status');
  var name=$('athlete');writeText(name,p.name);
 }
}
function manageUi(){
 var active=hasActiveTraining(),group=active?snapshot():null;
 doc.body.classList.toggle('liteFireActive',active);
 doc.documentElement.classList.toggle('liteFireActive',active);
 if(lastNativeActive!==active){
  lastNativeActive=active;
  try{if(window.LiteBridge&&typeof LiteBridge.setTabletTrainingActive==='function')
   LiteBridge.setTabletTrainingActive(!!active);}catch(e){}
 }
 doc.body.classList.toggle('liteFireGroup',!!group);
 if(!active)return;
 install();
 // Podgląd ćwiczenia i wskazówki z oryginalnego Trenera pozostają dostępne po rozwinięciu.
 var more=$('liteFireMore'),tech=$('technique'),extra=more&&more.querySelector('.liteFireExtra');
 var visual=$('v055Visual');
 if(more&&visual&&visual.parentNode!==more)more.appendChild(visual);
 if(extra&&tech)writeText(extra,tech.textContent||'');
 if(!group)return;
 syncRoster(group);
}
function boot(){
 install();
 installSignals();
 manageUi();
 setInterval(manageUi,1000);
 doc.addEventListener('visibilitychange',manageUi);
 // Po START/ZAPISZ/PAUZA/STOP odśwież stan od razu, bez czekania sekundy.
 doc.addEventListener('click',function(e){
  var id=e.target&&e.target.id;
  if(['startBtn','v086Resume','saveSetBtn','pauseBtn','stopBtn','v086SkipTurn','v086SkipExercise'].indexOf(id)!==-1)
   setTimeout(manageUi,80);
 });
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot);
else boot();
})();
