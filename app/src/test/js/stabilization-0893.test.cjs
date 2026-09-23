const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync('app/src/main/assets/'+p,'utf8');
const memory=new Map();
const localStorage={
 get length(){return memory.size;},key(i){return [...memory.keys()][i]??null;},
 getItem(k){return memory.get(k)??null;},
 setItem(k,v){memory.set(k,String(v));},
 removeItem(k){memory.delete(k);}
};
const past='2026-09-21';
const nodes={v0886SetList:{innerHTML:''},v0886SetMessage:{textContent:''}};
const document={readyState:'loading',addEventListener(){},getElementById:id=>nodes[id]||null,
 body:{appendChild(){}},createElement(){return {src:'',id:''};}};
const window={
 TrenerDiet076:{getDate:()=>past,render(){}},
 TrenerMealTime0889:{typeForRepeat:()=> 'dinner'}
};
const saved={id:'set-old',name:'Kanapki',type:'breakfast',ingredients:[
 {name:'Chleb',grams:100,kcal:250,protein:8,carbs:48,fat:2},
 {name:'Ser',grams:50,kcal:175,protein:13,carbs:0,fat:14}
]};
memory.set('trainer3.mealSets.v0886',JSON.stringify([saved]));
memory.set('trainer3.diet.v076',JSON.stringify({version:1,targets:{kcal:2300},meals:[],shopping:[]}));
vm.runInNewContext(read('v0886-meal-sets.js'),{window,document,localStorage,Date},{timeout:2000});
window.TrenerMealSets0886.add(0);
let stored=JSON.parse(memory.get('trainer3.diet.v076'));
assert.equal(stored.meals.length,1);
assert.equal(stored.meals[0].date,past,'saved set uses selected journal day');
assert.equal(stored.meals[0].type,'breakfast','historical entry retains saved classification');
assert.equal(stored.meals[0].kcal,425,'composite meal summed once');
assert.equal(stored.meals[0].ingredients.length,2);
assert.equal(stored.targets.kcal,2300,'old targets remain untouched');
const nativeHydration={getDayMl:date=>date===past?700:-1};
vm.runInNewContext(read('v0890-diet-visual.js'),{window,document,localStorage},{timeout:2000});
const visual=window.TrenerDietVisual0890;
assert.equal(visual.waterForDay({todayMl:1800,targetMl:2500},past,'2026-09-22',nativeHydration),700);
assert.equal(visual.waterForDay({todayMl:1800,targetMl:2500},'2026-09-22','2026-09-22',nativeHydration),1800);
assert.equal(visual.waterForDay({todayMl:1800,history:[]},'2026-08-20','2026-09-22',nativeHydration),null);
assert.equal(visual.waterForDay({todayMl:1800,history:[{date:past,ml:550}]},past,'2026-09-22',null),550);
assert(visual.renderRing('Woda',null,2.5,'var(--d-water)').includes('—'));
const css=read('v0890-diet-visual.css');
assert(css.includes('#v0890Overlay .v0890SheetCard.v0890PaneHidden{display:none!important}'),
 'inactive editor panes must remain hidden beneath the card display override');
const photos=[{id:'p1',date:'2026-09-21',data:'data:image/jpeg;base64,'+'A'.repeat(50000)}];
memory.set('trainer3.photos',JSON.stringify(photos));
memory.set('trainer3.history',JSON.stringify([{id:'old-workout'}]));
window.Android={getAppVersion:()=> '0.8.9.3'};
let restoredNative=null;
window.TrenerHydration={
 exportHydrationBackup:()=>JSON.stringify({'water_2026-08-01':2200,'water_2026-09-21':700,target_ml:2500}),
 importHydrationBackup:raw=>{restoredNative=JSON.parse(raw);return true;}
};
let reloads=0;
vm.runInNewContext(read('backup-addon.js'),{window,document,localStorage,Date,setTimeout:()=>{reloads++;}},{timeout:3000});
const backup=window.TrenerBackup.buildBackup();
assert.equal(backup.version,6);
assert.equal(backup.includesPhotos,true);
assert.equal(backup.nativeHydration['water_2026-08-01'],2200,'all dates, not just last 7, must be exported');
assert.equal(backup.storage['trainer3.photos'],JSON.stringify(photos));
assert.equal(backup.storage['trainer3.diet.v076'],memory.get('trainer3.diet.v076'));
memory.delete('trainer3.photos');
window.TrenerBackup.nativeImport(JSON.stringify(backup));
assert.equal(memory.get('trainer3.photos'),JSON.stringify(photos),'import must restore photos');
assert.equal(restoredNative['water_2026-08-01'],2200,'import restores native hydration history');
assert.deepEqual(JSON.parse(memory.get('trainer3.history')),[{id:'old-workout'}]);
assert.equal(reloads,1);
const update=read('update-addon.js');
assert(!update.includes("||key==='trainer3.photos'"),'automatic pre-update fallback must include photos');
assert(update.includes('includesPhotos:true'));
const pre=fs.readFileSync('app/src/main/java/pl/edwin/trener2/PreUpdateBackupStore.java','utf8');
assert(pre.includes('32 * 1024 * 1024'),'pre-update backup should accept photo-inclusive files');
const store=fs.readFileSync('app/src/main/java/pl/edwin/trener2/HydrationStore.java','utf8');
assert(store.includes('prefs(context).getAll()'),'all native hydration dates must enter backup');
assert(store.includes('editor.commit()'),'hydration restore commits preferences');
const hydrationBridge=fs.readFileSync('app/src/main/java/pl/edwin/trener2/MainActivityV077.java','utf8');
assert(hydrationBridge.includes('exportHydrationBackup()'));
assert(hydrationBridge.includes('importHydrationBackup(String json)'));

const nativeSession=fs.readFileSync('app/src/main/java/pl/edwin/trener2/LocalSessionManager.java','utf8');
assert(nativeSession.includes('out.writeUTF("HELLO:" + normalized + ":" + appVersion)'));
assert(nativeSession.includes('matchesHandshake(hello, expectedCode, appVersion)'));
assert(nativeSession.includes('emitStatus("error", "Niezgodna wersja Trenera 2.'));
const grade=fs.readFileSync('app/build.gradle','utf8');
assert(grade.includes("versionName '0.8.9.3'"));
console.log('0.8.9.3 stability: version guard, historical dates and water, full photo backup/restore, pane visibility OK');
