(function(){
  'use strict';
  // Reveal au scroll
  var els=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){e.target.classList.add('vu');io.unobserve(e.target);}
      });
    },{threshold:.12,rootMargin:'0px 0px -30px 0px'});
    els.forEach(function(el){io.observe(el);});
  }else{
    els.forEach(function(el){el.classList.add('vu');});
  }
  // Formulaire démo → toast
  var toast=document.getElementById('toast'),timer=null;
  function showToast(msg){
    toast.textContent=msg;
    toast.classList.add('on');
    clearTimeout(timer);
    timer=setTimeout(function(){toast.classList.remove('on');},4000);
  }
  document.getElementById('form-devis').addEventListener('submit',function(ev){
    ev.preventDefault();
    showToast('Ceci est une démonstration — sur votre site, cette demande arriverait par email et SMS.');
  });
})();
