(function(){
  var toast=document.getElementById('toast'),timer=null;
  function showToast(msg){
    toast.textContent=msg;
    toast.classList.add('show');
    clearTimeout(timer);
    timer=setTimeout(function(){toast.classList.remove('show')},3500);
  }
  document.querySelectorAll('.js-book').forEach(function(b){
    b.addEventListener('click',function(){
      showToast('Ceci est une démonstration — sur votre site, vos clientes réserveraient ici.');
    });
  });
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}
      });
    },{threshold:.12});
    document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
  }else{
    document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('in')});
  }
})();
