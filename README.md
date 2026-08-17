# HHC Job Tracker — Version 1

This is a front-end Progressive Web App prototype for the HydroHoist crew workflow.

## What works in V1

- Crew selector for HHBLACK, HHBLUE, HHGREEN, and HHRED
- Crew-specific job list
- Simulated "office import" job assignment
- Service-sheet-inspired job detail layout
- Locked/prefilled customer, address, lift/equipment, and service-history fields
- Crew-entered technicians, call status, arrival/leave times, items used, and work notes
- Job photo capture/upload with local previews
- Draft/in-progress/completed status
- Local browser storage
- Print / Save as PDF through the browser
- PWA manifest + service worker for Home Screen installation and basic offline loading

## Intentionally mocked for V1

- Microsoft Access integration
- Real office-to-crew syncing
- User authentication
- Cloud photo storage
- Cross-device synchronization
- Office dashboard / reassignment
- Sending completed job data back to Access

## GitHub Pages

Upload these files to the root of the HHC-Job-tracker repository:

- index.html
- styles.css
- app.js
- manifest.webmanifest
- service-worker.js
- icon.svg

Then publish the `main` branch from `/ (root)` in GitHub Pages.

## Test flow

1. Open the site.
2. Select a crew.
3. Tap **Simulate Office Import**.
4. Open the new job.
5. Enter technicians, arrival time, items used, notes, and photos.
6. Save Draft or Mark as Completed.
7. Use Export PDF to print/save the completed service sheet.

Important: V1 stores job data and photos locally in the browser. Clearing website data can erase them. Do not use this prototype as the company's production job record system until the real server/database sync is added.
