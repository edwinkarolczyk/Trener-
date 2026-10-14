(function(root,factory){
'use strict';
var mod=factory();
if(typeof module==='object'&&module.exports)module.exports=mod;
if(root)root.TrenerLiteProfileCore=mod;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
var VERSION=1;
function copy(x){return JSON.parse(JSON.stringify(x));}
function name(v){return String(v||'').trim().replace(/\s+/g,' ').slice(0,40);}
function validId(v){return typeof v==='string'&&/^[a-zA-Z0-9:_-]{5,128}$/.test(v);}
function own(obj,k){return Object.prototype.hasOwnProperty.call(obj,k);}
function historyRows(h,id){
 var members=h&&h.onePhone&&h.onePhone.participants||h&&h.group&&h.group.participants||[];
 var found=members.filter(function(m){return String(m.id||m.deviceId||'')===id;})[0];
 return (h&&h.records||[]).filter(function(r){
  if(!r||typeof r!=='object')return false;
  if(r.participantId!==undefined&&String(r.participantId)!=='')return String(r.participantId)===id;
  if(found)return Number(r.athlete||0)===Number(found.index||0);
  return String(h.participantId||'')===id&&Number(r.athlete||0)===Number(h.localAthlete||0);
 });
}
function hasHistory(id,history,pending,prs){
 if((history||[]).some(function(h){return historyRows(h,id).length>0;}))return true;
 if(pending&&Array.isArray(pending.records)&&historyRows({records:pending.records,
    onePhone:{participants:pending.participants||[]}},id).length>0)return true;
 return (prs||[]).some(function(r){return r&&String(r.profileId||'')===id;});
}
function build(old,roster,history,pending,prs,primary){
 var prev=old&&Array.isArray(old.people)?old.people:[];
 var map={},order=[];
 function add(p){
  if(!p||!validId(p.id))return;
  var id=p.id;
  if(!own(map,id)){
   if(order.length>=36)return;
   map[id]={id:id,name:name(p.name)||'Uczestnik',createdAt:Number(p.createdAt)||Date.now(),
     locked:!!p.locked};
   order.push(id);
  }else if(p.locked)map[id].locked=true;
 }
 prev.forEach(add);
 (roster||[]).forEach(add);
 // Chronologicznie od najstarszych — starsza nazwa nigdy nie jest zastąpiona
 // nową nazwą na tej samej pozycji, jeżeli są już zapisane serie.
 (history||[]).slice().sort(function(a,b){
  return Date.parse(String(a.iso||''))-Date.parse(String(b.iso||''));
 }).forEach(function(h){
  var ms=h.onePhone&&h.onePhone.participants||h.group&&h.group.participants||[];
  ms.forEach(function(m){add({id:String(m.id||m.deviceId||''),name:m.name,locked:false});});
  if(validId(String(h.participantId||'')))add({id:String(h.participantId),
    name:Array.isArray(h.names)?h.names[h.localAthlete||0]:'',locked:false});
  (h.records||[]).forEach(function(r){
   if(validId(String(r.participantId||'')))add({id:String(r.participantId),
     name:'Uczestnik',locked:false});
  });
 });
 if(primary&&validId(primary.id))add(primary);
 order.forEach(function(id){
  var p=map[id];
  var hist=hasHistory(id,history,pending,prs);
  if(hist&&!p.locked&&!prev.some(function(old){return old.id===id;})){
   // Dla istniejących danych wybierz pierwszą historyczną nazwę osoby.
   var earliest=(history||[]).slice().sort(function(a,b){
    return Date.parse(String(a.iso||''))-Date.parse(String(b.iso||''));
   });
   for(var k=0;k<earliest.length;k++){
    var h=earliest[k],m=(h.onePhone&&h.onePhone.participants||h.group&&h.group.participants||[]).
     filter(function(x){return String(x.id||x.deviceId)===id;})[0];
    if(m&&name(m.name)){p.name=name(m.name);break;}
   }
  }
  if(hist)p.locked=true;
 });
 return {schemaVersion:VERSION,people:order.map(function(id){return map[id];})};
}
function change(data,id,newName){
 var out=copy(data),p=out.people.filter(function(x){return x.id===id;})[0];
 if(!p)throw Error('Nie znaleziono profilu.');
 var nm=name(newName);
 if(nm.length<2)throw Error('Podaj imię lub nazwę (min. 2 znaki).');
 if(p.locked&&p.name!==nm)throw Error('Nazwa zablokowana — ten profil ma już historię treningową.');
 if(out.people.some(function(x){return x.id!==id&&name(x.name).toLocaleLowerCase('pl-PL')===nm.toLocaleLowerCase('pl-PL');}))
  throw Error('Taka nazwa jest już używana przez inny profil.');
 p.name=nm;return out;
}
function add(data,id,nm){
 if(!validId(id))throw Error('Nieprawidłowy identyfikator.');
 if(data.people.length>=36)throw Error('Limit 36 zapisanych profili.');
 var out=copy(data);
 if(out.people.some(function(p){return p.id===id;}))throw Error('Identyfikator już istnieje.');
 out.people.push({id:id,name:'Nowa osoba',createdAt:Date.now(),locked:false});
 return change(out,id,nm);
}
function select(data,ids){
 if(!Array.isArray(ids)||ids.length<1||ids.length>6||new Set(ids).size!==ids.length)
  throw Error('Wybierz od 1 do 6 różnych uczestników.');
 var list=ids.map(function(id,i){
  var p=data.people.filter(function(x){return x.id===id;})[0];
  if(!p)throw Error('Nieznany uczestnik.');
  return {index:i,id:p.id,name:p.name};
 });
 return list;
}
function sessionFor(h,person){
 if(!h||!person||!validId(person.id))return null;
 var rows=historyRows(h,person.id);
 if(!rows.length)return null;
 if(rows.length>2000)throw Error('Sesja ma ponad 2000 serii — podziel eksport.');
 var sessionId=String(h.sessionId||h.id||'');
 if(!validId(sessionId))throw Error('Nieprawidłowy identyfikator sesji.');
 var records=rows.map(function(r,i){
  var kg=Number(r.kg),reps=Number(r.reps);
  if(!Number.isFinite(kg)||kg<0||kg>2000||!Number.isFinite(reps)||reps<=0||reps>10000)
   throw Error('Nieprawidłowa seria treningowa — przerwano eksport.');
  return {uid:String(r.uid||sessionId+':'+person.id+':'+i).slice(0,180),
   id:String(r.id||'').slice(0,90),name:String(r.name||'Ćwiczenie').slice(0,120),
   ex:Number(r.ex)||0,set:Number(r.set)||0,athlete:0,kg:kg,reps:reps,time:!!r.time,
   at:Number(r.at)||0,participantId:person.id};
 });
 return {format:'trener2-one-phone-session',version:1,sourceVersion:'lite-0.3.7',
  originParticipantId:person.id,originName:person.name,sessionId:sessionId,
  session:{plan:String(h.plan||'Trening'),planKey:String(h.planKey||''),
   iso:String(h.iso||''),date:String(h.date||''),duration:Number(h.duration)||0,
   interrupted:!!h.interrupted,records:records}};
}
function personExport(person,history,prs){
 var sessions=[];
 (history||[]).forEach(function(h){var s=sessionFor(h,person);if(s)sessions.push(s);});
 var records=(prs||[]).filter(function(r){return r&&String(r.profileId||'')===person.id;});
 return {format:'trener2-lite-profile-archive',version:1,exportedAt:new Date().toISOString(),
   profile:{id:person.id,name:person.name,locked:!!person.locked},
   sessions:sessions,personalRecords:copy(records),
   // Pełny Trener 2 v086 importuje pojedyncze sesje; ZIP zawiera plik na każdą sesję.
   compatibility:'trener2-one-phone-session'};
}
return {build:build,change:change,add:add,select:select,hasHistory:hasHistory,
  historyRows:historyRows,sessionFor:sessionFor,personExport:personExport,validId:validId};
});
