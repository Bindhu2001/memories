# 💕 Memories

A romantic landing page plus a shared photo gallery. Photos, dates and notes are stored in a Google Drive folder.

## Pages
- `index.html` – landing page (background image + words)
- `memories.html` – gallery; **Add a Memory** uploads a photo + date + note to Drive
- `letter.html` – the original animated envelope love letter

## Background image
Save your photo as `images/bg.jpg`. It is used automatically.

## Google Drive setup (one time, signed in as ab.memoryvault@gmail.com)
1. Go to <https://script.google.com> → **New project**.
2. Paste in `apps-script/Code.gs`, and change `PASSPHRASE`.
3. Press **Run** on `doGet` once and approve the Drive permission. This creates the **Memories** folder in Drive.
4. **Deploy → New deployment → Web app** → Execute as **Me**, access **Anyone** → Deploy.
5. Copy the Web app URL into `js/config.js` (`scriptUrl`).
6. In Drive, share the **Memories** folder with the email IDs you want to have direct access.

Uploading from the site needs the passphrase. Anyone can *view* the gallery, but photos are only reachable through their long Drive IDs.

## Run locally
Open `index.html` in a browser.
