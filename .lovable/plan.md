## Why "not even halfway"

The current Gujarati pipeline only translates an English→Gujarati string table inside the **PDF/Excel exporter**. Everywhere else still ships English. Concrete gaps after auditing the codebase:

1. **On-screen report UI is fully English** — `ReportToolbar` (From, To, CSV, Excel, PDF, Print), `ReportViewer` print header (`As on`, `For the period`, `GSTIN:`, `FY 2025-26 (… to …)`), `EmptyState` titles, "Loading…", PrintModeDialog, Word preview window strings — none of these go through any translation.
2. **In-page report text is hard-coded** — every report route (Day Book, Ledger, Trial Balance, P&L, BS, Cash/Bank, Trading, Outstanding, Receivables/Payables, Ageing, Stock Summary, GSTR-1/2B/3B, GST books, BRS) builds titles, subtitles (`for the period 2025-04-01 to 2026-03-31`), section labels, T-account headers (`Dr. Out / Purchases / Payments`), narration prefixes, and column heads inline as English literals that never enter the report-i18n table.
3. **Export-only translation is leaky** — `tReportLabel` matches whole strings, so anything with interpolation (`Sales — ACME Traders`, `Subtotal — Indirect Expenses (₹12,345)`, `Page 1 of 5`, `Ageing 0–30 days`) falls through unchanged. Voucher-type values from the DB (`sales`, `purchase`, …) are mapped to English `TYPE_LABEL` before the exporter sees them.
4. **Dictionary itself is partial** — ~200 entries covers ~40 % of the labels actually printed. Missing: Stock Summary columns (Inwards/Outwards/Balance Qty, Closing Value), GSTR-1 sections (B2B, B2CS, CDNR, HSN Summary, Documents Issued), GSTR-3B boxes (3.1, 4(A)(5), 5, 6.1), BRS (Reconciled, Unreconciled, Statement Balance, Book Balance), Ageing buckets (Not due, 0–30, 31–60…), Outstanding (Bill ref, Pending, Overdue), receivables/payables totals, every "Note" / "Remarks" / "Place of Supply" / "Reverse Charge" / "Round Off" / "Net Receivable" / "Net Payable" / "TDS" / "TCS" / "Adjustment" / "Suspense" string.
5. **Numerals + amount-in-words** — confirmed out of scope (per your earlier choice). Plan keeps that decision.

## Goal

Every books-of-account & financial-report **screen, print preview, PDF, Excel, CSV and Word export** renders labels, headings, toolbars, section titles, footers and dynamic phrases in proper Gujarati when app language = ગુજરાતી. Switching language back to English instantly reverts.

## Approach

### Phase 1 — Single source-of-truth dictionary
- Promote `src/lib/report-i18n.ts` from "label table" to a **report glossary** with three layers:
  1. **Exact matches** (what exists today, expanded to ~600 entries: see Coverage list below).
  2. **Token rules** — small, ordered list of regex → template that handle common interpolation patterns (`^Sales — (.*)$` → `વેચાણ — $1`, `^Subtotal — (.+) \((.+)\)$` → `પેટા કુલ — ${tReportLabel($1)} (${$2})`, `^Page (\d+) of (\d+)$` → `પાનું $1 / $2`, `^Ageing (\d+)[-–](\d+) days$` → `${1}–${2} દિવસ`, `^For the period:?\s+(.+) to (.+)$`, `^FY (\d+)-(\d+)`, `^GSTIN:\s+(.+)$`).
  3. **Word-level fallback** — a closed set of keywords (`days`, `years`, `pcs`, `kg`, `Net`, `Gross`, `Less:`, `Add:`, `Round Off`) substituted only when the surrounding string already matched a rule (never on free text like ledger names).
- Add `tReportText(text, lang)` (used for free-form on-screen labels) and keep `tReportLabel` (strict, for PDF/Excel cells) as a thinner wrapper.
- Add a vetted `gu` translation review pass: each entry reviewed against Tally Gujarati glossary + your earlier feedback ("poor vocabulary"). Replace stilted translations:
  - "Stock Summary" → સ્ટોકનો સારાંશ (current: "સ્ટોક સારાંશ" — keep but verify)
  - "Outstanding" → બાકી લેણદેણ → **ચઢેલી રકમ** (more idiomatic for Gujarati merchants)
  - "Bank Reconciliation" → બેંક મેળવણી → **બેંક સામેલેણ**
  - "Net Profit" → ચોખ્ખો નફો ✓
  - "By/To" prefixes → keep as `જમા:` / `ઉધાર:` (currently silently stripped — wrong for ledger printouts where merchants expect them).
  - …(full diff lives in the dictionary commit; preview shown below)

