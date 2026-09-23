'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../../main/assets/v090-recipes.js'),'utf8');
const sandbox={};vm.runInNewContext(src,sandbox,{filename:'v090-recipes.js'});
const {RECIPES,nutrition,personalized,calculate,month,STORAGE_KEY}=sandbox.TrenerRecipes090;
const base={sex:'male',age:34,weight:70,height:170,work:'moderate',training:3,trend:'falling',goal:'recomp',meals:4};
test('recipe profile schema and old Diet storage remain unchanged',()=>{
  assert.equal(STORAGE_KEY,'trainer2.recipes.v1');
  assert.doesNotMatch(src,/localStorage\.setItem\(['"]trainer3\./);
  assert.ok(src.includes('schemaVersion:1,profile'),'maintain old recipe profile schema');
  for(const f of ['app/src/main/assets/v076-diet.js','app/src/main/assets/backup-addon.js','app/src/main/assets/update-addon.js'])
    assert.ok(fs.readFileSync(f,'utf8').includes("trainer3.") || fs.readFileSync(f,'utf8').includes("trainer2."));
});
test('bounded ingredient changes never yield impossible portions',()=>{
  const bounds={oil:20,egg:220,chicken:280,turkey:280,fish:280,cheese:500,nuts:35,pb:35,rice:165,pasta:165,buckwheat:165,potato:650,bread:210};
  for(const recipe of RECIPES){
    for(const scale of [.70,1,1.3,1.6]){
      const baseNutrition=nutrition(recipe,1);
      const targets={kcal:baseNutrition.kcal*scale,protein:baseNutrition.protein*scale,
        carbs:baseNutrition.carbs*scale,fat:baseNutrition.fat*scale};
      const food=personalized(recipe,targets);
      assert.ok(food.items.every(x=>x.grams>0),recipe.id);
      for(const ingredient of food.items){
        if(bounds[ingredient.key])assert.ok(ingredient.grams<=bounds[ingredient.key],recipe.id+': '+ingredient.key+' '+ingredient.grams);
      }
      for(const k of ['kcal','protein','carbs','fat'])assert.ok(Number.isFinite(food[k]),recipe.id+':'+k);
    }
  }
});
test('intelligent monthly plan retains full variety, 3/4 meal mode, and truthful nutrition totals',()=>{
  const variants=[
    base,
    {...base,meals:3},
    {...base,goal:'reduce',trend:'stable',work:'low',training:2},
    {...base,goal:'gain',trend:'stable',work:'high',training:5},
    {...base,sex:'female',weight:58,height:163,age:29,goal:'maintain',trend:'stable',work:'low',training:2},
  ];
  for(const p of variants){
    const target=calculate(p);
    const days=month(p,30),start=Date.now();
    assert.equal(days.length,30);
    const used=new Set(days.flatMap(x=>x.meals.map(y=>y.recipeId)));
    assert.ok(used.size>=(p.meals===3?42:50),'variety '+p.meals+' '+p.goal+' '+used.size);
    let maxDeviation=0,meanDeviation=0;
    for(const d of days){
      assert.equal(d.meals.length,p.meals);
      for(const k of ['kcal','protein','carbs','fat']){
        const expected=d.meals.reduce((n,x)=>n+x[k],0);
        assert.ok(Math.abs(expected-d.totals[k])<=(k==='kcal'?0:.21),k+' daily total');
      }
      for(const meal of d.meals){
        assert.ok(meal.items.length>0&&meal.items.every(i=>i.key&&i.grams>=1));
        assert.ok(meal.kcal>50&&meal.kcal<1500,'meal energy '+meal.name);
      }
      const deviation=Math.abs(d.totals.kcal-target.kcal)/target.kcal;
      meanDeviation+=deviation/30;maxDeviation=Math.max(maxDeviation,deviation);
    }
    assert.ok(meanDeviation<.20,'mean daily kcal deviation '+p.goal+': '+meanDeviation);
    console.log('Plan 0.9.3: '+p.goal+' / '+p.meals+' meals / '+target.kcal+' kcal; average deviation '+(100*meanDeviation).toFixed(1)+'%, max '+(100*maxDeviation).toFixed(1)+'%, recipes '+used.size);
  }
});
test('reject unsafe profile and unsupported plans rather than fabricate dates/targets',()=>{
  assert.throws(()=>month({...base,meals:2},30));
  assert.throws(()=>month({...base,meals:5},30));
  assert.throws(()=>month(base,0));
  assert.throws(()=>month(base,367));
  assert.throws(()=>personalized(RECIPES[0],{kcal:NaN,protein:1,carbs:1,fat:1}));
});
