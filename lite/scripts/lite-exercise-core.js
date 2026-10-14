(function(root,factory){
'use strict';
var api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.TrenerLiteExerciseCore=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
var columns={
 n:['nazwa','cwiczenie','nazwa_cwiczenia','exercise','name','title'],
 group:['partia','partia_miesniowa','grupa','group','muscle_group'],
 equipment:['sprzet','equipment','przyrzad','akcesoria'],
 sets:['serie','liczba_serii','sets'],
 min:['powt_min','powtorzenia_od','od','min','reps_min','powtorzenia'],
 max:['powt_max','powtorzenia_do','do','max','reps_max'],
 rest:['przerwa','przerwa_s','odpoczynek','rest','rest_s'],
 time:['na_czas','czasowe','time','timed'],
 setup:['pozycja_start','pozycja_poczatkowa','setup','start_position'],
 movement:['wykonanie','opis','ruch','movement','instructions'],
 mistake:['bledy','bledy_typowe','bezpieczenstwo','mistake','mistakes','errors'],
 tip:['wskazowka','uwagi','tip','notes'],
 imageStart:['zdjecie_start','zdjecie_poczatkowe','start_photo','image_start','photo_start'],
 imageEnd:['zdjecie_koniec','zdjecie_end','zdjecie_koncowe','end_photo','image_end','photo_end']
};
var groups=['Klatka','Plecy','Biceps','Triceps','Barki','Przedramiona','Nogi',
'Dwugłowe uda','Pośladki','Łydki','Brzuch','Całe ciało','Inne'];
var groupsMap={
 klatka:'Klatka',klatka_piersiowa:'Klatka',chest:'Klatka',
 plecy:'Plecy',back:'Plecy',
 biceps:'Biceps',triceps:'Triceps',
 barki:'Barki',shoulders:'Barki',ramiona:'Barki',
 przedramiona:'Przedramiona',forearms:'Przedramiona',
 nogi:'Nogi',legs:'Nogi',uda:'Nogi',
 dwuglowe_uda:'Dwugłowe uda',hamstrings:'Dwugłowe uda',
 posladki:'Pośladki',glutes:'Pośladki',
 lydki:'Łydki',calves:'Łydki',brzuch:'Brzuch',abs:'Brzuch',core:'Brzuch',
 cale_cialo:'Całe ciało',fullbody:'Całe ciało',inne:'Inne',other:'Inne'
};
function canon(s){
 return String(s===undefined||s===null?'':s).trim().toLowerCase()
 .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .replace(/ł/g,'l').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}
function guess(headers){
 var out={};
 Object.keys(columns).forEach(function(k){
  var h=headers.filter(function(x){return columns[k].indexOf(canon(x))!==-1;})[0];
  out[k]=h||'';
 });
 return out;
}
function number(s,def,min,max,label){
 if(s===undefined||s===null||String(s).trim()==='')return def;
 var n=Number(String(s).trim().replace(',','.'));
 if(!Number.isInteger(n)||n<min||n>max)throw Error('Nieprawidłowe pole '+label);
 return n;
}
function text(v,max){
 return String(v===undefined||v===null?'':v).trim().slice(0,max);
}
function get(obj,key){return obj[key]===undefined?'':obj[key];}
function findPhoto(ref,photos){
 var name=String(ref||'').trim().replace(/\\/g,'/').toLowerCase();
 if(!name)return '';
 if(name.charAt(0)==='/'||name.indexOf('../')!==-1||name.indexOf(':')!==-1)
  throw Error('Niedozwolona ścieżka zdjęcia.');
 if(Object.prototype.hasOwnProperty.call(photos,name))return photos[name];
 var suffix='/'+name,found=Object.keys(photos).filter(function(k){
  return k===name||k.slice(-suffix.length)===suffix;
 });
 if(found.length===1)return photos[found[0]];
 if(found.length>1)throw Error('Niejednoznaczna nazwa zdjęcia '+name);
 throw Error('Nie znaleziono zdjęcia '+name+' w paczce.');
}
function hash(s){
 var h=2166136261;
 for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(36);
}
function identity(ex){return canon(ex.n)+'|'+canon(ex.group);}
function stableId(ex){var v=identity(ex);return 'user:imp-'+hash(v)+'-'+hash(v.split('').reverse().join(''));}
function parseRow(raw,map,photos){
 function col(key){return map[key]?get(raw,map[key]):'';}
 var name=text(col('n'),110),groupVal=canon(col('group'));
 if(name.length<3)throw Error('Nazwa ćwiczenia musi mieć co najmniej 3 znaki.');
 var group=groupsMap[groupVal]||'';
 if(!group||groups.indexOf(group)<0)throw Error('Nieznana partia mięśni: '+text(col('group'),50));
 var min=number(col('min'),8,1,999,'min'),max=number(col('max'),Math.max(min,12),1,999,'max');
 if(min>max)throw Error('Powtórzenia: maksimum mniejsze od minimum.');
 var time=['1','true','tak','yes','x'].indexOf(canon(col('time')))!==-1;
 var ex={n:name,group:group,equipment:text(col('equipment'),100)||'Masa ciała',
  sets:number(col('sets'),3,1,15,'serie'),
  min:min,max:max,rest:number(col('rest'),90,0,1200,'przerwa'),
  time:time,
  setup:text(col('setup'),1500),movement:text(col('movement'),1500),
  mistake:text(col('mistake'),1500),tip:text(col('tip'),700),
  imageStart:findPhoto(col('imageStart'),photos),
  imageEnd:findPhoto(col('imageEnd'),photos)
 };
 ex.id=stableId(ex);
 return ex;
}
function preview(packageData,map,existing,builtins){
 if(!packageData||packageData.format!=='trener2-lite-exercises'||!Array.isArray(packageData.rows))
  throw Error('Nieprawidłowy pakiet ćwiczeń.');
 if(packageData.rows.length>250)throw Error('Maksymalnie 250 ćwiczeń na import.');
 var photos=packageData.images||{},keys=Object.keys(photos);
 if(keys.length>70)throw Error('Za dużo zdjęć.');
 var present={};
 (existing||[]).concat(builtins||[]).forEach(function(ex){
  if(ex&&ex.n)present[identity(ex)]=true;
 });
 var seen={},out=[],counts={new:0,duplicate:0,invalid:0};
 packageData.rows.forEach(function(row,i){
  var entry={row:i+2,selected:false,status:'invalid',error:'',exercise:null};
  try{
   var ex=parseRow(row,map,photos),id=identity(ex);
   entry.exercise=ex;
   if(present[id]||seen[id]){entry.status='duplicate';counts.duplicate++;}
   else{entry.status='new';entry.selected=true;counts.new++;seen[id]=true;}
  }catch(e){entry.error=String(e.message||e);counts.invalid++;}
  out.push(entry);
 });
 return {entries:out,counts:counts};
}
function commitPlan(existing,entries,validator){
 var chosen=entries.filter(function(x){return x.selected&&x.status==='new';});
 var seen={},existingIds={};
 existing.forEach(function(e){seen[identity(e)]=true;existingIds[e.id]=true;});
 var output=existing.slice();
 chosen.forEach(function(entry){
  var ex=entry.exercise,key=identity(ex);
  if(seen[key]||existingIds[ex.id])throw Error('Powtórzony identyfikator lub nazwa: '+ex.n);
  if(validator)ex=validator(ex,ex.id);
  output.push(ex);seen[key]=true;existingIds[ex.id]=true;
 });
 var serialized=JSON.stringify({schemaVersion:1,exercises:output});
 if(serialized.length>2800000)throw Error('Za dużo danych lub zdjęć. Podziel import na mniejsze paczki; nie zapisano niczego.');
 return {serialized:serialized,added:chosen.length,bytes:serialized.length};
}
return {canon:canon,guess:guess,columns:columns,groups:groups,parseRow:parseRow,
 preview:preview,commitPlan:commitPlan,identity:identity,stableId:stableId};
});
