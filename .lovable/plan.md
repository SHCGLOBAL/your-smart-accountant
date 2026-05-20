
## Goal

Add a **Manufacturing Journal** (a.k.a. Production / Stock Journal) module that consumes raw materials and produces finished goods, with optional **Bill of Materials (BOM)** templates that auto-populate the consumption table when a final product is picked. Keyboard behaviour matches the existing voucher screens (DDMM date auto-advance, Enter-as-Tab, infinite item-grid loop, Ctrl+S / Alt+S save).

## Design decisions worth flagging

1. **Accounting posture** — In Tally/Busy a Stock Journal is **inventory-only**: it moves stock value from raw-material items into finished items, with no GL ledger entries. We'll do the same — insert `voucher_items` rows with **negative qty** for consumption and **positive qty** for output, and write **zero `voucher_entries`**. This keeps the Trial Balance untouched (stock value just moves between items) and matches what manufacturing users expect. If you'd rather also debit a "Finished Goods" ledger and credit a "Raw Materials" ledger, say so and I'll add that.
2. **Cost of finished goods** = sum(consumption qty × rate) ÷ total output qty. Each output row's `rate_paise` is auto-set to this; user may override.
3. **Department / Godown** — there's no godown master yet. For v1 we'll reuse `vouchers.reference_no` as a free-text "Department / Section" field (label changed on this screen only). Building a real godown master is a separate ask.
4. **Spec columns (GSM, Dimensions, Weight/unit)** — these are row-level metadata, not item-master attributes. We'll add a single nullable `specs jsonb` column on `voucher_items` so the row can carry `{ gsm, length_cm, height_cm, weight_per_unit_g }` without polluting the item master.
5. **Stock report** — `src/routes/app.reports.stock-summary.tsx` currently only treats `purchase`/`credit_note` as inward and `sales`/`debit_note` as outward. We'll extend it to include `manufacturing` rows: positive qty = inward, negative qty = outward. Same for any other stock-aware view.

## Database changes (one migration)

```text
-- 1. Extend enum
ALTER TYPE public.voucher_type ADD VALUE 'manufacturing';

-- 2. Row-level specs (used by manufacturing rows; null for everything else)
ALTER TABLE public.voucher_items ADD COLUMN specs jsonb;

-- 3. BOM templates (one per output item)
CREATE TABLE public.bom_templates (
  id uuid PK,
  company_id uuid NOT NULL,
  output_item_id uuid NOT NULL,
  output_qty numeric NOT NULL DEFAULT 1,   -- recipe yields this much
  notes text,
  is_active boolean DEFAULT true,
  created_at, updated_at, created_by
);
CREATE UNIQUE INDEX ON bom_templates (company_id, output_item_id) WHERE is_active;

-- 4. BOM lines
CREATE TABLE public.bom_template_lines (
  id uuid PK,
  template_id uuid NOT NULL REFERENCES bom_templates ON DELETE CASCADE,
  input_item_id uuid NOT NULL,
  qty_per_output numeric NOT NULL,         -- raw qty to produce one `output_qty`
  specs jsonb,                             -- default specs to copy into the voucher row
  line_no int NOT NULL DEFAULT 1
);

-- 5. RLS on both new tables — mirror items table (is_company_member for SELECT,
--    can_write_company for INSERT/UPDATE, admin for DELETE).
```

No changes to `vouchers`, `voucher_entries`, `next_voucher_number`, period-lock triggers, or RLS on existing tables — the new voucher_type flows through them as-is.

## Frontend pieces

### New route
- `src/routes/app.vouchers.new.manufacturing.tsx` → renders the new `ManufacturingVoucherForm`.
- Sidebar entry under **Transactions** between Journal and All Vouchers.

