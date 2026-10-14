'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../scripts/lite-fire-ui-core.js');
const root=path.resolve(__dirname,'../scripts');
test('Fire: liczniki osobne, format mm:ss i brak wartości ujemnych',()=>{
  assert.equal(core.timer(61000),'01:01');
  assert.equal(core.timer(59001),'01:00');
  assert.equal(core.timer(1000),'00:01');
  assert.equal(core.timer(-100),'00:00');
  assert.equal(core.timer(0),'00:00');
});
test('Fire: cztery niezależne stany osoby',()=>{
  const now=100000;
  assert.equal(core.state({done:false,readyAt:now+22000},now,false).code,'rest');
  assert.equal(core.state({done:false,readyAt:0,deferredUntil:now+6000},now,false).code,'later');
  assert.equal(core.state({done:false,readyAt:0,deferredUntil:0},now,false).code,'ready');
  assert.equal(core.state({done:true,readyAt:0},now,false).code,'done');
  assert.equal(core.state({done:false,readyAt:0},now,true).code,'pause');
});
test('Fire: sześć osób ma oddzielne liczniki i zakończenia',()=>{
  const now=100000;
  const members=[
    {index:0,readyAt:0,done:false},{index:1,readyAt:now+45000,done:false},
    {index:2,readyAt:0,done:true},{index:3,readyAt:now+11000,done:false},
    {index:4,readyAt:0,done:false},{index:5,readyAt:0,done:true}
  ];
  assert.deepEqual(core.summary({participants:members,paused:false},now),
    {total:6,ready:2,rest:2,done:2,paused:0});
  assert.equal(core.state(members[1],now,false).detail,'00:45');
  assert.equal(core.state(members[3],now,false).detail,'00:11');
});
test('Fire: stan pauzy nie może być interpretowany jako gotowość',()=>{
  const one={done:false,readyAt:0},g={participants:[one,one],paused:true};
  assert.equal(core.summary(g,Date.now()).ready,0);
  assert.equal(core.summary(g,Date.now()).paused,2);
});
test('Fire: skalowalna lista aktualizuje tekst, nie odtwarza formularzy co sekundę',()=>{
  const js=fs.readFileSync(path.join(root,'lite-fire-ui.js'),'utf8');
  const patch=fs.readFileSync(path.join(root,'patch-group-six.cjs'),'utf8');
  assert.match(js,/writeText\(node\.querySelector/);
  assert.match(js,/setInterval\(manageUi,1000\)/);
  assert.match(js,/\.getAttribute\('data-index'\)|data-index/);
  assert.match(patch,/get tabletState\(\)/);
  assert.match(patch,/if\(!\$\('liteFireRoster'\)\)/);
  assert.match(js,/aria-label/);
});
test('Fire: zachowano motyw i podgląd ćwiczenia po rozwinięciu',()=>{
  const css=fs.readFileSync(path.join(root,'lite-fire.css'),'utf8');
  const js=fs.readFileSync(path.join(root,'lite-fire-ui.js'),'utf8');
  assert.match(css,/#ef2b2d/);
  assert.match(css,/#1f8d56/);
  assert.match(css,/\.liteFireMore\[open\] #v055Visual/);
  assert.match(css,/html\.v062Active\.liteFireActive/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/@media\(min-width:850px\)/);
  assert.match(js,/more\.appendChild\(visual\)/);
  assert.match(js,/doc\.documentElement\.classList\.toggle\('liteFireActive',active\)/);
});

test('Fire: opcjonalne sygnały i flagi ekranu w czasie treningu',()=>{
 const js=fs.readFileSync(path.join(root,'lite-fire-ui.js'),'utf8');
 const java=fs.readFileSync(path.resolve(__dirname,'../src/main/java/pl/edwin/trener2lite/LiteFullActivity.java'),'utf8');
 assert.match(js,/setTabletTrainingActive/);
 assert.match(js,/restFinishedSignal/);
 assert.match(js,/trainer3\.lite\.fire\.vibrate\.v035/);
 assert.match(js,/restSeen\[p\.id\]===key&&!restAnnounced\[key\]/);
 assert.match(java,/FLAG_KEEP_SCREEN_ON/);
 assert.match(java,/ToneGenerator/);
});
