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
assert.equal(food.usdaQuery('jajka'),'egg');
assert.equal(food.usdaQuery('pierś z kurczaka'),'chicken breast');
assert.equal(food.usdaQuery('mintaj'),'pollock');
assert.equal(food.usdaQuery('Winogron owoc'),'grapes');
assert.equal(food.usdaQuery('winogrona surowe'),'grapes');
assert.equal(food.offQuery('Winogron owoc'),'winogrona');
assert.equal(food.offQuery('Jabłko owoc'),'jabłko');
assert.equal(food.usdaQuery('PIZZA'),'pizza');
assert.equal(food.displayPl('CHICKEN BREAST, RAW'),'Pierś z kurczaka, surowy');
assert.equal(food.displayPl('PIZZA, CHEESE'),'Pizza, ser');
assert.equal(food.parseUsda({fdcId:4,description:'CHICKEN BREAST, RAW',
  foodNutrients:[{nutrientId:1008,unitName:'KCAL',value:120}]}).originalName,'CHICKEN BREAST, RAW');
const layoutCode=fs.readFileSync('app/src/main/assets/v084-diet-cards.js','utf8');
const cardWindow={};
vm.runInNewContext(layoutCode,{window:cardWindow,document,localStorage},{timeout:2000,filename:'v084-diet-cards.js'});
const cards=cardWindow.TrenerDietCards084;
assert(cards,'diet card controls missing');
assert.equal(cards.orderedKeys(['summary','hydration','catalog'],['catalog','summary','hydration']).join(','),
 'catalog,summary,hydration');
assert.equal(cards.moveKeys(['summary','hydration','catalog'],'catalog',-1).join(','),
 'summary,catalog,hydration');
assert.equal(cards.moveKeys(['summary','hydration','catalog'],'summary',-1).join(','),
 'summary,hydration,catalog');
const layout85Code=fs.readFileSync('app/src/main/assets/v085-drag-layout.js','utf8');
const layout85Window={};
const trainingStub={classList:{contains(value){return value==='hidden';}}};
const layout85Document={readyState:'loading',addEventListener(){},
 getElementById(id){return id==='training'?trainingStub:null;}};
vm.runInNewContext(layout85Code,{window:layout85Window,document:layout85Document,
 localStorage},{timeout:2000,filename:'v085-drag-layout.js'});
const drag85=layout85Window.TrenerCardLayout085;
assert(drag85,'general drag layout missing');
assert.equal(drag85.HOLD_MS,1000);
assert.equal(drag85.order(['a','b','c'],['c','a','b']).join(','),'c,a,b');
assert.equal(drag85.order(['a','b','c'],['b']).join(','),'b,a,c');
assert.equal(drag85.trainingActive(),false);
trainingStub.classList.contains=()=>false;
assert.equal(drag85.trainingActive(),true);
console.log('Food and layout tests: 26 assertions passed');