### Phase 2 — Translate the on-screen report shell
- `ReportToolbar`: replace literals (`From`, `To`, `CSV`, `Excel`, `PDF`, `Print`) with `t("toolbar.*")` keys added to `i18n.tsx`.
- `ReportViewer`: pipe `title`, `accountHeading`, `subtitle`, `periodText`, `addressLine`, `fyText` through `tReportText`. `As on / For the period / GSTIN / FY` use rule-based templates so dates inside stay DD-MM-YYYY.
- `PrintModeDialog`, `EmptyState`, "Loading…", Word `<title>` and the Print Preview popup's `<button>Print/Close</button>` and "Nothing to preview yet" message all go through `t("…")`.
- `TAccount` header props (`leftHeader`, `rightHeader`, `leftTotal` label) are localized at the component boundary so every report inherits the fix.

### Phase 3 — Translate inline report content
- For each `app.reports.*.tsx`, run the strings that compose **rendered text** (titles, subtitles, T-account headers, badges, group names, narration prefixes like `Sales — `, voucher-type labels) through `tReportText`. The only literals left untranslated are user data (party names, ledger names, item names, narrations, numerals).
- Centralize voucher-type labels: replace per-route `TYPE_LABEL` maps with one helper `voucherTypeLabel(type, lang)`.
- Centralize group-account labels (Capital Account, Sundry Debtors, …) inside `account-groups-runtime.tsx` so Trial Balance, Group Ledger, P&L and Balance Sheet share the same translated headings.

### Phase 4 — Quality + verification
- Add `src/lib/__tests__/report-i18n.test.ts` covering:
  - Every entry in `LABELS` round-trips through `tReportLabel`.
  - Token rules: `Sales — ACME` → `વેચાણ — ACME`; ledger names untouched; dates stay DD-MM-YYYY.
  - English passthrough is a no-op when `lang === "en"`.
  - Free text containing only a ledger name is not mangled.
- Manual QA matrix (documented in `docs/i18n-qa.md`): toggle ગુજરાતી, open each of the 17 reports, capture screen + PDF, confirm headings/footers/columns are Gujarati, data unchanged.
- Run `npm run build` + the new tests; only ship after both pass.

## Coverage targets (added to dictionary in this pass)

Day Book, Ledger, Group Ledger, Cash Book, Bank Book, Cash & Bank, Sales Register, Purchase Register, Trial Balance, Trading, Profit & Loss, Balance Sheet, Outstanding, Bill-by-Bill, Receivables, Payables, Ageing (all buckets), Stock Summary (Opening/Inwards/Outwards/Closing × Qty/Value), GSTR-1 (B2B, B2CS, B2CL, CDNR, CDNUR, EXP, NIL/Exempt/Non-GST, HSN, Docs Issued), GSTR-2B (ITC available, ITC reversed, Ineligible), GSTR-3B (3.1, 3.2, 4, 5, 6.1, 6.2 with each row label), GST Sales/Purchase Book, BRS (Statement / Book / Reconciled / Unreconciled / Difference), all toolbar verbs, all empty-state copy, all print-preview chrome.

Approx new entries: **~400** added to `LABELS`, **~25** rule-based templates, **~30** new `t("toolbar.*")` keys in `i18n.tsx` for `en` + `gu` (other languages fall back to English as today).

## Files to add
- `src/lib/report-i18n-rules.ts` — ordered template rules + `tReportText`.
- `src/lib/voucher-type-label.ts` — single voucher-type translator.
- `src/lib/__tests__/report-i18n.test.ts` — dictionary + rules tests.
- `docs/i18n-qa.md` — QA matrix.

## Files to edit
- `src/lib/report-i18n.ts` — expand `LABELS` (~+400), revise stilted translations, expose `tReportText`.
- `src/lib/i18n.tsx` — add `toolbar.*`, `report.viewer.*`, `report.empty.*` keys for `en` + `gu`.
- `src/components/reports/ReportViewer.tsx`, `ReportToolbar.tsx`, `PrintModeDialog.tsx`, `TAccount.tsx`, `GstBook.tsx`, `PeriodLockCard.tsx`, `ValidationPanel.tsx` — wire through `useI18n()` / `tReportText`.
- `src/components/EmptyState.tsx` — accept already-translated strings; no behaviour change.
- All `src/routes/app.reports.*.tsx` (17 files) — translate inline literals via `tReportText`; replace per-route `TYPE_LABEL` with helper.
- `src/lib/account-groups-runtime.tsx` — translate group display names at read.
- `src/lib/exporters.ts` — call `tReportText` (not just `tReportLabel`) so subtitle interpolations pass through rule layer.

## Out of scope
- Translating ledger / item / party names or narrations (user data).
- Transliterating numerals or amount-in-words.
- Other Indian languages (hi/mr/bn/ta/te/ml/kn) — they continue to fall back to English exactly as today; no regression and no new strings required.

## Validation
1. `bunx vitest run src/lib/__tests__/report-i18n.test.ts` — green.
2. `bun run build` — green.
3. Manual: switch language to ગુજરાતી → open each of the 17 reports → confirm screen, PDF, Excel and print preview all show Gujarati labels with hyphenated dates, numbers untouched, no English leaks. Switch back to English → identical to today.
4. Spot-check three multi-page PDFs (Day Book, Ledger, Trial Balance) — every page header/footer + cell renders in Noto Sans Gujarati without tofu.
