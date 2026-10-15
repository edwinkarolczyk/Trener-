'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../scripts/lite-040-core.js');
const ui=fs.readFileSync(path.join(__dirname,'../scripts/lite-040-ui.js'),'utf8');
const parity=fs.readFileSync(path.join(__dirname,'../scripts/build-parity-assets.cjs'),'utf8');
const fire=fs.readFileSync(path.join(__dirname,'../scripts/lite-fire-ui.js'),'utf8');
const backup=require('../scripts/lite-data-core.js');
function h(id,pid,date,rows){return {id,participantId:pid,iso:date,date,plan:'Test',records:rows};}
test('w pakiecie są obie części 0.4 i transpilacja dla WebView Chrome 37',()=>{
 assert.match(parity,/lite-040-core\.js/);assert.match(parity,/lite-040-ui\.js/);
 assert.match(parity,/chrome:'37'/);
});
test('otwarcie zawsze Start, a skrót wznowienia używa istniejącego silnika',()=>{
 assert.match(ui,/lite040Resume/);assert.match(ui,/v086Resume/);
 assert.match(ui,/trainer3\.lastTab\.v0884/);
});
test('kopie i identyfikatory profili nie są kasowane przez nowy interfejs',()=>{
 assert.match(ui,/TrenerLiteProfiles\.select\(ids\)/);
 assert.doesNotMatch(ui,/localStorage\.clear\s*\(/);
 assert.doesNotMatch(ui,/removeItem\s*\(\s*['"]trainer3\.history/);
 assert.doesNotMatch(ui,/removeItem\s*\(\s*['"]trainer3\.lite\.profiles/);
});
test('nowe awatary i tygodnie są bezpieczne dla pełnej kopii',()=>{
 const data={format:'trener2-backup',version:6,storage:{
  'trainer3.lite.week.v040':JSON.stringify({a:['mon','','','','','','']}),
  'trainer3.lite.avatar.v040':JSON.stringify({a:'data:image/jpeg;base64,aGVsbG8='}),
  'trainer3.history':JSON.stringify([])
 }};
 const result=backup.prepare(data,{},'all','');
 assert.ok(result.writes['trainer3.lite.week.v040']);
 assert.ok(result.writes['trainer3.lite.avatar.v040']);
});
test('import istniejącego profilu nie nadpisuje historii i ustawień',()=>{
 const current={'trainer3.lite.week.v040':'{"a":["fri"]}',
   'trainer3.history':JSON.stringify([h('old','a','2026-10-01',[])])};
 const incoming={format:'trener2-backup',storage:{
  'trainer3.lite.week.v040':'{"a":["mon"]}',
  'trainer3.history':JSON.stringify([h('new','a','2026-10-02',[])])}};
 const planned=backup.prepare(incoming,current,'all','');
 assert.equal(planned.writes['trainer3.lite.week.v040'],undefined);
 assert.equal(JSON.parse(planned.writes['trainer3.history']).length,2);
});
test('jeden rekord historii uczestnika, brak przecieków serii grupowych',()=>{
 const session={id:'g',onePhone:{participants:[{index:0,id:'a'},{index:1,id:'b'}]},
 records:[{athlete:0,id:'bench',kg:20},{athlete:1,id:'bench',kg:80}]};
 assert.equal(core.recordsOf(session,'a').length,1);
 assert.equal(core.recordsOf(session,'b')[0].kg,80);
 assert.equal(core.filterHistory([session],'a','group','').length,1);
 assert.equal(core.filterHistory([session],'c','group','').length,0);
});
test('sygnały odpoczynku i wygaszanie to konfiguracja, nie twarda blokada',()=>{
 assert.match(fire,/trainer3\.lite\.screen\.keep\.v040/);
 assert.match(fire,/liteFireBeep/);assert.match(fire,/liteFireVibrate/);
 assert.match(ui,/lite040KeepAwake/);
});
test('historie i biblioteka posiadają ekrany i deduplikują widok',()=>{
 assert.match(ui,/lite040HistoryMode/);assert.match(ui,/lite040HistoryPerson/);
 assert.match(ui,/lite040HistorySearch/);
 assert.match(ui,/if\(!el\.open\|\|!el\.classList\.contains/);
 assert.match(ui,/lite040WeekSave/);assert.match(ui,/lite040AllExercise/);
});

test('krótkie filmy lokalne mieszczą się w pełnej kopii bez niszczenia historii',()=>{
 assert.match(ui,/trainer3\.lite\.videos\.v040/);
 assert.match(ui,/512\*1024/);
 assert.match(ui,/reader\.readAsDataURL\(file\)/);
 const plan=backup.prepare({format:'trener2-backup',storage:{
  'trainer3.lite.videos.v040':JSON.stringify({bench:'data:video/mp4;base64,AAAA'}),
  'trainer3.history':'[]'
 }},{},'all','');
 assert.ok(plan.writes['trainer3.lite.videos.v040']);
});

test('0.4.1: na liście tylko zestawy A/B/C; dni v070 są jedynie harmonogramem',()=>{
 assert.match(ui,/o\.value\.indexOf\('v070day:'\)!==0/);
 assert.match(ui,/lite040MoveDay/);
 assert.match(ui,/PRZENIEŚ DZISIEJSZY TRENING NA JUTRO/);
 assert.match(ui,/core\.moveOnce/);
 assert.match(ui,/trainer3\.lite\.weekOverrides\.v041/);
 assert.match(ui,/Brak planu na dziś — wybierz ręcznie/);
});
test('0.4.1: przesunięcie nie mutuje tygodniowej konfiguracji ani historii',()=>{
 assert.match(ui,/write\(EXCEPTIONS,outcome\.exceptions\)/);
 assert.doesNotMatch(ui,/write\(WEEK_KEY,outcome\.exceptions\)/);
 const data={format:'trener2-backup',storage:{
   'trainer3.lite.weekOverrides.v041':JSON.stringify({a:{'2026-10-12':'','2026-10-13':'mon'}}),
   'trainer3.history':'[]'
 }};
 const restored=backup.prepare(data,{},'all','');
 assert.ok(restored.writes['trainer3.lite.weekOverrides.v041']);
});
test('0.4.1: trening i przerwy są rozróżnione, nagłówek nie pokazuje fikcyjnego ćwiczącego',()=>{
 assert.match(fire,/ĆWICZY TERAZ/);
 assert.match(fire,/TRWA ODPOCZYNEK/);
 assert.match(fire,/liteFireOverview/);
 assert.match(fire,/ZAPIS SERII PO PRZERWIE/);
 assert.doesNotMatch(fire,/AKTUALNIE ĆWICZY/);
 const css=fs.readFileSync(path.join(__dirname,'../scripts/lite-fire.css'),'utf8');
 assert.match(css,/liteFireOverviewWork/);
 assert.match(css,/liteFireOverviewRest/);
 assert.match(css,/liteFireactive/);
 assert.match(css,/liteFirerest/);
});
test('0.4.1: starszy harmonogram nie może ponownie wybrać przesuniętego treningu',()=>{
 assert.match(parity,/v072-beta-plan-timers\.js/);
 assert.match(parity,/movedAway/);
});
