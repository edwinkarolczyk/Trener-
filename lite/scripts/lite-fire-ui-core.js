(function(root,factory){
'use strict';
var api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.TrenerLiteFireCore=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
function seconds(ms){return Math.max(0,Math.ceil((Number(ms)||0)/1000));}
function timer(ms){
 var sec=seconds(ms);
 return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
}
function state(row,now,paused){
 if(row.done)return {code:'done',label:'UKOŃCZONE',detail:'Wszystkie ćwiczenia'};
 if(paused)return {code:'pause',label:'PAUZA',detail:'Trening wstrzymany'};
 var left=Math.max(0,Number(row.readyAt||0)-now);
 if(left>0)return {code:'rest',label:'ODPOCZYNEK',detail:timer(left)};
 var later=Math.max(0,Number(row.deferredUntil||0)-now);
 if(later>0)return {code:'later',label:'POMINIĘTA KOLEJKA',detail:timer(later)};
 return {code:'ready',label:'GOTOWY',detail:'Może ćwiczyć'};
}
function summary(group,now){
 if(!group||!Array.isArray(group.participants))return {total:0,ready:0,rest:0,done:0,paused:0};
 var sum={total:group.participants.length,ready:0,rest:0,done:0,paused:0};
 group.participants.forEach(function(p){
  var st=state(p,now,group.paused);
  if(st.code==='ready')sum.ready++;
  if(st.code==='rest'||st.code==='later')sum.rest++;
  if(st.code==='done')sum.done++;
  if(st.code==='pause')sum.paused++;
 });
 return sum;
}
function name(row){return String(row&&row.name||'Uczestnik').slice(0,40);}
function safeText(v){return String(v===undefined||v===null?'':v);}
return {timer:timer,state:state,summary:summary,name:name,safeText:safeText};
});
