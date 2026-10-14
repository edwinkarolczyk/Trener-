'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const g=require('../scripts/lite-group-core.js');
const roster=Array.from({length:6},(_,i)=>({index:i,id:'member-'+i,name:'Osoba '+(i+1)}));
const plan=(id,sets=2)=>({title:id,ex:[{id,n:id,sets,min:8,max:12,rest:60}]});
test('6 osób z trwałymi identyfikatorami jest poprawną grupą',()=>{
  assert.equal(g.validRoster(roster),true);
  assert.equal(g.validRoster(roster.slice(0,1)),true);
  assert.equal(g.validRoster(roster.concat([{index:6,id:'seventh',name:'Siódma'}])),false);
  assert.equal(g.validRoster(roster.map((p,i)=>({...p,id:i===5?'member-0':p.id}))),false);
});
test('różne plany i cele dają niezależne pozycje oraz liczbę serii',()=>{
 const plans={0:plan('bench',3),1:plan('squat',2)};
 const p0=g.nextPosition(roster[0],plans,{0:0,1:0},[
  {athlete:0,ex:0},{athlete:0,ex:0},{athlete:1,ex:0}]);
 const p1=g.nextPosition(roster[1],plans,{0:0,1:0},[
  {athlete:0,ex:0},{athlete:0,ex:0},{athlete:1,ex:0}]);
 assert.equal(p0.ex.id,'bench');assert.equal(p0.done,2);assert.equal(p0.total,3);
 assert.equal(p1.ex.id,'squat');assert.equal(p1.done,1);assert.equal(p1.total,2);
});
test('automatyczna kolejka wybiera kolejną gotową osobę i respektuje odpoczynek',()=>{
 const people=roster.slice(0,3),plans={0:plan('bench'),1:plan('curl'),2:plan('row')};
 const now=100000;
 const picked=g.pick(people,plans,{0:0,1:0,2:0},[],{0:now+30000,1:0,2:0},0,{},now);
 assert.equal(picked.selected.person.id,'member-1');
 const skipped=g.pick(people,plans,{0:0,1:0,2:0},[],{0:now+30000,1:0,2:0},0,{1:now+15000},now);
 assert.equal(skipped.selected.person.id,'member-2');
});
test('skończone plany nie blokują osób z pozostałymi seriami',()=>{
 const people=roster.slice(0,2),plans={0:plan('bench',1),1:plan('row',2)};
 const r=g.pick(people,plans,{0:1,1:0},[],{},0,{},Date.now());
 assert.equal(r.finished,false);assert.equal(r.selected.person.index,1);
 const fin=g.pick(people,plans,{0:1,1:1},[],{},0,{},Date.now());
 assert.equal(fin.finished,true);
});
test('ciężary i progresja są pobierane wyłącznie z historii danej osoby',()=>{
 const records=[{participantId:'member-0',id:'bench',kg:50,reps:12},
  {participantId:'member-0',id:'bench',kg:50,reps:12},
  {participantId:'member-1',id:'bench',kg:15,reps:5}];
 const history=[{id:'g1',iso:'2026-10-01',records}];
 const ex={id:'bench',n:'Ławka',sets:2,min:8,max:12};
 const a=g.suggestion(history,'member-0',ex,2.5);
 const b=g.suggestion(history,'member-1',ex,2.5);
 assert.equal(a.last,50);assert.equal(a.target,52.5);
 assert.equal(b.last,15);assert.equal(b.target,15);
 assert.equal(g.suggestion(history,'member-2',ex,2.5),null);
});
test('mieszane plany i wznowienie po częściowo ukończonych seriach',()=>{
 const r=roster.slice(0,2),plans={0:{title:'A',ex:[{id:'bench',sets:1},{id:'row',sets:1}]},
  1:{title:'B',ex:[{id:'curl',sets:2}]}};
 const done=[{athlete:0,ex:0},{athlete:1,ex:0}];
 const p=g.nextPosition(r[0],plans,{0:0,1:0},done);
 const q=g.nextPosition(r[1],plans,{0:0,1:0},done);
 assert.equal(p.ex.id,'row');assert.equal(q.ex.id,'curl');assert.equal(q.done,1);
});
