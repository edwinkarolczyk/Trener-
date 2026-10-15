(function(){
'use strict';
var core=window.TrenerLiteFireCore;
if(!core)return;
var doc=document,rosterNodes={},lastSession='',lastNativeActive=null,restSeen={},restAnnounced={};
var DOCK_KEY='trainer3.lite.dock.collapsed.v042',dockNodes={},dockSession='';
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
 bar.appendChild(box('strong','', 'STATUS TRENINGU GRUPOWEGO'));
 var chip=box('span','liteFireChip','TRENING GRUPOWY');chip.id='liteFireState';
 bar.appendChild(chip);
 container.appendChild(bar);
 var now=box('div','liteFireOverview','Przygotowanie treningu…');now.id='liteFireNow';
 now.setAttribute('role','status');container.appendChild(now);
}
function install(){
 if($('liteFireRoster'))return;
 var panel=$('v086Workout');
 if(!panel)return;
 addStatus(panel);
 addRoster(panel);
 var training=$('training'),athlete=$('athlete');
 // Najpierw status całej grupy, następnie formularz zapisu jednej serii.
 if(training&&athlete){
  training.insertBefore(panel,athlete);
  if(!$('liteFireFormLabel')){
   var sub=box('div','liteFireFormLabel','NASTĘPNA SERIA');sub.id='liteFireFormLabel';
   training.insertBefore(sub,athlete);
  }
 }
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
  {id:'liteFireVibrate',key:'trainer3.lite.fire.vibrate.v035',label:'Krótka wibracja (opcjonalna)',def:true}
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
  var code=selected&&stat.code==='ready'?'active':stat.code;
  var classes='liteFirePerson liteFire'+code+(selected?' liteFireCurrent':'');
  if(node.className!==classes)node.className=classes;
  writeText(node.querySelector('.liteFirePersonName'),core.name(p));
  writeText(node.querySelector('[data-field=status]'),code==='active'?'ĆWICZY TERAZ':stat.label);
  writeText(node.querySelector('[data-field=exercise]'),p.done?'Ćwiczenia zakończone':
    core.safeText(p.exerciseName));
  writeText(node.querySelector('[data-field=progress]'),
    p.done?(p.completedSets+' / '+p.totalSets+' serii — gotowe'):
      'Seria '+(p.seriesDone+1)+'/'+p.seriesTotal+' • '+p.completedSets+'/'+p.totalSets+' łącznie');
  writeText(node.querySelector('[data-field=rest]'),
    stat.code==='rest'||stat.code==='later'?stat.detail:
    stat.code==='done'?'✓':stat.code==='pause'?'❚❚':code==='active'?'▶':'●');
 });
 Object.keys(rosterNodes).forEach(function(key){
  if(!live[key]){var elem=rosterNodes[key];elem.parentNode&&elem.parentNode.removeChild(elem);delete rosterNodes[key];}
 });
 signalCompletedRest(group,now);
 var s=core.summary(group,now);
 writeText($('liteFireCount'),s.total+' osób • '+s.ready+' gotowe • '+s.done+' zakończone');
 var current=group.participants.filter(function(x){return x.index===group.personIndex;})[0];
 var currentState=current?core.state(current,now,group.paused):null;
 var activePerson=current&&currentState&&currentState.code==='ready'?current:null;
 var restCount=s.rest,waiting=s.ready-(activePerson?1:0);
 var label=group.paused?'WSZYSCY: PAUZA':activePerson?
  'ĆWICZY: '+core.name(activePerson):restCount?
  'TRWA ODPOCZYNEK':s.done===s.total?'TRENING ZAKOŃCZONY':'CZEKAMY NA GOTOWOŚĆ';
 writeText($('liteFireNow'),label);
 var nowBox=$('liteFireNow');if(nowBox){
  var cl='liteFireOverview '+(group.paused?'liteFireOverviewPause':activePerson?
   'liteFireOverviewWork':restCount?'liteFireOverviewRest':'liteFireOverviewReady');
  if(nowBox.className!==cl)nowBox.className=cl;
 }
 writeText($('liteFireState'),'GOTOWI: '+Math.max(0,waiting)+
  ' • PRZERWA: '+restCount+' • KONIEC: '+s.done);
 var form=$('liteFireFormLabel');if(form)
  writeText(form,activePerson?'ZAPIS SERII — '+core.name(activePerson):
   currentState&&currentState.code==='rest'?'PO PRZERWIE — '+core.name(current):
   'PRZYGOTOWANIE NASTĘPNEJ SERII');
 var save=$('saveSetBtn');
 if(save)writeText(save,activePerson?'ZAPISZ SERIĘ — '+core.name(activePerson):
  'ZAPIS SERII PO PRZERWIE');
 var p=current;
 if(p){
  var m=$('v086Status');
  if(m&&m.getAttribute('role')!=='status')m.setAttribute('role','status');
  var name=$('athlete');writeText(name,p.name);
 }
}

