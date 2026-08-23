# Setup Google Sheets Webhook (Backup Hybrid)

## 1) Buat Spreadsheet

- Buat file baru: `Moodify Backup Log`.
- Sheet name: `backup_log`.
- Header:
  - `id`
  - `event_type`
  - `username`
  - `source`
  - `created_at`
  - `payload_json`

## 2) Buat Apps Script

Di Spreadsheet, buka `Extensions -> Apps Script`, isi:

```javascript
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("backup_log") || ss.insertSheet("backup_log");

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["id", "event_type", "username", "source", "created_at", "payload_json"]);
    }

    sheet.appendRow([
      body.id || "",
      body.event_type || "",
      body.username || "",
      body.source || "",
      body.created_at || "",
      JSON.stringify(body.payload || {})
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## 3) Deploy Web App

- `Deploy -> New deployment -> Web app`
- Execute as: `Me`
- Who has access: `Anyone`
- Copy URL deployment.

## 4) Isi ENV

Masukkan ke `.env` / Vercel:

- `VITE_SHEETS_WEBHOOK_URL=<URL_DEPLOYMENT_APPS_SCRIPT>`
- `VITE_SHEETS_SOURCE_LABEL=moodify-web`

## 5) Verifikasi

- Lakukan 1 check-in dan 1 posting komunitas.
- Cek sheet `backup_log`, harus muncul 2 baris event baru.