### New component `src/components/vouchers/ManufacturingVoucherForm.tsx`
Mirrors `ItemVoucherForm` patterns:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Date  | Mfg No. (auto)  | Department  | Final Product | Qty   │
│  ↑ FyDatePicker (DDMM auto-advance, backspace guard already done)
├─────────────────────────────────────────────────────────────────┤
│ Raw Material Consumption          │ Finished Goods Output       │
│ Item·GSM·LxH·Unit·Qty·Rate·Amt    │ Item·LxH·Wt/u·Qty·Cost·Amt  │
│ [ItemRowMfg rows…] + Add line     │ [OutputRow rows…] + Add line│
├─────────────────────────────────────────────────────────────────┤
│ Total consumption: ₹X      Cost per unit (auto): ₹Y             │
└─────────────────────────────────────────────────────────────────┘
```

- Header uses existing `FyDatePicker`, plain `Input` for Mfg No (read-only after save), plain `Input` for Department, `Combo` for Final Product (from items master), numeric `Input` for Qty.
- Both grids reuse the keyboard pattern from the existing `ItemRow` (per-cell Enter, GST-style "Enter on last cell of last row → addLine + focus first cell of new row"). New `ItemRowMfg` and `OutputRow` components live under `src/components/fast-form/`.
- When Final Product or Qty changes, an effect loads the active BOM (`bom_templates` + lines), scales `qty_per_output * (qtyToProduce / output_qty)`, and replaces the consumption grid (only if user hasn't manually edited; we track a `dirty` flag).
- The output table is seeded with one row for the selected Final Product. User can add more output rows (co-products / by-products); cost is split by qty by default.
- `Ctrl+S` / `Alt+S` triggers save (same handler shape as `ItemVoucherForm`).

### Save logic (`src/lib/manufacturing-postings.ts`, new)
```text
- Validate: at least 1 consumption row + 1 output row, every row has item_id + qty>0.
- Compute totalConsumptionPaise = Σ(qty * rate_paise).
- For each output row, default rate_paise = round(totalConsumptionPaise / totalOutputQty).
- Insert into vouchers (voucher_type='manufacturing', totals all zero except a memo).
- Insert voucher_items:
    consumption rows  → qty = -input_qty, rate_paise = input_rate_paise, specs=jsonb
    output rows       → qty = +output_qty, rate_paise = computed_or_overridden, specs=jsonb
- No voucher_entries rows. (Skip the postings step the same way sales_order/delivery_note already do in ItemVoucherForm.)
- Bump masters cache so updated item rates reflect immediately.
```

### Reports update
- `src/routes/app.reports.stock-summary.tsx`: add `manufacturing` to both inward and outward classifiers, using qty sign:
  - `inward += sum(qty where voucher_type='manufacturing' AND qty > 0)`
  - `outward += sum(-qty where voucher_type='manufacturing' AND qty < 0)`
- `src/lib/voucher-type-label.ts`: add `manufacturing: "Manufacturing Journal"`.
- `src/lib/voucher-sort.ts` / All Vouchers list: add to the type filter dropdown.

### BOM management (light v1)
- A "Manage BOM" button inside the new form opens a dialog (`BomTemplateDialog.tsx`) bound to the currently selected Final Product: edit `output_qty`, add/edit/delete input lines with default specs. Saved via Supabase upsert.
- Future enhancement (out of scope): standalone BOM library screen.

## Keyboard rules (reused verbatim)

- DDMM auto-advance with backspace guard → already in `FyDatePicker`.
- Enter-as-Tab globally via `useEnterAsTab` wrapping the form.
- Per-cell Enter inside both grids + "Enter on last cell of last row → spawn new row + focus first cell" → same pattern as the recent `ItemRow` change.
- Combo (Final Product, item pickers) auto-advances on select → existing `Combo` behaviour.
- `Ctrl+S` / `Cmd+S` / `Alt+S` → save; `preventDefault` on Enter so no accidental submit.
- Backspace on a row's first cell does not auto-jump backward (we only forward-advance on Enter, never on backspace).

## Files touched / added

**New**
- `supabase/migrations/<ts>_manufacturing_voucher.sql`
- `src/routes/app.vouchers.new.manufacturing.tsx`
- `src/components/vouchers/ManufacturingVoucherForm.tsx`
- `src/components/vouchers/BomTemplateDialog.tsx`
- `src/components/fast-form/ItemRowMfg.tsx`
- `src/components/fast-form/OutputRow.tsx`
- `src/lib/manufacturing-postings.ts`
- `src/lib/bom.ts` (load/save BOM helpers)

**Edited**
- `src/components/AppSidebar.tsx` (new menu entry)
- `src/lib/voucher-type-label.ts` (label)
- `src/lib/voucher-sort.ts` (sort/group)
- `src/routes/app.reports.stock-summary.tsx` (treat manufacturing rows by qty sign)
- `src/components/vouchers/RecentVouchersPanel.tsx` (if it filters by type)

## Questions before I build

1. **GL postings**: keep this as a pure inventory move (Tally Stock-Journal style), or **also** post a Dr Finished Goods / Cr Raw Materials journal entry to a "Stock in Hand" ledger? Default = pure inventory move.
2. **Department / Godown**: free-text field on the voucher for now (reusing `reference_no`), or do you want a proper Godown master with its own CRUD screen?
3. **Specs columns**: are `GSM`, `Length`, `Height`, `Weight per unit` the full set, or do you want a generic "Specifications" free-text column too?
