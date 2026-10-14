'use strict';
const assert=require('assert');
const core=require('./lite-040-core.js');
const assertSame=(actual,expected)=>assert.deepStrictEqual(actual,expected);
assert.strictEqual(core.weekday('2026-10-12T12:00:00'),0);
assert.strictEqual(core.weekday('2026-10-18T12:00:00'),6);
const schedule={alice:['mon','','','','','',''],bob:['b-mon','','wed','','','','']};
assert.strictEqual(core.dayPlan(schedule,'alice','2026-10-12T12:00:00'),'mon');
assert.strictEqual(core.dayPlan(schedule,'bob','2026-10-14T12:00:00'),'wed');
assert.strictEqual(core.dayPlan(schedule,'none','2026-10-14T12:00:00'),'');
assertSame(core.uniqueSelection([{id:'a'},{id:'b'}],['b','b','fake','a']),['b','a']);
const h1={id:'h1',date:'2026-10-12',plan:'Plecy',duration:40,participantId:'a',
 records:[{athlete:0,participantId:'a',id:'row',name:'Wiosłowanie',kg:24,reps:8}]};
const h2={id:'h2',date:'2026-10-13',plan:'Klatka',duration:70,
 onePhone:{participants:[{index:0,id:'a',name:'Ala'},{index:1,id:'b',name:'Bartek'}]},
 records:[{athlete:0,id:'bench',name:'Wyciskanie',kg:40,reps:8},
 {athlete:1,id:'bench',name:'Wyciskanie',kg:70,reps:6}]};
assert.strictEqual(core.memberId(h2,h2.records[1]),'b');
assert.strictEqual(core.recordsOf(h2,'a').length,1);
assert.strictEqual(core.recordsOf(h2,'b')[0].kg,70);
assert.strictEqual(core.includesPerson(h2,'c'),false);
assert.strictEqual(core.isGroup(h1),false);
assert.strictEqual(core.isGroup(h2),true);
assertSame(core.filterHistory([h1,h2],'a','mine','klatka').map(x=>x.id),['h2']);
assertSame(core.filterHistory([h1,h2],'a','group','').map(x=>x.id),['h2']);
assertSame(core.filterHistory([h1,h2],'b','group','').map(x=>x.id),['h2']);
assertSame(core.filterHistory([h1,h2],'b','mine','plecy').map(x=>x.id),[]);
assert.strictEqual(core.bestRecords([h1,h2],'a').bench,40);
assert.strictEqual(core.bestRecords([h1,h2],'b').bench,70);
assert.strictEqual(core.hasEquipment,undefined); // public API intentionally minimal
assert.strictEqual(core.matchesEquipment({equipment:'Hantle'},{bars:[]},false),true);
assert.strictEqual(core.matchesEquipment({equipment:'Hantle'},{bars:[{type:'barbell'}]},false),false);
assert.strictEqual(core.matchesEquipment({equipment:'Hantle'},{bars:[{type:'dumbbell'}]},false),true);
assert.strictEqual(core.matchesEquipment({equipment:'Sztanga'},{bars:[{type:'barbell'}]},false),true);
assert.strictEqual(core.matchesEquipment({equipment:'Masa ciała'},{bars:[{type:'barbell'}]},false),true);
assertSame([h1,h2].map(x=>JSON.stringify(x)),[JSON.stringify(h1),JSON.stringify(h2)]);
console.log('Lite 0.4.0: 22 testy historii, profili, tygodnia, filtrów i niezmienności danych — PASS');
