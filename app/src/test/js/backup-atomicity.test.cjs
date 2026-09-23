const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app/src/main/assets/backup-addon.js','utf8');
const seed={
 'trainer3.diet.v076':'{"meals":[{"id":"original"}]}',
 'trainer3.history':'[{"id":"original-training"}]',
 'trainer3.settings':'{"theme":"dark"}',
 'trainer2.recipes.v1':'{"schemaVersion":1,"profile":{"meals":3}}'
};
const values=new Map(Object.entries(seed)),messages=[];
let failOn='',reloads=0;
const localStorage={
 getItem(k){return values.has(k)?values.get(k):null;},
 setItem(k,v){if(k===failOn){failOn='';throw Error('QuotaExceededError');}values.set(k,String(v));},
 removeItem(k){values.delete(k);},
 get length(){return values.size;},
 key(i){return [...values.keys()][i]??null;}
};
const window={toast:s=>messages.push(s),location:{reload(){reloads++;}}};
const document={readyState:'loading',addEventListener(){},getElementById(){return true}};
vm.runInNewContext(source,{window,document,localStorage,setTimeout:fn=>fn()},{timeout:3000});
const backup={format:'trener2-backup',version:5,schemaVersion:1,storage:{
 'trainer3.diet.v076':'{"meals":[{"id":"imported"}]}',
 'trainer3.history':'[{"id":"imported-training"}]',
 'trainer3.settings':'{"theme":"light"}',
 'trainer3.photos':'discarded',
 'trainer2.recipes.v1':'{"schemaVersion":1,"profile":{"meals":4}}'
}};
const snapshot=JSON.stringify([...values]);
failOn='trainer3.history';
window.TrenerBackup.nativeImport(JSON.stringify(backup));
assert.equal(JSON.stringify([...values]),snapshot,'failed import must roll back ALL overwritten keys');
assert.equal(reloads,0,'a failed import must not restart the app');
assert(messages.some(s=>s.includes('Przywrócono poprzednie dane')),'show truthful recovery feedback');
window.TrenerBackup.nativeImport(JSON.stringify(backup));
assert.equal(values.get('trainer3.diet.v076'),backup.storage['trainer3.diet.v076']);
assert.equal(values.get('trainer3.history'),backup.storage['trainer3.history']);
assert.equal(values.get('trainer3.settings'),backup.storage['trainer3.settings']);
assert.equal(values.get('trainer2.recipes.v1'),backup.storage['trainer2.recipes.v1']);
assert.equal(values.get('trainer3.photos'),'discarded','old photos must be restored');
assert.equal(reloads,1,'successful import should restart exactly once');
const current=JSON.stringify([...values]);const successes=reloads;
window.TrenerBackup.nativeImport(JSON.stringify({format:'trener2-backup',storage:{'trainer3.history':{bad:true}}}));
assert.equal(JSON.stringify([...values]),current,'invalid content must be rejected BEFORE writes');
assert.equal(reloads,successes,'invalid import must not reload');
window.TrenerBackup.nativeImport(JSON.stringify({format:'trener2-backup',storage:{}}));
assert.equal(JSON.stringify([...values]),current,'empty import must leave data intact');
console.log('Backup 0.8.9.4: failed import rolled back, valid import succeeds, malformed and empty imports rejected OK');
