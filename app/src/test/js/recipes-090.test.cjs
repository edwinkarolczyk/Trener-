'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../main/assets/v090-recipes.js'),'utf8');
const sandbox={};
vm.runInNewContext(source,sandbox,{filename:'v090-recipes.js'});
const {RECIPES,FOODS,nutrition,personalized,preparation,calculate,month,STORAGE_KEY}=sandbox.TrenerRecipes090;
const profile={sex:'male',age:34,weight:70,height:170,work:'moderate',training:3,trend:'falling',goal:'recomp',meals:4};
test('50 distinct recipes with valid ingredients and nutrition',()=>{
  assert.equal(RECIPES.length,50);
  assert.equal(new Set(RECIPES.map(x=>x.id)).size,50);
  const counts={breakfast:12,lunch:18,dinner:12,snack:8};
  for(const [type,n] of Object.entries(counts))assert.equal(RECIPES.filter(x=>x.type===type).length,n);
  for(const r of RECIPES){
    assert.ok(r.name && r.items.length>=2,r.id);
    for(const [key,g] of r.items){assert.ok(FOODS[key],r.id+':'+key);assert.ok(g>0,r.id);}
    const v=nutrition(r,1);
    const steps=preparation(v);
    assert.ok(steps.length>=2&&steps.every(x=>typeof x==='string'&&x.length>20),r.id+': preparation');
    assert.ok(v.items.every(x=>x.key&&x.grams>0),r.id+': item identity');
    for(const k of ['kcal','protein','carbs','fat'])assert.ok(Number.isFinite(v[k])&&v[k]>=0,r.id+':'+k);
  }
});
test('Mifflin estimate, activity and goals stay explicit and deterministic',()=>{
  const r=calculate(profile);
  assert.equal(r.bmr,1598);
  assert.equal(r.tdee,2460);
  assert.equal(r.kcal,2460);
  assert.equal(r.protein,154);
  assert.equal(r.fat,63);
  assert.ok(r.carbs>0);
  assert.equal(calculate({...profile,goal:'gain'}).kcal,r.tdee+200);
  assert.equal(calculate({...profile,goal:'reduce'}).kcal,r.tdee-350);
  assert.equal(calculate({...profile,trend:'stable'}).kcal,r.tdee-150);
  assert.throws(()=>calculate({...profile,age:17}));
  assert.throws(()=>calculate({...profile,weight:0}));
  assert.throws(()=>calculate({...profile,sex:''}));
  assert.throws(()=>calculate({...profile,training:8}));
});
test('30-day menu supports three and four meals without changing Diet data',()=>{
  for(const count of [3,4]){
    const days=month({...profile,meals:count},30);
    assert.equal(days.length,30);
    assert.ok(days.every(d=>d.meals.length===count));
    const seen=new Set(days.flatMap(d=>d.meals.map(m=>m.recipeId)));
    assert.ok(seen.size>=(count===4?50:42),'recipe variety '+count);
    for(const d of days){
      assert.equal(d.totals.kcal,d.meals.reduce((sum,m)=>sum+m.kcal,0));
      assert.ok(d.meals.every(m=>m.items.every(i=>i.grams>0&&i.key)));
      assert.ok(d.meals.every(m=>preparation(m).length>=2));
      assert.ok(d.totals.kcal>1500 && d.totals.kcal<3500,'daily calories '+d.day+': '+d.totals.kcal);
    }
  }
  assert.equal(STORAGE_KEY,'trainer2.recipes.v1');
  const previous=fs.readFileSync(path.join(__dirname,'../../main/assets/v076-diet.js'),'utf8');
  const backup=fs.readFileSync(path.join(__dirname,'../../main/assets/backup-addon.js'),'utf8');
  const update=fs.readFileSync(path.join(__dirname,'../../main/assets/update-addon.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../../main/assets/index.html'),'utf8');
  assert(previous.includes("trainer3.diet.v076"),'old diet namespace stays accessible');
  assert(backup.includes("key.startsWith('trainer2.')"),'recipe profile is included in full backup');
  assert(update.includes("key.startsWith('trainer2.')"),'recipe profile is included in pre-update backup');
  assert(html.includes('data-tab="diet"')&&html.includes('data-tab="recipes"'));
  assert(html.includes('id="recipes"')&&html.includes('id="diet"'));
  const gradle=fs.readFileSync(path.join(__dirname,'../../../build.gradle'),'utf8');
  assert(gradle.includes("versionName '0.9.5'"));
  assert(gradle.includes('versionCode 95'));

  assert.doesNotMatch(source,/localStorage\.setItem\(['"]trainer3\./);
});
test('ingredient proportions change independently to meet macro targets',()=>{
  const r=RECIPES.find(x=>x.id==='l1');
  const personalizedMeal=personalized(r,{kcal:850,protein:65,carbs:90,fat:25});
  assert.equal(personalizedMeal.items.length,r.items.length);
  assert.ok(personalizedMeal.items.some((x,i)=>x.grams!==r.items[i][1]));
  assert.ok(new Set(personalizedMeal.items.map((x,i)=>(x.grams/r.items[i][1]).toFixed(2))).size>1);
});
