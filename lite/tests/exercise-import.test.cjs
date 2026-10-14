'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const c=require('../scripts/lite-exercise-core.js');
function exRows(){
 return [{nazwa:'Wyciskanie hantli',partia:'Klatka',sprzet:'Hantle',serie:'3',powt_min:'8',powt_max:'12',przerwa:'90',
   wykonanie:'Płynnie wyciśnij',zdjecie_start:'zdjecia/start.jpg',zdjecie_koniec:'zdjecia/end.jpg'},
   {nazwa:'Przysiad',partia:'Nogi',serie:'4',powt_min:'6',powt_max:'10',przerwa:'120'}];
}
function sample(){
 return {format:'trener2-lite-exercises',kind:'zip',rows:exRows(),
  images:{'zdjecia/start.jpg':'data:image/jpeg;base64,Zm9v',
    'zdjecia/end.jpg':'data:image/jpeg;base64,YmFy'}};
}
test('automatyczne mapowanie polskich kolumn importu ZIP',()=>{
 const map=c.guess(Object.keys(exRows()[0]));
 assert.equal(map.n,'nazwa');assert.equal(map.group,'partia');
 assert.equal(map.imageStart,'zdjecie_start');
 assert.equal(map.imageEnd,'zdjecie_koniec');
 assert.equal(map.movement,'wykonanie');
});
test('ćwiczenia i dwa zdjęcia START/KONIEC trafiają do tej samej biblioteki',()=>{
 const data=sample(),plan=c.preview(data,c.guess(Object.keys(data.rows[0])),[],[]);
 assert.deepEqual(plan.counts,{new:2,duplicate:0,invalid:0});
 assert.equal(plan.entries[0].exercise.imageStart,data.images['zdjecia/start.jpg']);
 assert.equal(plan.entries[0].exercise.imageEnd,data.images['zdjecia/end.jpg']);
 assert.equal(plan.entries[0].exercise.rest,90);
 const merged=c.commitPlan([],plan.entries);
 assert.equal(merged.added,2);
 const items=JSON.parse(merged.serialized).exercises;
 assert.equal(items.length,2);assert.equal(items[0].group,'Klatka');
 assert.equal(items[0].imageEnd,'data:image/jpeg;base64,YmFy');
});
test('powtórny import nie nadpisuje wcześniejszego zdjęcia ani opisu',()=>{
 const data=sample(),map=c.guess(Object.keys(data.rows[0]));
 const old=c.commitPlan([],c.preview(data,map,[],[]).entries);
 const existing=JSON.parse(old.serialized).exercises;
 existing[0].imageStart='data:image/jpeg;base64,STARE';
 const repeated=c.preview(data,map,existing,[]);
 assert.deepEqual(repeated.counts,{new:0,duplicate:2,invalid:0});
 assert.equal(repeated.entries[0].selected,false);
 assert.equal(existing[0].imageStart,'data:image/jpeg;base64,STARE');
});
test('duplikaty w pojedynczej paczce są oznaczone i nie zapisują się podwójnie',()=>{
 const data=sample();data.rows.push(Object.assign({},data.rows[0]));
 const p=c.preview(data,c.guess(Object.keys(data.rows[0])),[],[]);
 assert.equal(p.counts.duplicate,1);
 assert.equal(c.commitPlan([],p.entries).added,2);
});
test('błędny adres zdjęcia jest blokowany, a reszta nie jest modyfikowana',()=>{
 const data=sample();data.rows[0].zdjecie_start='../ucieczka.jpg';
 const p=c.preview(data,c.guess(Object.keys(data.rows[0])),[],[]);
 assert.equal(p.counts.invalid,1);assert.equal(p.counts.new,1);
 assert.equal(p.entries[0].selected,false);
});
test('brakujący obraz nie jest cicho ignorowany',()=>{
 const data=sample();delete data.images['zdjecia/end.jpg'];
 const p=c.preview(data,c.guess(Object.keys(data.rows[0])),[],[]);
 assert.match(p.entries[0].error,/Nie znaleziono zdjęcia/);
});
test('Excel bez zdjęć importuje się i nie wymaga paczki ZIP',()=>{
 const data={format:'trener2-lite-exercises',kind:'xlsx',
  rows:[{exercise:'Martwy ciąg',group:'Plecy',sets:'3',min:'5',max:'8',rest:'150'}],images:{}};
 const p=c.preview(data,c.guess(Object.keys(data.rows[0])),[],[]);
 assert.equal(p.counts.new,1);
 assert.equal(p.entries[0].exercise.equipment,'Masa ciała');
});
test('błędny zakres, obca partia i wartości ujemne są odrzucane',()=>{
 const data={format:'trener2-lite-exercises',kind:'csv',images:{},
  rows:[{nazwa:'Przysiad',partia:'Nogi',powt_min:'14',powt_max:'8',przerwa:''},
    {nazwa:'Uginanie',partia:'Mars',serie:'3'},
    {nazwa:'Podciąganie',partia:'Plecy',przerwa:'-2'}]};
 const p=c.preview(data,c.guess(Object.keys(data.rows[0])),[],[]);
 assert.equal(p.counts.invalid,3);
});
test('wybór tylko jednego ćwiczenia zachowuje pozostałe wpisy',()=>{
 const data=sample(),p=c.preview(data,c.guess(Object.keys(data.rows[0])),[],[]);
 p.entries[1].selected=false;
 const base=[{id:'user:abcdefgh1234',n:'Stara nazwa',group:'Klatka',sets:3,min:8,max:12}];
 const merged=c.commitPlan(base,p.entries);
 assert.equal(merged.added,1);
 const items=JSON.parse(merged.serialized).exercises;
 assert.equal(items.length,2);assert.equal(items[0].n,'Stara nazwa');
});
test('limit pojemności sprawdzony PRZED zapisem; nie ma częściowego importu',()=>{
 const data=sample(),p=c.preview(data,c.guess(Object.keys(data.rows[0])),[],[]);
 const over=[{id:'user:abcdefgh999',n:'Stara',group:'Klatka',imageStart:'x'.repeat(2800000)}];
 assert.throws(()=>c.commitPlan(over,p.entries),/Za dużo danych/);
});
