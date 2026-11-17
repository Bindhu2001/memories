/**
 * Memory Vault backend (albums + photos + videos).
 * Runs as the Google account that owns the script and stores everything in
 * Drive:   Memories/            <- root folder
 *            Ooty Trip/         <- one subfolder per album (date + note kept in its description)
 *              IMG_1.jpg, clip.mp4 ...
 *
 * 1. CHANGE the PASSPHRASE below.
 * 2. Deploy > New deployment > Web app
 *      Execute as: Me      Who has access: Anyone
 *    (after editing later: Deploy > Manage deployments > pencil > Version: New version)
 */
const PASSPHRASE = 'ourlove';
const ROOT_NAME = 'Memories';

function root_() {
  const it = DriveApp.getFoldersByName(ROOT_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_NAME);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function meta_(folder) {
  try { return JSON.parse(folder.getDescription() || '{}'); } catch (e) { return {}; }
}

// Only allow folders that are direct children of the root folder
function album_(id) {
  const root = root_(), folder = DriveApp.getFolderById(id), parents = folder.getParents();
  while (parents.hasNext()) if (parents.next().getId() === root.getId()) return folder;
  throw new Error('Album not found');
}

/** GET ?action=albums            -> list albums
 *  GET ?action=album&id=FOLDERID -> list files in an album */
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.action === 'album') {
      const folder = album_(p.id), m = meta_(folder), files = folder.getFiles(), items = [];
      while (files.hasNext()) {
        const f = files.next(), mime = f.getMimeType();
        if (!/^(image|video)\//.test(mime)) continue;
        items.push({ id: f.getId(), name: f.getName(), mime: mime, created: f.getDateCreated().getTime() });
      }
      items.sort((a, b) => a.created - b.created);
      return json_({ id: folder.getId(), name: folder.getName(), date: m.date || '', note: m.note || '', items: items });
    }

    // default: list albums
    const folders = root_().getFolders(), albums = [];
    while (folders.hasNext()) {
      const f = folders.next(), m = meta_(f), files = f.getFiles();
      let count = 0, imageCover = '', videoCover = '';
      while (files.hasNext()) {
        const file = files.next(), mime = file.getMimeType();
        if (!/^(image|video)\//.test(mime)) continue;
        count++;
        if (/^image\//.test(mime)) { if (!imageCover) imageCover = file.getId(); }
        else if (!videoCover) videoCover = file.getId();
      }
      albums.push({
        id: f.getId(), name: f.getName(),
        date: m.date || Utilities.formatDate(f.getDateCreated(), 'UTC', 'yyyy-MM-dd'),
        note: m.note || '', count: count, cover: imageCover || videoCover,
      });
    }
    albums.sort((a, b) => (a.date < b.date ? 1 : -1));
    return json_({ albums: albums });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

/** POST (text/plain JSON) { key, action: 'createAlbum' | 'uploadUrl', ... } */
function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.key !== PASSPHRASE) return json_({ error: 'Wrong passphrase' });

    if (b.action === 'createAlbum') {
      const name = String(b.name || '').trim();
      if (!name) return json_({ error: 'Album name is required' });
      const folder = root_().createFolder(name);
      folder.setDescription(JSON.stringify({ date: b.date || '', note: b.note || '' }));
      // Files inherit this, so the site can show photos and play videos
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return json_({ ok: true, id: folder.getId() });
    }

    if (b.action === 'uploadUrl') {
      // Starts a Drive "resumable upload" so the browser can send big files
      // (videos!) straight to Drive instead of through this script.
      const folder = album_(b.albumId);
      const res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'post',
        contentType: 'application/json; charset=UTF-8',
        headers: {
          Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
          'X-Upload-Content-Type': b.mime || 'application/octet-stream',
          Origin: b.origin,
        },
        payload: JSON.stringify({ name: b.name, parents: [folder.getId()] }),
        muteHttpExceptions: true,
      });
      if (res.getResponseCode() !== 200) return json_({ error: 'Drive error: ' + res.getContentText() });
      const h = res.getHeaders();
      return json_({ ok: true, url: h['Location'] || h['location'] });
    }

    return json_({ error: 'Unknown action' });
  } catch (err) {
    return json_({ error: String(err) });
  }
}
