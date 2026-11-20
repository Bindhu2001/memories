(function () {
  const box = document.getElementById('hearts');
  if (!box) return;

  // Uses the layered pink heart <symbol id="pheart"> defined in index.html
  function spawn() {
    const h = document.createElement('div');
    h.className = 'heart';
    h.innerHTML = '<svg viewBox="0 0 24 24"><use href="#pheart"/></svg>';
    const size = 10 + Math.random() * 14;              // small: 10-24px
    const dur = 8 + Math.random() * 8;                 // 8-16s rise
    h.style.left = Math.random() * 100 + '%';
    h.style.width = h.style.height = size + 'px';
    h.style.setProperty('--sway', (Math.random() * 80 - 40).toFixed(0) + 'px');
    h.style.animationDuration = dur + 's';
    box.appendChild(h);
    setTimeout(() => h.remove(), dur * 1000);
  }
  for (let i = 0; i < 12; i++) setTimeout(spawn, i * 300);
  setInterval(spawn, 500);
})();
