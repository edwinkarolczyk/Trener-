const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('app/src/main/assets/v083-food-catalog.js','utf8');
const window={};
const document={readyState:'loading',addEventListener(){}};
const localStorage={getItem(){return null;},setItem(){}};
vm.runInNewContext(script,{window,document,localStorage}, {timeout:2000,filename:'v083-food-catalog.js'});
const food=window.TrenerFoodCatalog;
assert(food,'food API missing');
const off=food.parseOff({code:'5901234567890',product_name:'Test',
 nutriments:{'energy-kcal_100g':100,proteins_100g:10,carbohydrates_100g:15,fat_100g:2}});
assert.equal(off.kcal100,100);
assert.equal(food.calculate(off,200,'g',null,null).protein100,20);
const usda=food.parseUsda({fdcId:123,description:'Egg',
 foodNutrients:[{nutrientId:1008,unitName:'KCAL',value:155},
  {nutrientId:1003,value:13},{nutrientId:1005,value:1.1},{nutrientId:1004,value:11}]});
assert.equal(usda.kcal100,155);
assert.equal(usda.fat100,11);
assert.equal(food.calculate(usda,3,'szt',50,null).grams,150);
assert.equal(food.calculate(off,250,'ml',null,1.03).grams,257.5);
assert.equal(food.calculate(usda,3,'szt',null,null),null);
const incomplete={kcal100:50,protein100:null,carbs100:0,fat100:0};
assert.equal(food.calculate(incomplete,100,'g',null,null).protein100,null);
assert.equal(food.parseOff({code:'0123456789012',product_name:'Without nutrients',nutriments:{}}).protein100,null);
console.log('Food catalog tests: 8 assertions passed');
