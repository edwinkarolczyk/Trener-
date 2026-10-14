'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const pr=require('../scripts/lite-pr-core.js');

test('1RM z jednej serii to dokładny ciężar, a 2–10 powtórzeń daje estymację',()=>{
  assert.equal(pr.estimate(50,1),50);
  assert.equal(pr.estimate(50,6),60);
  assert.equal(pr.estimate(0,6),null);
  assert.equal(pr.estimate(30,11),null);
  assert.equal(pr.estimate(30,2.5),null);
});
test('wspólny trening nie miesza ciężaru osoby A z osobą B',()=>{
 const h=[{iso:'2026-10-10T09:00:00Z',id:'group-1',
   participantId:'person-a',onePhone:{participants:[
     {id:'person-a',index:0,name:'A'},{id:'person-b',index:1,name:'B'}]},
   records:[
     {participantId:'person-a',athlete:0,id:'bench',name:'Ławka',kg:40,reps:5},
     {participantId:'person-b',athlete:1,id:'bench',name:'Ławka',kg:20,reps:5}
   ]}];
 assert.equal(pr.bestEstimated(pr.historyRows(h,'person-a'),'bench').kg,40);
 assert.equal(pr.bestEstimated(pr.historyRows(h,'person-b'),'bench').kg,20);
 assert.equal(pr.historyRows(h,'person-c').length,0);
});
test('legacy grupa bez participantId w seriach korzysta z indeksu profilu',()=>{
 const hist=[{onePhone:{participants:[{id:'p1',index:0},{id:'p2',index:1}]},
  records:[{athlete:0,id:'bench',kg:30,reps:8},
   {athlete:1,id:'bench',kg:40,reps:6}]}];
 assert.equal(pr.historyRows(hist,'p2')[0].kg,40);
 assert.equal(pr.historyRows(hist,'p1')[0].kg,30);
});
test('obca historia solo nie jest przypisywana przypadkowej osobie',()=>{
 const h=[{participantId:'solo-a',localAthlete:0,
  records:[{id:'bench',kg:50,reps:1,athlete:0}]}];
 assert.equal(pr.historyRows(h,'solo-b').length,0);
 assert.equal(pr.historyRows(h,'solo-a').length,1);
});
test('przypomnienie po 4/6/8 tygodniach, bez przypomnień przy 0',()=>{
 const week=7*86400000,now=Date.UTC(2026,9,14);
 assert.equal(pr.isDue(now-8*week,8,now),true);
 assert.equal(pr.isDue(now-7*week,8,now),false);
 assert.equal(pr.isDue(now-5*week,6,now),false);
 assert.equal(pr.isDue(now-4*week,4,now),true);
 assert.equal(pr.isDue(0,0,now),false);
 assert.equal(pr.safeInterval(3),8);
});
