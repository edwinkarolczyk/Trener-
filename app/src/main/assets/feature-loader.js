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
    ['0.6.1','v061-progress-charts.js']
  ];
  features.forEach(([min,src])=>{
    if(!gte(current,min))return;
    if(document.querySelector(`script[data-trener-feature="${src}"]`))return;
    const s=document.createElement('script');s.src=src;s.dataset.trenerFeature=src;s.async=false;document.body.appendChild(s);
  });
})();