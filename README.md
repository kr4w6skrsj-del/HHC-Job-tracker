# JobClock PWA v3

## Current job fields
- Customer Name
- Phone Number
- Items Used
- Notes
- Eastern Time start
- Eastern Time stop
- Completed job photos

## Completed jobs
- Saved locally on the iPhone/browser
- Add more photos later
- Delete jobs
- Export one job to PDF
- Export all jobs to one PDF
- PDF includes customer info, items used, notes, timestamps, and attached photos

## Updating your existing GitHub Pages site
Replace the old files in your JobClock repository with these files:
- index.html
- styles.css
- app.js
- manifest.json
- service-worker.js
- icon-192.png
- icon-512.png

All files are intentionally in the repository root to make phone-based GitHub uploads simpler.

After committing the replacements, GitHub Pages will redeploy automatically. You may need to fully close/reopen the Home Screen app once so the updated service worker takes over.

## Storage note
Jobs and photos are stored locally on the device. They are not uploaded to GitHub and are not synced between phones.
