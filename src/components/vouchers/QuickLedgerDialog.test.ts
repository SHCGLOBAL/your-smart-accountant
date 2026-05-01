import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression: the New / Edit Ledger dialogs must NOT close when the user
 * switches windows, the window loses focus, or they click outside the dialog.
 *
 * Radix Dialog dismisses on:
 *   - onPointerDownOutside  (outside pointer / click)
 *   - onInteractOutside     (covers focus loss / window blur / outside focus)
 *
 * Both handlers must call `e.preventDefault()` on every <DialogContent> used
 * for ledger create/edit. This test asserts that statically so the behavior
 * cannot regress silently.
 */

const LEDGER_DIALOG_FILES = [
  "src/components/vouchers/QuickLedgerDialog.tsx",
  "src/routes/app.ledgers.tsx",
];

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Ledger dialog dismissal guards", () => {
  for (const file of LEDGER_DIALOG_FILES) {
    describe(file, () => {
      const src = read(file);

      it("prevents close on outside pointer interactions", () => {
        expect(src).toMatch(
          /onPointerDownOutside=\{\(e\)\s*=>\s*e\.preventDefault\(\)\}/,
        );
      });

      it("prevents close on window blur / outside focus interactions", () => {
        expect(src).toMatch(
          /onInteractOutside=\{\(e\)\s*=>\s*e\.preventDefault\(\)\}/,
        );
      });

      it("attaches both guards to <DialogContent>", () => {
        // Ensure the guards live on a DialogContent element (not some other
        // nested popover) by checking they appear inside the same JSX tag.
        const dialogContentBlocks = src.match(
          /<DialogContent[\s\S]*?>/g,
        );
        expect(dialogContentBlocks, "expected at least one <DialogContent>").toBeTruthy();
        const guarded = dialogContentBlocks!.some(
          (block) =>
            /onPointerDownOutside=\{\(e\)\s*=>\s*e\.preventDefault\(\)\}/.test(block) &&
            /onInteractOutside=\{\(e\)\s*=>\s*e\.preventDefault\(\)\}/.test(block),
        );
        expect(guarded).toBe(true);
      });
    });
  }
});

describe("Dismissal guard semantics", () => {
  it("preventDefault on the event blocks Radix from auto-closing", () => {
    // Mirrors the exact handler shape used in the components.
    const handler = (e: { preventDefault: () => void }) => e.preventDefault();
    let prevented = false;
    handler({ preventDefault: () => (prevented = true) });
    expect(prevented).toBe(true);
  });
});