# HHC Job Tracker — Version 1.1

This is the revised Version 1.1 build.

## Version 1.1 features

- Crew selector for **HHBLACK, HHBLUE, HHGREEN, and HHRED**
- Crew-specific job list
- Simulated Microsoft Access / office import
- Locked customer, address, lift/equipment, and previous-service information
- Crew-entered technicians, call status, arrival/leave times, items used, work performed, and notes
- Separate **Take Photo** and **Upload Photos** controls
- Multiple existing photos can be selected from an iPhone/iPad/desktop photo library
- Local device storage for the prototype
- Draft / In Progress / Completed job status
- Home Screen PWA support and basic offline loading

## Revised in this V1.1 package

### Direct PDF sharing on iPhone/iPad
The **Share PDF** button now creates a real PDF file inside the web app instead of opening the browser Print screen first.

On compatible iPhone/iPad browsers and Home Screen PWAs, it opens the native iOS **Share sheet** so the PDF can be sent by Messages, Mail, AirDrop, Files, etc.

If file sharing is unavailable in a browser, the app falls back to downloading the PDF.

### Office-friendly PDF
The PDF's first page is generated in the familiar HydroHoist service-sheet style, with:
- Customer information
- Lake and billing addresses
- Boat / slip information
- Job number, technicians, call status, arrival/leave time
- Items used
- Lift/equipment information
- Previous service calls
- Work performed / notes

Uploaded job photos are placed on additional PDF pages so the service sheet remains clean and familiar to office staff.

Filename format:
`Customer Name M-D-Y.pdf`

Example:
`Roy Holmes 8-16-2026.pdf`

### HydroHoist branding
The app now uses the HydroHoist of the Carolinas **flag mark supplied by the user**:
- In the app interface
- As the Home Screen / PWA icon
- In exported PDFs

## Still mocked in V1.1

- Real Microsoft Access integration
- Office-to-crew cloud synchronization
- User authentication
- Cloud photo backup
- Cross-device synchronization
- Sending completed records directly back into Access

## Updating the GitHub Pages app

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

Then commit the changes to `main`.

Important: because the service worker is cached, after GitHub Pages redeploys you may need to close and reopen the Home Screen app once before the new V1.1 appearance is visible.
