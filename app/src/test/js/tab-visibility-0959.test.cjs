const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync('app/src/main/assets/app.js','utf8');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const style=fs.readFileSync('app/src/main/assets/style.css','utf8');
const ids=['start','plan','history','progress','diet','recipes','settings'];
const modules=ids.filter(x=>x!=='settings');
function makeClassList(initial=[]){
 const set=new Set(initial);
 return {add(x){set.add(x);},remove(x){set.delete(x);},contains(x){return set.has(x);},
  toggle(x,force){if(force===undefined)force=!set.has(x);if(force)set.add(x);else set.delete(x);return force;}};
}
const store=new Map([['trainer3.lastTab.v0884','start'],['trainer3.diet.v076','{"meals":[{"name":"Bez utraty danych"}]}']]);
const storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};
function runtime(){
 const tabs=ids.map(id=>({dataset:{tab:id},classList:makeClassList(),setAttribute(k,v){this[k]=v;}}));
 const screens=ids.map(id=>({id,classList:makeClassList(id==='start'?['show']:[])}));
 const toggles=modules.map(id=>({dataset:{moduleTab:id},checked:false,disabled:false}));
 const nodes=Object.fromEntries(screens.map(x=>[x.id,x]));
 const document={
  getElementById:id=>nodes[id]||null,
  querySelectorAll:selector=>selector==='.tab'?tabs:selector==='.screen'?screens:
   selector==='[data-module-tab]'?toggles:[],
  querySelector:selector=>selector==='.screen.show'?screens.find(x=>x.classList.contains('show')):null
 };
 const toastEl={textContent:'',classList:makeClassList()};
 nodes.toast=toastEl;
 const window={};
 const expression=script.replace(/\\ninit\\(\\);\\s*$/,'')+
 '\\nrefreshWifiInfo=()=>{};renderHistory=()=>{};renderProgress=()=>{};'+
 '\\nwindow.testTabs={loadTabPreferences,rememberedTab,showTab,applyTabVisibility,setTabVisibility,firstTab,tabEnabled,'+
 'startSession:()=>{running=true;},endSession:()=>{running=false;}};';
 assert(!expression.endsWith('init();'),'unit tests must skip regular application initialization');
 vm.runInNewContext(expression,{window,document,localStorage:storage,Date,Math,setTimeout(){},clearTimeout(){},navigator:{}},{timeout:3000});
 return {api:window.testTabs,tabs,screens,toggles,nodes};
}
const a=runtime(),api=a.api;
assert(api,'tab controls missing');
assert.equal(api.rememberedTab(),'diet','existing installation must start in Dieta until user chooses otherwise');
assert.deepEqual(modules.filter(id=>api.loadTabPreferences()[id]),['diet']);
api.showTab(api.rememberedTab());
assert.equal(a.screens.find(x=>x.classList.contains('show')).id,'diet');
assert.deepEqual(a.tabs.filter(x=>!x.classList.contains('hidden')).map(x=>x.dataset.tab),['diet','settings']);
assert.equal(a.tabs.find(x=>x.dataset.tab==='settings')['aria-hidden'],'false');
assert.equal(a.toggles.find(x=>x.dataset.moduleTab==='diet').checked,true);
assert.equal(api.setTabVisibility('diet',false),false,'cannot disable last module');
assert.equal(api.loadTabPreferences().diet,true);
assert.equal(api.setTabVisibility('plan',true),true);
assert.equal(api.setTabVisibility('diet',false),true);
assert.equal(api.loadTabPreferences().plan,true);
assert.equal(api.loadTabPreferences().diet,false);
assert.equal(a.screens.find(x=>x.classList.contains('show')).id,'plan','disabled active screen must switch to remaining module');
assert.deepEqual(a.tabs.filter(x=>!x.classList.contains('hidden')).map(x=>x.dataset.tab),['plan','settings']);
api.showTab('start');
assert.equal(a.screens.find(x=>x.classList.contains('show')).id,'plan','disabled module cannot be entered via navigation');
api.showTab('settings');
assert.equal(a.screens.find(x=>x.classList.contains('show')).id,'settings','settings always accessible');
const b=runtime();
assert.equal(b.api.loadTabPreferences().plan,true,'selection survives app restart');
assert.equal(b.api.loadTabPreferences().diet,false);
assert.equal(b.api.rememberedTab(),'settings','saved settings screen remains navigable');
assert.equal(b.api.setTabVisibility('start',true),true);
b.api.startSession();
assert.equal(b.api.setTabVisibility('start',false),false,'cannot hide Start while workout active');
assert.equal(b.api.loadTabPreferences().start,true);
b.api.endSession();
assert.equal(b.api.setTabVisibility('start',false),true);
assert.equal(b.api.loadTabPreferences().plan,true);
assert.equal(b.api.setTabVisibility('not-a-module',true),false);
assert.equal(JSON.parse(store.get('trainer3.diet.v076')).meals[0].name,'Bez utraty danych');
assert(store.has('trainer3.enabledTabs.v0959'),'preferences must be covered by trainer3 backup namespace');
assert(html.includes('data-module-tab="diet" checked'));
assert(html.includes('<section id="diet" class="screen show">'));
assert(html.includes('data-tab="settings" aria-label="Ustawienia i włączanie zakładek"'));
assert(style.includes('.tabs{display:flex;flex-wrap:wrap;'), 'navigation adapts to few or many visible tabs');
const gradle=fs.readFileSync('app/build.gradle','utf8');
assert(gradle.includes("versionName '0.9.5.9'"));
console.log('Tab visibility 0.9.5.9: Dieta only by default, Settings always, persist, safety, saved data OK');
