(function(){
  // Toast démo sur tous les CTA de commande
  var toast=document.getElementById('toast'),t;
  document.querySelectorAll('.js-demo').forEach(function(b){
    b.addEventListener('click',function(){
      clearTimeout(t);
      toast.classList.add('on');
      t=setTimeout(function(){toast.classList.remove('on')},2800);
    });
  });
  // Reveal au scroll
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){e.target.classList.add('vu');io.unobserve(e.target)}
      });
    },{threshold:.12,rootMargin:'0px 0px -30px 0px'});
    document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
  }else{
    document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('vu')});
  }
})();
