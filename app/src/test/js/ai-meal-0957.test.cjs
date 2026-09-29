const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync('app/src/main/assets/v0957-ai-meal.js','utf8');
const memory=new Map();
const original={version:1,targets:{kcal:2200,protein:140,carbs:250,fat:70},meals:[
 {id:'old',date:'2026-09-29',name:'Stary',type:'breakfast',kcal:300,protein:10,carbs:40,fat:10,createdAt:1}
],shopping:[{name:'Mleko'}]};
memory.set('trainer3.diet.v076',JSON.stringify(original));
const localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v))};
let renders=0,syncs=0;
const root={
 TrenerRecipes090:{FOODS:{
  chickenCooked:["Kurczak po obróbce",165,31,0,3.6],
  potato:["Ziemniaki",77,2,17,0.1],
  veg:["Warzywa mieszane",45,2.5,7,0.5],
  oil:["Olej rzepakowy",900,0,0,100]
 }},
 TrenerDiet076:{load:()=>JSON.parse(memory.get('trainer3.diet.v076')),render:()=>renders++,getDate:()=>'2026-09-29'},
 TrenerWidget077:{sync:()=>syncs++}
};
vm.runInNewContext(script,{globalThis:root,localStorage,Date,Math,JSON,console},{timeout:2000});
const api=root.TrenerAiMeal0957;assert(api);
assert.equal(api.resolveKey('kurczak grillowany'),'chickenCooked');
assert.equal(api.resolveKey('Ziemniaki'),'potato');
const raw={mealName:'Obiad',confidence:88,items:[
 {name:'kurczak grillowany',share:30,confidence:95},{name:'ziemniaki',share:45},
 {name:'surówka',share:20},{name:'olej',share:5}]};
const n=api.normalizeResult(raw);
assert.equal(n.items.length,4);
assert(Math.abs(n.items.reduce((s,x)=>s+x.share,0)-1)<1e-9);
const p=api.prepare(raw,600);
assert.deepEqual(Array.from(p.ingredients,x=>x.grams),[180,270,120,30]);
assert.equal(p.unresolved.length,0);assert.equal(p.totalWeightG,600);
assert(p.kcal>0&&p.protein>0&&p.carbs>0&&p.fat>0);
const changed=api.prepare(raw,600,[
 {foodKey:'chickenCooked',grams:220},{foodKey:'potato',grams:250},{foodKey:'veg',grams:100},{foodKey:'oil',grams:30}
]);
assert.equal(changed.ingredients[0].grams,220);
assert.equal(changed.ingredients.reduce((s,x)=>s+x.grams,0),600);
assert.throws(()=>api.saveApproved(p,'2026-09-29',false),/zatwierdź/);
const saved=api.saveApproved(p,'2026-09-29',true,'lunch');
const after=JSON.parse(memory.get('trainer3.diet.v076'));
assert.equal(after.meals.length,2);
assert.deepEqual(after.meals[0],original.meals[0]);
assert.deepEqual(after.targets,original.targets);
assert.deepEqual(after.shopping,original.shopping);
assert.equal(saved.type,'lunch');assert.equal(saved.ingredients.length,4);assert.equal(saved.totalWeightG,600);
assert.equal(renders,1);assert.equal(syncs,1);
const unknown=api.prepare({mealName:'Mix',items:[{name:'tajemniczy sos',share:1}]},100);
assert.equal(unknown.unresolved.length,1);
assert.throws(()=>api.saveApproved(unknown,'2026-09-29',true),/Dopasuj/);
console.log('AI meal 0.9.5.7: weight split, canonical foods, correction, approval-only save, legacy retention OK');
