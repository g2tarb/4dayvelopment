(function(){
  // Reveal au scroll
  var els=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){e.target.classList.add('vu');io.unobserve(e.target);}
      });
    },{threshold:.12,rootMargin:'0px 0px -40px 0px'});
    els.forEach(function(el){io.observe(el);});
  }else{
    els.forEach(function(el){el.classList.add('vu');});
  }
  // Toast démo
  var toast=document.getElementById('toast'),timer;
  document.querySelectorAll('.js-resa').forEach(function(btn){
    btn.addEventListener('click',function(){
      toast.classList.add('actif');
      clearTimeout(timer);
      timer=setTimeout(function(){toast.classList.remove('actif');},3800);
    });
  });
})();
