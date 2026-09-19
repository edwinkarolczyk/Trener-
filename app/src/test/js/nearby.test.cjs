const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const store=new Map([['trainer3.participantId.v070','owner-12345']]);
const localStorage={
  getItem:k=>store.has(k)?store.get(k):null,
  setItem:(k,v)=>store.set(k,String(v)),
  removeItem:k=>store.delete(k)
};
let approvals=0;
const phone={id:'dawid-12345',name:'Dawid',alias:'dawid-12345'};
const Android={
  nearbyStart(){},nearbyStop(){},nearbyPair(){},nearbySend(){},
  nearbyAck(){},
  nearbyPairs(){return JSON.stringify([phone]);}
};
const window={Android,TrenerData070:{participantId:()=>'owner-12345'}};
const document={readyState:'loading',addEventListener(){},getElementById(id){
 if(id==='nameA')return {value:'Edwin'};
 return null;
}};
const context={window,document,Android,localStorage,
 confirm:()=>{approvals++;return true;},setTimeout(){},clearTimeout(){}};
vm.runInNewContext(fs.readFileSync('app/src/main/assets/v086-one-phone.js','utf8'),
 context,{filename:'v086-one-phone.js',timeout:2000});
vm.runInNewContext(fs.readFileSync('app/src/main/assets/v087-nearby.js','utf8'),
 context,{filename:'v087-nearby.js',timeout:2000});
const one=window.TrenerOnePhone086,near=window.TrenerNearby087;
assert(one&&near);
assert.equal(near.jobKey('dawid','session','participant'),'dawid|session|participant');
near.nativeEvent(JSON.stringify({type:'paired',id:phone.id,name:'Dawid',alias:phone.alias}));
let people=near.people;
assert(people.some(p=>p.id===phone.id&&p.peerId===phone.id));
assert.equal(near.selectedRoster().length,2);
assert.equal(near.selectedRoster()[1].id,'dawid-12345');
near.nativeEvent(JSON.stringify({type:'online',peers:[{id:phone.id,name:'Dawid K.'}]}));
people=near.people;
assert.equal(people.find(p=>p.id===phone.id).name,'Dawid K.');
assert.equal(near.selectedRoster()[1].id,phone.id);
const peopleForHistory=[
 {index:0,id:'owner-12345',name:'Edwin'},
 {index:1,id:'dawid-12345',name:'Dawid K.'}
];
const session={
 sessionId:'one:session12345',plan:'A',planKey:'mon',date:'19.09.2026',
 onePhone:{participants:peopleForHistory},
 records:[
  {uid:'own',participantId:'owner-12345',id:'bench',name:'Bench',kg:50,reps:8,ex:0,set:0},
  {uid:'his',participantId:'dawid-12345',id:'bench',name:'Bench',kg:70,reps:9,ex:0,set:0}
 ]};
const jobs=near.queueFor(session,people,[phone],new Set());
assert.equal(jobs.length,1);
assert.equal(jobs[0].bundle.session.records.length,1);
assert.equal(jobs[0].bundle.session.records[0].uid,'his');
assert.equal(near.queueFor(session,people,[phone],new Set([jobs[0].key])).length,0);
const bundle=jobs[0].bundle;
assert.throws(()=>one.receive(bundle,{trustedSourceId:'owner-12345',expectedOriginId:'not-dawid'}),
 /nie pasuje/);
const imported=one.receive(bundle,{trustedSourceId:'owner-12345',expectedOriginId:'dawid-12345'});
assert.equal(imported.imported,true);
assert.equal(approvals,0);
const again=one.receive(bundle,{trustedSourceId:'owner-12345',expectedOriginId:'dawid-12345'});
assert.equal(again.imported,false);
assert.equal(JSON.parse(store.get('trainer3.history')).length,1);
assert.equal(JSON.parse(store.get('trainer3.history'))[0].records[0].kg,70);
const java=fs.readFileSync('app/src/main/java/pl/edwin/trener2/NearbyProfileManager.java','utf8');
assert.match(java,/SERVICE="_trener2\._tcp\."/);
assert.match(java,/AES\/GCM\/NoPadding/);
assert.match(java,/ECDH/);
assert.match(java,/MessageDigest\.isEqual/);
assert.match(java,/alias\."\+from/);
assert.match(java,/KODY ZGODNE/);
assert.match(java,/new ServerSocket\(0\)/);
assert.match(fs.readFileSync('app/src/main/AndroidManifest.xml','utf8'),/CHANGE_WIFI_MULTICAST_STATE/);
console.log('Nearby paired profile, queue, authenticated import checks passed');
