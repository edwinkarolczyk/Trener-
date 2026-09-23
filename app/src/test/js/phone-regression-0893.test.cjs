const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=name=>fs.readFileSync('app/src/main/assets/'+name,'utf8');
let running=false,exIdx=0,scrolls=0,resize;
const document={
 readyState:'complete',
 head:{appendChild(el){if(el.id==='v0631-workout-scroll-style')this.sheet=el.textContent;}},
 createElement(){return {id:'',textContent:''};},
 getElementById(id){if(id==='v0631-workout-scroll-style')return null;if(id==='training')return {id};return null;},
 querySelector(s){if(s==='#training .inputs')return {scrollIntoView(){scrolls++;}};return null;}
};
let workoutTick;
const window={addEventListener(type,fn){if(type==='resize')resize=fn;}};
const sandbox={document,window,setInterval:fn=>{workoutTick=fn;},setTimeout:fn=>fn(),Date};
Object.defineProperty(sandbox,'running',{get:()=>running});
Object.defineProperty(sandbox,'exIdx',{get:()=>exIdx});
sandbox.currentPlan={ex:[{name:'Klatka'},{name:'Triceps'}]};
vm.runInNewContext(read('v0631-workout-scroll-ui.js'),sandbox,{timeout:2000});
assert(workoutTick,'workout scroll watchdog missing');
running=true;workoutTick();
assert.equal(scrolls,1,'entry to workout may center series input once');
for(let i=0;i<20;i++){resize();workoutTick();}
assert.equal(scrolls,1,'keyboard/viewport resize must not repeatedly recenter input');
exIdx=1;workoutTick();assert.equal(scrolls,2,'next exercise can center once');
assert(document.head.sheet.includes('overflow-y:auto!important'));
assert(document.head.sheet.includes('overflow:visible!important'));
const widgetMessages=[];
const bridge={syncWorkoutWidget:raw=>widgetMessages.push(JSON.parse(raw))};
const handlers={},scheduled=[];
const els={weight:{value:'40'},reps:{value:'10'},series:{textContent:'Seria 1/3'}};
const doc2={readyState:'complete',getElementById:id=>els[id]||null,addEventListener:(ev,cb)=>handlers[ev]=cb};
const win2={TrenerWidget:bridge,TrenerGroup:{},addEventListener:(ev,cb)=>handlers[ev]=cb};
let exercise=0;
const s2={window:win2,document:doc2,TrenerWidget:bridge,setInterval:fn=>{scheduled.push(fn);},
 setTimeout:fn=>fn(),Date,net:{active:false,localAthlete:0},paused:false,running:true,exIdx:exercise,
 currentPlan:{title:'Trening',ex:[{n:'Klatka',sets:3},{n:'Triceps',sets:3}]},setIdx:0,
 elapsedMs:()=>1000,restEnd:0,planKey:'mon'};
vm.runInNewContext(read('v080-workout-widget.js'),s2,{timeout:2000});
assert.equal(widgetMessages.length,1,'boot must publish initial workout state');
scheduled[0]();scheduled[0]();assert.equal(widgetMessages.length,1,'unchanged state does not flood widget');
s2.exIdx=1;scheduled[0]();assert.equal(widgetMessages.length,2,'next exercise is broadcast');
assert.equal(widgetMessages[1].exercise,'Triceps');
handlers.visibilitychange();assert.equal(widgetMessages.length,3,'return from background must force widget sync');
s2.running=false;scheduled[0]();assert.equal(widgetMessages.at(-1).active,false,'finished workout clears widget');
const stylesheet=read('v0890-diet-visual.css');
assert(stylesheet.includes('max-height:min(91dvh,950px)'),'meal keyboard sheet must have bounded viewport height');
assert(stylesheet.includes('overflow:auto'),'meal editor must be scrollable');
console.log('Phone regression simulation: keyboard resize keeps input scroll; widget start, exercise, resume and stop sync OK. Physical Android still requires manual check.');
