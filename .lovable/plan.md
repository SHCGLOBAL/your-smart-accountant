# Shared Validation Layer

Goal: one source of truth for validation rules. Same zod schemas run in the form (instant inline errors) and in a server function (rejects bad payloads before they hit Postgres). DB triggers + RLS remain the final guard.

## What gets built

### 1. `src/lib/schemas/` — shared, client-safe
- `voucher.ts`
  - `voucherEntrySchema` — ledger_id (uuid), debit_paise/credit_paise (int ≥ 0, exactly one > 0), narration (≤500)
  - `itemRowSchema` — item_id, qty > 0, rate_paise ≥ 0, gst %, computed line total
  - `voucherHeaderSchema` — voucher_type enum, voucher_date (valid ISO, not in future > 1 day), party_ledger_id optional, narration ≤ 1000
  - `entryVoucherSchema` — header + entries[]; refine: sum(debit) === sum(credit), at least 2 entries
  - `itemVoucherSchema` — header + items[] + tax entries; refine: totals balance
  - Exported helper: `validateVoucher(input): { ok, errors }`
- `ledger.ts`, `item.ts`, `company.ts` — move inline zod from route files here, re-export.

### 2. `src/server/vouchers.functions.ts` — new server function
- `saveVoucherFn = createServerFn({ method: "POST" })`
  - `.inputValidator(entryVoucherSchema.or(itemVoucherSchema).parse)`
  - `.middleware([requireSupabaseAuth])`
  - `.handler(...)` — calls `next_voucher_number` RPC, inserts voucher + entries with the auth-scoped client (RLS applies), returns `{ id, voucher_no }`.
- Errors mapped to typed shape `{ ok:false, code, message, fieldErrors? }`.

### 3. Wire frontend
- `EntryVoucherForm` / `ItemVoucherForm`: replace ad-hoc Dr=Cr / required-field checks with `validateVoucher(snapshot)`. Show first error inline; block enqueue only on validation failure (matches earlier "block on validation, async on network" decision).
- `save-queue.tsx`: replace direct `supabase.from('vouchers').insert(...)` path for vouchers with `saveVoucherFn({ data })`. Failure → existing pending tray + retry.
- Ledger / Item / Company route files: import schemas from `@/lib/schemas/*` instead of declaring inline.

### 4. Keep as-is (backend depth)
- RLS policies, `enforce_period_lock_*` triggers, `next_voucher_number` RPC. These continue to enforce stateful rules (period locks, sequences, authorization) that schemas can't express.

## Files

Created:
- `src/lib/schemas/voucher.ts`
- `src/lib/schemas/ledger.ts`
- `src/lib/schemas/item.ts`
- `src/lib/schemas/company.ts`
- `src/server/vouchers.functions.ts`

Edited:
- `src/components/vouchers/EntryVoucherForm.tsx`
- `src/components/vouchers/ItemVoucherForm.tsx`
- `src/lib/save-queue.tsx`
- `src/routes/app.ledgers.tsx`
- `src/routes/app.items.tsx`
- `src/routes/app.companies.tsx`

No DB migrations needed.

## Acceptance

- Same malformed voucher payload is rejected with the same error code whether sent from the form or via direct `saveVoucherFn` call.
- Removing client validation still results in server rejection (defense in depth verified).
- Existing zero-latency behavior preserved: validation runs synchronously on the snapshot before `enqueueSave`; UI reset/focus is unaffected.
