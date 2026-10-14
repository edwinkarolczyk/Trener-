'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const inv=require('../scripts/lite-inventory-core.js');
const items=()=>({
  version:1,
  bars:[{id:'grip-two',name:'Dwa gryfy',type:'dumbbell',kg:2,count:2,diameter:30,maxKg:14},
    {id:'long-bar',name:'Sztanga',type:'barbell',kg:20,count:1,diameter:50,maxKg:100}],
  plates:[{id:'plate-25',name:'Talerze 2,5',kg:2.5,count:8,diameter:30}]
});
test('8 x 2,5 kg i dwa gryfy 2 kg: maksimum 12 kg na jedną hantlę',()=>{
  const r=inv.recommend(items(),'dumbbell-pair','grip-two',100);
  assert.equal(r.possible,true);assert.equal(r.total,12);assert.equal(r.maximum,12);
  assert.deepEqual(r.side,[{kg:2.5,count:2}]);
  assert.match(inv.layout(r),/LEWĄ/);
});
test('skok +2,5 kg na hantlę niemożliwy z samymi talerzami 2,5 kg',()=>{
  const r=inv.recommend(items(),'dumbbell-pair','grip-two',9.5);
  assert.equal(r.total,7);assert.equal(r.exact,false);
});
test('możliwość wykorzystania tylko jednej hantli: 4 talerze na stronę',()=>{
  const gear=items();gear.bars[0].maxKg=30;
  const r=inv.recommend(gear,'dumbbell-one','grip-two',100);
  assert.equal(r.total,22);assert.equal(r.side[0].count,4);
});
test('zestaw oburącz nie może policzyć tych samych czterech talerzy na obie hantle',()=>{
  const data=items();data.plates[0].count=4;
  const r=inv.recommend(data,'dumbbell-pair','grip-two',100);
  assert.equal(r.total,7);assert.equal(r.side[0].count,1);
});
test('średnice niekompatybilne; sztanga ma tylko masę własną',()=>{
  const r=inv.recommend(items(),'barbell','long-bar',30);
  assert.equal(r.possible,true);assert.equal(r.total,20);assert.equal(r.exact,false);
});
test('maksymalna nośność gryfu jest egzekwowana',()=>{
  const data=items();data.bars[0].maxKg=9;
  const r=inv.recommend(data,'dumbbell-pair','grip-two',50);
  assert.equal(r.total,7);
});
test('para wymaga co najmniej dwóch identycznych gryfów',()=>{
  const data=items();data.bars[0].count=1;
  const r=inv.recommend(data,'dumbbell-pair','grip-two',10);
  assert.equal(r.possible,false);
});
test('limit docelowy poniżej masy gryfu nie daje fikcyjnego ciężaru',()=>{
  const r=inv.recommend(items(),'dumbbell-one','grip-two',1.5);
  assert.equal(r.possible,false);
});
test('hantle stałe są liczone bez dokładania talerzy',()=>{
  const data=items();data.bars.push({id:'fixed-8',name:'Hantle stałe 8 kg',type:'fixed',kg:8,count:2,diameter:null,maxKg:null});
  const r=inv.recommend(data,'fixed-pair','fixed-8',10);
  assert.equal(r.total,8);assert.deepEqual(r.side,[]);
});
test('dwie wielkości talerzy łączą się bez przekraczania liczby dostępnych sztuk',()=>{
  const data=items();data.plates.push({id:'plate-05',name:'Małe',kg:.5,count:4,diameter:30});
  const r=inv.recommend(data,'dumbbell-pair','grip-two',8);
  assert.equal(r.total,8);assert.deepEqual(r.side,[{kg:2.5,count:1},{kg:0.5,count:1}]);
});
test('błędna masa i liczba sztuk oraz duplikaty są odrzucane',()=>{
  const bad=items();bad.plates[0].count=-3;
  assert.throws(()=>inv.validate(bad),/liczba/i);
  const dup=items();dup.plates[0].id='grip-two';
  assert.throws(()=>inv.validate(dup),/powtórzony/i);
  const value=items();value.bars[0].kg=0;
  assert.throws(()=>inv.validate(value),/masa/i);
});
test('bez sprzętu brak propozycji fikcyjnych obciążeń',()=>{
  const r=inv.recommend({bars:[],plates:[]},'dumbbell-pair','',10);
  assert.equal(r.possible,false);
});
