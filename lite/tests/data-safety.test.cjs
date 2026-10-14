'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../scripts/lite-data-core.js');
const fixture=()=>({app:'Trener2Lite',schema:1,
  profiles:[{id:1,name:'Ala'},{id:2,name:'Bartek'}],
  exercises:[{id:5,name:'Ławka'}],plans:[{id:2,name:'Klatka'}],
  sessions:[{id:11,profile_id:1,plan_id:2,started_at:1790000000000,finished_at:1790003600000},
    {id:12,profile_id:2,plan_id:2,started_at:1790086400000,finished_at:null}],
  workout_sets:[{id:41,session_id:11,exercise_id:5,weight:35,reps:8,created_at:1790000009000},
    {id:42,session_id:12,exercise_id:5,weight:25,reps:7,created_at:1790086408000}],
  liteExtensions:{lite_set_quality:[{set_id:41,rir:2,technique:'good',pain:'none'}],
    lite_session_names:[{session_id:11,plan_name:'Klatka A'}]}});
function backup(storage,legacyLite){return {format:'trener2-backup',version:6,storage,legacyLite};}
test('stara SQLite przekształca sesje do historii z identyfikatorami osób, RIR i stabilnym id',()=>{
  const out=core.legacyToHistory(fixture());
  assert.equal(out.length,2);
  assert.equal(out[0].records[0].participantId,'lite-profile:1');
  assert.equal(out[0].records[0].rir,2);
  assert.equal(out[0].plan,'Klatka A');
  assert.equal(out[1].interrupted,true);
  assert.equal(out[0].id,'lite-legacy:11');
  assert.equal(out[0].records[0].uid,'legacy:11:41');
});
test('wielokrotna migracja jest idempotentna, nie usuwa lokalnej historii',()=>{
  const old={id:'local',iso:'2025-01-01T00:00:00.000Z',records:[{kg:5,reps:10}]};
  const storage={'trainer3.history':JSON.stringify([old])};
  const p1=core.prepare(fixture(),storage,'all');
  assert.equal(p1.stats.historyAdded,2);
  assert.equal(p1.stats.historyDuplicate,0);
  assert.equal(JSON.parse(p1.writes['trainer3.history']).length,3);
  const storage2={'trainer3.history':p1.writes['trainer3.history']};
  const p2=core.prepare(fixture(),storage2,'all');
  assert.equal(p2.stats.historyAdded,0);
  assert.equal(p2.stats.historyDuplicate,2);
  assert.equal(p2.keyCount,0);
});
test('pełny import nie nadpisuje istniejących ustawień, zdjęć ani historii',()=>{
  const current={'trainer3.history':JSON.stringify([{id:'keep',iso:'2024-01-01',records:[]}]),
    'trainer3.settings':'{"theme":"mine"}',
    'trainer3.photos':JSON.stringify([{id:'image1',data:'data:image/jpeg;base64,aaa'}])};
  const src=backup({'trainer3.history':JSON.stringify([{id:'from',iso:'2025-01-01',records:[]}]),
    'trainer3.settings':'{"theme":"other"}',
    'trainer3.photos':JSON.stringify([{id:'image2',data:'data:image/jpeg;base64,bbb'}]),
    'trainer3.customPlan':'{"x":1}'});
  const plan=core.prepare(src,current,'all');
  assert.equal(plan.stats.historyAdded,1);
  assert.equal(plan.writes['trainer3.settings'],undefined);
  assert.equal(JSON.parse(plan.writes['trainer3.photos']).length,2);
  assert.equal(plan.writes['trainer3.customPlan'],'{"x":1}');
});
test('konflikt identyfikatora sesji chroni już zapisane dane',()=>{
  const stored=[{id:'w11',iso:'2024-01-01',records:[{kg:40}]}];
  const imported=[{id:'w11',iso:'2024-01-01',records:[{kg:100}]}];
  const p=core.prepare(backup({'trainer3.history':JSON.stringify(imported)}),
    {'trainer3.history':JSON.stringify(stored)},'all');
  assert.equal(p.stats.historyAdded,0);
  assert.equal(p.stats.historyConflict,1);
  assert.equal(p.writes['trainer3.history'],undefined);
});
test('wybór jednej osoby kopiuje wyłącznie jej serie z grupy',()=>{
  const group={id:'group7',iso:'2026-10-01T10:00:00Z',
    onePhone:{participants:[{id:'alice',name:'Ala',index:0},{id:'bob',name:'Bartek',index:1}]},
    records:[{id:'bench',participantId:'alice',athlete:0,kg:25,reps:10},
      {id:'bench',participantId:'bob',athlete:1,kg:40,reps:8}]};
  const plan=core.prepare(backup({'trainer3.history':JSON.stringify([group])}),{},'person','bob');
  const h=JSON.parse(plan.writes['trainer3.history'])[0];
  assert.equal(h.records.length,1);
  assert.equal(h.records[0].kg,40);
  assert.equal(h.records[0].athlete,0);
  assert.equal(h.participantId,'bob');
  assert.equal(h.mode,1);
  assert.equal(h.onePhone,undefined);
});
test('migracja nie interpretuje nieotagowanych serii wspólnej grupy jako serii przypadkowego profilu',()=>{
  const group={id:'group-old',onePhone:{participants:[{id:'a',index:0},{id:'b',index:1}]},
    records:[{athlete:0,kg:15},{athlete:1,kg:22.5}]};
  const h=core.onlyPerson(group,'b');
  assert.equal(h.records.length,1);assert.equal(h.records[0].kg,22.5);
  assert.equal(core.onlyPerson(group,'unknown'),null);
});
test('dane diety i znaczniki starej migracji są odfiltrowane',()=>{
  assert.equal(core.allowedKey('trainer3.diet'),false);
  const plan=core.prepare(backup({'trainer3.history':'[]',
    'trainer3.food':'[]','trainer3.customPlan':'{}',
    'trainer3.liteLegacyImported.v03':'yes'}),{},'all');
  assert.equal(plan.writes['trainer3.food'],undefined);
  assert.equal(plan.writes['trainer3.liteLegacyImported.v03'],undefined);
});
test('błąd po częściowym zapisie wywołuje rollback wszystkich zmienionych kluczy',()=>{
  const items={'trainer3.history':'["original"]','trainer3.settings':'{"s":"old"}'};
  const storage={
    getItem:k=>Object.prototype.hasOwnProperty.call(items,k)?items[k]:null,
    setItem(k,v){if(k==='trainer3.settings'&&v==='{"s":"new"}')throw Error('Brak pamięci');
      items[k]=v;},
    removeItem(k){delete items[k];}
  };
  const result=core.apply(storage,{writes:{
    'trainer3.history':'["other"]','trainer3.settings':'{"s":"new"}'}});
  assert.equal(result.ok,false);assert.equal(result.recovered,true);
  assert.equal(items['trainer3.history'],'["original"]');
  assert.equal(items['trainer3.settings'],'{"s":"old"}');
});
test('pełna kopia łączy dane nowego Trenera z archivum starszego Lite',()=>{
  const mixed=backup({'trainer3.history':JSON.stringify([{id:'new',iso:'2026-10-01',records:[]}])},fixture());
  const b=core.source(mixed);
  assert.equal(JSON.parse(b.storage['trainer3.history']).length,3);
});
