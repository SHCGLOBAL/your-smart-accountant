import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Calculator,
  FileBarChart,
  Keyboard,
  Package,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Your Mehtaji — Modern GST Accounting for India" },
      {
        name: "description",
        content:
          "Sales, purchase, inventory, ledgers, P&L and GSTR reports. Multi-company, multi-user, keyboard-first. Web + Windows.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: ReceiptText, title: "GST Sales & Purchase", desc: "CGST/SGST/IGST auto-split, HSN, e-invoice ready format." },
  { icon: Package, title: "Inventory Tracking", desc: "Items, stock in/out, movement and valuation." },
  { icon: Calculator, title: "Double-entry Vouchers", desc: "Receipt, payment, journal, contra, credit/debit notes." },
  { icon: FileBarChart, title: "Reports", desc: "Day book, ledger, trial balance, P&L, balance sheet, GSTR-1/3B." },
  { icon: Building2, title: "Multi-company, Multi-user", desc: "Switch companies in one click. Roles: admin, accountant, viewer." },
  { icon: Keyboard, title: "Busy-style Hotkeys", desc: "Alt+S sales, Alt+P purchase, Ctrl+S save — fast data entry." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              म
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold">Your Mehtaji</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Accounting Software
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-background to-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" /> GST-ready • Multi-company • Web + Windows
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Modern accounting for Indian businesses
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Your Mehtaji brings together the speed of Busy with a clean, modern interface — sales,
            purchase, inventory, ledgers and GSTR reports in one place.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Create free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Everything you need</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Built for accountants, billing staff, and business owners.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Your Mehtaji. Built with ♥ for Indian businesses.
      </footer>
    </div>
  );
}
