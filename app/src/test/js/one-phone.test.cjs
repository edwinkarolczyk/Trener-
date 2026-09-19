const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('app/src/main/assets/v086-one-phone.js','utf8');
const store=new Map([['trainer3.participantId.v070','owner-id-12345']]);
const localStorage={
 getItem:k=>store.has(k)?store.get(k):null,
 setItem:(k,v)=>store.set(k,String(v)),
 removeItem:k=>store.delete(k)
};
const window={TrenerData070:{participantId:()=> 'owner-id-12345'}};
const document={
 readyState:'loading',addEventListener(){},
 getElementById(id){return id==='nameA'?{value:'Edwin'}:null}
};
let confirmations=0;
vm.runInNewContext(script,{
 window,document,localStorage,
 confirm:()=>{confirmations++;return true;}
},{filename:'v086-one-phone.js',timeout:3000});
const api=window.TrenerOnePhone086;
assert(api);
const first=api.rosterFor(3,['Edwin','Dawid','Marek']);
assert.equal(first[0].id,'owner-id-12345');
assert.notEqual(first[1].id,first[2].id);
assert.notEqual(first[0].id,first[1].id);
store.set('trainer3.onePhone.participants.v086',JSON.stringify(first));
const renamed=api.rosterFor(3,['Edwin','Dawid Nowy','Marek']);
assert.equal(renamed[1].id,first[1].id);
assert.equal(renamed[2].id,first[2].id);
const session={sessionId:'one:session-77777',plan:'Plan A',planKey:'mon',
 iso:'2026-09-19T10:00:00Z',date:'19.09.2026',duration:430,
 records:[
  {uid:'a',participantId:first[0].id,athlete:0,id:'bench',name:'Wyciskanie',kg:60,reps:8,ex:0,set:0},
  {uid:'b',participantId:first[1].id,athlete:1,id:'bench',name:'Wyciskanie',kg:45,reps:9,ex:0,set:0},
  {uid:'c',participantId:first[2].id,athlete:2,id:'bench',name:'Wyciskanie',kg:35,reps:12,ex:0,set:0}
 ]};
const bundle=api.transferFor(session,first[1]);
assert.equal(bundle.session.records.length,1);
assert.equal(bundle.session.records[0].uid,'b');
assert.equal(bundle.originParticipantId,first[1].id);
const converted=api.sanitizeBundle(bundle);
assert.equal(converted.records[0].participantId,'owner-id-12345');
assert.equal(converted.records[0].originParticipantId,first[1].id);
assert.equal(converted.records[0].athlete,0);
const mixed=JSON.parse(JSON.stringify(bundle));
mixed.session.records.push({...mixed.session.records[0],participantId:first[2].id});
assert.throws(()=>api.sanitizeBundle(mixed),/Uszkodzone/);
const firstImport=api.receive(bundle);
assert.equal(firstImport.imported,true);
assert.equal(confirmations,1);
let h=JSON.parse(localStorage.getItem('trainer3.history'));
assert.equal(h.length,1);
assert.equal(h[0].records[0].kg,45);
assert.equal(h[0].participantId,'owner-id-12345');
const secondImport=api.receive(bundle);
assert.equal(secondImport.imported,false);
assert.equal(confirmations,1);
h=JSON.parse(localStorage.getItem('trainer3.history'));
assert.equal(h.length,1);
assert.equal(h[0].records.length,1);
const bigger=JSON.parse(JSON.stringify(bundle));
bigger.session.records.push({...bigger.session.records[0],uid:'d',set:1,reps:10});
const updated=api.receive(bigger);
assert.equal(updated.imported,false);
assert.equal(JSON.parse(localStorage.getItem('trainer3.history'))[0].records.length,2);
assert.equal(confirmations,1);
assert.throws(()=>api.sanitizeBundle({...bundle,version:2}),/Nieprawidłowy/);
const java=fs.readFileSync('app/src/main/java/pl/edwin/trener2/DietWidgetProvider.java','utf8');
const receiver=fs.readFileSync('app/src/main/java/pl/edwin/trener2/HydrationReceiver.java','utf8');
const xml=fs.readFileSync('app/src/main/res/layout/diet_widget.xml','utf8');
assert.match(java,/R\.id\.widgetWaterAdd100, addWater100Pending/);
assert.match(receiver,/ACTION_ADD_100/);
assert.match(receiver,/HydrationStore\.addWater\(context, amount\)/);
assert.match(xml,/android:id="@\+id\/widgetWaterAdd100"/);
console.log('One-phone transfer and widget tests passed');
