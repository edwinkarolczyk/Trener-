(function(){
  'use strict';

  function activeGroup(){
    try{return !!(window.TrenerGroup&&TrenerGroup.groupSession&&net&&net.active);}catch(e){return false;}
  }

  function snapshot(){
    try{
      if(net.role!=='host'||!activeGroup())return;
      wifiSend({
        type:'GROUP_SNAPSHOT',
        targetDeviceId:null,
        active:true,
        sessionId:net.sessionId,
        planKey,
        plan:currentPlan,
        participants:[...(TrenerGroup.participants||[])],
        names:[...(net.names||[])],
        done:[...(net.done||[])],
        records:[...(records||[])],
        sharedEquipment:!!TrenerGroup.sharedEquipment,
        sharedLoads:Object.assign({},TrenerGroup.sharedLoads||{}),
        extraSets:JSON.parse(JSON.stringify(TrenerGroup.extraSets||{})),
        positions:JSON.parse(JSON.stringify(TrenerGroup.positions||{})),
        paused:!!paused,
        elapsed:running?elapsedMs():0
      });
    }catch(e){}
  }

  function wrapWifi(){
    if(!window.TrenerWifi||window.TrenerWifi.__v064Guard)return false;
    const base=window.TrenerWifi.nativeMessage.bind(window.TrenerWifi);
    window.TrenerWifi.nativeMessage=function(raw){
      let m=null;try{m=JSON.parse(raw);}catch(e){}
      try{
        if(m&&m.type==='GROUP_SNAPSHOT'&&m.active&&net.role==='guest'&&window.TrenerGroup){
          TrenerGroup.groupSession=true;
          if(typeof m.sharedEquipment==='boolean')TrenerGroup.sharedEquipment=m.sharedEquipment;
        }
        if(m&&m.type==='SNAPSHOT'&&activeGroup()){
          return;
        }
        if(m&&m.type==='RESYNC'&&activeGroup()&&net.role==='host'&&m.sessionId===net.sessionId){
          if(Array.isArray(m.records))m.records.forEach(mergeRecord);
          const a=Number(m.athlete)||1;
          net.done[a]=!!m.done;
          snapshot();
          try{renderLivePanel();}catch(e){}
          return;
        }
      }catch(e){}
      return base(raw);
    };
    window.TrenerWifi.__v064Guard=true;
    return true;
  }

  function installStyle(){
    if(document.getElementById('v064-guard-style'))return;
    const s=document.createElement('style');
    s.id='v064-guard-style';
    s.textContent='html.v064SharedMode #v058Advice{display:none!important}';
    document.head.appendChild(s);
  }

  function boot(){wrapWifi();installStyle();setInterval(()=>{wrapWifi();installStyle();},1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
