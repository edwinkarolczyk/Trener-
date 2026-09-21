const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const planner=fs.readFileSync('app/src/main/assets/v070-beta-planner.js','utf8');
const timer=fs.readFileSync('app/src/main/assets/v072-beta-plan-timers.js','utf8');
const slice=(s,begin,end)=>{
  const a=s.indexOf(begin),b=s.indexOf(end,a+begin.length);
  assert(a>=0&&b>a,'Unable to isolate '+begin);return s.slice(a,b);
};
const config=new Map();
const localStorage={
 getItem:k=>config.has(k)?config.get(k):null,
 setItem:(k,v)=>config.set(k,v)
};
const first=[{value:'mon',textContent:'Trening A'},{value:'wed',textContent:'Trening B'}];
let removeCount=0,appendCount=0;
const sel={
 options:first.slice(),value:'mon',
 querySelectorAll(){return this.options.filter(x=>x.dataset?.v070Day);},
 appendChild(option){appendCount++;this.options.push(option);},
};
const makeOption=()=>({
 value:'',textContent:'',dataset:{},
 remove(){removeCount++;sel.options=sel.options.filter(o=>o!==this);if(sel.value===this.value)sel.value=sel.options[0]?.value||'';}
});
const document={activeElement:null,createElement:()=>makeOption()};
const plans={'1':{title:'Klatka + triceps'},'3':{title:'Plecy + biceps'}};
config.set('trainer3.settings',JSON.stringify({planKey:'mon'}));
const sandbox={
  $:id=>id==='planSelect'?sel:null,
  document,localStorage,
  state:{startOptionsInitialized:false},
  DAYS:[['1','Poniedziałek','Pon'],['3','Środa','Śr']],
  today:()=>String(new Date().getDay()),
  planForDay:k=>plans[k]||null
};
vm.runInNewContext(slice(planner,'  function refreshStartOptions(){','  function wrapPlans(){')+
  '\nthis.refreshStartOptions=refreshStartOptions;',sandbox);
sandbox.refreshStartOptions();
assert.equal(appendCount,2,'initial planner must append the two scheduled workouts');
assert.equal(sel.value,'mon','initial manual workout must survive first refresh');
const initialRemovals=removeCount,initialAppends=appendCount;
for(let i=0;i<100;i++)sandbox.refreshStartOptions();
assert.equal(removeCount,initialRemovals,
  'maintenance must not remove unchanged native select options every 1.5 seconds');
assert.equal(appendCount,initialAppends,
  'maintenance must not append unchanged native select options every 1.5 seconds');
sel.value='wed';config.set('trainer3.settings',JSON.stringify({planKey:'wed'}));
for(let i=0;i<100;i++)sandbox.refreshStartOptions();
assert.equal(sel.value,'wed','manual workout B selection must survive repeated planner ticks');
plans['3'].title='Zmieniony trening';
document.activeElement=sel;
sandbox.refreshStartOptions();
assert.equal(removeCount,initialRemovals,'do not close an active native picker when schedule changes');
document.activeElement=null;
sandbox.refreshStartOptions();
assert(sel.options.some(o=>o.textContent.includes('Zmieniony trening')),
  'actual schedule changes should refresh options after user closes picker');
assert.equal(sel.value,'wed','real option update must still preserve selected workout');

const day=String(new Date().getDay()),wanted='v070day:'+day;
const hint={innerHTML:''};
const selector={value:'wed',options:[{value:'mon'},{value:'wed'},{value:wanted}]};
const nowCfg={days:{[day]:{kind:'preset',presetKey:'mon'}}};
config.set('trainer3.weekPlan.v070',JSON.stringify(nowCfg));
config.set('trainer3.settings',JSON.stringify({planKey:'wed'}));
const ctx={
 window:{TrenerBetaPlanner:{planForDay:()=>({title:'Trening dziś'})}},
 document:{getElementById:id=>id==='planSelect'?selector:id==='v050TodayHint'?hint:null,activeElement:null},
 localStorage,NEW_KEY:'trainer3.weekPlan.v070',
 AUTO_CHOICE_KEY:'trainer3.todayAutoChoice.v0888',
 safe:(text,fallback)=>{try{return JSON.parse(text||'')||fallback;}catch(e){return fallback;}},
 isAssigned:d=>!!(d&&d.kind&&d.kind!=='off'),Date
};
vm.runInNewContext(slice(timer,'  function localToday(){','  function polishPlannerHeader(){')+
 '\nthis.syncTodayUi=syncTodayUi;',ctx);
for(let i=0;i<100;i++)ctx.syncTodayUi(true);
assert.equal(selector.value,'wed',
 '250 ms scheduled-day sync MUST NOT reset a manually selected workout');
assert.equal(JSON.parse(config.get('trainer3.settings')).planKey,'wed',
 '250 ms scheduled-day sync MUST NOT overwrite persisted workout');
assert.equal(hint.innerHTML,'<b>DZIŚ WG PLANU:</b> Trening dziś');
selector.value=wanted;
config.set('trainer3.settings',JSON.stringify({planKey:wanted}));
ctx.syncTodayUi(true);
selector.value='mon';
config.set('trainer3.settings',JSON.stringify({planKey:'mon'}));
for(let i=0;i<100;i++)ctx.syncTodayUi(true);
assert.equal(selector.value,'mon','user override of an earlier auto-choice must remain manual');
console.log('Training picker: stable options, manual choice persistence, active popup guard and no 250ms override OK');
