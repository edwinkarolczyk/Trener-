(function(root,factory){
'use strict';
var api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.TrenerLiteGroupCore=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
function validRoster(roster){
 if(!Array.isArray(roster)||roster.length<1||roster.length>6)return false;
 var seen={},names={};
 return roster.every(function(p){
  if(!p||typeof p.id!=='string'||!p.id||typeof p.name!=='string'||!p.name.trim())return false;
  var name=p.name.trim().toLocaleLowerCase('pl-PL');
  if(seen[p.id]||names[name])return false;
  seen[p.id]=1;names[name]=1;return true;
 });
}
function nextPosition(person,plans,positions,records){
 var exs=plans[person.index]&&plans[person.index].ex||[];
 var cursor=Number(positions[person.index]||0);
 for(;cursor<exs.length;cursor++){
  var ex=exs[cursor],count=records.filter(function(r){
   return Number(r.athlete)===person.index&&Number(r.ex)===cursor;
  }).length;
  if(count<Math.max(1,Number(ex.sets)||1))
   return {exercise:cursor,ex:ex,done:count,total:Math.max(1,Number(ex.sets)||1)};
 }
 return null;
}
function pick(roster,plans,positions,records,readyAt,lastTurn,deferred,now){
 var todo=roster.map(function(p){
   var pos=nextPosition(p,plans,positions,records);
   if(!pos)return null;
   return {person:p,position:pos,ready:Number(readyAt[p.index]||0),
     blocked:Number(deferred&&deferred[p.index]||0)};
 }).filter(Boolean);
 if(!todo.length)return {finished:true,selected:null,anyReady:false};
 // Rotacja po poprzedniej osobie wśród gotowych.
 var start=Number(lastTurn);
 todo.sort(function(a,b){
  var n=roster.length;
  return (a.person.index-start+n-1)%n-(b.person.index-start+n-1)%n;
 });
 var active=todo.filter(function(c){return c.ready<=now&&c.blocked<=now;});
 var chosen=active.length?active[0]:todo.slice().sort(function(a,b){
  return Math.max(a.ready,a.blocked)-Math.max(b.ready,b.blocked);
 })[0];
 return {finished:false,selected:chosen,anyReady:active.length>0};
}
function matchingRow(h,r,id){
 if(r.participantId!==undefined&&r.participantId!==null&&String(r.participantId)!=='')
  return String(r.participantId)===id;
 var members=h&&h.onePhone&&h.onePhone.participants||h&&h.group&&h.group.participants;
 if(Array.isArray(members)){
  var m=members.filter(function(p){return String(p.id||p.deviceId)===id;})[0];
  if(!m)return false;
  return Number(r.athlete||0)===Number(m.index||0);
 }
 return String(h&&h.participantId||'')===id&&Number(r.athlete||0)===Number(h.localAthlete||0);
}
function suggestion(history,id,ex,step){
 if(!ex||ex.time)return null;
 var found=[];
 (history||[]).forEach(function(h){
  var rows=(h.records||[]).filter(function(r){
   return matchingRow(h,r,String(id))&&
    String(r.id||r.name||'')===String(ex.id||ex.n||'')&&Number(r.kg)>0&&Number(r.reps)>0;
  });
  if(rows.length)found.push(rows);
 });
 if(!found.length)return null;
 var sets=found[0],kg=Number(sets[0].kg);
 var sorted=sets.reduce(function(map,r){
  var weight=Number(r.kg);map[weight]=(map[weight]||0)+1;return map;
 },{});
 kg=Number(Object.keys(sorted).sort(function(a,b){return sorted[b]-sorted[a];})[0]||kg);
 var work=sets.filter(function(r){return Math.abs(Number(r.kg)-kg)<.001;});
 var reps=work.map(function(r){return Number(r.reps);});
 var min=Number(ex.min)||1,max=Number(ex.max)||min;
 var target=kg,decision='KEEP';
 if(reps.length>=Math.max(1,Number(ex.sets)||1)&&reps.every(function(r){return r>=max;})){
  decision='ADD';target=kg+Math.max(.25,Number(step)||2.5);
 }else if(reps.filter(function(r){return r<min;}).length>=2){
  decision='REDUCE';var s=Math.max(.25,Number(step)||2.5);
  target=Math.round(kg*.95/s)*s;if(target>=kg)target=kg-s;
 }
 return {last:kg,target:Math.max(0,Math.round(target*100)/100),
   decision:decision,reps:reps,historyCount:Math.min(5,found.length)};
}
return {validRoster:validRoster,nextPosition:nextPosition,pick:pick,matchingRow:matchingRow,suggestion:suggestion};
});
