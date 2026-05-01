
# Accounting Integrity Audit — Findings & Fix Plan

I did a focused audit of the highest-risk areas: double-entry posting, GST rounding, opening-balance import, group classification, and company delete. Below is a ranked list of real bugs found, with the exact fix for each. Nothing here is cosmetic — every item can cause a wrong Trial Balance, GST return, or audit failure.

## Severity legend
- **P0** — wrong numbers in books / GST returns. Fix immediately.
- **P1** — usability or data-quality issues that lead to wrong numbers if user is not careful.
- **P2** — robustness / future-proofing.

---

## P0-1 — Round-off breaks Trial Balance on every invoice

**Where:** `src/components/vouchers/ItemVoucherForm.tsx` (line 254–314) + `src/lib/voucher-postings.ts`.

**What happens today:**
- The voucher header stores `total_paise = subtotal + GST` (no round-off added).
- A separate `round_off_paise` is stored on the header and printed on the invoice/PDF.
- The double-entry posts the **same `totals.total_paise`** to the party ledger.
- Result: if invoice is rounded from ₹1,234.56 → ₹1,235, the round-off of ₹0.44 appears on the printed invoice but is **never posted to any ledger**, so Sales + Output GST ≠ Party Receivable. Trial Balance is out by the round-off amount on every invoice — silently.

**Fix:**
1. Decide one model and apply it everywhere: store `vouchers.total_paise = subtotal + GST + round_off`. Keep `round_off_paise` on the header for display.
2. Get-or-create a **"Round Off"** system ledger (type `expense_indirect` for Dr round-off, `income_indirect` for Cr — single ledger, side decided per voucher).
3. Update `buildItemVoucherPostings` to accept `round_off_paise` and append the round-off entry on the side opposite the party so debits = credits exactly.
4. Update PDF (`src/lib/invoice-pdf.ts`) and on-screen totals so the rounded total = party receivable.

---

## P0-2 — Opening Balance Import: created ledgers may violate group ↔ type contract

**Where:** `src/components/housekeeping/OpeningBalanceImport.tsx` (insert at line 193–205).

**What happens today:**
- We save both `group_code` (from section heading) and `type` (from `defaultLedgerTypeForGroup(groupCode)` initially).
- But the user can change `new_type` independently in the row (the `LEDGER_TYPES` Select), and we never re-validate that `type` is actually one of `GROUP_BY_CODE[group_code].ledgerTypes`.
- Result: a ledger can be saved as `group_code = SUNDRY_CREDITORS` with `type = bank`, which then displays in Bank Accounts on the Balance Sheet but in Sundry Creditors on Group Ledger. Two different reports, two different answers.

**Fix:**
1. On every group change → reset `new_type` to `defaultLedgerTypeForGroup(group_code)`.
2. On every type change → if the new type is not in `GROUP_BY_CODE[group_code].ledgerTypes`, also auto-update `group_code` to `defaultGroupCodeForType(type)` (or constrain the Type dropdown to types valid for the chosen group).
3. Add a pre-post validation: refuse to insert when `type ∉ group.ledgerTypes` and toast the offending row.

---

## P0-3 — Section-hint regex misses very common Tally headings

**Where:** `src/lib/statement-parse.ts` `GROUP_HEADINGS` (line 139–163).

**Issues found while reading the regex set:**
- `Duties & Taxes` heading rx is `/^(duties\s*(ies)?\s*&?\s*taxes|gst\s+payable)\b/i` — the `(ies)?` group is leftover and prevents matching `Duties & Taxes` cleanly when OCR returns `Duties&Taxes` (no spaces) or `Duties Taxes`.
- No heading for **Branch / Divisions**, **Deposits (Asset)**, **Suspense A/c**, **Cash & Bank** (combined heading), **Loans & Advances (Liability)**, **Stock-in-Hand** typo `Stock In Hand`.
- `Bank OD A/c` is mapped to `BANK_ACCOUNTS` (assets, Dr) but a true overdraft is a **Secured Loan (Cr)**. Mis-classifies CC/OD limits.

**Fix:**
1. Tighten / expand the heading regex set; remove the broken `(ies)?` token.
2. Add explicit headings for Bank OD/CC → `SECURED_LOANS`, "Loans (Liability)" → `UNSECURED_LOANS`, "Deposits" → `CURRENT_ASSETS`, "Suspense" → `CURRENT_LIABILITIES`.
3. Add a unit test fixture (small text snippet → expected rows) so regressions are caught.

---

## P0-4 — `guessGroupCode` override path picks the wrong group

**Where:** `src/lib/account-groups.ts` line 220–230.

**Problem:** When section hint = `CAPITAL_ACCOUNT` and the row name contains the word `bank` (e.g. "Kaushik Bank Loan A/c" listed under Capital by mistake in the source PDF), the code finds an `overrideMatch = BANK_ACCOUNTS` and returns it — **even though that override has lower confidence than the explicit section heading**. That re-introduces the original mis-classification.

