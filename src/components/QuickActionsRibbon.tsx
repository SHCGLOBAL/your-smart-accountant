import { Link, useLocation } from "@tanstack/react-router";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Repeat,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  to: string;
  label: string;
  icon: LucideIcon;
  hotkey: string;
}

const ACTIONS: QuickAction[] = [
  { to: "/app/vouchers/new/sales", label: "Sales", icon: TrendingUp, hotkey: "Alt+S" },
  { to: "/app/vouchers/new/purchase", label: "Purchase", icon: TrendingDown, hotkey: "Alt+P" },
  { to: "/app/vouchers/new/receipt", label: "Receipt", icon: ArrowLeftRight, hotkey: "Alt+R" },
  { to: "/app/vouchers/new/payment", label: "Payment", icon: Banknote, hotkey: "Alt+Y" },
  { to: "/app/vouchers/new/journal", label: "Journal", icon: BookOpen, hotkey: "Alt+J" },
  { to: "/app/vouchers/new/contra", label: "Contra", icon: Repeat, hotkey: "Alt+C" },
];

export function QuickActionsRibbon() {
  const location = useLocation();
  return (
    <div className="hidden md:flex items-center gap-1 overflow-x-auto border-b border-border bg-muted/30 px-4 py-1.5 print:hidden">
      <span className="mr-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Quick Entry
      </span>
      {ACTIONS.map((a) => {
        const active = location.pathname === a.to;
        return (
          <Link
            key={a.to}
            to={a.to}
            className={cn(
              "group flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-foreground/80 hover:bg-accent/60 hover:text-accent-foreground",
            )}
            title={`${a.label} (${a.hotkey})`}
          >
            <a.icon className="h-3.5 w-3.5" />
            <span>{a.label}</span>
            <kbd className="ml-1 hidden rounded border border-border bg-background px-1 text-[9px] font-mono text-muted-foreground group-hover:text-foreground lg:inline">
              {a.hotkey}
            </kbd>
          </Link>
        );
      })}
    </div>
  );
}
