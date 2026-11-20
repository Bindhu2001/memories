(function () {
  const box = document.getElementById('hearts');
  if (!box) return;

  const P = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.6 4.5 6.3 4.5c2.2 0 3.9 1.3 5.7 3.4 1.8-2.1 3.5-3.4 5.7-3.4 3.7 0 5.4 3.9 3.9 7.3C19.5 16.4 12 21 12 21z';

  // Style 1: glowing red heart
  const glow = `<svg viewBox="0 0 24 24"><defs><radialGradient id="g1" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#ff8aa5"/><stop offset=".6" stop-color="#ff3d6e"/><stop offset="1" stop-color="#d8174f"/></radialGradient></defs><path d="${P}" fill="url(#g1)"/></svg>`;

  // Style 2: layered pink heart (outer pink, inner lighter, centre red)
  const layered = `<svg viewBox="0 0 24 24"><path d="${P}" fill="#ff7eb6"/><path d="${P}" fill="#ffc2dc" transform="translate(12 12.4) scale(.72) translate(-12 -12.4)"/><path d="${P}" fill="#ff4d79" transform="translate(12 12.8) scale(.42) translate(-12 -12.8)"/></svg>`;

  function spawn() {
    const h = document.createElement('div');
    const isGlow = Math.random() > .5;
    h.className = 'heart ' + (isGlow ? 'glow' : 'layered');
    h.innerHTML = isGlow ? glow : layered;
    const size = 9 + Math.random() * 13;               // small: 9-22px
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