**Fix:** Make override only fire when the row's name contains a **strong identifier** (e.g. matches a high-specificity hint like `\bhdfc\b`, `\bsbi\b`, `\bbank a/c\b`) AND the section hint is a generic catch-all (`CURRENT_LIABILITIES`, `CURRENT_ASSETS`). Otherwise prefer the section heading. Add an allow-list of "strong override" patterns instead of accepting any same-side hint match.

---

## P0-5 — GST CGST/SGST rounding can create 1-paise drift across many lines

**Where:** `src/lib/gst.ts` `computeLine` (line 27–37).

**What happens today:** per line we do `Math.round(gstAmount/2)` for CGST and `gstAmount - cgst` for SGST. That is correct **per line**, but when the voucher has many lines, the sum of CGST may differ from the sum of SGST by N×0 to N×1 paise — which is acceptable. **However**, Indian GST rules require CGST = SGST on every B2B invoice for downstream GSTR-1/2A reconciliation. A 1-paise difference on a line will be flagged by GSTN portal validators.

**Fix:** Compute `half = Math.floor(gstAmount / 2)` and assign `cgst = sgst = half`, then add the leftover 1 paise (if `gstAmount` is odd) into a separate per-voucher round-off accumulator that is consolidated into the existing `round_off_paise` on the voucher header. This keeps CGST = SGST on every line and preserves total integrity via round-off.

---

## P1-6 — Company delete still relies on cascade that may not exist

**Where:** Last migration created in the previous turn for company delete.

**Risk:** If any child table (e.g. `gst_api_credentials`, `recurring_invoices`, `einvoice_details`, `einvoice_api_log`, `bill_allocations`, `voucher_items`, `voucher_entries`, `bank_statement_lines`, `gstr2b_lines`, `payment_reminders`, `ledger_group_mappings`, `gstr3b_inward_summary`, `gstr3b_itc_reversal`) lacks `ON DELETE CASCADE` from `companies` (the schema shows **no foreign keys at all** on most tables), DELETE on companies fails silently from the user's perspective (RLS hides the row but a referencing row blocks the delete with a 23503 violation).

**Fix:** A single migration that, for every `*.company_id` column in `public`, adds a `FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE` (drop existing constraint first if any). Same for `voucher_id` cascading to `vouchers`. This guarantees company delete actually deletes everything.

---

## P1-7 — `next_voucher_number` race window

**Where:** `public.next_voucher_number` (RPC, plpgsql).

**Problem:** It does `INSERT … ON CONFLICT DO NOTHING` then `UPDATE … RETURNING next_number - 1`. Under concurrent inserts (two browser tabs saving at once) the same number can be returned twice because the seq row is not locked between the two statements.

**Fix:** Wrap in `SELECT … FOR UPDATE` after the upsert, or do the upsert + increment in a single CTE. Add a unique index on `(company_id, voucher_type, voucher_number)` on `vouchers` so duplicates are physically prevented. Backfill any duplicates first.

---

## P2-8 — Period locking / financial-year guard is missing

**Observation:** Nothing in the code prevents posting a voucher dated in a closed financial year, after GSTR-1 has been filed for that period. Standard Indian accounting software locks past periods after returns are filed.

**Fix (later, low priority for this turn):** Add a `period_locks` table (`company_id, ym, locked_at, locked_by`) and check before insert/update of vouchers and voucher_entries. Mention as a follow-up; do not block this turn on it.

---

## What I will change in this turn (in order)

1. **P0-1 round-off**: update `voucher-postings.ts` to add round-off entry; update `ItemVoucherForm.tsx` so header `total_paise = subtotal + GST + round_off`; align PDF.
2. **P0-5 CGST/SGST equality**: rewrite `computeLine` to keep CGST = SGST and push remainder to a `rounding_paise` field returned from `sumLines`; fold into header `round_off_paise`.
3. **P0-2 group/type contract**: in `OpeningBalanceImport.tsx`, sync `group_code` ↔ `type` in both directions and validate before insert.
4. **P0-3 + P0-4 classification**: tighten `GROUP_HEADINGS` regex set; add Bank OD → Secured Loans; refine `guessGroupCode` override to only fire on strong-identifier matches.
5. **P1-6 cascade migration**: one migration adding `ON DELETE CASCADE` foreign keys for every `company_id` and `voucher_id` column so company / voucher delete is reliable.
6. **P1-7 voucher number race**: tighten RPC + add unique index.

I will skip P2-8 (period lock) this turn — it's a feature, not a bug — and surface it as the next safety upgrade after these fixes land.

## What I will NOT touch
- Existing data (no destructive backfills besides the cascade FK adjustment).
- The auth/company-membership flow (it's already correct after the last fix).
- The Tally/Busy big-file importer (working from the previous plan, separate scope).

Approve this and I'll switch to build mode and apply the fixes in the order above, with a quick verification pass (compile + spot-check trial balance equality after a sample sales voucher with round-off) at the end.
