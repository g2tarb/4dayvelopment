(function(){
  var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Reveal + compteurs + barres */
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      e.target.classList.add('on');
      e.target.querySelectorAll('.count').forEach(anim);
      io.unobserve(e.target);
    });
  },{threshold:.2});
  document.querySelectorAll('.rv,.stats,.bars').forEach(function(el){io.observe(el)});

  function anim(el){
    if(el.dataset.done)return;el.dataset.done=1;
    var n=+el.dataset.n,pre=el.dataset.pre||'';
    if(rm){el.textContent=pre+n;return}
    var t0=null;
    function tick(t){
      if(!t0)t0=t;
      var p=Math.min((t-t0)/1200,1);
      el.textContent=pre+Math.round(n*(1-Math.pow(1-p,3)));
      if(p<1)requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* Formulaire démo → toast */
  var f=document.getElementById('f'),toast=document.getElementById('toast'),tm;
  f.addEventListener('submit',function(ev){
    ev.preventDefault();
    var msg='Ceci est une démonstration — aucune donnée n\'a été envoyée.';
    if(!f.prenom.value.trim()||!f.tel.value.trim()||!f.obj.value){
      msg='Remplis les 3 champs pour tester le formulaire (démo).';
    }else{f.reset()}
    toast.textContent=msg;
    toast.classList.add('show');
    clearTimeout(tm);
    tm=setTimeout(function(){toast.classList.remove('show')},4200);
  });
})();
