(function(root,factory){
 'use strict';
 var api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.TrenerLiteInventoryCore=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
function invalid(message){throw new Error(message);}
function mass(v,label,zero){
 var n=Number(v);
 if(!isFinite(n)||n<(zero?0:0.1)||n>1000||Math.round(n*1000)!==n*1000)invalid('Nieprawidłowa masa: '+label);
 return n;
}
function quantity(v,label){
 var n=Number(v);
 if(!Number.isInteger(n)||n<1||n>300)invalid('Nieprawidłowa liczba sztuk: '+label);
 return n;
}
function diameter(v){
 if(v===null||v===undefined||v==='')return null;
 var n=Number(v);
 if(!Number.isInteger(n)||n<10||n>60)invalid('Nieprawidłowa średnica mocowania [mm].');
 return n;
}
function validate(input){
 var data=input||{};
 if(!data||typeof data!=='object'||!Array.isArray(data.bars)||!Array.isArray(data.plates))invalid('Nieprawidłowy katalog sprzętu.');
 if(data.bars.length>30||data.plates.length>40)invalid('Przekroczono limit typów sprzętu.');
 var seen={};
 function checkId(x){
  var id=String(x.id||'');
  if(!/^[a-zA-Z0-9_-]{3,64}$/.test(id)||seen[id])invalid('Nieprawidłowy lub powtórzony identyfikator sprzętu.');
  seen[id]=true;return id;
 }
 var bars=data.bars.map(function(b){
  if(!b||['dumbbell','barbell','fixed'].indexOf(b.type)===-1)invalid('Nieprawidłowy typ gryfu.');
  var id=checkId(b),name=String(b.name||'').trim().slice(0,60);
  if(!name)invalid('Wpisz nazwę gryfu.');
  var kg=mass(b.kg,'gryf '+name,false),count=quantity(b.count,name),dia=diameter(b.diameter);
  var max=b.maxKg===null||b.maxKg===undefined||b.maxKg===''?null:mass(b.maxKg,'maksymalne obciążenie',false);
  if(max!==null&&max<kg)invalid('Maksymalne obciążenie nie może być mniejsze od masy gryfu.');
  return {id:id,type:b.type,name:name,kg:kg,count:count,diameter:dia,maxKg:max};
 });
 var plates=data.plates.map(function(p){
  if(!p)invalid('Nieprawidłowy talerz.');
  var id=checkId(p),name=String(p.name||'Talerz').trim().slice(0,60);
  var kg=mass(p.kg,'talerz',false),count=quantity(p.count,'talerze'),dia=diameter(p.diameter);
  return {id:id,name:name,kg:kg,count:count,diameter:dia};
 });
 return {version:1,bars:bars,plates:plates};
}
function compatible(a,b){return !(a!==null&&b!==null&&a!==b);}
function possibilities(inventory,kind,barId){
 var inv=validate(inventory);
 if(['dumbbell-one','dumbbell-pair','barbell','fixed-one','fixed-pair'].indexOf(kind)===-1)
  return {levels:[],reason:'Wybierz rodzaj sprzętu dla ćwiczenia.'};
 var pair=kind==='dumbbell-pair'||kind==='fixed-pair';
 var isFixed=kind==='fixed-one'||kind==='fixed-pair';
 var type=isFixed?'fixed':kind==='barbell'?'barbell':'dumbbell';
 var bars=inv.bars.filter(function(b){return b.type===type&&(!barId||b.id===barId)&&b.count>=(pair?2:1);});
 if(!bars.length)return {levels:[],reason:pair?'Brakuje dwóch identycznych gryfów lub hantli.':'Brak odpowiedniego gryfu lub hantli.'};
 var all=[];
 bars.forEach(function(bar){
  if(isFixed){
   all.push({total:bar.kg,barId:bar.id,barName:bar.name,kind:kind,side:[],pair:pair,diameterUnknown:false,maxUnknown:false});
   return;
  }
  // W każdym wariancie talerze muszą być symetryczne na lewo/prawo.
  // Dla pary sztangielek zapas należy podzielić przez 4 (obie strony obu gryfów).
  var factor=pair?4:2;
  var avail=inv.plates.filter(function(p){return compatible(bar.diameter,p.diameter);});
  var choices=[{grams:0,side:[]}];
  var limit=bar.maxKg===null?1000000:Math.max(0,Math.round((bar.maxKg-bar.kg)*500));
  for(var i=0;i<avail.length;i++){
   var p=avail[i],units=Math.floor(p.count/factor),weight=Math.round(p.kg*1000),map={};
   // 0/1/2/... sztuk na stronę KAŻDEGO gryfu; bez powielania fizycznego zapasu.
   choices.forEach(function(v){
    for(var n=0;n<=units;n++){
     var grams=v.grams+n*weight;
     if(grams>limit)break;
     var key=String(grams);
     var candidate={grams:grams,side:n?v.side.concat([{kg:p.kg,count:n}]) :v.side.slice()};
     if(!map[key]||candidate.side.reduce(function(x,y){return x+y.count;},0)<
        map[key].side.reduce(function(x,y){return x+y.count;},0))map[key]=candidate;
    }
   });
   choices=Object.keys(map).map(function(key){return map[key];});
   if(choices.length>12000)invalid('Zbyt wiele kombinacji. Ogranicz typy talerzy lub ich ilości.');
  }
  choices.forEach(function(c){
   var total=Math.round((bar.kg+2*c.grams/1000)*1000)/1000;
   if(bar.maxKg!==null&&total>bar.maxKg+1e-6)return;
   all.push({total:total,barId:bar.id,barName:bar.name,kind:kind,pair:pair,
    side:c.side,diameterUnknown:bar.diameter===null||c.side.some(function(t){
     return avail.some(function(p){return p.kg===t.kg&&p.diameter===null;});
    }),maxUnknown:bar.maxKg===null});
  });
 });
 all.sort(function(a,b){return a.total-b.total||a.side.length-b.side.length;});
 // Rozróżniaj gryfy; wybór powiązany z konkretną, fizyczną konfiguracją.
 return {levels:all,reason:all.length?'':'Nie można utworzyć symetrycznego obciążenia.'};
}
function recommend(inventory,kind,barId,target){
 var n=Number(target);
 if(!isFinite(n)||n<=0)return {possible:false,reason:'Wpisz dodatni docelowy ciężar.'};
 var p=possibilities(inventory,kind,barId);
 if(!p.levels.length)return {possible:false,reason:p.reason};
 var candidates=p.levels.filter(function(x){return x.total<=n+0.000001;});
 if(!candidates.length)return {possible:false,reason:'Najlżejszy dostępny gryf waży więcej od wybranego celu.'};
 var chosen=candidates[candidates.length-1];
 return Object.assign({possible:true,target:n,exact:Math.abs(chosen.total-n)<.000001,
  maximum:p.levels[p.levels.length-1].total},chosen);
}
function layout(value){
 if(!value||!value.possible)return value&&value.reason||'Nie znaleziono możliwego obciążenia.';
 var unit=value.pair?'na każdym gryfie':'na gryfie';
 var txt=value.side.length?value.side.map(function(x){
  return x.count+' × '+x.kg+' kg';
 }).join(' + '):'bez talerzy';
 return value.barName+': '+txt+' na LEWĄ i tyle samo na PRAWĄ stronę '+unit+
   '. Masa '+value.total+' kg '+(value.pair?'na jedną hantlę.':'łącznie.');
}
return {validate:validate,possibilities:possibilities,recommend:recommend,layout:layout};
});
