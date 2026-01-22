# Hero Combo Creator (production-ready)

## Files
- `index.html` — main page
- `css/app.css` — styles (no Tailwind build required)
- `js/firebase.js` — firebase initialization + auth helper
- `js/translations.js` — translations (English included)
- `js/app.js` — app logic

## Quick deploy
Option A — **Netlify** (drag & drop)
1. Zip the folder and drag to Netlify Deploy UI.

Option B — **GitHub Pages**
1. Create a repo and push contents.
2. GitHub → Settings → Pages → Source: `main` branch / root.

## Firebase rules (IMPORTANT)
In Firebase Console → Firestore → Rules, use:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/bestCombos/{comboId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
