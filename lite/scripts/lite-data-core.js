(function(root,factory){
  'use strict';
  var core=factory();
  if(typeof module==='object'&&module.exports)module.exports=core;
  if(root)root.TrenerLiteDataCore=core;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
var SKIP_WORDS=['diet','hydrat','water','food','recipe','meal','calor','nutri'];
function own(obj,k){return Object.prototype.hasOwnProperty.call(obj,k);}
function allowedKey(k){
  if(typeof k!=='string'||!/^(trainer3|trainer2)\.[A-Za-z0-9._-]{1,180}$/.test(k))return false;
  var lower=k.toLowerCase();
  return !SKIP_WORDS.some(function(word){return lower.indexOf(word)!==-1;});
}
function json(raw){try{return JSON.parse(raw);}catch(e){throw new Error('Nieprawidłowy zapis JSON danych.');}}
function array(raw,label){
  if(raw===null||raw===undefined||raw==='')return [];
  var value=typeof raw==='string'?json(raw):raw;
  if(!Array.isArray(value))throw new Error('Nieprawidłowa lista: '+label);
  return value;
}
function epoch(n){
  var x=Number(n);
  if(!isFinite(x)||x<=0)return 0;
  return x<100000000000?x*1000:x;
}
function legacyToHistory(data){
  if(!data||data.app!=='Trener2Lite')throw new Error('Nieznany format starej bazy Lite.');
  var profiles={},exercises={},plans={},quality={},names={},interrupted={};
  var ext=data.liteExtensions||{};
  array(data.profiles,'profile').forEach(function(p){profiles[p.id]=p.name;});
  array(data.exercises,'ćwiczenia').forEach(function(x){exercises[x.id]=x.name;});
  array(data.plans,'plany').forEach(function(x){plans[x.id]=x.name;});
  array(ext.lite_set_quality,'RIR').forEach(function(x){quality[x.set_id]=x;});
  array(ext.lite_session_names,'nazwy sesji').forEach(function(x){names[x.session_id]=x.plan_name;});
  array(ext.lite_session_status,'status sesji').forEach(function(x){interrupted[x.session_id]=!!x.interrupted;});
  var bySession={};
  array(data.workout_sets,'zestawy sesji').forEach(function(s){
    var k=String(s.session_id);
    if(!bySession[k])bySession[k]=[];
    bySession[k].push(s);
  });
  var out=[];
  array(data.sessions,'sesje').forEach(function(s){
    if(s.id===undefined||s.profile_id===undefined)return;
    var start=epoch(s.started_at),finished=epoch(s.finished_at);
    var profileId='lite-profile:'+String(s.profile_id);
    var person=String(profiles[s.profile_id]||'Osoba '+s.profile_id);
    var sets=(bySession[String(s.id)]||[]).map(function(set,index){
      var q=quality[set.id]||{},at=epoch(set.created_at)||start||Date.now();
      return {uid:'legacy:'+s.id+':'+set.id,
        id:'lite-ex:'+set.exercise_id,name:String(exercises[set.exercise_id]||'Ćwiczenie'),
        ex:0,set:index,athlete:0,kg:Number(set.weight)||0,reps:Number(set.reps)||0,
        rir:q.rir===undefined?null:Number(q.rir),technique:q.technique||'good',
        pain:q.pain||'none',at:at,participantId:profileId};
    });
    // Nawet sesja bez serii jest faktem historycznym, np. przerwany trening.
    out.push({id:'lite-legacy:'+s.id,iso:new Date(start||Date.now()).toISOString(),
      date:new Date(start||Date.now()).toLocaleString('pl-PL'),
      plan:String(names[s.id]||plans[s.plan_id]||'Trening Lite'),
      planKey:'lite-legacy',mode:1,shared:false,localAthlete:0,
      names:[person],participantId:profileId,
      duration:finished&&start?Math.max(0,Math.round((finished-start)/1000)):0,
      interrupted:!finished||!!interrupted[s.id],records:sets,schemaVersion:2,
      legacySource:'Trener2Lite'});
  });
  return out;
}
function source(raw){
  var data=typeof raw==='string'?json(raw):raw;
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Nieprawidłowy plik kopii.');
  if(data.app==='Trener2Lite')return {storage:{'trainer3.history':JSON.stringify(legacyToHistory(data))},format:'legacy'};
  if(data.format!=='trener2-backup')throw new Error('Nieobsługiwany format. Wybierz kopię Trenera 2 lub starego Lite.');
  var storage={};
  if(data.storage&&typeof data.storage==='object'&&!Array.isArray(data.storage)){
    Object.keys(data.storage).forEach(function(k){
      if(!allowedKey(k))return;
      if(typeof data.storage[k]!=='string')throw new Error('Nieprawidłowe pole kopii: '+k);
      storage[k]=data.storage[k];
    });
  }else if(Array.isArray(data.history)){
    storage['trainer3.history']=JSON.stringify(data.history);
  }else throw new Error('Brak rozpoznawalnych danych treningowych.');
  if(data.legacyLite&&data.legacyLite.app==='Trener2Lite'){
    var legacy=legacyToHistory(data.legacyLite);
    var existing=array(storage['trainer3.history'],'historia');
    storage['trainer3.history']=JSON.stringify(existing.concat(legacy));
  }
  return {storage:storage,format:'trener2'};
}
function personRecord(h,r,id){
  if(r.participantId!==undefined&&r.participantId!==null&&String(r.participantId)!=='')
    return String(r.participantId)===id;
  var group=h.onePhone&&h.onePhone.participants||h.group&&h.group.participants;
  if(Array.isArray(group)){
    for(var i=0;i<group.length;i++){
      if(String(group[i].id||group[i].deviceId||'')===id)
        return Number(r.athlete||0)===Number(group[i].index===undefined?i:group[i].index);
    }
    return false;
  }
  return String(h.participantId||'')===id&&Number(r.athlete||0)===Number(h.localAthlete||0);
}
function onlyPerson(h,id){
  if(!h||!Array.isArray(h.records))return null;
  var rs=h.records.filter(function(r){return r&&personRecord(h,r,id);});
  var hPid=String(h.participantId||'');
  var relevant=rs.length||hPid===id&&!h.records.length;
  if(!relevant)return null;
  var n='';
  var group=h.onePhone&&h.onePhone.participants||h.group&&h.group.participants;
  if(Array.isArray(group))for(var i=0;i<group.length;i++)
    if(String(group[i].id||group[i].deviceId||'')===id)n=group[i].name||'';
  if(!n)n=String(h.names&&h.names[h.localAthlete||0]||'Uczestnik');
  var copy=JSON.parse(JSON.stringify(h));
  copy.id='lite-person-import:'+String(h.id||h.sessionId||h.iso)+':'+id;
  copy.participantId=id;copy.records=rs.map(function(r){
    var v=JSON.parse(JSON.stringify(r));v.athlete=0;v.participantId=id;return v;
  });
  copy.mode=1;copy.shared=false;copy.localAthlete=0;copy.names=[n];
  delete copy.onePhone;delete copy.group;
  copy.originSessionId=String(h.sessionId||h.id||'');copy.sessionId=copy.id;
  return copy;
}
function sessionKey(h){
  return h&&h.id!==undefined&&h.id!==null?'id:'+String(h.id):
    'fallback:'+String(h&&h.iso||'')+'|'+String(h&&h.plan||'')+'|'+String(h&&h.participantId||'');
}
function mergeHistory(current,incoming,personId){
  var left=array(current,'istniejąca historia').slice(),right=array(incoming,'historia z kopii');
  var seen={},added=0,duplicate=0,conflict=0,ambiguous=0;
  left.forEach(function(h){seen[sessionKey(h)]=h;});
  right.forEach(function(h){
    if(!h||typeof h!=='object'||Array.isArray(h)||!Array.isArray(h.records)){ambiguous++;return;}
    if(personId){
      h=onlyPerson(h,personId);
      if(!h){ambiguous++;return;}
    }
    var key=sessionKey(h);
    if(own(seen,key)){
      if(JSON.stringify(seen[key])!==JSON.stringify(h))conflict++;
      duplicate++;return;
    }
    left.push(h);seen[key]=h;added++;
  });
  left.sort(function(a,b){return Date.parse(String(b.iso||''))-Date.parse(String(a.iso||''));});
  return {values:left,added:added,duplicate:duplicate,conflict:conflict,ambiguous:ambiguous};
}
function mergeRows(current,incoming,key){
  var left=array(current,key).slice(),right=array(incoming,key),seen={},added=0,duplicate=0;
  left.forEach(function(x){seen[JSON.stringify(x)]=true;});
  right.forEach(function(x){
    var id=JSON.stringify(x);
    if(seen[id]){duplicate++;return;}
    seen[id]=true;left.push(x);added++;
  });
  return {values:left,added:added,duplicate:duplicate};
}
function mergePr(current,incoming,personId){
  var left=json(current||'{}'),right=json(incoming||'{}');
  if(!left||Array.isArray(left)||!right||Array.isArray(right))throw new Error('Nieprawidłowy rejestr rekordów.');
  var result=JSON.parse(JSON.stringify(left));
  var l=array(result.records,'rekordy'),r=array(right.records,'rekordy');
  var ids={};l.forEach(function(x){ids[String(x.id||JSON.stringify(x))]=true;});
  var added=0,duplicate=0;
  r.forEach(function(x){
    if(personId&&String(x.profileId)!==personId)return;
    var id=String(x.id||JSON.stringify(x));
    if(ids[id]){duplicate++;return;}ids[id]=true;l.push(x);added++;
  });
  result.records=l;
  if(!personId){
    ['lastAction','snoozedUntil'].forEach(function(k){
      if(!result[k]||typeof result[k]!=='object')result[k]={};
      if(right[k]&&typeof right[k]==='object')Object.keys(right[k]).forEach(function(p){
        if(!own(result[k],p))result[k][p]=right[k][p];
      });
    });
  }
  return {value:JSON.stringify(result),added:added,duplicate:duplicate};
}
function prepare(raw,existing,mode,personId){
  var bundle=source(raw),storage=bundle.storage;
  if(mode!=='all'&&mode!=='person')throw new Error('Wybierz tryb importu.');
  if(mode==='person'&&(!personId||typeof personId!=='string'))
    throw new Error('Wybierz uczestnika do importu.');
  var writes={},stats={historyAdded:0,historyDuplicate:0,historyConflict:0,
    historySkipped:0,otherImported:0,otherSkipped:0,recordsAdded:0};
  var keys=Object.keys(storage);
  for(var i=0;i<keys.length;i++){
    var key=keys[i],incoming=storage[key];
    if(!allowedKey(key)||key.indexOf('trainer3.liteLegacyImported')===0)continue;
    var current=own(existing,key)?existing[key]:null;
    if(key==='trainer3.history'){
      var h=mergeHistory(current,incoming,mode==='person'?personId:'');
      stats.historyAdded+=h.added;stats.historyDuplicate+=h.duplicate;
      stats.historyConflict+=h.conflict;stats.historySkipped+=h.ambiguous;
      if(h.added)writes[key]=JSON.stringify(h.values);
    }else if(mode==='person'){
      if(key==='trainer3.lite.pr.v1'){
        var p=mergePr(current,incoming,personId);
        stats.recordsAdded+=p.added;
        if(p.added)writes[key]=p.value;
      }else stats.otherSkipped++;
    }else if(key==='trainer3.lite.pr.v1'){
      var pr=mergePr(current,incoming,'');
      stats.recordsAdded+=pr.added;
      if(pr.added)writes[key]=pr.value;
    }else if(key==='trainer3.weights'||key==='trainer3.photos'){
      var ar=mergeRows(current,incoming,key);
      stats.otherImported+=ar.added;
      if(ar.added)writes[key]=JSON.stringify(ar.values);
    }else if(current===null||current===undefined){
      // Pozostałe ustawienia/plany tylko do pustego klucza. Żadnego nadpisywania konfliktów.
      writes[key]=incoming;stats.otherImported++;
    }else if(current!==incoming)stats.otherSkipped++;
  }
  return {writes:writes,stats:stats,format:bundle.format,keyCount:Object.keys(writes).length};
}
function apply(storage,plan){
  var writes=plan&&plan.writes;
  if(!writes||!Object.keys(writes).length)return {ok:true,changed:0};
  var prev={},keys=Object.keys(writes),changed=[];
  keys.forEach(function(k){prev[k]=storage.getItem(k);});
  try{
    keys.forEach(function(k){changed.push(k);storage.setItem(k,writes[k]);});
    return {ok:true,changed:changed.length};
  }catch(e){
    // Najpierw zwolnij miejsce po niedokończonych zapisach.
    changed.forEach(function(k){try{storage.removeItem(k);}catch(ignore){}});
    var recovered=true;
    changed.forEach(function(k){
      if(prev[k]!==null)try{storage.setItem(k,prev[k]);}catch(error){recovered=false;}
    });
    return {ok:false,recovered:recovered,error:String(e&&e.message||e)};
  }
}
return {legacyToHistory:legacyToHistory,source:source,prepare:prepare,apply:apply,
  mergeHistory:mergeHistory,onlyPerson:onlyPerson,allowedKey:allowedKey};
});
