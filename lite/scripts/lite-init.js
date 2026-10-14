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
  // Start otwiera się przy każdym uruchomieniu Lite (bez ingerencji w profile/historię).
  try{localStorage.setItem('trainer3.lastTab.v0884','start');}catch(ignore){}

  // Przed startem oryginalnego silnika importuj niedestrukcyjnie stare sesje SQLite Lite.
  var LEGACY_KEY='trainer3.liteLegacyImported.v032';
  function migrateOldLite(){
    if(localStorage.getItem(LEGACY_KEY)==='yes'||!window.LiteBridge||!LiteBridge.exportPreviousLite)return;
    var core=window.TrenerLiteDataCore;
    if(!core)return;
    var raw=LiteBridge.exportPreviousLite();
    if(!raw)return; // brak bazy lub błąd odczytu — nie ustawiaj znacznika migracji
    var old=JSON.parse(raw);
    if(!old||old.app!=='Trener2Lite'||!Array.isArray(old.sessions)||old.sessions.length===0)return;
    // Oryginał SQLite pozostaje nietknięty; pełna kopia będzie też zawierać surowe tabele.
    var existing={};
    var current=localStorage.getItem('trainer3.history');
    if(current!==null)existing['trainer3.history']=current;
    var plan=core.prepare(old,existing,'all','');
    var result=core.apply(localStorage,plan);
    if(!result.ok)throw new Error(result.recovered?
      'Brak miejsca — zachowano oryginalną historię bez zmian.':
      'Nie udało się cofnąć migracji — wykonaj kopię ręcznie.');
    // Oznacz sukces dopiero po bezpiecznym zapisie, nawet jeżeli identyczne sesje już istnieją.
    localStorage.setItem(LEGACY_KEY,'yes');
  }
  try{migrateOldLite();}catch(e){
    try{console.error('Trener 2 Lite: stara baza zachowana; migracja wstrzymana',e);}catch(ignore){}
  }
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