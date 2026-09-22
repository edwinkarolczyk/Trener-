const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const css=fs.readFileSync('app/src/main/assets/v0895-ergonomics.css','utf8');
const source=fs.readFileSync('app/src/main/assets/v0895-ergonomics.js','utf8');
const loader=fs.readFileSync('app/src/main/assets/feature-loader.js','utf8');
const gradle=fs.readFileSync('app/build.gradle','utf8');
assert(loader.includes("['0.8.9.5','v0895-ergonomics.js']"),'ergonomic layer must be gated to 0.8.9.5');
assert(gradle.includes("versionName '0.8.9.5'"));
assert(gradle.includes('versionCode 89'));
assert(css.includes('body.v062Active #training .inputs input:focus'),'workout inputs need visible focus');
assert(css.includes('body.v062Active:has(#training .inputs:focus-within) #v072FixedTimers'),
  'timer dock must not cover keyboard entry fields');
assert(css.includes('display:none!important;'),'dock must actually hide while editing series');
assert(css.includes('body.v062Active #training .v062Stat'),'summary should be legible');
assert(css.includes('#diet .v0890Ready .v0890MealMetric output'),'keep four visible macro metrics');
assert(css.includes('#v0890Sheet input'),'bottom sheet should be usable with keyboard');
assert(!source.includes('localStorage'),'layout layer must not touch user data');
assert(!source.includes('setInterval'),'layout layer must not add high-frequency rendering loops');
assert(!source.includes('scrollIntoView'),'layout layer must not steal scroll position');
assert(!css.includes('position:fixed'),'must not reintroduce a fixed workout screen');
const manifest=fs.readFileSync('app/src/main/AndroidManifest.xml','utf8');
for(const activity of ['.MainActivityV077','.MainActivity']){
 assert(manifest.includes('android:name="'+activity+'"\\n            android:windowSoftInputMode="adjustResize"'.replace('\\n','\n')),
  'keyboard must resize activity '+activity);
}
let onReady=()=>{},link=null,count=0;
const document={
 readyState:'loading',
 addEventListener(name,fn){assert.equal(name,'DOMContentLoaded');onReady=fn;},
 getElementById(id){return id==='v0895ErgoCss'?link:null;},
 createElement(tag){assert.equal(tag,'link');return {};},
 head:{appendChild(node){count++;link=node;}}
};
vm.runInNewContext(source,{document},{timeout:1000});
assert.equal(count,0,'do not inject while DOM is loading');
onReady();onReady();
assert.equal(count,1,'insert style only once');
assert.equal(link.href,'v0895-ergonomics.css');
assert.equal(link.rel,'stylesheet');
console.log('Ergonomics 0.8.9.5: late single stylesheet, input focus, dock clearance, legible Diet and zero state changes OK');
