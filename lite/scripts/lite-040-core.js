(function(root,factory){
'use strict';
var api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.TrenerLite040Core=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
function safe(x){return String(x===null||x===undefined?'':x).trim();}
function parse(raw,fallback){try{var value=typeof raw==='string'?JSON.parse(raw):raw;return value===null?fallback:value;}catch(e){return fallback;}}
function weekday(date){var d=date instanceof Date?date:new Date(date);return (d.getDay()+6)%7;}
function dayPlan(schedule,id,date){var week=schedule&&schedule[id];if(!Array.isArray(week))return '';return safe(week[weekday(date)]||'');}
function uniqueSelection(all,selected){
 var seen={},exists={},out=[];
 (all||[]).forEach(function(p){if(p&&p.id)exists[p.id]=true;});
 (selected||[]).forEach(function(id){if(exists[id]&&!seen[id]&&out.length<6){seen[id]=true;out.push(id);}});
 return out;
}
function memberId(session,row){
 var direct=safe(row&&row.participantId);if(direct)return direct;
 var members=session&&(session.onePhone&&session.onePhone.participants||session.group&&session.group.participants);
 if(Array.isArray(members)){
  var slot=Number(row&&row.athlete||0);
  var person=members.filter(function(p,i){return Number(p.index===undefined?i:p.index)===slot;})[0];
  return person?safe(person.id||person.deviceId):'';
 }
 return safe(session&&session.participantId);
}
function recordsOf(session,personId){
 var list=Array.isArray(session&&session.records)?session.records:[];
 return personId?list.filter(function(r){return memberId(session,r)===personId;}):list.slice();
}
function includesPerson(session,personId){
 return recordsOf(session,personId).length>0;
}
function isGroup(session){
 var participants=session&&(session.onePhone&&session.onePhone.participants||session.group&&session.group.participants);
 return Array.isArray(participants)&&participants.length>1;
}
function historyMatches(session,personId,mode,term){
 if(mode==='group'&&!isGroup(session))return false;
 if(mode!=='group'&&personId&&!includesPerson(session,personId))return false;
 if(mode==='group'&&personId&&!includesPerson(session,personId))return false;
 var text=safe(term).toLocaleLowerCase('pl-PL');if(!text)return true;
 var parts=[session.date,session.plan];
 var people=session.onePhone&&session.onePhone.participants||session.group&&session.group.participants||[];
 people.forEach(function(p){parts.push(p.name);});
 (mode==='group'?recordsOf(session,personId):recordsOf(session,personId)).forEach(function(r){parts.push(r.name||r.id);});
 return parts.join(' ').toLocaleLowerCase('pl-PL').indexOf(text)!==-1;
}
function filterHistory(history,personId,mode,term){
 return (Array.isArray(history)?history:[]).filter(function(s){return historyMatches(s,personId,mode,term);});
}
function hasEquipment(inventory){
 return !!(inventory&&Array.isArray(inventory.bars)&&inventory.bars.length);
}
function matchesEquipment(ex,inventory,showAll){
 if(showAll||!hasEquipment(inventory))return true;
 var name=safe(ex.equipment||ex.n||ex.name).toLowerCase();
 if(/masa ciała|bez sprzętu|pomp|plank|brzusz|bodyweight/.test(name))return true;
 var types=(inventory.bars||[]).map(function(b){return safe(b.type).toLowerCase();});
 if(/hantl|sztangiel/.test(name))return types.some(function(t){return t==='dumbbell'||t==='fixed';});
 if(/sztang|gryf/.test(name))return types.some(function(t){return t==='barbell';});
 // Nie ukrywaj ćwiczeń, jeżeli nazwa nie pozwala jednoznacznie określić sprzętu.
 return true;
}
function bestRecords(history,personId){
 var result={};
 (Array.isArray(history)?history:[]).forEach(function(h){
  recordsOf(h,personId).forEach(function(r){
   var id=safe(r.id||r.name),kg=Number(r.kg);
   if(id&&isFinite(kg)&&kg>0&&(result[id]===undefined||kg>result[id]))result[id]=kg;
  });
 });
 return result;
}
function formatTime(minutes){
 var n=Math.max(0,Math.round(Number(minutes)||0));
 return Math.floor(n/60)+' h '+(n%60)+' min';
}
return {parse:parse,weekday:weekday,dayPlan:dayPlan,uniqueSelection:uniqueSelection,
 memberId:memberId,recordsOf:recordsOf,includesPerson:includesPerson,isGroup:isGroup,
 filterHistory:filterHistory,matchesEquipment:matchesEquipment,bestRecords:bestRecords,formatTime:formatTime};
});
