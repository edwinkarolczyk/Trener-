const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('app/src/main/assets/v0823-diagnostics.js','utf8');
const native=fs.readFileSync('app/src/main/java/pl/edwin/trener2/MainActivity.java','utf8');
assert(native.includes('onConsoleMessage(ConsoleMessage message)'));
assert(native.includes('TrenerDiagnostics.nativeConsole('));
assert(native.includes('JSONObject.quote(detail)'));
let time=0,hidden=false,storage=new Map(),interval=null;
const docEvents=new Map(),winEvents=new Map();
const document={
  readyState:'loading',
  get hidden(){return hidden;},
  activeElement:{tagName:'BODY'},
  getElementById(){return null;},
  createElement(){return {id:'',textContent:''};},
  head:{appendChild(){}},
  addEventListener(type,handler){docEvents.set(type,handler);}
};
const win={
  innerHeight:900,scrollY:0,TrenerWifi:null,
  Android:{getAppVersion(){return '0.8.8.7';}},
  addEventListener(type,handler){winEvents.set(type,handler);}
};
const localStorage={
 getItem(key){return storage.get(key)||null;},
 setItem(key,value){storage.set(key,value);},
 removeItem(key){storage.delete(key);}
};
vm.runInNewContext(script,{
 window:win,Android:win.Android,document,localStorage,performance:{now:()=>time},
 Date,console,setInterval(fn){interval=fn;return 1;},
 setTimeout(){return 1;},clearTimeout(){},confirm(){return true;}
},{filename:'diagnostics.js',timeout:2000});
docEvents.get('DOMContentLoaded')();
assert(interval,'diagnostic timer installed');
function events(){return JSON.parse(storage.get('trainer3.logs.v0823')||'[]');}
time=1000;interval();
assert(!events().some(x=>x.type==='UI_STALL'));
hidden=true;docEvents.get('visibilitychange')();
time=180000;
hidden=false;docEvents.get('visibilitychange')();
time+=1000;interval();
assert(!events().some(x=>x.type==='UI_STALL'),
 'background time must not be counted as a foreground freeze');
time+=2200;interval();
assert.equal(events().filter(x=>x.type==='UI_STALL').length,1,
 'real foreground delay remains visible');
time+=200000;interval();
assert.equal(events().filter(x=>x.type==='TIMER_GAP').length,1,
 'ambiguous very long scheduling gaps must not be mislabeled UI_STALL');
win.TrenerDiagnostics.nativeConsole('Uncaught TypeError: x is not a function',
 'file:///android_asset/v0886-meal-sets.js',123);
win.TrenerDiagnostics.nativeConsole('Uncaught TypeError: x is not a function',
 'file:///android_asset/v0886-meal-sets.js',123);
assert.equal(events().filter(x=>x.type==='JS_CONSOLE_ERROR').length,1,
 'native duplicate console error events should be rate limited');
assert(win.TrenerDiagnostics.exportText().includes('ver=0.8.8.7'));
assert(win.TrenerDiagnostics.exportText().includes('v0886-meal-sets.js'));
console.log('Diagnostics: background gaps, foreground stalls, native console sources and versions OK');
