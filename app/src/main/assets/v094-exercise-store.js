(function(){
  'use strict';

  const KEY='trainer3.userExercises.v094';
  const SCHEMA=1;
  const MAX_MEDIA_CHARS=420000;
  const MAX_TOTAL_CHARS=2800000;
  const groups=['Klatka','Plecy','Biceps','Triceps','Barki','Przedramiona','Nogi','Dwugłowe uda','Pośladki','Łydki','Brzuch','Całe ciało','Inne'];

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function read(){
    const saved=localStorage.getItem(KEY);
    if(saved===null)return [];
    let raw;
    try{raw=JSON.parse(saved);}catch(e){throw Error('Uszkodzony zapis biblioteki — nie nadpisuję danych. Wykonaj kopię.');}
    if(!raw||raw.schemaVersion!==SCHEMA||!Array.isArray(raw.exercises))
      throw Error('Nieznany format biblioteki — nie nadpisuję danych.');
    return raw.exercises;
  }
  function validMedia(s){
    return !s||(typeof s==='string'&&s.length<=MAX_MEDIA_CHARS&&/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(s));
  }
  function validate(source,expectedId){
    if(!source||typeof source!=='object'||Array.isArray(source))throw Error('Nieprawidłowe ćwiczenie.');
    const name=String(source.n||'').trim();
    if(name.length<3||name.length>110)throw Error('Nazwa: 3–110 znaków.');
    const group=String(source.group||'Inne').trim();
    if(!groups.includes(group))throw Error('Wybierz poprawną partię.');
    const number=(key,min,max,def)=>{
      const value=source[key]===undefined?def:Number(source[key]);
      if(!Number.isInteger(value)||value<min||value>max)throw Error('Nieprawidłowe pole: '+key);
      return value;
    };
    const id=expectedId||String(source.id||'');
    if(!/^user:[a-z0-9-]{8,80}$/i.test(id))throw Error('Nieprawidłowy identyfikator.');
    const result={
      id,n:name,group,equipment:String(source.equipment||'Masa ciała').trim().slice(0,100),
      sets:number('sets',1,15,3),min:number('min',1,999,8),max:number('max',1,999,12),
      rest:number('rest',0,1200,90),time:source.time===true,
      setup:String(source.setup||'').trim().slice(0,1500),
      movement:String(source.movement||'').trim().slice(0,1500),
      mistake:String(source.mistake||'').trim().slice(0,1500),
      tip:String(source.tip||'').trim().slice(0,700),
      imageStart:String(source.imageStart||''),imageEnd:String(source.imageEnd||''),
      origin:'user'
    };
    if(result.max<result.min)throw Error('Maksimum musi być większe lub równe minimum.');
    if(!validMedia(result.imageStart)||!validMedia(result.imageEnd))throw Error('Nieprawidłowy lub za duży obraz.');
    return result;
  }
  function newId(){
    const arr=new Uint32Array(3);
    if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(arr);
    else for(let i=0;i<arr.length;i++)arr[i]=Math.floor(Math.random()*4294967296);
    return 'user:'+Array.from(arr).map(n=>n.toString(36)).join('-');
  }
  function library(){
    try{return exerciseLibrary;}catch(e){return null;}
  }
  let lastError='';
  function hydrate(){
    const lib=library();if(!lib)return false;
    let saved,ready;
    try{
      saved=read();
      const ids=new Set(lib.filter(e=>!String(e?.id||'').startsWith('user:')).map(e=>e.id));
      ready=saved.map(raw=>{
        const ex=validate(raw);
        if(ids.has(ex.id))throw Error('Duplikat identyfikatora ćwiczenia: '+ex.id);
        ids.add(ex.id);
        const planEx=Object.assign({},ex);
        delete planEx.imageStart;delete planEx.imageEnd;
        return planEx;
      });
    }catch(e){lastError=String(e.message||e);return false;}
    lastError='';
    for(let i=lib.length-1;i>=0;i--)if(String(lib[i]?.id||'').startsWith('user:'))lib.splice(i,1);
    lib.push(...ready);
    return true;
  }
  function store(list){
    const normalized=[],seen=new Set();
    for(const x of list){
      const item=validate(x);
      if(seen.has(item.id))throw Error('Powtórzony identyfikator.');
      seen.add(item.id);normalized.push(item);
    }
    const data=JSON.stringify({schemaVersion:SCHEMA,exercises:normalized});
    if(data.length>MAX_TOTAL_CHARS)throw Error('Brak miejsca w bibliotece zdjęć. Wyeksportuj kopię i ogranicz zdjęcia.');
    // A failed storage write must never mutate the live library or history.
    localStorage.setItem(KEY,data);
    hydrate();
    return normalized;
  }
  function save(raw){
    const prev=read(),id=raw.id||newId();
    const item=validate(Object.assign({},raw,{id}),id);
    const lib=library()||[];
    if(lib.some(x=>x.id===id&&!String(x.id).startsWith('user:')))throw Error('Nie wolno zastępować ćwiczenia fabrycznego.');
    const index=prev.findIndex(x=>x.id===id);
    if(index<0)prev.push(item);else prev[index]=item;
    store(prev);return clone(item);
  }
  const PART_LABELS={chest:'Klatka',back:'Plecy',biceps:'Biceps',triceps:'Triceps',
    shoulders:'Barki',legs:'Nogi',core:'Brzuch',forearms:'Przedramiona',hamstrings:'Dwugłowe uda',
    glutes:'Pośladki',calves:'Łydki',fullbody:'Całe ciało'};
  function references(id){
    // If a dependent plan is damaged, fail closed instead of silently deleting an exercise.
    const safe=k=>{
      const raw=localStorage.getItem(k);
      if(raw===null)return null;
      try{return JSON.parse(raw);}catch(e){throw Error('Nie można odczytać planów. Najpierw wykonaj kopię danych.');}
    };
    const single=safe('trainer3.customPlan');
    if(single?.ex?.some(e=>(e?.id||e)===id))return true;
    const multi=safe('trainer3.customPlans.v050');
    if(Array.isArray(multi)&&multi.some(p=>p?.ex?.some(e=>(e?.id||e)===id)))return true;
    const week=safe('trainer3.weekPlan.v070'),exercise=get(id);
    if(week?.days&&Object.values(week.days).some(d=>
      d?.exerciseIds?.includes(id)||
      (d?.kind==='parts'&&d?.parts?.some(k=>PART_LABELS[k]===exercise?.group))))return true;
    return false;
  }
  function remove(id){
    const previous=read(),next=previous.filter(x=>x.id!==id);
    if(previous.length===next.length)return false;
    if(references(id))throw Error('Ćwiczenie jest używane w zapisanym planie. Najpierw usuń je z planu.');
    store(next);return true;
  }
  function get(id){return read().find(x=>x.id===id)||null;}
  function list(){return clone(read());}
  function refresh(){
    if(!hydrate())return false;
    try{
      if(typeof renderBuilder==='function'){
        const selected=new Set([...document.querySelectorAll('.builderCheck:checked')].map(el=>el.value));
        renderBuilder();
        for(const el of document.querySelectorAll('.builderCheck'))if(selected.has(el.value))el.checked=true;
      }
    }catch(e){}
    try{document.getElementById('v070LibrarySearch')?.dispatchEvent(new Event('input'));}catch(e){}
    return true;
  }
  window.TrenerCustomExercises094={KEY,SCHEMA,groups,list,get,save,remove,hydrate,refresh,validate,getLastError:()=>lastError};
})();