# Lead Capture Popup — Setup (5 minutes)

The website now shows a popup ~4 seconds after a first-time visitor lands. It
collects **name, email, and phone**, then sends each submission to a Google
Sheet you control. Visitors only see it once (we remember with `localStorage`),
and every lead is also backed up in the browser's `localStorage` under the key
`210-leads` as a safety net.

Follow these steps once to make leads flow into a spreadsheet automatically.

## 1. Create the Google Sheet

1. Go to <https://sheets.google.com> and create a **new blank spreadsheet**.
2. Name it e.g. `210 Tint — Leads`.
3. In **row 1**, add these headers (column A–E):

   | A          | B    | C     | D     | E      |
   |------------|------|-------|-------|--------|
   | Timestamp  | Name | Email | Phone | Source |

## 2. Add the Apps Script

1. In that sheet, go to **Extensions → Apps Script**.
2. Delete whatever is in `Code.gs` and paste this:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      data.ts || new Date().toISOString(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.source || ''
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Click **Save** (disk icon).

## 3. Deploy as a Web App

1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" → choose **Web app**.
3. Set:
   - **Description:** `210 lead capture`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy**, authorize when prompted (allow your own account).
5. Copy the **Web app URL** — it looks like:
   `https://script.google.com/macros/s/AKfyc.....X/exec`

## 4. Paste the URL into the site

Open `src/App.tsx`, find the `LeadCapturePopup` function near the top, and
replace this line:

```js
const LEAD_ENDPOINT = 'https://script.google.com/macros/s/PASTE_YOUR_SCRIPT_ID/exec';
```

with your real Web app URL. Then rebuild/redeploy the site.

That's it — every popup submission now appends a row to your Google Sheet in
real time. To get it as Excel: **File → Download → Microsoft Excel (.xlsx)**.

## Notes

- **Updating the script later?** Use **Deploy → Manage deployments → Edit →
  New version** so the same URL keeps working (a brand-new deployment gives a
  new URL you'd have to paste in again).
- **CORS:** Apps Script doesn't return CORS headers, so the site posts with
  `mode: 'no-cors'`. The row still saves; the browser just can't read the
  response. This is expected and fine for lead capture.
- **Before the URL is set:** until you paste the real URL, the popup still works
  for visitors and stores leads locally (`localStorage['210-leads']`), but
  nothing reaches the sheet yet.
