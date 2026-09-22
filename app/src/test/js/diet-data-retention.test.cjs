const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const diet=fs.readFileSync('app/src/main/assets/v076-diet.js','utf8');
const visual=fs.readFileSync('app/src/main/assets/v0890-diet-visual.js','utf8');
const composer=fs.readFileSync('app/src/main/assets/v0885-meal-composer.js','utf8');
const KEY='trainer3.diet.v076';
const meals=Array.from({length:1601},(_,i)=>({
 id:'meal-'+i,date:'2026-09-22',createdAt:i,
 name:'History '+i,kcal:100,protein:2,carbs:5,fat:1
}));
const shopping=Array.from({length:321},(_,i)=>({id:'shopping-'+i,name:'Item '+i,done:false}));
const original={version:1,targets:{mode:'gain',kcal:2600,protein:150,carbs:300,fat:80},meals,shopping};
let persisted=JSON.stringify(original),shouldFail=false;
const storage={
 getItem(key){return key===KEY?persisted:null;},
 setItem(key,value){
  assert.equal(key,KEY);
  if(shouldFail)throw Error('QuotaExceededError');
  persisted=value;
 }
};
const window={},document={readyState:'loading',addEventListener(){}};
const context={window,document,localStorage:storage,console};
const instrumentedDiet=diet.replace(
 'window.TrenerDiet076={','window.__dietSaveForTest=save;window.TrenerDiet076={');
assert.notEqual(instrumentedDiet,diet,'save test hook should be placed in memory only');
vm.runInNewContext(instrumentedDiet,context,{timeout:3000});
assert.equal(window.TrenerDiet076.load().meals.length,1601);
assert.equal(window.TrenerDiet076.load().shopping.length,321);
const next=window.TrenerDiet076.load();
next.meals.push({...next.meals[0],id:'meal-1601'});
next.shopping.push({id:'shopping-321',name:'New item',done:false});
assert.equal(window.__dietSaveForTest(next),true,'regular save should succeed');
assert.equal(JSON.parse(persisted).meals.length,1602,'no older meal may be truncated');
assert.equal(JSON.parse(persisted).shopping.length,322,'no older shopping item may be truncated');
assert.equal(JSON.parse(persisted).meals[0].id,'meal-0','the oldest meal survives');
assert.equal(JSON.parse(persisted).shopping[0].id,'shopping-0','the oldest item survives');
const beforeFailure=persisted;
shouldFail=true;
assert.equal(window.__dietSaveForTest(next),false,'quota failure must report failure');
assert.equal(persisted,beforeFailure,'failed save cannot overwrite prior data');
assert(!diet.includes('.slice(-1500)'), 'legacy diet must never silently cap meals');
assert(!diet.includes('.slice(-300)'), 'legacy diet must never silently cap shopping');
assert(!composer.includes('.slice(-1500)'), 'composer must never silently cap meals');
assert(!visual.includes('.slice(-1500)'), 'visual shortcuts must never silently cap meals');
assert(diet.includes('if(!save(d))return;clearMealEdit()'),
 'failed meal save must not clear user input or claim success');
assert(diet.includes('if(!save(d))return;render()'),
 'failed target save must not claim success');
console.log('Diet 0.8.9.4: 1602 meals, 322 shopping items, oldest records retained; quota failure preserves previous data OK');
