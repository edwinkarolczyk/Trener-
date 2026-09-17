(function(){
  'use strict';
  function version(){try{return window.Android&&Android.getAppVersion?String(Android.getAppVersion()):'0.0.0'}catch(e){return '0.0.0'}}
  function parts(v){return String(v||'0').replace(/^v/i,'').split('.').map(x=>parseInt(x,10)||0)}
  function gte(a,b){const x=parts(a),y=parts(b),n=Math.max(x.length,y.length);for(let i=0;i<n;i++){const A=x[i]||0,B=y[i]||0;if(A>B)return true;if(A<B)return false}return true}
  const current=version();
  const features=[
    ['0.5.8','v058-smart-set.js'],
    ['0.5.9','v059-readiness.js'],
    ['0.6.0','v060-equipment.js'],
    ['0.6.1','v061-progress-charts.js'],
    ['0.6.2','v062-compact-workout.js'],
    ['0.6.3','v063-rest-focus.js'],
    ['0.6.3.1','v0631-workout-scroll-ui.js'],
    ['0.6.3.2','v0632-duo-guard.js'],
    ['0.6.3.4','v0634-ai-visuals.js'],
    ['0.6.3.5','v0635-duo-profile-finish.js'],
    ['0.6.3.6','v0636-feedback.js'],
    ['0.6.4','v064-group-session.js'],
    ['0.6.4','v064-group-guard.js'],
    ['0.6.4.2','v0642-adaptive-volume.js'],
    ['0.6.4.3','v0643-resilient-sync.js'],
    ['0.7.0','v070-beta-queue.js'],
    ['0.7.2','v072-beta-plan-timers.js'],
    ['0.7.0','v070-beta-planner.js'],
    ['0.7.0','v070-beta-recovery.js'],
    ['0.7.0','v070-beta-data.js'],
    ['0.7.0','v070-beta-sync-hardening.js'],
    ['0.7.1','v071-shared-ui-authority.js'],
    ['0.7.4','v074-safe-finish.js'],
    ['0.7.5','v075-ui-photo-fixes.js'],
    ['0.7.6','v076-diet.js'],
    ['0.7.7','v077-diet-quick.js'],
    ['0.7.7','v077-widget-sync.js'],
    ['0.7.7','v077-sound-haptics.js']
  ];
  features.forEach(([min,src])=>{
    if(!gte(current,min))return;
    if(document.querySelector(`script[data-trener-feature="${src}"]`))return;
    const s=document.createElement('script');s.src=src;s.dataset.trenerFeature=src;s.async=false;document.body.appendChild(s);
  });
})();
