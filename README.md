# HHC Job Tracker — Version 1.2 Final

Version 1.2 final keeps the Version 1.1 HydroHoist service-sheet workflow and adds the weekly crew dispatch system approved on August 17, 2026.

## New in Version 1.2

### Monday–Saturday job board
- Jobs are organized into **Monday, Tuesday, Wednesday, Thursday, Friday, and Saturday** tabs.
- Each tab shows the number of jobs still remaining that day.
- Completed jobs stay attached to their scheduled day but collapse into a **Completed** section so the active list stays clean.
- Office-imported jobs now have a `scheduledDate` / `weekKey` concept so they can automatically land on the correct day.

### Sunday weekly rollover
- Sunday is treated as the boundary for the next Monday–Saturday dispatch week.
- When the app is opened in a new work week, completed jobs from the old week move into **Archive**.
- Unfinished old jobs are **not deleted**. They become **Carryover Jobs** and remain visible until handled.
- The rollover also works if the app was not opened on Sunday; it is applied the next time the app opens.

### Weekly Archive
- Archived jobs are grouped by their original work week.
- A job can also be archived manually at any time.
- Archived jobs can still be opened, viewed, mapped, and shared as PDFs.
- Archived jobs can be restored to the current week.
- Permanent deletion is available behind a confirmation prompt.

### Apple Maps directions
- Job cards now show the full **Lake Address** and include a **Maps** button.
- The service sheet also has a prominent **Open Lake Address in Maps** button plus an inline **Directions** button beside Lake Address.
- Directions always use the Lake Address fields, not the billing address.

### Demo office import
- **Simulate Office Import** now loads a sample Monday–Saturday week for the selected crew so the weekly workflow can be tested immediately.

## Existing Version 1.1 features retained

- Crew selector for **HHBLACK, HHBLUE, HHGREEN, and HHRED**
- Locked/prefilled customer, address, lift/equipment, and service-history information
- Crew-entered technicians, call status, arrival/leave times, items used, work performed, and notes
- Separate **Take Photo** and **Upload Photos** controls
- Multiple photo selection
- Local device storage
- Assigned / In Progress / Completed statuses
- Direct PDF creation and iPhone/iPad Share-sheet workflow when supported
- HydroHoist service-sheet-style completed-job PDF
- PDF filename format: `Customer Name M-D-Y.pdf`
- HydroHoist of the Carolinas branding and Home Screen PWA support
- Basic offline loading

## Data migration

Version 1.2 intentionally keeps the existing local-storage key (`hhc-job-tracker-v1`) so an iPhone/iPad that already used V1.1 can keep its locally saved jobs. Older jobs are normalized with the new scheduling fields automatically.

## Prototype limitation

Photos and archived records are still stored locally in the browser/PWA. A long-running production archive with many photos should move to cloud storage when the office synchronization phase is built, because browser local storage is finite.

## Still mocked

- Real Microsoft Access integration
- Office-to-crew cloud synchronization
- User authentication
- Cloud photo/archive backup
- Cross-device synchronization
- Sending completed records directly back into Access

## Updating GitHub Pages

Replace/upload these files in the root of the `HHC-Job-tracker` repository:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `service-worker.js`
- `logo-flag.png`
- `icon-192.png`
- `icon-512.png`
- `apple-touch-icon.png`
- `icon.svg` (optional fallback)

Commit the changes to `main`.

Because Version 1.2 changes the service-worker cache name, the new build should replace V1.1 after GitHub Pages deploys. If the Home Screen app still shows the old version, fully close it and reopen it once.