/* Stały pasek dolny: steruje oryginalnymi przyciskami, nie dubluje zapisu serii. */
function dockButton(id,label,source,style){
 var el=box('button','liteFireDockButton '+style,label);
 el.type='button';el.id=id;el.setAttribute('data-source',source);
 el.addEventListener('click',function(){
  var action=$(source);
  if(!action||action.disabled)return;
  action.click();setTimeout(manageUi,80);
 });
 return el;
}
function collapsedDock(state,save){
 var dock=$('liteFireDock');if(!dock)return;
 dock.classList.toggle('liteFireDockCollapsed',!!state);
 doc.body.classList.toggle('liteFireDockCollapsed',!!state);
 var button=$('liteFireDockToggle');
 if(button){
  button.textContent=state?'ROZWIŃ ▲':'ZWIŃ ▼';
  button.setAttribute('aria-expanded',state?'false':'true');
 }
 if(save){try{localStorage.setItem(DOCK_KEY,state?'yes':'no');}catch(e){}}
}
function installDock(){
 if($('liteFireDock'))return;
 var dock=box('aside','liteFireDock');dock.id='liteFireDock';
 dock.setAttribute('role','region');
 dock.setAttribute('aria-label','Stały pasek serii i przerw');
 var head=box('div','liteFireDockHeader');
 var summary=box('div','liteFireDockSummary','TRENING • SERIE I PRZERWY');
 summary.id='liteFireDockSummary';head.appendChild(summary);
 var toggle=box('button','liteFireDockToggle','ZWIŃ ▼');toggle.id='liteFireDockToggle';
 toggle.type='button';toggle.setAttribute('aria-controls','liteFireDockDetails');
 toggle.addEventListener('click',function(){
  collapsedDock(!dock.classList.contains('liteFireDockCollapsed'),true);
 });
 head.appendChild(toggle);dock.appendChild(head);
 var details=box('div','liteFireDockDetails');details.id='liteFireDockDetails';
 var timers=box('div','liteFireDockTimers');timers.id='liteFireDockTimers';
 timers.setAttribute('aria-label','Indywidualne czasy odpoczynku');details.appendChild(timers);
 var inputs=$('training')&&$('training').querySelector('.inputs');
 if(inputs){inputs.classList.add('liteFireDockInputFields');details.appendChild(inputs);}
 var series=box('div','liteFireDockSeries','Seria —');
 series.id='liteFireDockSeries';details.appendChild(series);
 var actions=box('div','liteFireDockActions');
 actions.appendChild(dockButton('liteFireDockSave','ZAPISZ SERIĘ','saveSetBtn','liteFireDockSave'));
 actions.appendChild(dockButton('liteFireDockSkipTurn','POMIŃ KOLEJKĘ','v086SkipTurn','liteFireDockSecondary'));
 actions.appendChild(dockButton('liteFireDockSkipExercise','POMIŃ ĆWICZENIE','v086SkipExercise','liteFireDockSecondary'));
 actions.appendChild(dockButton('liteFireDockSkipRest','POMIŃ PRZERWĘ','skipRestBtn','liteFireDockSecondary'));
 actions.appendChild(dockButton('liteFireDockPause','PAUZA','pauseBtn','liteFireDockSecondary'));
 actions.appendChild(dockButton('liteFireDockStop','STOP','stopBtn','liteFireDockDanger'));
 details.appendChild(actions);dock.appendChild(details);
 doc.body.appendChild(dock);
 collapsedDock(localStorage.getItem(DOCK_KEY)==='yes',false);
}
function syncDockAction(id,label,show){
 var dockButton=$(id);if(!dockButton)return;
 var source=$(dockButton.getAttribute('data-source'));
 dockButton.style.display=show?'block':'none';
 if(!show)return;
 dockButton.disabled=!source||!!source.disabled;
 if(label)writeText(dockButton,label);
}
function dockChip(key,name,status,detail){
 var parent=$('liteFireDockTimers');if(!parent)return;
 var node=dockNodes[key];
 if(!node){
  node=box('div','liteFireDockPerson');
  node.setAttribute('data-dock-person',key);
  var who=box('strong','liteFireDockPersonName');
  var clock=box('span','liteFireDockPersonTime');
  node.appendChild(who);node.appendChild(clock);
  dockNodes[key]=node;parent.appendChild(node);
 }
 var css='liteFireDockPerson liteFireDock'+status;
 if(node.className!==css)node.className=css;
 writeText(node.firstChild,name);
 writeText(node.lastChild,detail);
}
function syncDock(group){
 installDock();
 var main=$('liteFireDock'),summary=$('liteFireDockSummary'),series=$('liteFireDockSeries');
 if(!main)return;
 var now=Date.now(),activePerson='',restLabel='',summaryText='',seriesText='',live={};
 if(group&&Array.isArray(group.participants)){
  if(dockSession!==group.sessionId){
   dockSession=group.sessionId;dockNodes={};
   var list=$('liteFireDockTimers');while(list&&list.firstChild)list.removeChild(list.firstChild);
  }
  group.participants.forEach(function(p){
   var key=String(p.index),state=core.state(p,now,group.paused),isCurrent=group.personIndex===p.index;
   var status=isCurrent&&state.code==='ready'?'Work':state.code==='rest'||state.code==='later'?'Rest':
    state.code==='done'?'Done':state.code==='pause'?'Pause':'Ready';
   var detail=status==='Rest'?'PRZERWA '+state.detail:status==='Work'?'ĆWICZY • '+(p.seriesDone+1)+'/'+p.seriesTotal:
    status==='Done'?'KONIEC':status==='Pause'?'PAUZA':'GOTOWY';
   dockChip(key,core.name(p),status,detail);live[key]=true;
   if(status==='Work'){
    activePerson=core.name(p);seriesText=core.name(p)+' • SERIA '+(p.seriesDone+1)+'/'+p.seriesTotal;
   }
   if(status==='Rest'&&!restLabel)restLabel=core.name(p)+' '+state.detail;
  });
  summaryText=group.paused?'PAUZA • '+group.participants.length+' OSÓB':
   activePerson?'ĆWICZY: '+activePerson+(restLabel?' • PRZERWA: '+restLabel:''):
   restLabel?'PRZERWA: '+restLabel:
   'GOTOWI • '+group.participants.length+' OSÓB';
  if(!seriesText){
   var selected=group.participants.filter(function(p){return p.index===group.personIndex;})[0];
   if(selected)seriesText=core.name(selected)+' • SERIA '+(selected.seriesDone+1)+'/'+selected.seriesTotal;
  }
 }else{
  if(dockSession!=='solo'){
   dockSession='solo';dockNodes={};
   var list2=$('liteFireDockTimers');while(list2&&list2.firstChild)list2.removeChild(list2.firstChild);
  }
  var name=core.safeText($('athlete')&&$('athlete').textContent||'Uczestnik');
  var rest=core.safeText($('restTime')&&$('restTime').textContent||'GOTOWY');
  var isRest=/PRZERWA|ODPOCZYNEK|\d\d:\d\d/.test(rest)&&!/GOTOWY/.test(rest);
  var paused=doc.body.classList.contains('paused')||($('stateBadge')&&/PAUZA/.test($('stateBadge').textContent));
  dockChip('solo',name,paused?'Pause':isRest?'Rest':'Work',paused?'PAUZA':rest);
  live.solo=true;summaryText=name+' • '+rest;
  seriesText=core.safeText($('series')&&$('series').textContent||'SERIA');
 }
 Object.keys(dockNodes).forEach(function(key){
  if(!live[key]){
   var node=dockNodes[key];if(node.parentNode)node.parentNode.removeChild(node);
   delete dockNodes[key];
  }
 });
 writeText(summary,summaryText);
 writeText(series,seriesText);
 var save=$('saveSetBtn'),saveLabel=save&&save.textContent||'ZAPISZ SERIĘ';
 syncDockAction('liteFireDockSave',saveLabel,true);
 syncDockAction('liteFireDockSkipTurn','POMIŃ KOLEJKĘ',!!group);
 syncDockAction('liteFireDockSkipExercise','POMIŃ ĆWICZENIE',!!group);
 syncDockAction('liteFireDockSkipRest','POMIŃ PRZERWĘ',!group&&!!$('skipRestBtn')&&
  !$('skipRestBtn').classList.contains('hidden'));
 syncDockAction('liteFireDockPause',$('pauseBtn')&&$('pauseBtn').textContent||'PAUZA',true);
 syncDockAction('liteFireDockStop','STOP',true);
}

