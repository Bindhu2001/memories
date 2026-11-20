(function () {
  const URL_ = (window.MEMORY_CONFIG || {}).scriptUrl;
  const $ = (id) => document.getElementById(id);
  const thumb = (id, w) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d);
    return isNaN(dt) ? '' : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const monthKey = (d) => (d || '').slice(0, 7) || 'undated';
  const monthLabel = (k) => {
    if (k === 'undated') return 'Undated';
    const dt = new Date(k + '-01T00:00:00');
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // ---------- API ----------
  async function apiGet(params) {
    const res = await fetch(URL_ + '?' + new URLSearchParams(params));
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }
  async function apiPost(body) {
    // text/plain avoids a CORS preflight, which Apps Script can't answer
    const res = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  // ---------- Albums list ----------
  async function loadAlbums() {
    const status = $('status'), box = $('albums');
    if (!URL_) { status.textContent = 'Drive is not connected yet — set scriptUrl in js/config.js.'; return; }
    status.textContent = 'Loading albums…';
    try {
      const { albums } = await apiGet({ action: 'albums' });
      status.textContent = '';
      box.innerHTML = '';
      if (!albums.length) {
        box.innerHTML = '<div class="empty">No albums yet. Create your first one.</div>';
        return;
      }
      const groups = {};
      albums.forEach((a) => (groups[monthKey(a.date)] = groups[monthKey(a.date)] || []).push(a));
      Object.keys(groups).sort().reverse().forEach((k) => {
        const h = document.createElement('h2');
        h.className = 'month';
        h.textContent = monthLabel(k);
        const grid = document.createElement('div');
        grid.className = 'albums';
        groups[k].forEach((a) => grid.appendChild(albumCard(a)));
        box.append(h, grid);
      });
    } catch (e) {
      status.textContent = 'Could not load albums: ' + e.message;
    }
  }

  function albumCard(a) {
    const card = document.createElement('a');
    card.className = 'album-card';
    card.href = '#album=' + a.id;
    const cover = document.createElement('div');
    cover.className = 'cover';
    if (a.cover) {
      const img = document.createElement('img');
      img.loading = 'lazy'; img.alt = ''; img.src = thumb(a.cover, 600);
      cover.appendChild(img);
    }
    const info = document.createElement('div');
    info.className = 'info';
    const t = document.createElement('div'); t.className = 'title'; t.textContent = a.name;
    const m = document.createElement('div'); m.className = 'sub';
    m.textContent = `${fmtDate(a.date)} · ${a.count} ${a.count === 1 ? 'item' : 'items'}`;
    info.append(t, m);
    if (a.note) { const n = document.createElement('div'); n.className = 'note'; n.textContent = a.note; info.appendChild(n); }
    card.append(cover, info);
    return card;
  }

  // ---------- Single album ----------
  let current = null; // {id, items}
  async function openAlbum(id) {
    $('albumsView').hidden = true;
    $('albumView').hidden = false;
    window.scrollTo(0, 0);
    const status = $('albumStatus'), grid = $('mediaGrid');
    grid.innerHTML = '';
    status.textContent = 'Loading…';
    try {
      const a = await apiGet({ action: 'album', id });
      current = a;
      $('albumTitle').textContent = a.name;
      $('albumMeta').textContent = [fmtDate(a.date), a.note].filter(Boolean).join(' — ');
      status.textContent = a.items.length ? '' : 'No photos yet. Add some.';
      a.items.forEach((m, i) => {
        const cell = document.createElement('div');
        cell.className = 'media-item';
        const img = document.createElement('img');
        img.loading = 'lazy'; img.alt = m.name; img.src = thumb(m.id, 500);
        cell.appendChild(img);
        if (m.mime.startsWith('video/')) {
          const b = document.createElement('span'); b.className = 'badge'; b.textContent = '▶';
          cell.appendChild(b);
        }
        cell.addEventListener('click', () => showItem(i));
        grid.appendChild(cell);
      });
    } catch (e) {
      status.textContent = 'Could not load album: ' + e.message;
    }
  }

  // ---------- Viewer ----------
  let idx = 0;
  function showItem(i) {
    const items = current.items;
    idx = (i + items.length) % items.length;
    const m = items[idx], stage = $('stage');
    stage.innerHTML = '';
    if (m.mime.startsWith('video/')) {
      const f = document.createElement('iframe');
      f.src = `https://drive.google.com/file/d/${encodeURIComponent(m.id)}/preview`;
      f.allow = 'autoplay; fullscreen'; f.allowFullscreen = true;
      stage.appendChild(f);
    } else {
      const img = document.createElement('img');
      img.src = thumb(m.id, 2000); img.alt = m.name;
      stage.appendChild(img);
    }
    $('viewCount').textContent = `${idx + 1} / ${items.length}`;
    $('viewer').classList.add('open');
  }
  function closeViewer() { $('viewer').classList.remove('open'); $('stage').innerHTML = ''; }
  $('prevBtn').onclick = () => showItem(idx - 1);
  $('nextBtn').onclick = () => showItem(idx + 1);
  $('closeViewer').onclick = closeViewer;
  $('viewer').addEventListener('click', (e) => { if (e.target === $('viewer')) closeViewer(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach((m) => m.classList.remove('open'));
    if ($('viewer').classList.contains('open')) {
      if (e.key === 'ArrowLeft') showItem(idx - 1);
      if (e.key === 'ArrowRight') showItem(idx + 1);
    }
  });

  // ---------- Create album / upload ----------
  const modal = $('uploadModal'), form = $('uploadForm');
  let mode = 'new'; // 'new' | 'add'

  function openModal(m) {
    mode = m;
    form.reset();
    $('fileCount').textContent = '';
    $('progress').hidden = true;
    $('albumFields').hidden = m !== 'new';
    $('albumName').required = m === 'new';
    $('albumDate').required = m === 'new';
    $('uploadTitle').textContent = m === 'new' ? 'New Album' : 'Add to ' + (current ? current.name : 'album');
    $('albumDate').value = new Date().toISOString().slice(0, 10);
    try { $('key').value = localStorage.getItem('memKey') || ''; } catch (e) {}
    modal.classList.add('open');
  }
  $('newAlbumBtn').onclick = () => openModal('new');
  $('addPhotosBtn').onclick = () => openModal('add');
  $('cancelBtn').onclick = () => modal.classList.remove('open');
  $('refreshBtn').onclick = loadAlbums;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

  $('files').addEventListener('change', (e) => {
    const f = [...e.target.files];
    const mb = f.reduce((s, x) => s + x.size, 0) / 1048576;
    $('fileCount').textContent = f.length ? `${f.length} file${f.length > 1 ? 's' : ''} · ${mb.toFixed(1)} MB` : '';
  });

  // Browser -> Drive directly (resumable session URL from the script)
  function putFile(url, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed (' + xhr.status + ')')));
      xhr.onerror = () => reject(new Error('Network error while uploading ' + file.name));
      xhr.send(file);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!URL_) { alert('Set scriptUrl in js/config.js first.'); return; }
    if (location.origin === 'null' || location.protocol === 'file:') {
      alert('Uploads need the live site (or http://localhost). Open the GitHub Pages link instead of the file.');
      return;
    }
    const key = $('key').value;
    const files = [...$('files').files];
    if (mode === 'new' && !files.length && !confirm('Create the album without any photos?')) return;
    if (mode === 'add' && !files.length) { alert('Choose at least one photo or video.'); return; }

    const btn = $('saveBtn'), prog = $('progress'), fill = $('fill'), ptext = $('ptext');
    btn.disabled = true; btn.textContent = 'Saving…'; prog.hidden = false;
    try {
      let albumId;
      if (mode === 'new') {
        ptext.textContent = 'Creating album…';
        const r = await apiPost({ key, action: 'createAlbum', name: $('albumName').value, date: $('albumDate').value, note: $('albumNote').value });
        albumId = r.id;
      } else albumId = current.id;
      try { localStorage.setItem('memKey', key); } catch (e2) {}

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const label = `Uploading ${i + 1} of ${files.length}: ${f.name}`;
        ptext.textContent = label;
        fill.style.width = (i / files.length * 100) + '%';
        const { url } = await apiPost({ key, action: 'uploadUrl', albumId, name: f.name, mime: f.type || 'application/octet-stream', origin: location.origin });
        await putFile(url, f, (p) => { fill.style.width = ((i + p) / files.length * 100) + '%'; });
      }
      fill.style.width = '100%';
      modal.classList.remove('open');
      if (mode === 'new') { await loadAlbums(); location.hash = '#album=' + albumId; }
      else openAlbum(albumId);
    } catch (err) {
      ptext.textContent = '';
      alert('Could not save: ' + err.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Save to Drive';
    }
  });

  // ---------- Routing (#album=ID makes albums shareable links) ----------
  function route() {
    const m = location.hash.match(/^#album=(.+)$/);
    if (m) openAlbum(decodeURIComponent(m[1]));
    else {
      $('albumView').hidden = true; $('albumsView').hidden = false; closeViewer();
      loadAlbums();
    }
  }
  window.addEventListener('hashchange', route);
  $('backLink').addEventListener('click', (e) => { e.preventDefault(); location.hash = ''; history.replaceState(null, '', location.pathname); route(); });
  route();
})();
