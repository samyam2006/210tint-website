# BMW M8 Giveaway — Setup

> **⚠️ MODEL CHANGED (current plan).** Entries are now tracked by a **third-party sweepstakes
> administrator** (e.g. American Sweepstakes), **not** by this website or the Google Sheet.
> The on-site "Check My Entries" lookup and the on-site free-entry form have been **removed**;
> free entry is **mail-in** (No Purchase Necessary), and the administrator processes it. The
> giveaway is currently in **soft-launch**: a public "Coming Soon" waitlist is live, while the
> full mechanics/rules stay hidden behind the `GIVEAWAY_LIVE` flag until the attorney +
> administrator sign off.
>
> **What the website still writes to your Google Sheet:** only lead/waitlist rows from the
> popup and the "Notify Me at Launch" coming-soon form (identified by their `source` value,
> e.g. `BMW M8 giveaway waitlist`). The `doGet`/JSONP entry-lookup and the "Giveaway" entry
> ledger below are **deprecated** — keep them only if you later choose to self-administer.

The sections below are retained for reference only (self-administration path).

---

## How entries work (current config)

- **100 entries per $1 spent** on any 210 Tint service
- **+50,000 bonus entries** once a customer's total spend hits **$500**
- **Free entry (no purchase) = 1,000 entries**

Example: a $575 whole-car ceramic tint = 57,500 + 50,000 = **107,500 entries**.

> To change these numbers, edit the constants near the top of the `GiveawayPage` function
> in `src/App.tsx` (`PER_DOLLAR`, `BONUS`, `BONUS_AT`, `FREE_ENTRIES`) **and** the matching
> numbers in the Apps Script below — keep them in sync.

---

## 1. Add a "Giveaway" tab to your Sheet

In the same Google Sheet you use for leads, add a new tab named exactly **`Giveaway`** with
these headers in row 1:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Timestamp | Name | Email | Phone | AmountSpent | EntryType |

**Your ongoing job:**
- After each completed job, add a row — Name, Email, Phone, the dollar **AmountSpent**, and
  put `purchase` in EntryType.
- **Free entries are mail-in** (No Purchase Necessary). When a valid mail-in card arrives, add
  a row with the person's Name/Email/Phone, leave AmountSpent blank, and put `free` in
  EntryType. (The website no longer submits free entries — this keeps the promo a compliant
  sweepstakes without an on-site free form.)

*(Optional) add an `Entries` formula in column G to eyeball each row:*
```
=IF(F2="free", 1000, E2*100 + IF(E2>=500, 50000, 0))
```
*(The website computes the real per-person total itself — this column is just for you.)*

---

## 2. Replace your Apps Script with this

**Extensions → Apps Script**, select all, delete, paste this (it keeps your lead-capture
working AND adds the giveaway). Then **Save**.

```javascript
// ===== 210 Tint — lead capture + BMW M8 giveaway backend =====
var PER_DOLLAR = 100, BONUS = 50000, BONUS_AT = 500, FREE_ENTRIES = 1000;

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    if (data.type === 'giveaway-free') {
      var g = ss.getSheetByName('Giveaway');
      if (!g) { g = ss.insertSheet('Giveaway'); g.appendRow(['Timestamp','Name','Email','Phone','AmountSpent','EntryType']); }
      g.appendRow([ data.ts || new Date().toISOString(), data.name||'', data.email||'', data.phone||'', '', 'free' ]);
    } else {
      var lead = ss.getSheetByName('Leads') || ss.getSheets()[0];
      lead.appendRow([ data.ts || new Date().toISOString(), data.name||'', data.email||'', data.phone||'', data.source||'' ]);
    }
    return ContentService.createTextOutput(JSON.stringify({result:'ok'})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({result:'error', error:String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var cb = e && e.parameter && e.parameter.callback;
  // Plain browser visit = health check
  if (!cb) {
    return ContentService.createTextOutput('210 Tint backend is live ✅').setMimeType(ContentService.MimeType.TEXT);
  }
  var email = ((e.parameter.email||'') + '').trim().toLowerCase();
  var phone = ((e.parameter.phone||'') + '').replace(/[^0-9]/g,'');
  var out = { found:false, entries:0, totalSpend:0 };
  try {
    var g = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Giveaway');
    if (g) {
      var rows = g.getDataRange().getValues();
      var name='', totalSpend=0, freeCount=0, matched=false;
      for (var i=1; i<rows.length; i++) {
        var r = rows[i];
        var rEmail = ((r[2]||'') + '').trim().toLowerCase();
        var rPhone = ((r[3]||'') + '').replace(/[^0-9]/g,'');
        var hit = (email && rEmail && rEmail === email) ||
                  (phone.length >= 10 && rPhone.length >= 10 && rPhone.slice(-10) === phone.slice(-10));
        if (!hit) continue;
        matched = true;
        if (!name && r[1]) name = (r[1] + '');
        if (((r[5]||'') + '').trim().toLowerCase() === 'free') { freeCount++; }
        else { totalSpend += parseFloat(((r[4]||'0') + '').replace(/[^0-9.]/g,'')) || 0; }
      }
      if (matched) {
        var bonus = totalSpend >= BONUS_AT ? BONUS : 0;
        out = { found:true, name:name, totalSpend:totalSpend, entries: Math.round(totalSpend*PER_DOLLAR + bonus + freeCount*FREE_ENTRIES) };
      }
    }
  } catch (err) { out = { found:false, entries:0, error:String(err) }; }
  return ContentService.createTextOutput(cb + '(' + JSON.stringify(out) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
```

> Note: if your leads currently land on the first tab, either rename that tab to **`Leads`**
> or leave it — the script falls back to the first tab automatically, so leads keep working.

---

## 3. Re-deploy (same URL)

Very important — **do not create a new deployment** (that would make a new URL):

1. **Deploy → Manage deployments**
2. Click the **✏️ pencil** on your existing deployment
3. **Version → New version** → **Deploy**
4. Keep **Execute as: Me**, **Who has access: Anyone**

That's it. The website already points at this URL, so the lookup and free entries work
immediately.

---

## 4. Test it

- **Health check:** open your `/exec` URL in a browser → should say "210 Tint backend is live ✅".
- **Free entry:** on the giveaway page, submit the free-entry form → a `free` row appears in
  the Giveaway tab.
- **Lookup:** add a test row (your email, AmountSpent `575`, EntryType `purchase`), then use
  "Check My Entries" with that email → should show **107,500 entries**.

---

## Before you launch (important)

- ⚠️ **Legal:** the Official Rules on the page are a **template** — get them (and the
  free-vs-paid entry ratio) reviewed by a professional. A purchase-based car giveaway must be
  run as a sweepstakes with a genuine free-entry path to stay legal.
- **Mailing address + deadline (required):** the free entry is now **mail-in**. Replace the
  `[Mailing address]` and `[deadline]` placeholders — they appear twice in `src/App.tsx`
  (the "Free Entry by Mail" section and the Official Rules). Use a real address you can
  receive mail at (a PO box is fine). Just tell me the address and deadline and I'll fill
  them in.
- **Draw date:** the countdown uses `2026-09-07 8PM ET` — change `DRAW` in the `GiveawayPage`
  function in `src/App.tsx` to your real date.
- **Prize photo:** the hero uses a styled placeholder. Send a real BMW M8 photo and I'll drop
  it in.
- **Fill in the rules blanks:** ARV (car value), eligibility state/age, start date, etc.
