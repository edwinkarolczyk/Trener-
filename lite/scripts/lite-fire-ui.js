(function(){
'use strict';
var core=window.TrenerLiteFireCore;
if(!core)return;
var doc=document,rosterNodes={},lastSession='',lastMinute=-1;
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
 var holder=$('technique');if(holder)holder.insertAdjacentElement('afterend',extra);
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
function syncRoster(group){
 var people=$('liteFirePeople');if(!people)return;
 if(lastSession!==group.sessionId){
  rosterNodes={};lastSession=group.sessionId;
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
 doc.body.classList.toggle('liteFireGroup',!!group);
 if(!active)return;
 install();
 if(!group)return;
 syncRoster(group);
 // Duplikujący ekran przełączania uczestnika z oryginalnego modułu jest
 // ukryty przez CSS. Jedyny źródłowy stan pochodzi z jego silnika treningowego.
 var more=$('liteFireMore'),tech=$('technique'),extra=more&&more.querySelector('.liteFireExtra');
 if(extra&&tech){
  var text=tech.textContent||'';
  writeText(extra,text);
 }
}
function boot(){
 install();
 manageUi();
 setInterval(manageUi,1000);
 doc.addEventListener('visibilitychange',manageUi);
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot);
else boot();
})();
