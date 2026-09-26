const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync('app/src/main/assets/'+p,'utf8');
const seed={
 'trainer3.diet.v076':JSON.stringify({version:1,targets:{kcal:2300,protein:140,carbs:276,fat:65},meals:[{id:'old1',date:'2026-09-21',kcal:272,protein:3.4,carbs:25.8,fat:16.8}],shopping:[{name:'Mleko'}]}),
 'trainer3.history':JSON.stringify([{id:'old workout',records:[{kg:40,reps:8}]}]),
 'trainer3.photos':JSON.stringify([{id:'before',photo:'data:image/jpeg;base64,AAABBB'}]),
 'trainer2.recipes.v1':JSON.stringify({schemaVersion:1,profile:{age:34,weight:70,height:170,meals:3}}),
 'trainer3.settings':'{"theme":"dark"}'
};
const memory=new Map(Object.entries(seed)),localStorage={
 get length(){return memory.size;},key:i=>[...memory.keys()][i]??null,
 getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),
 removeItem:k=>memory.delete(k)
};
let restored=null,reloaded=0;
const water={'water_2026-08-01':1600,'water_2026-09-21':700,target_ml:2500};
const window={
 TrenerHydration:{exportHydrationBackup:()=>JSON.stringify(water),importHydrationBackup:s=>{restored=JSON.parse(s);return true;}},
 location:{reload(){reloaded++;}}
};
const document={readyState:'loading',addEventListener(){},getElementById(){return null;},
 createElement(){return {id:'',src:''};},body:{appendChild(){}}};
vm.runInNewContext(read('backup-addon.js'),{window,document,localStorage,setTimeout:fn=>fn()},{timeout:2000});
const backup=window.TrenerBackup.buildBackup();
assert.equal(backup.version,6);
assert.equal(backup.storage['trainer3.photos'],seed['trainer3.photos']);
assert.equal(backup.storage['trainer2.recipes.v1'],seed['trainer2.recipes.v1']);
assert.equal(backup.nativeHydration['water_2026-08-01'],1600);
for(const key of Object.keys(seed))memory.delete(key);
window.TrenerBackup.nativeImport(JSON.stringify(backup));
for(const [key,value] of Object.entries(seed))assert.equal(memory.get(key),value,'lost older user data '+key);
assert.equal(restored['water_2026-09-21'],700);
assert.equal(reloaded,1);
const previous=memory.get('trainer3.diet.v076'),history=memory.get('trainer3.history');
const sandbox={};
vm.runInNewContext(read('v090-recipes.js'),sandbox,{timeout:2000});
const api=sandbox.TrenerRecipes090;
assert.equal(api.RECIPES.length,50);
const profile={sex:'male',age:34,weight:70,height:170,work:'moderate',training:3,trend:'stable',goal:'recomp',meals:3};
assert.equal(api.month(profile,30).length,30);
assert.equal(memory.get('trainer3.diet.v076'),previous);
assert.equal(memory.get('trainer3.history'),history);
const java=fs.readFileSync('app/src/main/java/pl/edwin/trener2/LocalSessionManager.java','utf8');
assert(java.includes('matchesHandshake(hello, expectedCode, appVersion)'));
assert(java.includes('out.writeUTF("HELLO:" + normalized + ":" + appVersion)'));
const native=fs.readFileSync('app/src/main/java/pl/edwin/trener2/HydrationStore.java','utf8');
assert(native.includes('public static int getDayMl('));
assert(native.includes('public static String backupJson('));
const version=fs.readFileSync('app/build.gradle','utf8');
{
  const versionName=(version.match(/versionName\s+'([^']+)'/)||[])[1]||'0';
  const versionCode=Number((version.match(/versionCode\s+(\d+)/)||[])[1]||0);
  const parts=v=>String(v).split('.').map(Number);
  const ge=(a,b)=>{a=parts(a);b=parts(b);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;};
  assert(ge(versionName,'0.9.5.1')&&versionCode>=96);
}
console.log('0.9.1 upgrade: historical Diet/training/photos/recipe profile/native water, version guard and 30 days OK');
