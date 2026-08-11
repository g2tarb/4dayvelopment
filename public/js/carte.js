(function(){
  var b=document.getElementById('qrbtn'), f=document.getElementById('qrfull');
  function open(e){ e.preventDefault(); f.classList.add('on');
    if(f.requestFullscreen){ f.requestFullscreen().catch(function(){}); } }
  function close(){ f.classList.remove('on');
    if(document.fullscreenElement && document.exitFullscreen){ document.exitFullscreen().catch(function(){}); } }
  b.addEventListener('click', open);
  f.addEventListener('click', close);
  if(location.hash==='#qr'){ f.classList.add('on'); }
})();
