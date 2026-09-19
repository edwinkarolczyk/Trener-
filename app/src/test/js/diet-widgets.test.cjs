const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app/src/main/assets/v077-widget-sync.js','utf8');
let calls=[],stored={targets:{mode:'gain',kcal:2300,protein:140,carbs:276,fat:65},meals:[]};
const bridge={syncDietWidget:s=>calls.push(JSON.parse(s))};
const sandbox={
  window:{TrenerWidget:bridge},
  TrenerWidget:bridge,
  localStorage:{getItem:k=>k==='trainer3.diet.v076'?JSON.stringify(stored):null},
  document:{addEventListener(){}},
  setInterval(){},setTimeout(){}
};
vm.runInNewContext(source,sandbox,{filename:'v077-widget-sync.js',timeout:2000});
const api=sandbox.window.TrenerWidget077;
assert(api&&typeof api.payloadFor==='function');
const today=api.dayKey();
stored.meals=[
  {date:today,kcal:1400,protein:44.8,carbs:120.3,fat:20.5},
  {date:today,kcal:379,protein:10.1,carbs:127.6,fat:38.7},
  {date:'2000-01-01',kcal:500,protein:200,carbs:300,fat:400}
];
const payload=api.payloadFor(stored,today);
assert.equal(payload.day,today);
assert.equal(payload.mode,'gain');
assert.equal(payload.kcal,1779);
assert.equal(payload.protein,54.9);
assert.equal(payload.carbs,247.9);
assert.equal(payload.fat,59.2);
assert.equal(payload.targetKcal,2300);
assert.equal(payload.targetProtein,140);
assert.equal(payload.targetCarbs,276);
assert.equal(payload.targetFat,65);
api.sync();api.sync();
assert.equal(calls.length,1,'unchanged macros should not create extra widget broadcasts');
assert.equal(calls[0].fat,59.2);
api.sync(true);
assert.equal(calls.length,2,'force refresh should write widget even without data change');
stored.meals.shift();
api.sync();
assert.equal(calls.length,3);
stored.targets.mode='reduce';
api.sync();
assert.equal(calls[3].mode,'reduce');
const dietXml=fs.readFileSync('app/src/main/res/layout/diet_widget.xml','utf8');
const waterXml=fs.readFileSync('app/src/main/res/layout/water_widget.xml','utf8');
for(const id of ['widgetKcal','widgetKcalDetail','widgetKcalProgress',
'widgetProtein','widgetProteinDetail','widgetProteinProgress',
'widgetCarbs','widgetCarbsDetail','widgetCarbsProgress',
'widgetFat','widgetFatDetail','widgetFatProgress','widgetDay','widgetMode']){
 assert(dietXml.includes('android:id="@+id/'+id+'"'),'missing macro widget view '+id);
}
for(const id of ['waterWidgetRoot','waterWidget100','waterWidget250','waterWidget500','waterWidgetValue','waterWidgetProgress']){
 assert(waterXml.includes('android:id="@+id/'+id+'"'),'missing water view '+id);
}
assert.equal((dietXml.match(/@drawable\/diet_macro_card/g)||[]).length,4);
assert(!/<Space\\b/.test(dietXml),'AppWidget RemoteViews must not inflate Space; Xiaomi launcher can reject the widget');
const tags=[...dietXml.matchAll(/<([A-Z][A-Za-z]*)\\b/g)].map(m=>m[1]);
assert(tags.every(t=>['LinearLayout','TextView','ProgressBar'].includes(t)),
  'AppWidget must only inflate supported RemoteViews classes: '+tags.join(', '));
assert.equal((dietXml.match(/android:importantForAccessibility="no"/g)||[]).length,4);

const provider=fs.readFileSync('app/src/main/java/pl/edwin/trener2/DietWidgetProvider.java','utf8');
assert(provider.includes('LocalDate.now()'),'widget must reset displayed intake on day change');
assert(provider.includes('targetCarbs'));
assert(provider.includes('targetFat'));
assert(provider.includes('current?p.getFloat("carbs",0):0'));
const native=fs.readFileSync('app/src/main/java/pl/edwin/trener2/WaterWidgetProvider.java','utf8');
assert(native.includes('HydrationReceiver.ACTION_ADD_500'));
assert(native.includes('R.id.waterWidget100'));
assert(native.includes('R.id.waterWidget250'));
assert(native.includes('R.id.waterWidget500'));
const receiver=fs.readFileSync('app/src/main/java/pl/edwin/trener2/HydrationReceiver.java','utf8');
assert(receiver.includes('ACTION_ADD_500'));
const store=fs.readFileSync('app/src/main/java/pl/edwin/trener2/HydrationStore.java','utf8');
assert.equal((store.match(/WaterWidgetProvider.updateAll\(context\)/g)||[]).length,2);
const manifest=fs.readFileSync('app/src/main/AndroidManifest.xml','utf8');
assert(manifest.includes('android:name=".WaterWidgetProvider"'));
assert(manifest.includes('android:resource="@xml/water_widget_info"'));
assert(manifest.includes('android.intent.action.DATE_CHANGED'));
console.log('Diet macro & water widget sync and native resources checks passed');
