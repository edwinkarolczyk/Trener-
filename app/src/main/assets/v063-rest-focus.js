(function(){
  'use strict';

  function installCss(){
    if(document.getElementById('v063-rest-focus-style'))return;
    const s=document.createElement('style');
    s.id='v063-rest-focus-style';
    s.textContent=`
      body.v062Active #training #restBox{
        position:relative!important;
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
        align-items:center!important;
        text-align:center!important;
        min-height:76px!important;
        flex:0 0 76px!important;
        padding:7px 74px 7px 12px!important;
        border:1px solid #35292a!important;
        background:linear-gradient(180deg,#100d0d,#090909)!important;
        transition:min-height .15s ease,flex-basis .15s ease,border-color .15s ease,background .15s ease!important;
      }
      body.v062Active #training #restBox .small{
        position:static!important;
        display:block!important;
        width:100%!important;
        margin:0 0 2px!important;
        text-align:center!important;
        font-size:10px!important;
        font-weight:950!important;
        letter-spacing:.12em!important;
        color:#a9a9a9!important;
      }
      body.v062Active #training #restTime{
        display:block!important;
        width:100%!important;
        margin:0!important;
        text-align:center!important;
        font-size:38px!important;
        line-height:.95!important;
        font-weight:1000!important;
        letter-spacing:.025em!important;
        color:#fff!important;
        font-variant-numeric:tabular-nums!important;
      }
      body.v062Active #training .v062RestTarget{
        display:block!important;
        width:100%!important;
        margin:3px 0 0!important;
        text-align:center!important;
        font-size:9px!important;
        font-weight:850!important;
        color:#888!important;
      }
      body.v062Active #training #skipRestBtn{
        position:absolute!important;
        right:8px!important;
        top:50%!important;
        transform:translateY(-50%)!important;
        min-width:60px!important;
        max-width:64px!important;
        min-height:46px!important;
        height:46px!important;
        padding:5px 6px!important;
        margin:0!important;
        font-size:9px!important;
        line-height:1.05!important;
      }
      body.v062Active #training #restBox.v063RestActive{
        min-height:108px!important;
        flex-basis:108px!important;
        border-color:#7a3d3f!important;
        background:radial-gradient(circle at 50% 45%,#261314 0%,#120b0c 58%,#090909 100%)!important;
        box-shadow:0 0 0 1px rgba(239,75,77,.08) inset!important;
      }
      body.v062Active #training #restBox.v063RestActive .small{
        color:#ff7779!important;
        font-size:11px!important;
      }
      body.v062Active #training #restBox.v063RestActive #restTime{
        font-size:58px!important;
        color:#fff!important;
        text-shadow:0 0 18px rgba(239,75,77,.22)!important;
      }
      body.v062Active #training #restBox.v063RestActive .v062RestTarget{
        color:#c8a2a3!important;
        font-size:10px!important;
      }
      body.v062Active #training .controls{
        flex-basis:54px!important;
      }
      body.v062Active #training .controls button{
        height:54px!important;
        min-height:54px!important;
        font-size:14px!important;
      }
      @media(max-height:720px){
        body.v062Active #training #restBox{min-height:64px!important;flex-basis:64px!important;padding-top:5px!important;padding-bottom:5px!important}
        body.v062Active #training #restTime{font-size:32px!important}
        body.v062Active #training #restBox.v063RestActive{min-height:86px!important;flex-basis:86px!important}
        body.v062Active #training #restBox.v063RestActive #restTime{font-size:48px!important}
        body.v062Active #training .controls{flex-basis:46px!important}
        body.v062Active #training .controls button{height:46px!important;min-height:46px!important;font-size:12px!important}
      }
      @media(max-width:380px){
        body.v062Active #training #restBox.v063RestActive #restTime{font-size:52px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function update(){
    const box=document.getElementById('restBox');
    if(!box)return;
    let active=false;
    try{active=typeof restEnd!=='undefined' && Number(restEnd)>Date.now();}catch(e){}
    box.classList.toggle('v063RestActive',active);
    const small=box.querySelector('.small');
    if(small&&active)small.textContent='PRZERWA';
  }

  function boot(){
    installCss();
    setInterval(update,150);
    document.addEventListener('visibilitychange',update);
    update();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
