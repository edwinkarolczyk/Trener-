(function(root){
  'use strict';
  // Offline recipe lab. Intentionally does not touch trainer3.* Diet or training state.
  const STORAGE_KEY='trainer2.recipes.v1';
  const FOODS={"oats":["Płatki owsiane",370,13,60,7],"milk":["Mleko 2%",50,3.4,4.8,2],"egg":["Jaja (masa bez skorupki)",143,12.6,0.7,9.5],"banana":["Banan (bez skórki)",89,1.1,22.8,0.3],"bread":["Chleb",245,8.5,47,2.8],"chicken":["Pierś kurczaka (surowa)",110,23,0,1.5],"chickenCooked":["Kurczak po obróbce",165,31,0,3.6],"twarog":["Twaróg półtłusty",130,19,3.5,5],"skyr":["Skyr naturalny",63,11,4,0.2],"rice":["Ryż suchy",350,7,78,0.6],"pasta":["Makaron suchy",350,12,71,1.5],"potato":["Ziemniaki",77,2,17,0.1],"veg":["Warzywa mieszane",45,2.5,7,0.5],"oil":["Olej rzepakowy",900,0,0,100],"tomato":["Pomidor / ogórek",18,0.9,3.9,0.2],"apple":["Jabłko",52,0.3,14,0.2],"pb":["Masło orzechowe",600,25,20,50],"tuna":["Tuńczyk w wodzie (odsączony)",110,25,0,1],"lentils":["Soczewica sucha",340,24,54,1.5],"beans":["Fasola konserwowa odsączona",95,6,15,0.8],"cheese":["Ser żółty",355,25,1,28],"ham":["Szynka drobiowa",110,18,2,3],"turkey":["Filet z indyka surowy",110,24,0,1.5],"flour":["Mąka pszenna",350,10,74,1],"berries":["Mrożone owoce jagodowe",50,1,12,0.5],"buckwheat":["Kasza gryczana sucha",345,12,70,3],"tortilla":["Tortilla pszenna",310,9,51,8],"fish":["Mintaj surowy",80,17,0,1],"honey":["Miód",320,0,80,0],"nuts":["Orzechy",610,20,19,54],"quark":["Twaróg chudy",100,19,3,0.5]};
  const RECIPES=[{"id":"b1","type":"breakfast","name":"Owsianka z bananem, mlekiem i jajkami","items":[["oats",70],["milk",250],["banana",120],["egg",110]]},{"id":"b2","type":"breakfast","name":"Jajka, twaróg i kanapki","items":[["egg",110],["twarog",100],["bread",100],["tomato",150]]},{"id":"b3","type":"breakfast","name":"Owsianka nocna ze skyrem","items":[["oats",75],["skyr",200],["banana",110],["milk",100]]},{"id":"b4","type":"breakfast","name":"Jajecznica z szynką i pieczywem","items":[["egg",165],["ham",65],["bread",100],["tomato",150],["oil",5]]},{"id":"b5","type":"breakfast","name":"Kanapki z twarogiem i mleko","items":[["bread",130],["twarog",150],["milk",250],["tomato",100]]},{"id":"b6","type":"breakfast","name":"Omlet owsiany z owocami","items":[["oats",60],["egg",165],["berries",150],["skyr",100]]},{"id":"b7","type":"breakfast","name":"Tosty francuskie z bananem","items":[["bread",120],["egg",110],["milk",150],["banana",100]]},{"id":"b8","type":"breakfast","name":"Owsianka z jabłkiem i orzechami","items":[["oats",75],["skyr",180],["apple",150],["nuts",20]]},{"id":"b9","type":"breakfast","name":"Kanapki z kurczakiem i jajkiem","items":[["bread",120],["chickenCooked",90],["egg",55],["tomato",160]]},{"id":"b10","type":"breakfast","name":"Twaróg z płatkami i bananem","items":[["quark",180],["oats",65],["banana",120],["milk",150]]},{"id":"b11","type":"breakfast","name":"Tortilla z jajkiem, serem i warzywami","items":[["tortilla",90],["egg",110],["cheese",30],["tomato",170]]},{"id":"b12","type":"breakfast","name":"Owsianka z masłem orzechowym","items":[["oats",70],["milk",300],["pb",25],["banana",120]]},{"id":"l1","type":"lunch","name":"Kurczak z ryżem i warzywami","items":[["chicken",180],["rice",110],["veg",250],["oil",15]]},{"id":"l2","type":"lunch","name":"Kurczak z ziemniakami","items":[["chicken",190],["potato",500],["veg",250],["oil",12]]},{"id":"l3","type":"lunch","name":"Makaron z kurczakiem i pomidorami","items":[["pasta",110],["chicken",180],["tomato",250],["oil",15]]},{"id":"l4","type":"lunch","name":"Indyk z kaszą gryczaną","items":[["turkey",190],["buckwheat",110],["veg",250],["oil",12]]},{"id":"l5","type":"lunch","name":"Ryż z fasolą i kurczakiem","items":[["rice",100],["beans",180],["chicken",140],["veg",200],["oil",10]]},{"id":"l6","type":"lunch","name":"Gulasz z indyka i ziemniaków","items":[["turkey",200],["potato",470],["tomato",200],["oil",12]]},{"id":"l7","type":"lunch","name":"Kurczak z kaszą i marchewką","items":[["chicken",190],["buckwheat",110],["veg",250],["oil",15]]},{"id":"l8","type":"lunch","name":"Mintaj z ziemniakami","items":[["fish",250],["potato",470],["veg",220],["oil",18]]},{"id":"l9","type":"lunch","name":"Ryż z indykiem i warzywami","items":[["rice",110],["turkey",190],["veg",250],["oil",15]]},{"id":"l10","type":"lunch","name":"Makaron z tuńczykiem","items":[["pasta",110],["tuna",140],["tomato",250],["oil",15]]},{"id":"l11","type":"lunch","name":"Duszona soczewica z ryżem","items":[["lentils",100],["rice",75],["tomato",250],["oil",10]]},{"id":"l12","type":"lunch","name":"Tortilla z kurczakiem","items":[["tortilla",130],["chicken",190],["veg",200],["twarog",70]]},{"id":"l13","type":"lunch","name":"Kurczak z makaronem i warzywami","items":[["chicken",190],["pasta",105],["veg",280],["oil",15]]},{"id":"l14","type":"lunch","name":"Fasola z indykiem i ryżem","items":[["beans",220],["turkey",170],["rice",95],["tomato",170],["oil",10]]},{"id":"l15","type":"lunch","name":"Pieczone ziemniaki i kurczak","items":[["potato",500],["chicken",185],["veg",200],["oil",15]]},{"id":"l16","type":"lunch","name":"Kasza z tuńczykiem i warzywami","items":[["buckwheat",110],["tuna",160],["veg",230],["oil",14]]},{"id":"l17","type":"lunch","name":"Makaron z sosem soczewicowym","items":[["pasta",100],["lentils",85],["tomato",240],["twarog",80],["oil",10]]},{"id":"l18","type":"lunch","name":"Ryż z mintajem i groszkiem","items":[["rice",105],["fish",240],["veg",260],["oil",16]]},{"id":"d1","type":"dinner","name":"Kanapki z twarogiem i mlekiem","items":[["bread",110],["twarog",150],["milk",250],["tomato",150]]},{"id":"d2","type":"dinner","name":"Kanapki z jajkiem i szynką","items":[["bread",125],["egg",110],["ham",70],["tomato",180]]},{"id":"d3","type":"dinner","name":"Tortilla z kurczakiem na zimno","items":[["tortilla",110],["chickenCooked",110],["tomato",180],["twarog",60]]},{"id":"d4","type":"dinner","name":"Jajecznica z pieczywem i warzywami","items":[["egg",165],["bread",130],["tomato",180],["oil",5]]},{"id":"d5","type":"dinner","name":"Pasta z tuńczyka i twarogu","items":[["tuna",110],["twarog",100],["bread",130],["tomato",120]]},{"id":"d6","type":"dinner","name":"Kanapki z kurczakiem i serem","items":[["bread",120],["chickenCooked",100],["cheese",35],["tomato",150]]},{"id":"d7","type":"dinner","name":"Omlet z twarogiem i owocami","items":[["egg",110],["oats",75],["twarog",110],["berries",150]]},{"id":"d8","type":"dinner","name":"Pieczone ziemniaki z twarogiem","items":[["potato",380],["twarog",180],["tomato",180],["oil",10]]},{"id":"d9","type":"dinner","name":"Ryż na mleku ze skyrem","items":[["rice",80],["milk",300],["skyr",220],["berries",130]]},{"id":"d10","type":"dinner","name":"Tortilla z fasolą i serem","items":[["tortilla",110],["beans",170],["cheese",35],["tomato",170]]},{"id":"d11","type":"dinner","name":"Kanapki z pastą jajeczną","items":[["bread",140],["egg",165],["twarog",80],["tomato",160]]},{"id":"d12","type":"dinner","name":"Kurczak z kaszą na kolację","items":[["chicken",145],["buckwheat",80],["veg",210],["oil",12]]},{"id":"s1","type":"snack","name":"Skyr z bananem i płatkami","items":[["skyr",200],["banana",120],["oats",40]]},{"id":"s2","type":"snack","name":"Twaróg z jabłkiem i miodem","items":[["quark",180],["apple",150],["honey",20]]},{"id":"s3","type":"snack","name":"Kanapki z szynką","items":[["bread",80],["ham",80],["tomato",130]]},{"id":"s4","type":"snack","name":"Skyr z orzechami i owocami","items":[["skyr",220],["nuts",20],["berries",130]]},{"id":"s5","type":"snack","name":"Koktajl mleczny z bananem","items":[["milk",350],["banana",150],["oats",35]]},{"id":"s6","type":"snack","name":"Jajka i kanapka","items":[["egg",110],["bread",75],["tomato",100]]},{"id":"s7","type":"snack","name":"Twaróg z bananem","items":[["twarog",150],["banana",125],["milk",100]]},{"id":"s8","type":"snack","name":"Tost z masłem orzechowym","items":[["bread",80],["pb",30],["milk",180]]}];

  const names={breakfast:'Śniadanie',lunch:'Obiad',dinner:'Kolacja',snack:'Drugie śniadanie / podwieczorek'};
  const round=(x,n=0)=>Number(x.toFixed(n));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function nutrition(recipe,factor){
    const sum={kcal:0,protein:0,carbs:0,fat:0};
    const items=recipe.items.map(([key,grams])=>{
      const food=FOODS[key],g=round(grams*factor,0);
      if(!food)throw Error('Nieznany produkt: '+key);
      const values=[1,2,3,4].map(i=>food[i]*g/100);
      ['kcal','protein','carbs','fat'].forEach((k,i)=>sum[k]+=values[i]);
      return {key,name:food[0],grams:g};
    });
    Object.keys(sum).forEach(k=>sum[k]=round(sum[k],k==='kcal'?0:1));
    return {...sum,items};
  }
  function calculate(p){
    const age=Number(p.age),kg=Number(p.weight),cm=Number(p.height),training=Number(p.training);
    if(!Number.isFinite(age)||age<18||age>100||!Number.isFinite(kg)||kg<35||kg>300||!Number.isFinite(cm)||cm<120||cm>230||!Number.isInteger(training)||training<0||training>7)throw Error('Sprawdź wiek (18+), wagę, wzrost i liczbę treningów.');
    if(!['male','female'].includes(p.sex))throw Error('Wybierz wariant wzoru zapotrzebowania.');
    if(!['low','moderate','high'].includes(p.work))throw Error('Wybierz aktywność w pracy.');
    if(!['reduce','maintain','gain','recomp'].includes(p.goal))throw Error('Wybierz cel.');
    if(!['falling','stable','rising'].includes(p.trend))throw Error('Wybierz trend masy.');
    const bmr=10*kg+6.25*cm-5*age+(p.sex==='male'?5:-161);
    const multiplier=clamp(({low:1.25,moderate:1.45,high:1.60})[p.work]+training*.03,1.2,1.85);
    const tdee=round(bmr*multiplier/10)*10;
    const offset=p.goal==='reduce'?-350:p.goal==='gain'?200:p.goal==='recomp'?(p.trend==='falling'?0:-150):0;
    const kcal=Math.round((tdee+offset)/10)*10;
    const protein=Math.round(kg*(p.goal==='recomp'?2.2:p.goal==='reduce'?2.0:1.8));
    const fat=Math.round(kg*.9);
    const carbs=Math.max(0,Math.round((kcal-protein*4-fat*9)/4));
    return {bmr:round(bmr),tdee,kcal,protein,carbs,fat,multiplier:round(multiplier,2),
      note:'Wartości szacunkowe. Zmiany energii oceniaj po 2 tygodniach na podstawie średniej masy, pasa i siły.'};
  }
  // Adjust food proportions within each recipe rather than multiplying every ingredient identically.
  // Keep vegetables and base recipes recognizable; adapt protein, starch and fat sources separately.
  function personalized(recipe,targets){
    const base=nutrition(recipe,1);
    const portion=clamp(targets.kcal/base.kcal,.65,1.85);
    const items=recipe.items.map(([key,grams])=>[key,Math.max(1,round(grams*portion,0))]);
    const original=items.map(([,grams])=>grams);
    const groups=[
      ['protein',['chicken','chickenCooked','turkey','fish','tuna','quark','skyr','twarog','ham','egg']],
      ['carbs',['rice','pasta','buckwheat','oats','bread','potato','tortilla','banana','apple','lentils','beans']],
      ['fat',['oil','nuts','pb','cheese','egg']]
    ];
    function adjust(metric,keys,goal){
      let remaining=goal-nutrition({items},1)[metric];
      const index=items.findIndex(([key])=>keys.includes(key) && FOODS[key][{protein:2,carbs:3,fat:4}[metric]]>0);
      if(index<0 || Math.abs(remaining)<2)return;
      const [key,current]=items[index],perGram=FOODS[key][{protein:2,carbs:3,fat:4}[metric]]/100;
      const lo=Math.max(1,round(original[index]*.65)),hi=round(original[index]*2.1);
      items[index][1]=clamp(round(current+remaining/perGram),lo,hi);
    }
    adjust('protein',groups[0][1],targets.protein);
    adjust('carbs',groups[1][1],targets.carbs);
    adjust('fat',groups[2][1],targets.fat);
    const current=nutrition({items},1);
    // Modest final energy correction via starch when one macro source is missing.
    if(Math.abs(targets.kcal-current.kcal)>55){
      const i=items.findIndex(([key])=>groups[1][1].includes(key));
      if(i>=0){
        const per=FOODS[items[i][0]][1]/100;
        items[i][1]=clamp(round(items[i][1]+(targets.kcal-current.kcal)/per),
          round(original[i]*.65),round(original[i]*2.1));
      }
    }
    return {portion:round(portion,2),...nutrition({items},1)};
  }
  function preparation(recipe){
    const ks=new Set(recipe.items.map(x=>Array.isArray(x)?x[0]:x.key));
    const steps=[];
    const has=(...x)=>x.some(k=>ks.has(k));
    if(has('chicken','chickenCooked','turkey','fish','tuna','lentils','beans')){
      if(has('rice','pasta','buckwheat','lentils'))
        steps.push('Odważ suchy ryż, makaron, kaszę lub soczewicę. Ugotuj zgodnie z czasem na opakowaniu; wagę do obliczeń przyjmij PRZED gotowaniem.');
      if(has('potato'))steps.push('Ziemniaki obierz lub umyj, pokrój i ugotuj albo upiecz do miękkości bez dodatkowego tłuszczu poza podanym w składnikach.');
      if(has('chicken','turkey','fish')){
        steps.push('Mięso lub rybę pokrój, dopraw i przygotuj na patelni albo w piekarniku, odmierzając olej z przepisu. Drób doprowadź do co najmniej 74°C wewnątrz; rybę do 63°C.');
      }else if(has('tuna'))steps.push('Tuńczyka odsącz z zalewy i dodaj do pozostałych składników; nie dodawaj wagi zalewy.');
      if(has('beans'))steps.push('Fasolę z puszki odsącz i opłucz; podgrzej lub wymieszaj z pozostałymi składnikami.');
      if(has('veg','tomato'))steps.push('Warzywa umyj, pokrój i dodaj na surowo lub ugotuj krótko do preferowanej miękkości.');
      if(has('twarog','quark','skyr'))steps.push('Twaróg lub skyr dodaj na końcu, po ostudzeniu ciepłych składników.');
      steps.push('Połącz składniki i podziel na porcję o gramaturach pokazanych wyżej; nie doliczaj tłuszczu ani sosu spoza listy.');
    }else if(has('oats','rice')&&has('milk','skyr','twarog','quark')){
      steps.push('Odmierz płatki lub suchy ryż. Gotuj w odmierzonej ilości mleka albo wody, aż zmiękną; do wersji nocnej płatki namocz w lodówce.');
      if(has('egg'))steps.push('Jajka ugotuj lub usmaż osobno bez nieujętego oleju; podawaj z owsianką.');
      if(has('skyr','twarog','quark'))steps.push('Skyr lub twaróg wmieszaj po lekkim przestudzeniu, żeby zachować konsystencję.');
      steps.push('Dodaj odważone owoce, orzechy i pozostałe dodatki. Masa banana i jaj jest liczona bez skórki i skorupki.');
    }else if(has('egg')){
      steps.push('Odważ jajka bez skorupek, pieczywo i pozostałe składniki.');
      steps.push(has('flour','oats')?'Wymieszaj jajka z mąką lub płatkami i przygotuj omlet na patelni bez dodatkowego tłuszczu.':'Jajka ugotuj, zrób jajecznicę lub omlet; użyj tylko tłuszczu wymienionego w składnikach.');
      steps.push('Dodaj pieczywo, odważone warzywa lub owoce i nabiał zgodnie z wyświetloną gramaturą.');
    }else if(has('bread','tortilla')){
      steps.push('Odważ pieczywo lub tortillę oraz wszystkie dodatki.');
      steps.push('Pokrój warzywa, wymieszaj składniki pasty lub ułóż dodatki na pieczywie; mięso oznaczone jako „po obróbce” waż po przygotowaniu.');
      steps.push('Podawaj na zimno albo zapiecz, bez nieujętych sosów i tłuszczu.');
    }else{
      steps.push('Odważ każdy składnik według gramatury powyżej.');
      steps.push('Umyj owoce i warzywa, pokrój, wymieszaj z nabiałem lub przygotuj koktajl.');
      steps.push('Podawaj jako jedną porcję; dodatki nieuwzględnione w składzie zmieniają makro.');
    }
    return steps;
  }

  function month(p,days=30){
    const target=calculate(p),count=Number(p.meals)===3?3:4;
    const shares=count===3?{breakfast:.29,lunch:.41,dinner:.30}:{breakfast:.25,lunch:.34,snack:.16,dinner:.25};
    const groups={breakfast:RECIPES.filter(x=>x.type==='breakfast'),lunch:RECIPES.filter(x=>x.type==='lunch'),dinner:RECIPES.filter(x=>x.type==='dinner'),snack:RECIPES.filter(x=>x.type==='snack')};
    const order=count===3?['breakfast','lunch','dinner']:['breakfast','snack','lunch','dinner'];
    const hours=count===3?['07:00','13:00','19:00']:['06:30','10:00','15:00','19:30'];
    return Array.from({length:days},(_,day)=>{
      const meals=order.map((type,pos)=>{
        const group=groups[type],recipe=group[(day*(type==='snack'?3:5)+Math.floor(day/group.length)+pos)%group.length];
        const portions={kcal:target.kcal*shares[type],protein:target.protein*shares[type],carbs:target.carbs*shares[type],fat:target.fat*shares[type]};
        return {hour:hours[pos],type,recipeId:recipe.id,name:recipe.name,...personalized(recipe,portions)};
      });
      const totals={kcal:0,protein:0,carbs:0,fat:0};
      meals.forEach(m=>Object.keys(totals).forEach(k=>totals[k]+=m[k]));
      Object.keys(totals).forEach(k=>totals[k]=round(totals[k],k==='kcal'?0:1));
      return {day:day+1,meals,totals};
    });
  }
  const api=Object.freeze({FOODS,RECIPES,names,nutrition,personalized,preparation,calculate,month,STORAGE_KEY});
  root.TrenerRecipes090=api;
  if(typeof document==='undefined')return;
  const byId=id=>document.getElementById(id);
  const fmt=n=>Number(n).toLocaleString('pl-PL',{maximumFractionDigits:1});
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let profile={sex:'',age:'',weight:'',height:'',training:'',work:'moderate',trend:'stable',goal:'maintain',meals:4};
  let selected=1,plan=null;
  function read(){
    try{const o=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(o&&o.schemaVersion===1&&o.profile)profile={...profile,...o.profile};}catch(e){}
  }
  function save(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({schemaVersion:1,profile}));return true;}
    catch(e){showError('Nie udało się zapisać ustawień przepisów. Sprawdź pamięć telefonu.');return false;}
  }
  function showError(msg){const e=byId('r090Error');if(e){e.textContent=msg;e.hidden=!msg;}}
  function form(){
    return '<div class="card r090Hero"><div class="eyebrow">PRZEPISY • OSOBNY MODUŁ</div><h2>Jadłospis na 30 dni</h2><p class="hint">Własny kalkulator i 50 przepisów. Nic nie zapisuje do Diety ani treningów.</p>'+
    '<div class="r090Fields">'+
    '<label>Wariant wzoru BMR<select id="r090Sex"><option value="">Wybierz</option><option value="male">Męski</option><option value="female">Żeński</option></select></label>'+
    '<label>Wiek [lata]<input id="r090Age" type="number" min="18" max="100"></label>'+
    '<label>Masa [kg]<input id="r090Weight" type="number" min="35" max="300" step=".1"></label>'+
    '<label>Wzrost [cm]<input id="r090Height" type="number" min="120" max="230"></label>'+
    '<label>Aktywność w pracy<select id="r090Work"><option value="low">Mała</option><option value="moderate">Umiarkowana</option><option value="high">Duża / fizyczna</option></select></label>'+
    '<label>Treningi tygodniowo<input id="r090Training" type="number" min="0" max="7"></label>'+
    '<label>Cel<select id="r090Goal"><option value="reduce">Schudnąć</option><option value="maintain">Utrzymać wagę</option><option value="gain">Przytyć</option><option value="recomp">Rekompozycja</option></select></label>'+
    '<label>Trend masy<select id="r090Trend"><option value="falling">Spada</option><option value="stable">Stoi</option><option value="rising">Rośnie</option></select></label>'+
    '<label>Posiłki dziennie<select id="r090Meals"><option value="3">3 posiłki</option><option value="4">4 posiłki</option></select></label>'+
    '</div><button class="primary bigBtn" id="r090Generate" type="button">OBLICZ I UŁÓŻ 30 DNI</button><p id="r090Error" class="r090Error" role="alert" hidden></p></div>'+
    '<div class="card" id="r090Result" hidden></div><div class="card"><h2>Biblioteka 50 przepisów</h2><div id="r090Library"></div></div>';
  }
  function collect(){
    const text=(id)=>byId('r090'+id).value;
    if(text('Training')==='')throw Error('Wpisz liczbę treningów tygodniowo (0–7).');
    return {sex:text('Sex'),age:Number(text('Age')),weight:Number(text('Weight')),height:Number(text('Height')),work:text('Work'),training:Number(text('Training')),goal:text('Goal'),trend:text('Trend'),meals:Number(text('Meals'))};
  }
  function restore(){
    Object.entries({Sex:'sex',Age:'age',Weight:'weight',Height:'height',Work:'work',Training:'training',Goal:'goal',Trend:'trend',Meals:'meals'}).forEach(([id,k])=>byId('r090'+id).value=profile[k]);
  }
  function nutritionText(m){return fmt(m.kcal)+' kcal · B '+fmt(m.protein)+' g · W '+fmt(m.carbs)+' g · T '+fmt(m.fat)+' g';}
  function details(m){return '<details><summary>Składniki i sposób przygotowania</summary><div class="r090Ingredients">'+m.items.map(x=>'<div>'+escape(x.name)+' <b>'+fmt(x.grams)+' g</b></div>').join('')+'</div><p class="hint">Gramatury ryżu, makaronu i kaszy są przed gotowaniem; drób surowy, chyba że nazwano go „po obróbce”.</p><ol class="r090Steps">'+preparation(m).map(x=>'<li>'+escape(x)+'</li>').join('')+'</ol></details>';}
  function drawLibrary(){
    const el=byId('r090Library');if(!el)return;
    el.innerHTML=['breakfast','lunch','dinner','snack'].map(type=>
      '<details class="r090Category"><summary>'+names[type]+' ('+RECIPES.filter(x=>x.type===type).length+')</summary>'+
      RECIPES.filter(x=>x.type===type).map(r=>{const n=nutrition(r,1);return '<div class="r090Recipe"><b>'+escape(r.name)+'</b><small>'+nutritionText(n)+'</small>'+details(n)+'</div>';}).join('')+'</details>'
    ).join('');
  }
  function draw(){
    if(!plan)return;
    const e=byId('r090Result'),t=plan.target,d=plan.days[selected-1];
    const options=plan.days.map(x=>'<option value="'+x.day+'" '+(x.day===selected?'selected':'')+'>Dzień '+x.day+' • '+fmt(x.totals.kcal)+' kcal</option>').join('');
    e.hidden=false;
    e.innerHTML='<h2>Twój cel: '+fmt(t.kcal)+' kcal</h2>'+
      '<p class="hint">Szacowane utrzymanie: '+fmt(t.tdee)+' kcal • BMR: '+fmt(t.bmr)+' kcal • współczynnik '+fmt(t.multiplier)+'</p>'+
      '<div class="r090Stats"><div><span>Białko</span><b>'+fmt(t.protein)+' g</b></div><div><span>Węgle</span><b>'+fmt(t.carbs)+' g</b></div><div><span>Tłuszcz</span><b>'+fmt(t.fat)+' g</b></div></div>'+
      '<p class="hint">'+escape(t.note)+'</p>'+
      '<label>Wybierz dzień<select id="r090Day">'+options+'</select></label>'+
      '<div class="r090DayTotal">Dzień '+selected+': '+nutritionText(d.totals)+'</div>'+
      '<p class="hint">Składniki białkowe, węglowodanowe i tłuszczowe są dopasowywane oddzielnie. Sprawdź sumę B/W/T: plan jest przykładem, a nie gwarancją idealnego trafienia makro.</p>'+
      d.meals.map(m=>'<article class="r090Meal"><div class="r090MealHead"><span>'+escape(m.hour)+' · '+names[m.type]+'</span><strong>'+fmt(m.portion*100)+'% porcji wyjściowej · skład dostosowany</strong></div><h3>'+escape(m.name)+'</h3><p>'+nutritionText(m)+'</p>'+details(m)+'</article>').join('');
    byId('r090Day').onchange=ev=>{selected=Number(ev.target.value)||1;draw();};
  }
  function generate(){
    showError('');
    try{const next=collect(),target=calculate(next),days=month(next,30);profile=next;plan={target,days};selected=1;save();draw();}
    catch(e){showError(String(e.message||e));}
  }
  function boot(){
    const el=byId('recipes');if(!el)return;
    read();el.innerHTML=form();restore();drawLibrary();
    byId('r090Generate').addEventListener('click',generate);

  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof window!=='undefined'?window:globalThis);
