# Trial-Mode Local Books on Your PC

## What you actually asked for vs what is realistic today

You said: *"All data stored locally and continuously saved on my hard disk, no cloud."*

Honest situation:
- The whole app today (vouchers, ledgers, GST, reports) is built on Lovable Cloud (Supabase). Switching to a **true local database** (SQLite/IndexedDB) means rewriting every read/write in the app — that is weeks of work and I will not pretend otherwise.
- What I **can deliver right now, safely** is a **Trial Mode** that:
  1. Keeps your books working exactly as they do today (so your trial books actually balance, GST is correct, reports print).
  2. **Continuously mirrors every change to your hard disk** as JSON + Excel — so the data effectively *lives* on your PC. If cloud goes away tomorrow, you still have every voucher, ledger, and report on disk.
  3. Marks the company as "Trial / Local-only" so you know it.
- The fully offline SQLite edition will be a **Phase 2** milestone after you've validated the trial.

This plan covers Phase 1 in detail and lists Phase 2 as a follow-up.

---

## Phase 1 — Trial Mode + Continuous Local Save (build now)

### 1. Mark the company as "Trial / Local-only"
- Add a `mode` flag on the company (`trial_local` | `normal`) via a small migration.
- When creating a company, add a checkbox **"Trial books — keep a continuous local copy on this PC"**.
- Show a yellow "Trial / Local-only" badge in the sidebar and header so you never confuse it with real books.

### 2. Auto-save snapshots on app close + manual button
Per your answers: snapshot **on app close** + a one-click **Backup now** button. Both formats: **JSON (for restore) + Excel (for human review)**.

- Hook into `beforeunload` (browser) and Electron `before-quit` (desktop) — when fired on a Trial company, write a snapshot before the app exits.
- Add a prominent **"Backup now (JSON + Excel)"** button in:
  - Housekeeping → Backup tool (already exists, extend it)
  - The header bar when a Trial company is active (so it's one click)

### 3. Where files land on your PC
Reuse the existing Electron save bridge. Folder layout:

```text
Documents/
  YourMehtaji/
    Exports/
      <CompanyName>/
        backups/
          AcmeTraders_2026-05-01_14-30-22.json     ← full restore file
          AcmeTraders_2026-05-01_14-30-22.xlsx     ← multi-sheet workbook
        latest/
          AcmeTraders_latest.json                   ← always overwritten
          AcmeTraders_latest.xlsx                   ← always overwritten
```

- `backups/` keeps a timestamped history (auto-prune to last 30).
- `latest/` always holds the newest snapshot — easy to find, easy to email.
- In the **browser** (no Electron), the manual button still downloads both files; the auto-on-close part only works in the desktop app (browsers cannot silently write to disk — this is a hard browser security rule).

### 4. The Excel workbook (human-readable mirror)
One `.xlsx` per snapshot with these sheets:
- `Company` — name, GSTIN, FY start, mode
- `Ledgers` — code, name, group, opening balance, GSTIN
- `Items` — name, HSN, GST rate, opening qty/value
- `Vouchers` — date, number, type, party, total, narration
- `Voucher_Items` — line items (item, qty, rate, GST)
- `Voucher_Entries` — Dr/Cr postings (the double-entry view)
- `Trial_Balance` — computed from postings, with totals row
- `Bill_Allocations` — bill-wise tracking

Built with `openpyxl` patterns from the xlsx skill — formulas where it matters (totals), values elsewhere.

### 5. Restore flow (already exists, harden it)
- The current Restore tool already replays a JSON backup into a target company.
- Add: when restoring, if the source backup was `mode = trial_local`, default the target to the same mode and show a warning before overwriting non-trial books.

### 6. Safety rails
- A "Trial / Local-only" company cannot be accidentally promoted to "real books" without explicit confirmation + a fresh backup.
- The header shows **"Last local save: 2 minutes ago"** so you always know the disk copy is current.
- If a snapshot fails to write (disk full, permission), the close is **cancelled** with a clear error — your data is never lost silently.

---

## Phase 2 — True Offline SQLite Edition (separate milestone, do not start now)

Outline only, for visibility:
- Replace the Supabase client with an abstraction that targets either Supabase (cloud) or **SQLite via better-sqlite3** in Electron.
- Move every `supabase.from(...)` call behind a `db.table(...)` adapter.
- Reimplement RLS-equivalent checks in the app layer (single-user desktop = trivial).
- Migrate edge functions (GSTIN lookup, etc.) to direct API calls from the desktop process.

This is real work and should be scoped, quoted, and approved as its own project after Phase 1 proves the trial flow.

---

## Files this plan will touch (Phase 1)

**New / migration**
- `supabase/migrations/<ts>_add_company_mode.sql` — add `companies.mode` column (`trial_local` | `normal`, default `normal`).
- `src/lib/local-mirror.ts` — new module: build snapshot, write JSON + XLSX via Electron bridge, prune old files.

**Modified**
- `src/lib/backup.ts` — extend `buildCompanyBackup` to also emit XLSX; add `writeLatestSnapshot()` helper.
- `src/components/housekeeping/BackupRestoreTool.tsx` — add "Backup now (JSON + Excel)" combined button; show last-save time.
- `src/components/CompanyFlyout.tsx` / company-create form — add **"Trial books — keep a continuous local copy"** checkbox.
- `src/components/AppSidebar.tsx` + header — show "Trial / Local-only" badge and "Last local save" timestamp.
- `src/routes/app.tsx` — register `beforeunload` handler that triggers snapshot for active Trial company.
- `electron/main.cjs` — handle `before-quit` to flush a final snapshot before exit.
- `package.json` — add `xlsx` (or reuse existing `exceljs` if present) for workbook generation in the renderer.

## Technical notes

- **Browser limitation**: silent auto-save on close only works in the Electron desktop build. In a browser tab, the manual button is the only reliable path — browsers block silent disk writes by design. I'll show a clear note in the UI.
- **XLSX in renderer**: generate the workbook in the React app, hand the `Uint8Array` to the existing `saveCompanyFile` IPC channel (it already supports binary).
- **Pruning**: keep last 30 timestamped snapshots per company in `backups/`; `latest/` is always one file overwritten.
- **No server changes** beyond the small `mode` column migration.

---

If you approve, I'll implement Phase 1 end-to-end in the next turn. Phase 2 (true SQLite offline) stays a separate, future decision.
