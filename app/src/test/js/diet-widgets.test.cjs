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
assert(!/<Space/.test(dietXml),'AppWidget RemoteViews must not inflate Space; Xiaomi launcher can reject the widget');
const tags=[...dietXml.matchAll(/<([A-Z][A-Za-z]*)/g)].map(m=>m[1]);
assert(tags.every(t=>['LinearLayout','TextView','ProgressBar'].includes(t)),
  'AppWidget must only inflate supported RemoteViews classes: '+tags.join(', '));
assert.equal((dietXml.match(/android:importantForAccessibility="no"/g)||[]).length,4);

assert.equal((dietXml.match(/android:layout_height="wrap_content"\s+android:orientation="horizontal"/g)||[]).length,2,
  'macro rows must wrap content rather than stretch to widget height');
assert.equal((dietXml.match(/android:layout_height="wrap_content"\s+android:layout_marginLeft/g)||[]).length,4,
  'all four macro cards must wrap content instead of growing vertically');
assert.equal((dietXml.match(/android:layout_height="10dp"\s+android:text=""/g)||[]).length,4,
  'all four progress bars must have fixed, compact spacing');
assert(!/android:layout_height="0dp"\s+android:layout_weight="1"/.test(dietXml),
  'vertical layout weights stretch macros into oversized empty tiles');


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

for(const [file,minHeight,minResizeHeight] of [
  ['diet_widget_info.xml',320,300],
  ['workout_widget_info.xml',250,230],
  ['water_widget_info.xml',150,140]
]){
  const xml=fs.readFileSync('app/src/main/res/xml/'+file,'utf8');
  assert(xml.includes('android:minHeight="'+minHeight+'dp"'),file+' content needs enough height');
  assert(xml.includes('android:minResizeHeight="'+minResizeHeight+'dp"'),file+' may not be shrunk below content height');
}
for(const name of ['DietWidgetProvider','WaterWidgetProvider','WorkoutWidgetProvider']){
 const java=fs.readFileSync('app/src/main/java/pl/edwin/trener2/'+name+'.java','utf8');
 assert(java.includes('void onAppWidgetOptionsChanged('),name+' must redraw after resize');
 assert(java.includes('updateAll(context);'),name+' must refresh data');
}
const boot=fs.readFileSync('app/src/main/java/pl/edwin/trener2/BootReceiver.java','utf8');
for(const name of ['DietWidgetProvider','WaterWidgetProvider','WorkoutWidgetProvider'])
 assert(boot.includes(name+'.updateAll(context);'),name+' must redraw after reboot');

const appSource=fs.readFileSync('app/src/main/assets/app.js','utf8');
const tabStart=appSource.indexOf("const LAST_TAB_KEY=");
const tabEnd=appSource.indexOf('function loadSettings()',tabStart);
assert(tabStart>0&&tabEnd>tabStart,'last-tab implementation missing');
const memory=new Map(),screens={};
const tabs=['start','plan','history','progress','diet','settings'];
for(const id of tabs)screens[id]={classList:{add(){},remove(){}}};
const tabButtons=tabs.map(id=>({dataset:{tab:id},classList:{toggle(){}}}));
const tabWindow={};
vm.runInNewContext(appSource.slice(tabStart,tabEnd)+'\\nwindow.tabApi={showTab,rememberedTab};',{
 window:tabWindow,localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},
 document:{querySelectorAll:selector=>selector==='.screen'?Object.values(screens):tabButtons},
 $:id=>screens[id],renderHistory(){},renderProgress(){},refreshWifiInfo(){}
},{filename:'last-tab.js',timeout:2000});
assert.equal(tabWindow.tabApi.rememberedTab(),'start');
tabWindow.tabApi.showTab('diet');
assert.equal(tabWindow.tabApi.rememberedTab(),'diet');
tabWindow.tabApi.showTab('does-not-exist');
assert.equal(tabWindow.tabApi.rememberedTab(),'diet','invalid tabs must not overwrite saved tab');
tabWindow.tabApi.showTab('start');
assert.equal(tabWindow.tabApi.rememberedTab(),'start','explicit widget navigation must persist');
const activity=fs.readFileSync('app/src/main/java/pl/edwin/trener2/MainActivityV077.java','utf8');
assert(activity.includes('betaWebView.getProgress() < 100'),'widget intents must wait for loaded app');
assert(activity.includes('pending.removeExtra("open_diet")'),'widget deep link must be consumed once');

console.log('Diet macro & water widget sync and native resources checks passed');
