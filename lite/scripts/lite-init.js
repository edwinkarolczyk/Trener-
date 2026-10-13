(function(){
  'use strict';
  // Polyfille DOM wymagane przez starszy WebView tabletu Amazon.
  if(!Element.prototype.matches)Element.prototype.matches=Element.prototype.webkitMatchesSelector||
    function(selector){var all=this.parentNode?this.parentNode.querySelectorAll(selector):[];
      for(var i=0;i<all.length;i++)if(all[i]===this)return true;return false;};
  if(!Element.prototype.closest)Element.prototype.closest=function(selector){
    var el=this;while(el&&el.nodeType===1){if(el.matches(selector))return el;el=el.parentElement;}return null;};
  if(!Element.prototype.remove)Element.prototype.remove=function(){
    if(this.parentNode)this.parentNode.removeChild(this);};
  if(!Element.prototype.append)Element.prototype.append=function(){
    for(var i=0;i<arguments.length;i++){
      var v=arguments[i];this.appendChild(v instanceof Node?v:document.createTextNode(String(v)));}};
  if(!NodeList.prototype.forEach)NodeList.prototype.forEach=Array.prototype.forEach;
  if(['diet','recipes'].indexOf(localStorage.getItem('trainer3.lastTab.v0884'))!==-1)
    localStorage.setItem('trainer3.lastTab.v0884','start');

  // Przed startem oryginalnego silnika importuj niedestrukcyjnie stare sesje SQLite Lite.
  var LEGACY_KEY='trainer3.liteLegacyImported.v03';
  function decode(raw){
    try{return JSON.parse(raw);}catch(e){return null;}
  }
  function migrateOldLite(){
    if(localStorage.getItem(LEGACY_KEY)==='yes'||!window.LiteBridge||!LiteBridge.exportPreviousLite)return;
    var old=decode(LiteBridge.exportPreviousLite());
    if(!old||!Array.isArray(old.sessions)||!Array.isArray(old.workout_sets))return;
    var profiles={},exercises={},plans={};
    (old.profiles||[]).forEach(function(p){profiles[p.id]=p.name;});
    (old.exercises||[]).forEach(function(ex){exercises[ex.id]=ex.name;});
    (old.plans||[]).forEach(function(plan){plans[plan.id]=plan.name;});
    var history=decode(localStorage.getItem('trainer3.history'));
    if(!Array.isArray(history))history=[];
    var existing={};
    history.forEach(function(s){existing[String(s.id)]=true;});
    var migrated=0;
    (old.sessions||[]).forEach(function(session){
      var key='lite-legacy:'+session.id;
      if(existing[key])return;
      var person=profiles[session.profile_id]||'Osoba '+session.profile_id;
      var records=[];
      (old.workout_sets||[]).forEach(function(set){
        if(set.session_id!==session.id)return;
        records.push({
          id:'lite-ex:'+set.exercise_id,
          name:exercises[set.exercise_id]||'Ćwiczenie',
          ex:0,set:records.length,athlete:0,
          kg:Number(set.weight)||0,reps:Number(set.reps)||0,
          rir:set.rir===undefined?2:Number(set.rir),
          technique:set.technique||'good',pain:set.pain||'none',
          at:Number(set.created_at)||Number(session.started_at)||Date.now(),
          participantId:'lite-profile:'+session.profile_id
        });
      });
      if(!records.length)return;
      var started=Number(session.started_at)||Date.now();
      var ended=Number(session.finished_at)||started;
      history.push({
        id:key,iso:new Date(started).toISOString(),
        date:new Date(started).toLocaleString('pl-PL'),
        plan:session.plan_name||plans[session.plan_id]||'Trening Lite',
        planKey:'lite-legacy',
        mode:1,shared:false,onePhoneImport:true,
        localAthlete:0,names:[person],
        participantId:'lite-profile:'+session.profile_id,
        duration:Math.max(0,Math.round((ended-started)/1000)),
        interrupted:!session.finished_at,
        records:records,schemaVersion:2
      });
      migrated++;
    });
    if(migrated){
      history.sort(function(a,b){return Date.parse(b.iso||'')-Date.parse(a.iso||'');});
      // Nie kasuj pełnych istniejących danych. W razie braku miejsca SQLite nadal przechowuje oryginał.
      localStorage.setItem('trainer3.history',JSON.stringify(history));
    }
    localStorage.setItem(LEGACY_KEY,'yes');
  }
  try{migrateOldLite();}catch(e){try{console.error('Lite: historia SQLite zachowana; migracja JS odłożona',e);}catch(ignored){}}
  function tools(){
    var screen=document.getElementById('settings');
    if(!screen||document.getElementById('liteBridgeTools'))return;
    var section=document.createElement('div');
    section.id='liteBridgeTools';section.className='card';
    section.innerHTML='<div class="eyebrow">TRENER 2 LITE • TABLET AMAZON</div>'+
      '<h2>Treningi i aktualizacje</h2>'+
      '<p class="hint">Ten sam silnik treningów i ten sam ciemny motyw co pełny Trener 2. Większe przyciski dla tabletu.</p>'+
      '<button id="liteCheckUpdate" type="button">SPRAWDŹ AKTUALIZACJE LITE</button>'+
      '<button id="liteOpenPrevious" type="button">OTWÓRZ STARSZE TRENINGI LITE (SQLite)</button>'+
      '<p class="hint">Stare dane pozostają w oryginalnej bazie. Nie usuwaj aplikacji podczas aktualizacji.</p>';
    screen.appendChild(section);
    document.getElementById('liteCheckUpdate').onclick=function(){
      if(window.LiteBridge&&LiteBridge.checkUpdates) LiteBridge.checkUpdates();
    };
    document.getElementById('liteOpenPrevious').onclick=function(){
      if(window.LiteBridge&&LiteBridge.openPreviousLite) LiteBridge.openPreviousLite();
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tools);
  else tools();
})();