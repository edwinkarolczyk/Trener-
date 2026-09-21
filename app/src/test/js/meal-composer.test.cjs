const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const builder=fs.readFileSync('app/src/main/assets/v0885-meal-composer.js','utf8');
const script=fs.readFileSync('app/src/main/assets/v076-diet.js','utf8');
const document={readyState:'loading',addEventListener(){}};
const window={};
vm.runInNewContext(builder,{window,document},{filename:'meal-composer.js',timeout:2000});
const api=window.TrenerMealComposer0885;
assert(api,'meal composer API missing');
const per100={kcal:250,protein:20,carbs:10,fat:5};
const eq=(actual,expected)=>assert.equal(JSON.stringify(actual),JSON.stringify(expected));
eq(api.calculate(per100,100),per100);
eq(api.calculate(per100,150),{kcal:375,protein:30,carbs:15,fat:7.5});
eq(api.calculate(per100,75),{kcal:187.5,protein:15,carbs:7.5,fat:3.8});
eq(api.calculate(per100,0),{kcal:0,protein:0,carbs:0,fat:0});
eq(api.calculate({...per100,protein:null},150),
  {kcal:375,protein:null,carbs:15,fat:7.5});
const bread={kcal:200,protein:8,carbs:40,fat:2};
const ham={kcal:80,protein:16,carbs:1,fat:2};
const cheese={kcal:120,protein:10,carbs:1,fat:10};
const total=api.sumItems([bread,ham,cheese]);
eq(total,{kcal:400,protein:34,carbs:42,fat:14});
// Compound meals are stored once, not as separate daily meal entries.
const day='2026-09-21';
let stored={targets:{mode:'maintain',kcal:2000,protein:100,carbs:200,fat:60},
  meals:[{id:'combo',date:day,name:'Kanapki',type:'breakfast',
    ...total,ingredients:[bread,ham,cheese]}],shopping:[]};
const nodes={};
const node=id=>nodes[id]||(nodes[id]={value:'',innerHTML:'',textContent:'',
  disabled:false,classList:{toggle(){},add(){},remove(){} }});
const dom={readyState:'loading',addEventListener(){},getElementById:node};
const localStorage={getItem:k=>k==='trainer3.diet.v076'?JSON.stringify(stored):null};
const dietWindow={};
vm.runInNewContext(script,{window:dietWindow,document:dom,localStorage},
  {filename:'diet.js',timeout:2000});
assert(dietWindow.TrenerDiet076,'diet API missing');
dietWindow.TrenerDiet076.setDate(day);
assert(nodes.v076Meals.innerHTML.includes('Składniki (3)'));
assert.equal((nodes.v076Meals.innerHTML.match(/v0885MealStat/g)||[]).length,4);
assert(nodes.v076Meals.innerHTML.includes('400 kcal / 2 000 kcal (20%)'));
assert(nodes.v076Meals.innerHTML.includes('34 g / 100 g (34%)'));
assert(nodes.v076Summary.innerHTML.includes('400 kcal'));
assert(!nodes.v076Summary.innerHTML.includes('800 kcal'),'do not count ingredients twice');
stored.targets.kcal=0;
dietWindow.TrenerDiet076.setDate(day);
assert(nodes.v076Meals.innerHTML.includes('cel —'));
assert(!nodes.v076Meals.innerHTML.includes('Infinity'));
console.log('Meal composer: scaling, missing values, totals, 4 goal bars, edit-safe rendering OK');
