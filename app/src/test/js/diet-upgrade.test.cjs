const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const diet=fs.readFileSync('app/src/main/assets/v076-diet.js','utf8');
const visual=fs.readFileSync('app/src/main/assets/v0890-diet-visual.js','utf8');
const android=fs.readFileSync('app/src/main/java/pl/edwin/trener2/MainActivity.java','utf8');
const gradle=fs.readFileSync('app/build.gradle','utf8');
assert(gradle.includes("applicationId 'pl.edwin.trener2'"),'an update must install over the same Android app');
assert(android.includes('settings.setDomStorageEnabled(true)'),'Android WebView must persist prior localStorage');
assert(diet.includes("const KEY='trainer3.diet.v076'"),'legacy Diet storage key must not change');
assert(visual.includes("localStorage.setItem('trainer3.diet.v076'"),
 'new Diet must save to the existing Diet storage key');
const day='2026-09-21';
const old={
 version:1,targets:{mode:'gain',kcal:2300,protein:140,carbs:276,fat:65},
 meals:[
  {id:'old-single',date:day,type:'breakfast',name:'Rogalik',portion:'60 g',
   kcal:272,protein:3.4,carbs:25.8,fat:16.8,createdAt:100},
  {id:'old-compound',date:day,type:'lunch',name:'Kanapki',
   kcal:480,protein:25,carbs:45,fat:20,createdAt:200,
   ingredients:[{id:'bread',name:'Chleb',grams:100,kcal:260,protein:8,carbs:49,fat:3},
    {id:'cheese',name:'Ser',grams:60,kcal:220,protein:17,carbs:0,fat:17}]}],
 shopping:[{id:'old-shop',name:'Jajka',done:false,createdAt:1}]
};
const before=JSON.stringify(old);
let writes=0;
const localStorage={getItem(key){return key==='trainer3.diet.v076'?before:null;},
 setItem(){writes++;throw Error('rendering a legacy Diet must not mutate stored user data');}};
const document={readyState:'loading',addEventListener(){}};
const window={};
vm.runInNewContext(diet,{window,document,localStorage},{timeout:2000});
vm.runInNewContext(visual,{window,document,localStorage},{timeout:2000});
const restored=window.TrenerDiet076.load();
assert.equal(JSON.stringify(restored),before,'all prior meal targets, shopping and ingredients must survive');
const totals=window.TrenerDietVisual0890.totals(restored,day);
assert.equal(JSON.stringify(totals),JSON.stringify({kcal:752,protein:28.4,carbs:70.8,fat:36.8}),
 'old single and composite meals each contribute once');
const solo=window.TrenerDietVisual0890.renderMeal(restored.meals[0],old.targets);
const compound=window.TrenerDietVisual0890.renderMeal(restored.meals[1],old.targets);
assert.equal((solo.match(/class="v0890MealMetric"/g)||[]).length,4);
assert.equal((compound.match(/class="v0890MealMetric"/g)||[]).length,4);
assert(compound.includes('Składniki (2)'));
assert(solo.includes('Rogalik'));
assert.equal(writes,0,'view upgrade must never overwrite old data just to draw');
console.log('Previous Diet v076: intact targets, meals, ingredients, shopping; four bars and no destructive migration OK');
