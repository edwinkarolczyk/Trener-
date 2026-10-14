'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const c=require('../scripts/lite-profile-core.js');
const alice='profile-001',bob='profile-002';
const roster=[{index:0,id:alice,name:'Ala'},{index:1,id:bob,name:'Bartek'}];
const session={id:'w12345',sessionId:'one:abc123',iso:'2026-10-10T10:00:00Z',plan:'Plan',
 participantId:alice,localAthlete:0,onePhone:{participants:roster},records:[
 {uid:'s1',participantId:alice,athlete:0,ex:0,set:0,id:'bench',name:'Ławka',kg:45,reps:8},
 {uid:'s2',participantId:bob,athlete:1,ex:0,set:0,id:'bench',name:'Ławka',kg:30,reps:10}]};
test('migracja zachowuje ID, nazwy i blokuje nazwy po pierwszej serii',()=>{
 const p=c.build(null,roster,[session],null,[],roster[0]);
 assert.equal(p.people[0].id,alice);assert.equal(p.people[1].id,bob);
 assert.equal(p.people[1].locked,true);
 assert.throws(()=>c.change(p,bob,'Nowa nazwa'),/zablokowana/i);
 const noHistory=c.build(p,roster,[],null,[],roster[0]);
 assert.equal(noHistory.people[1].locked,true);
});
test('puste profile można poprawić, nie zmieniając ID',()=>{
 const p=c.build(null,roster,[],null,[],roster[0]);
 const renamed=c.change(p,bob,'Robert');
 assert.equal(renamed.people[1].id,bob);
 assert.equal(renamed.people[1].name,'Robert');
 assert.equal(p.people[1].name,'Bartek');
});
test('wybór dowolnej osoby, kolejność nie zmienia identyfikatora',()=>{
 const p=c.build(null,roster,[],null,[],roster[0]);
 assert.deepEqual(c.select(p,[bob,alice]).map(x=>x.id),[bob,alice]);
 assert.equal(c.select(p,[bob])[0].index,0);
 assert.throws(()=>c.select(p,[bob,bob]),/różnych/);
});
test('wznowienie serii i rekord 1RM blokują nazwę',()=>{
 const p=c.build(null,roster,[],{participants:roster,records:[{participantId:bob,kg:25,reps:8}]},
 [{profileId:alice,kg:65}],roster[0]);
 assert.equal(p.people[0].locked,true);assert.equal(p.people[1].locked,true);
});
test('telefon otrzymuje tylko własne serie uczestnika',()=>{
 const file=c.sessionFor(session,{id:bob,name:'Bartek'});
 assert.equal(file.format,'trener2-one-phone-session');
 assert.equal(file.version,1);
 assert.equal(file.originParticipantId,bob);
 assert.equal(file.session.records.length,1);
 assert.equal(file.session.records[0].kg,30);
 assert.equal(file.session.records[0].athlete,0);
});
test('paczka pełnego profilu nie zawiera innych profili',()=>{
 const bundle=c.personExport({id:alice,name:'Ala',locked:true},[session],
 [{id:'pr1',profileId:alice,kg:72},{id:'pr2',profileId:bob,kg:85}]);
 assert.equal(bundle.sessions.length,1);
 assert.equal(bundle.personalRecords.length,1);
 assert.equal(bundle.personalRecords[0].kg,72);
});
test('stara sesja bez participantId wybiera serie według historycznej kolejności',()=>{
 const old=JSON.parse(JSON.stringify(session));
 old.records.forEach(r=>delete r.participantId);
 assert.equal(c.sessionFor(old,{id:bob,name:'Bartek'}).session.records[0].kg,30);
});
test('migracja wybiera najstarsze historyczne imię dla już trenowanej osoby',()=>{
 const later=JSON.parse(JSON.stringify(session));
 later.iso='2026-10-12T10:00:00Z';
 later.onePhone.participants[1].name='Nowa osoba';
 const p=c.build(null,later.onePhone.participants,[later,session],null,[],roster[0]);
 assert.equal(p.people[1].name,'Bartek');
 assert.equal(p.people[1].locked,true);
});
