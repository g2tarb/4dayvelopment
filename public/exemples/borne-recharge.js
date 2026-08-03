(function(){
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
  },{threshold:.12});
  document.querySelectorAll('.rv').forEach(function(el){io.observe(el)});

  var f=document.getElementById('lead'),t=document.getElementById('toast');
  f.addEventListener('submit',function(e){
    e.preventDefault();
    t.classList.add('on');
    t.scrollIntoView({block:'nearest',behavior:'smooth'});
    clearTimeout(t._h);
    t._h=setTimeout(function(){t.classList.remove('on')},6000);
  });
})();
