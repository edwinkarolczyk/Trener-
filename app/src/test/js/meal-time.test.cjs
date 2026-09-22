const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('app/src/main/assets/v0889-meal-time.js','utf8');
const controls={};
for(const id of ['v076MealType','v0885Type']){
  const events={};
  controls[id]={value:'',dataset:{},addEventListener:(type,fn)=>{events[type]=fn;},
    trigger:type=>events[type]?.()};
}
const window={};
const document={readyState:'loading',addEventListener(){},
  getElementById:id=>controls[id]||null};
vm.runInNewContext(code,{window,document,Date},{filename:'v0889-meal-time.js',timeout:2000});
const api=window.TrenerMealTime0889;
assert(api,'meal timing module must export API');
for(const [hour,type] of [
  [0,'breakfast'],[6,'breakfast'],[9,'breakfast'],
  [10,'lunch'],[12,'lunch'],[14,'lunch'],
  [15,'afternoon'],[17,'afternoon'],
  [18,'dinner'],[22,'dinner'],[23,'dinner']
])assert.equal(api.typeForHour(hour),type,'wrong meal type for hour '+hour);
assert.equal(api.typeForRepeat('breakfast',new Date(2026,8,22,16)),'afternoon');
assert.equal(api.typeForRepeat('snack',new Date(2026,8,22,16)),'snack');
assert.equal(api.typeForRepeat('other',new Date(2026,8,22,16)),'other');
assert.equal(api.install(),true,'both meal type dropdowns must be initialized');
assert.equal(controls.v076MealType.value,api.currentType());
assert.equal(controls.v0885Type.value,api.currentType());
controls.v076MealType.value='snack';controls.v076MealType.trigger('change');
assert.equal(api.apply('v076MealType'),false,'manual choice must not be overwritten by time');
assert.equal(controls.v076MealType.value,'snack');
api.beginEdit('v0885Type','other');
assert.equal(api.apply('v0885Type'),false,'editing must preserve existing category');
assert.equal(controls.v0885Type.value,'other');
api.reset();
assert.equal(controls.v076MealType.value,api.currentType(),'after save, use a fresh time default');
assert.equal(controls.v0885Type.value,api.currentType(),'compound meal resets after save');
const diet=fs.readFileSync('app/src/main/assets/v076-diet.js','utf8');
const composer=fs.readFileSync('app/src/main/assets/v0885-meal-composer.js','utf8');
for(const file of [diet,composer])assert(file.includes('value="afternoon"'),
  'Podwieczorek option must exist in both forms');
assert(diet.includes("afternoon:'Podwieczorek'"),
  'history and daily meal rows should display proper category label');
assert(composer.includes("cancelEdit?.(false)"),
  'adding an ingredient must not silently reset a user-selected meal type');
for(const path of ['app/src/main/assets/v077-diet-quick.js','app/src/main/assets/v0886-meal-sets.js'])
  assert(fs.readFileSync(path,'utf8').includes('TrenerMealTime0889?.typeForRepeat'),
    'repeated foods and saved sets must use the current meal time');
const loader=fs.readFileSync('app/src/main/assets/feature-loader.js','utf8');
assert(loader.includes("['0.8.8.9','v0889-meal-time.js']"));
console.log('Meal time defaults, manual types, editing, repeats and Podwieczorek OK');
