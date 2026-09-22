(function(){
  'use strict';
  // Load last: legacy workout and Diet inject their styles dynamically.
  // Keeping this as a presentation-only layer protects stored workout/diet state.
  function boot(){
    if(document.getElementById('v0895ErgoCss'))return;
    const link=document.createElement('link');
    link.id='v0895ErgoCss';
    link.rel='stylesheet';
    link.href='v0895-ergonomics.css';
    document.head.appendChild(link);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
