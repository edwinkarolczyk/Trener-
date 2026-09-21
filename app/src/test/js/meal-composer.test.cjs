const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const builder=fs.readFileSync('app/src/main/assets/v0885-meal-composer.js','utf8');
const script=fs.readFileSync('app/src/main/assets/v076-diet.js','utf8');
const editNodes={};
const editNode=id=>editNodes[id]||(editNodes[id]={value:'',textContent:''});
const document={readyState:'loading',addEventListener(){},getElementById:editNode};
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
api.restoreSelection({grams:150,source100:per100,source:'Open Food Facts'});
assert.equal(editNode('v0885Grams').value,150);
Object.assign(editNode('v076Kcal'),{value:375});
Object.assign(editNode('v076Protein'),{value:30});
Object.assign(editNode('v076Carbs'),{value:15});
Object.assign(editNode('v076Fat'),{value:7.5});
eq(api.captureSelection().base100,per100);
api.restoreSelection({portion:'2 szt (160 g)',kcal:320,protein:16,carbs:32,fat:8});
assert.equal(editNode('v0885Grams').value,160);
editNode('v076Kcal').value=320;editNode('v076Protein').value=16;
editNode('v076Carbs').value=32;editNode('v076Fat').value=8;
eq(api.captureSelection().base100,{kcal:200,protein:10,carbs:20,fat:5});
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
assert.equal((nodes.v076Meals.innerHTML.match(/class="v0885MealStat"/g)||[]).length,4);
assert(nodes.v076Meals.innerHTML.includes('(20%)'),'400 of 2000 kcal must mean 20%');
assert(nodes.v076Meals.innerHTML.includes('34 g / 100 g (34%)'));
assert(nodes.v076Summary.innerHTML.includes('400 kcal'));
assert(!nodes.v076Summary.innerHTML.includes('800 kcal'),'do not count ingredients twice');
stored.targets.kcal=0;
dietWindow.TrenerDiet076.setDate(day);
assert(nodes.v076Meals.innerHTML.includes('cel —'));
assert(!nodes.v076Meals.innerHTML.includes('Infinity'));

const setsScript=fs.readFileSync('app/src/main/assets/v0886-meal-sets.js','utf8');
const setStorage=new Map();
const savedMeals={version:1,targets:{},meals:[]};
let setRefreshes=0,setWidgetSyncs=0;
setStorage.set('trainer3.diet.v076',JSON.stringify(savedMeals));
const setWindow={TrenerDiet076:{render(){setRefreshes++;}},
  TrenerWidget077:{sync(){setWidgetSyncs++;}}};
const setLocalStorage={getItem:key=>setStorage.get(key)||null,
  setItem:(key,value)=>setStorage.set(key,value)};
vm.runInNewContext(setsScript,{window:setWindow,document,
  localStorage:setLocalStorage,Date,Math},{filename:'meal-sets.js',timeout:2000});
const setApi=setWindow.TrenerMealSets0886;
assert(setApi,'saved meal sets API missing');
const saved={id:'set1',name:'Kanapki',type:'breakfast',
  ingredients:[{...bread,grams:100,base100:per100},{...ham,grams:50},{...cheese,grams:30}]};
setStorage.set('trainer3.mealSets.v0886',JSON.stringify([saved]));
eq(setApi.sum(saved.ingredients),total);
setApi.add(0);
const logged=JSON.parse(setStorage.get('trainer3.diet.v076')).meals;
assert.equal(logged.length,1,'set must be logged once, not one meal per ingredient');
assert.equal(logged[0].ingredients.length,3);
assert.equal(logged[0].kcal,400);
assert.equal(logged[0].name,'Kanapki');
assert.equal(setRefreshes,1);
assert.equal(setWidgetSyncs,1);
setApi.add(0);
assert.equal(JSON.parse(setStorage.get('trainer3.diet.v076')).meals.length,2,
  'logging same preset twice creates two separate meal entries');
const entryScript=fs.readFileSync('app/src/main/assets/v0886-food-entry.js','utf8');
assert(entryScript.includes("Android.scanFoodBarcode()"));
assert(entryScript.includes("focus('v083Query')"));
assert(entryScript.includes("focus('v0885Templates')"));
assert(builder.includes("pane.addEventListener('input'"),'ingredient grams must recalculate on input');
assert(builder.includes('captureManualBaseline'),'manual food grams need a stable per-100g baseline');

console.log('Meal composer: scaling, missing values, totals, 4 goal bars, edit-safe rendering OK');
