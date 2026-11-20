(function () {
  const box = document.getElementById('hearts');
  if (!box) return;
  const glyphs = ['❤️', '💕', '💖', '💗', '🌹', '✨'];

  function spawn() {
    const h = document.createElement('div');
    h.className = 'heart';
    h.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    const dur = 7 + Math.random() * 7;               // 7-14s rise
    h.style.left = Math.random() * 100 + '%';
    h.style.fontSize = (16 + Math.random() * 34) + 'px';
    h.style.setProperty('--sway', (Math.random() * 120 - 60).toFixed(0) + 'px');
    h.style.animationDuration = dur + 's';
    box.appendChild(h);
    setTimeout(() => h.remove(), dur * 1000);
  }
  for (let i = 0; i < 14; i++) setTimeout(spawn, i * 250);
  setInterval(spawn, 450);
})();