function manageUi(){
 var active=hasActiveTraining(),group=active?snapshot():null;
 doc.body.classList.toggle('liteFireActive',active);
 doc.documentElement.classList.toggle('liteFireActive',active);
 if(lastNativeActive!==active){
  lastNativeActive=active;
  try{if(window.LiteBridge&&typeof LiteBridge.setTabletTrainingActive==='function')
   LiteBridge.setTabletTrainingActive(!!active&&localStorage.getItem('trainer3.lite.screen.keep.v040')==='yes');}catch(e){}
 }
 doc.body.classList.toggle('liteFireGroup',!!group);
 if(!active)return;
 install();
 // Podgląd ćwiczenia i wskazówki z oryginalnego Trenera pozostają dostępne po rozwinięciu.
 var more=$('liteFireMore'),tech=$('technique'),extra=more&&more.querySelector('.liteFireExtra');
 var visual=$('v055Visual');
 if(more&&visual&&visual.parentNode!==more)more.appendChild(visual);
 if(extra&&tech)writeText(extra,tech.textContent||'');
 if(group)syncRoster(group);
 syncDock(group);
}
function boot(){
 install();
 installSignals();
 manageUi();
 setInterval(manageUi,1000);
 doc.addEventListener('visibilitychange',manageUi);
 // Podczas wpisywania ciężaru/powtórzeń chowamy rozbudowaną część paska, nie licznik.
 doc.addEventListener('focusin',function(e){
  var target=e.target;
  if(target&&(target.id==='weight'||target.id==='reps'))doc.body.classList.add('liteFireDockTyping');
 });
 doc.addEventListener('focusout',function(e){
  var target=e.target;
  if(target&&(target.id==='weight'||target.id==='reps'))doc.body.classList.remove('liteFireDockTyping');
 });
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
