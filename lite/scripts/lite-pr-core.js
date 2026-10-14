(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TrenerLitePRCore=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  var MS_WEEK=7*24*60*60*1000;
  function estimate(kg,reps){
    var w=Number(kg),r=Number(reps);
    if(!isFinite(w)||!isFinite(r)||w<=0||r<1||r>10||Math.floor(r)!==r)return null;
    return Math.round((r===1?w:w*(1+r/30))*10)/10;
  }
  function isDue(lastAction,intervalWeeks,now){
    var weeks=Number(intervalWeeks);
    if(!isFinite(weeks)||weeks<=0)return false;
    if(!lastAction)return true;
    return Number(now)-Number(lastAction)>=weeks*MS_WEEK;
  }
  function historyRows(hist,profileId){
    var rows=[],profile=String(profileId||'');
    if(!profile||!Array.isArray(hist))return rows;
    hist.forEach(function(h){
      if(!h||!Array.isArray(h.records))return;
      var members=h.onePhone&&Array.isArray(h.onePhone.participants)?
        h.onePhone.participants:(h.group&&Array.isArray(h.group.participants)?h.group.participants:[]);
      var member=members.filter(function(p){return String(p.id||p.deviceId||'')===profile;})[0];
      var fallback=String(h.participantId||'')===profile;
      h.records.forEach(function(r){
        if(!r)return;
        var belongs=false;
        if(r.participantId!==undefined&&r.participantId!==null&&String(r.participantId)!==''){
          belongs=String(r.participantId)===profile;
        }else if(member){
          belongs=Number(r.athlete||0)===Number(member.index||0);
        }else if(!members.length&&fallback){
          belongs=Number(r.athlete||0)===Number(h.localAthlete||0);
        }
        if(!belongs)return;
        var kg=Number(r.kg),reps=Number(r.reps);
        if(!isFinite(kg)||kg<=0||!isFinite(reps)||reps<1||r.time)return;
        rows.push({exerciseId:String(r.id||r.name||''),exerciseName:String(r.name||r.id||'Ćwiczenie'),
          kg:kg,reps:reps,date:String(h.iso||h.date||''),sessionId:String(h.sessionId||h.id||''),
          at:Number(r.at)||Date.parse(String(h.iso||''))||0});
      });
    });
    return rows;
  }
  function bestEstimated(rows,id){
    var chosen=null;
    (rows||[]).forEach(function(r){
      if(String(r.exerciseId)!==String(id))return;
      var value=estimate(r.kg,r.reps);
      if(value===null)return;
      if(!chosen||value>chosen.estimated)chosen={estimated:value,kg:r.kg,reps:r.reps,date:r.date};
    });
    return chosen;
  }
  function safeInterval(weeks){
    var n=Number(weeks);
    return n===0||n===4||n===6||n===8?n:8;
  }
  return {estimate:estimate,isDue:isDue,historyRows:historyRows,bestEstimated:bestEstimated,safeInterval:safeInterval};
});
