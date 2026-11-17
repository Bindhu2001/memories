(function () {
  const box = document.getElementById('hearts');
  if (!box) return;
  function spawn() {
    const h = document.createElement('div');
    h.className = 'heart';
    h.textContent = Math.random() > .3 ? '❤️' : '💕';
    h.style.left = Math.random() * 100 + '%';
    h.style.fontSize = (14 + Math.random() * 20) + 'px';
    box.appendChild(h);
    setTimeout(() => h.remove(), 9000);
  }
  for (let i = 0; i < 10; i++) setTimeout(spawn, i * 400);
  setInterval(spawn, 700);
})();
