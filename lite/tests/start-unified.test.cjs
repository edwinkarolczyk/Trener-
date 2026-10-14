'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../app/src/main/assets/v086-one-phone.js'),'utf8');
const patched=require('../scripts/patch-group-six.cjs').patch(source);
const css=fs.readFileSync(path.resolve(__dirname,'../scripts/lite-tablet.css'),'utf8');
const profileUi=fs.readFileSync(path.resolve(__dirname,'../scripts/lite-profile-ui.js'),'utf8');
const group=require('../scripts/lite-group-core.js');

test('Start Lite ma tylko jeden wybór treningu 1–6 osób',()=>{
 assert.match(patched,/b\.textContent='TRENING 1–6 OSÓB • JEDEN TABLET'/);
 assert.doesNotMatch(patched,/WSPÓLNY 2–4 • JEDEN TELEFON/);
 assert.match(css,/#start #setup \.modeRow/);
 assert.match(css,/#start #setup #partnerWrap/);
});
test('jeden tryb uruchamia się automatycznie, a kliknięcie nie wyłącza go',()=>{
 assert.match(patched,/installTransferUi\(\);\s*selectLocal\(true\)/);
 assert.match(patched,/b\.onclick=\(\)=>\{if\(running\)return;selectLocal\(true\)/);
 assert.doesNotMatch(patched,/selectLocal\(!state\.selected\)/);
});
test('wybór profili zamiast starego licznika i nazw z pola Solo/Duet',()=>{
 assert.match(patched,/TrenerLiteProfiles\?\.selectedRoster/);
 assert.match(profileUi,/Math\.max\(1,Math\.min\(6,picked\.length\)\)/);
 assert.match(profileUi,/Math\.max\(1,Math\.min\(6,roster\.length\)\)/);
 assert.match(patched,/name=\x27v086PlanMode\x27|id="v086PlanMode"/);
});
test('silnik obsługuje pojedynczą osobę i sześcioosobową grupę',()=>{
 const group1=[{id:'person-101',name:'Osoba 1',index:0}];
 const group6=Array.from({length:6},(_,i)=>({id:'person-'+i,name:'Osoba '+i,index:i}));
 assert.equal(group.validRoster(group1),true);
 assert.equal(group.validRoster(group6),true);
 assert.equal(group.validRoster(group6.concat([{id:'person-7',name:'7',index:6}])),false);
});
