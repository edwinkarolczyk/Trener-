const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app/src/main/assets/v0890-diet-visual.js','utf8');
const css=fs.readFileSync('app/src/main/assets/v0890-diet-visual.css','utf8');
const window={};
const localStorage={getItem:()=>null,setItem(){}};
const document={readyState:'loading',addEventListener(){}};
vm.runInNewContext(source,{window,document,localStorage},{timeout:3000,filename:'v0890-diet-visual.js'});
const api=window.TrenerDietVisual0890;
assert(api,'approved diet view API should load without starting a second diet engine');
const day='2026-09-21';
const targets={kcal:2500,protein:150,carbs:300,fat:80};
const bread={name:'Chleb',kcal:260,protein:8,carbs:50,fat:2};
const ham={name:'Szynka',kcal:60,protein:12,carbs:0,fat:1};
const cheese={name:'Ser',kcal:140,protein:10,carbs:1,fat:11};
const compound={id:'combo',date:day,createdAt:1000,name:'Kanapki',type:'breakfast',
 kcal:460,protein:30,carbs:51,fat:14,ingredients:[bread,ham,cheese]};
const chocolate={id:'snack',date:day,createdAt:2000,name:'Princessa',type:'snack',
 kcal:211,protein:2,carbs:23,fat:13};
const other={id:'elsewhere',date:'2026-09-20',createdAt:500,name:'Wczoraj',
 kcal:900,protein:30,carbs:100,fat:40};
const totals=api.totals({meals:[compound,chocolate,other]},day);
assert.equal(totals.kcal,671,'compound ingredient calories must not be counted twice');
assert.equal(totals.protein,32);
assert.equal(totals.carbs,74);
assert.equal(totals.fat,27);
assert.equal(api.bar(700,2500).pct,28);
assert.equal(api.bar(40,150).pct,27);
assert.equal(api.bar(31,80).pct,39);
assert.equal(api.bar(101,100).over,true);
assert.equal(api.bar(20,0).known,false,'unset goal does not mean zero-intake');
assert.equal(api.bar(20,0).pct,0);
assert.equal(api.bar(700,2500).width,28);
assert.equal(api.bar(120,100).width,100,'visual bar must not overflow its track');
const markup=api.renderMeal(compound,targets);
assert.equal((markup.match(/class="v0890MealMetric"/g)||[]).length,4,
 'all four macro bars must be permanently visible');
assert(markup.includes('28%')===false,'meal percentage uses 460 kcal, not the mockup 700 kcal');
assert(markup.includes('18%'),'460 kcal of 2500 kcal is 18% rounded');
assert(markup.includes('20%'),'30 g of 150 g protein is 20%');
assert(markup.includes('Składniki (3)'));
assert(markup.includes('Ser'));
assert(markup.includes('data-drag="combo"'));
assert(markup.includes('data-visual="menu"'));
const photo=api.renderMeal({...compound,imageUrl:'https://images.openfoodfacts.org/images/products/123/front.200.jpg'},targets);
assert(photo.includes('class="v0890MealThumb"'),'verified OFF photos should be displayed');
assert(!api.renderMeal({...compound,imageUrl:'javascript:alert(1)'},targets).includes('class="v0890MealThumb"'),
 'unsafe product image must never be shown');
assert(!api.renderMeal({...compound,imageUrl:'https://evil.example.org/x.jpg'},targets).includes('class="v0890MealThumb"'));

const bad=api.renderMeal({...compound,name:'<img src=x onerror=alert(1)>'},targets);
assert(!bad.includes('<img '),'meal title must be HTML-escaped');
assert(bad.includes('&lt;img'));
const meals=[chocolate,compound];
assert.equal(api.orderMeals(meals,'time').map(x=>x.id).join(','),'combo,snack');
assert.equal(api.orderMeals(meals,'newest').map(x=>x.id).join(','),'snack,combo');
assert.equal(api.orderMeals(meals,'kcal').map(x=>x.id).join(','),'combo,snack');
assert.equal(api.orderMeals(meals,'manual',['snack','combo']).map(x=>x.id).join(','),'snack,combo');
assert.equal(api.signature({...compound,id:'different',createdAt:3000}),api.signature(compound),
 'favorites should ignore record ID and timestamp');
assert(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),'four metrics must fit phone width');
assert(css.includes('#v0890Overlay'),'bottom sheet must have real styles');
for(const color of ['#5bcb7a','#63a8f8','#e6be55','#ee915c','#58bedc','#d94b5b']){
 assert(css.toLowerCase().includes(color),'muted diet palette missing '+color);
}
for(const token of ['var(--d-green)','var(--d-blue)','var(--d-yellow)','var(--d-orange)','var(--d-water)']){
 assert(source.includes(token),'JS bars must use CSS palette token '+token);
}
assert(source.includes('v0890RemainingExceeded'),'over target requires a distinct muted warning');
assert(!css.includes('#v0890BottomNav'),'no separate navigation CSS in Diet');
assert(!css.includes('body.v0890DietActive'),'Diet must not hide app header or six tabs');
assert(!source.includes("nav.id='v0890BottomNav'"),'no Diet-specific bottom navigation');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
for(const tab of ['start','plan','history','progress','diet','recipes','settings'])
 assert(html.includes('data-tab="'+tab+'"'),'retain original tab '+tab);
assert(html.includes('class="appHeader"'),'retain original TRENER 2 header');

assert(!source.includes('🏋️<span>Trening')&&!source.includes('🍴<span>Dieta'),
 'avoid mixed saturated emoji colors in tab navigation');
for(const old of ['#56d487','#69b9ff','#ffd062','#ff925b','#61caeb']){
 assert(!source.toLowerCase().includes(old),'legacy saturated JS color '+old);
}
const loader=fs.readFileSync('app/src/main/assets/feature-loader.js','utf8');
assert(loader.includes("['0.8.9.0','v0890-diet-visual.js']"));
const build=fs.readFileSync('app/build.gradle','utf8');
{
  const versionName=(build.match(/versionName\s+'([^']+)'/)||[])[1]||'0';
  const versionCode=Number((build.match(/versionCode\s+(\d+)/)||[])[1]||0);
  const parts=v=>String(v).split('.').map(Number);
  const ge=(a,b)=>{a=parts(a);b=parts(b);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;};
  assert(ge(versionName,'0.9.5.1'));
  assert(versionCode>=96);
}
assert(css.includes('--d-panel:var(--panel)'),'diet card palette should follow app theme');
assert(css.includes('--d-red:var(--red)'),'diet accent should follow app theme');
assert(css.includes('background:var(--red)!important'),'add-meal button should use app red');
assert(css.includes('#v0890SheetTabs button[aria-selected="true"]'),'bottom sheet tab selection should follow app theme');
const activity=fs.readFileSync('app/src/main/java/pl/edwin/trener2/MainActivity.java','utf8');
assert(activity.includes('image_front_small_url,image_small_url'),'Android must actually request the food pictures');
console.log('Diet 0.8.9.5 with shared theme: 4 full bars, compound totals, colors, sorting, sanitization and version OK');
