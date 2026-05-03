## Goal
Make voucher entry feel desktop-native (Tally/Busy speed): typing never re-renders the parent, Enter advances focus imperatively in <1ms, pickers search a synchronous in-memory Map, and Ctrl+A clears + refocuses Date in <10ms while the database save runs in the background.

## Architecture

```text
┌─ src/lib/masters-cache.tsx ───────────┐  loaded once per company switch
│  ledgersMap: Map<id, Ledger>          │  + Supabase Realtime subscription
│  itemsMap:   Map<id, Item>            │  → patches Map in place, bumps version
│  useMastersVersion() → number          │  (only pickers subscribe)
└────────────────────────────────────────┘
              ▲
              │ synchronous read
┌─ src/components/fast-form/ ───────────────────────────┐
│  useFocusManager()   → register(ref), focusNext(), focusByName(), reset()
│  <FastInput name … />        memoized, uncontrolled (defaultValue + ref)
│  <FastNumberInput … />       same, formats on blur
│  <FastDateInput … />         dd/mm/yyyy, smart-pad on blur
│  <FastPicker … />            cmdk over masters Map, 2-stage Enter
│  <FastForm onAccept … />     wires Ctrl+A / Esc / Enter-as-Tab
│  useSaveQueue()              startTransition + requestIdleCallback flush
└────────────────────────────────────────────────────────┘
              ▲
              │ used by
  EntryVoucherForm.tsx (rewrite)   ItemVoucherForm.tsx (rewrite)
```

## Implementation steps

**1. Global masters cache — `src/lib/masters-cache.tsx`**
- `MastersProvider` wraps the app inside `CompanyProvider`.
- On `activeCompanyId` change: parallel fetch all `ledgers` + `items` for that company (paged in 1000-row batches to bypass PostgREST limit), build `Map<id, Ledger>` and `Map<id, Item>`, plus pre-sorted arrays for picker rendering.
- Subscribe to `postgres_changes` on `ledgers` and `items` filtered by `company_id`. On INSERT/UPDATE/DELETE, mutate the Map in place and increment a `version` integer stored in a `useSyncExternalStore` snapshot.
- Exports: `getLedger(id)`, `getItem(id)`, `searchLedgers(query, type?)`, `searchItems(query)`, `useMastersReady()`, `useMastersVersion()`. Pickers subscribe only to version, not to the whole list — typing causes zero parent re-render.
- Migration: add `ledgers` and `items` to `supabase_realtime` publication and set `REPLICA IDENTITY FULL` so updates carry old rows.

**2. Focus manager — `src/components/fast-form/useFocusManager.tsx`**
- `useFocusManager()` returns `{ register(name, ref), focusNext(currentName), focusByName(name), focusFirst(), reset() }`.
- Internally keeps an **ordered ref array** (no state) so focus shifts never trigger renders.
- `register` returns a callback ref that inserts at mount and removes at unmount; order is determined by DOM position (`compareDocumentPosition`) so dynamic rows stay correctly ordered.

**3. FastForm primitives — `src/components/fast-form/`**
- `FastInput` / `FastNumberInput` / `FastDateInput`: `React.memo`, take `defaultValue` + `name` + `manager`, never `value`. They expose data via `manager.getValue(name)` (reads from `ref.current.value`). Validation happens on blur.
- `FastPicker`: memoized; subscribes to `useMastersVersion`. Holds tiny local state for `query` + `open` + `highlight`. Search runs synchronously over the Map (filtered + Fuse-style scoring, capped at 50 results). **Two-stage Enter:** if popover open and a row is highlighted, first Enter selects + closes (cursor stays on trigger); second Enter calls `manager.focusNext`. If popover closed, Enter advances. Alt+C calls `onCreate(query)`.
- `FastForm`: wraps children in a `<div onKeyDown>` that handles Enter-as-Tab (via manager), Ctrl+A → `onAccept`, Esc → `onCancel`. Provides `manager` via context.

**4. Save queue — `src/lib/save-queue.ts`**
- `enqueueSave(fn)` pushes a job; flush happens inside `requestIdleCallback` (fallback `setTimeout(0)`) wrapped in `startTransition`.
- On failure: toast + push to a "Pending" tray (`useSaveQueue()` exposes pending count + retry).
- No IndexedDB persistence in this pass (per user choice — validation-only blocking).

**5. Rewrite `EntryVoucherForm.tsx`**
- Replace `useState` per field with `FastInput` / `FastPicker` driven by one `useFocusManager`.
- Replace ledger fetch + Combo with `<FastPicker source="ledgers" filter={...} />`.
- `handleAccept` (Ctrl+A): synchronously read all values from manager → run validation (balanced Dr/Cr, required ledger, non-zero amount). If invalid, toast and keep focus. If valid: snapshot payload, call `manager.reset()` + `manager.focusByName("date")` (single rAF), then `enqueueSave(() => persistVoucher(payload))`.

**6. Rewrite `ItemVoucherForm.tsx`**
- Same pattern. Item grid rows use a stable key + `React.memo` row component; row-level state is held in refs so typing in row 5 never re-renders rows 1–4 or the totals header.
- Totals (subtotal/CGST/SGST/IGST/total) recompute via a debounced manager subscription (`requestAnimationFrame` coalesced) and write into a separate memoized `<TotalsBar>` — typing remains lag-free even on 100-line invoices.

**7. Wire-up**
- `src/routes/app.tsx`: mount `<MastersProvider>` inside `<CompanyProvider>`. Show a one-time "Loading masters…" splash only on first company switch; subsequent navigations are instant.
- Remove the now-redundant per-form ledger/item fetches.

**8. Database migration**
```sql
alter publication supabase_realtime add table public.ledgers;
alter publication supabase_realtime add table public.items;
alter table public.ledgers replica identity full;
alter table public.items   replica identity full;
```

## Files

**New**
- `src/lib/masters-cache.tsx`
- `src/lib/save-queue.ts`
- `src/components/fast-form/useFocusManager.tsx`
- `src/components/fast-form/FastForm.tsx`
- `src/components/fast-form/FastInput.tsx`
- `src/components/fast-form/FastNumberInput.tsx`
- `src/components/fast-form/FastDateInput.tsx`
- `src/components/fast-form/FastPicker.tsx`
- `src/components/fast-form/PendingSavesTray.tsx`
- `supabase/migrations/<ts>_realtime_masters.sql`

**Rewritten**
- `src/components/vouchers/EntryVoucherForm.tsx`
- `src/components/vouchers/ItemVoucherForm.tsx`

**Edited**
- `src/routes/app.tsx` (mount MastersProvider + PendingSavesTray in footer)
- `src/components/vouchers/Combo.tsx` (kept but marked deprecated; FastPicker replaces it in voucher forms)

## Out of scope (this pass)
- Web Worker for posting math (per your choice — startTransition is enough)
- IndexedDB offline queue
- Migrating non-voucher screens (ledgers/items/reports) to FastForm — they don't need it

## Acceptance checklist
- Typing in any field: React DevTools shows only that input re-rendering.
- Picker open + first letter typed: results appear within the same frame, no network call.
- Ctrl+A on a valid voucher: form clears and Date is focused before the network request leaves; failed saves appear in the Pending tray with retry.
- Realtime: creating a ledger in another tab makes it appear in the picker without refresh.
