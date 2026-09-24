'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('app/src/main/assets/v094-exercise-store.js','utf8');
const data=new Map();
let fail=false;
const localStorage={
  getItem:k=>data.has(k)?data.get(k):null,
  setItem:(k,v)=>{if(fail)throw Error('QuotaExceededError');data.set(k,String(v));}
};
const base={id:'bench',n:'Wyciskanie',group:'Klatka',sets:3,min:8,max:12,rest:90};
const exerciseLibrary=[base];
let builds=0;
const ctx={window:{},localStorage,exerciseLibrary,Uint32Array,Math,JSON,renderBuilder:()=>builds++,
  document:{getElementById:()=>null},Event:class Event{constructor(name){this.type=name;}}};
vm.runInNewContext(source,ctx,{filename:'v094-exercise-store.js'});
const s=ctx.window.TrenerCustomExercises094;
const basic={n:'Uginanie młotkowe',group:'Biceps',equipment:'Hantle',sets:3,min:10,max:12,rest:90,
 setup:'Ręce przy tułowiu.',movement:'Ugnij przedramiona.',mistake:'Nie bujaj tułowiem.',tip:'Kontrola ruchu.'};

test('manual exercise survives reload and appears in shared training-library lookup',()=>{
  const ex=s.save(basic);
  assert.match(ex.id,/^user:/);
  assert.equal(exerciseLibrary.find(e=>e.id===ex.id).n,basic.n);
  const another=[base];
  vm.runInNewContext(source,{window:{},localStorage,exerciseLibrary:another,Uint32Array,Math,JSON});
  assert.equal(another.length,1,'module declaration by itself should not mutate library');
  s.hydrate();
  assert.equal(exerciseLibrary.filter(e=>e.id===ex.id).length,1);
  assert.equal(s.list().length,1);
  s.refresh();
  assert.ok(builds>0);
});

test('edits keep ID and never duplicate exercise records',()=>{
  const ex=s.list()[0];s.save({...ex,n:'Uginanie młotkowe — hantle'});
  assert.equal(s.list().length,1);
  assert.equal(s.get(ex.id).n,'Uginanie młotkowe — hantle');
  assert.equal(exerciseLibrary.filter(e=>e.id===ex.id).length,1);
});

test('invalid inputs, built-in ID collision and corrupted photos are rejected',()=>{
  assert.throws(()=>s.save({...basic,id:'bench'}));
  assert.throws(()=>s.save({...basic,n:''}));
  assert.throws(()=>s.save({...basic,max:2,min:15}));
  assert.throws(()=>s.save({...basic,group:'Biceps<script>'}));
  assert.throws(()=>s.save({...basic,imageStart:'https://example.test/pic.jpg'}));
  assert.equal(exerciseLibrary[0].n,'Wyciskanie');
});

test('storage failure preserves prior data and live library',()=>{
  const previous=localStorage.getItem(s.KEY),before=exerciseLibrary.length;
  fail=true;
  assert.throws(()=>s.save({...basic,n:'Test zapisu'}));
  fail=false;
  assert.equal(localStorage.getItem(s.KEY),previous);
  assert.equal(exerciseLibrary.length,before);
});

test('deleting custom exercise does not delete history, diet or old plans',()=>{
  const ex=s.list()[0];
  data.set('trainer3.history','[{"id":"w1","records":[{"id":"'+ex.id+'"}]}]');
  data.set('trainer3.diet.v076','{"meals":[{"id":"m1"}]}');
  data.set('trainer3.customPlans.v050','[{"id":"p1","ex":["'+ex.id+'"]}]');
  assert.throws(()=>s.remove(ex.id),/używane w zapisanym planie/);
  assert.equal(s.list().length,1,'referenced plan remains resolvable');
  data.delete('trainer3.customPlans.v050');
  s.remove(ex.id);
  assert.equal(s.list().length,0);
  assert.equal(exerciseLibrary.length,1);
  assert.equal(JSON.parse(data.get('trainer3.history'))[0].records[0].id,ex.id);
  assert.equal(JSON.parse(data.get('trainer3.diet.v076')).meals[0].id,'m1');
  assert.equal(JSON.parse(data.get('trainer3.customPlans.v050'))[0].id,'p1');
});

test('photos stay in personal backup, not in shared plan payload',()=>{
  const picture='data:image/jpeg;base64,AAABBB==';
  const ex=s.save({...basic,imageStart:picture,imageEnd:picture});
  assert.equal(s.get(ex.id).imageStart,picture);
  const live=exerciseLibrary.find(e=>e.id===ex.id);
  assert.equal(live.imageStart,undefined);
  assert.equal(live.imageEnd,undefined);
  assert.ok(JSON.stringify({title:'Duet',ex:[live]}).length<20000);
  s.remove(ex.id);
});

test('corrupt saved library refuses overwrite and leaves live exercises intact',()=>{
  const snapshot=localStorage.getItem(s.KEY);
  data.set(s.KEY,'{broken-json');
  assert.equal(s.hydrate(),false);
  assert.throws(()=>s.save(basic),/Uszkodzony zapis biblioteki/);
  assert.equal(data.get(s.KEY),'{broken-json');
  assert.equal(exerciseLibrary[0].n,'Wyciskanie');
  data.set(s.KEY,snapshot);
});

test('old-format backup and planner still include custom exercise data',()=>{
  const backup=fs.readFileSync('app/src/main/assets/backup-addon.js','utf8');
  const planner=fs.readFileSync('app/src/main/assets/v070-beta-planner.js','utf8');
  const loader=fs.readFileSync('app/src/main/assets/feature-loader.js','utf8');
  assert.match(backup,/key\.startsWith\('trainer3\.'\)/);
  assert.match(planner,/function idsForPart\(k\)/);
  assert.match(planner,/flatMap\(idsForPart\)/);
  assert.match(loader,/\['0\.9\.4','v094-exercise-store\.js'\]/);
  assert.match(loader,/\['0\.9\.4','v094-exercise-ui\.js'\]/);
  const gradle=fs.readFileSync('app/build.gradle','utf8');
  assert.match(gradle,/versionName '0\\.9\\.5'/);
  assert.match(gradle,/versionCode 95/);
});