(function () {
  const URL_ = (window.MEMORY_CONFIG || {}).scriptUrl;
  const $ = (id) => document.getElementById(id);
  const gallery = $('gallery'), statusEl = $('status');

  const setStatus = (t) => { statusEl.textContent = t || ''; };
  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
    return isNaN(dt) ? '' : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const imgUrl = (id, w) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;

  function render(items) {
    gallery.innerHTML = '';
    if (!items.length) {
      gallery.innerHTML = '<div class="empty">No memories yet — add your first one 💕</div>';
      return;
    }
    items.forEach((m, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.animationDelay = Math.min(i * 0.06, 1) + 's';

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = m.note || 'Memory';
      img.src = imgUrl(m.id, 600);

      const meta = document.createElement('div');
      meta.className = 'meta';
      const date = document.createElement('div');
      date.className = 'date';
      date.textContent = fmtDate(m.date);
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = m.note || '';
      meta.append(date, note);

      card.append(img, meta);
      card.addEventListener('click', () => {
        $('viewImg').src = imgUrl(m.id, 1600);
        $('viewDate').textContent = fmtDate(m.date);
        $('viewNote').textContent = m.note || '';
        $('viewer').classList.add('open');
      });
      gallery.appendChild(card);
    });
  }

  async function load() {
    if (!URL_) {
      setStatus('Drive is not connected yet — set scriptUrl in js/config.js (see README).');
      render([]);
      return;
    }
    setStatus('Loading memories…');
    try {
      const res = await fetch(URL_);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      render(data.items);
      setStatus('');
    } catch (e) {
      setStatus('Could not load memories: ' + e.message);
    }
  }

  // --- Add memory ---
  const modal = $('addModal'), form = $('addForm');
  $('addBtn').onclick = () => {
    $('date').value = new Date().toISOString().slice(0, 10);
    try { $('key').value = localStorage.getItem('memKey') || ''; } catch (e) {}
    modal.classList.add('open');
  };
  $('cancelBtn').onclick = () => modal.classList.remove('open');
  $('refreshBtn').onclick = load;

  $('photo').addEventListener('change', (e) => {
    const f = e.target.files[0], p = $('preview');
    if (!f) { p.style.display = 'none'; return; }
    p.src = URL.createObjectURL(f);
    p.style.display = 'block';
  });

  // Shrink big phone photos before upload (Apps Script has size limits)
  function toBase64(file, maxSide = 2000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = URL.createObjectURL(file);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!URL_) { alert('Set scriptUrl in js/config.js first.'); return; }
    const btn = $('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const file = $('photo').files[0];
      const body = {
        key: $('key').value,
        date: $('date').value,
        note: $('note').value,
        name: file.name.replace(/\.[^.]+$/, '') + '.jpg',
        data: await toBase64(file),
      };
      // text/plain avoids a CORS preflight, which Apps Script can't answer
      const res = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
      const out = await res.json();
      if (out.error) throw new Error(out.error);
      try { localStorage.setItem('memKey', body.key); } catch (e) {}
      form.reset(); $('preview').style.display = 'none';
      modal.classList.remove('open');
      load();
    } catch (err) {
      alert('Could not save: ' + err.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Save to Drive';
    }
  });

  // Close modals on backdrop click / Esc
  document.querySelectorAll('.modal').forEach((m) =>
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach((m) => m.classList.remove('open'));
  });

  load();
})();
