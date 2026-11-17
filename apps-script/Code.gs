/**
 * Memory Vault backend. Runs as ab.memoryvault@gmail.com and stores photos
 * (plus date + note) in a Drive folder called "Memories".
 *
 * 1. CHANGE the PASSPHRASE below.
 * 2. Deploy > New deployment > Web app
 *      Execute as: Me      Who has access: Anyone
 */
const PASSPHRASE = 'change-me';
const FOLDER_NAME = 'Memories';

function getFolder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// List memories (newest first)
function doGet() {
  try {
    const files = getFolder_().getFiles();
    const items = [];
    while (files.hasNext()) {
      const f = files.next();
      let meta = {};
      try { meta = JSON.parse(f.getDescription() || '{}'); } catch (e) {}
      items.push({
        id: f.getId(),
        date: meta.date || Utilities.formatDate(f.getDateCreated(), 'UTC', 'yyyy-MM-dd'),
        note: meta.note || '',
      });
    }
    items.sort((a, b) => (a.date < b.date ? 1 : -1));
    return json_({ items: items });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

// Add a memory
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.key !== PASSPHRASE) return json_({ error: 'Wrong passphrase' });

    const blob = Utilities.newBlob(Utilities.base64Decode(body.data), 'image/jpeg', body.name || 'memory.jpg');
    const file = getFolder_().createFile(blob);
    file.setDescription(JSON.stringify({ date: body.date, note: body.note || '' }));
    // Needed so the site can display the image
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return json_({ ok: true, id: file.getId() });
  } catch (err) {
    return json_({ error: String(err) });
  }
}
