import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Package, ReceiptText, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/lib/company-context";
import { formatINR } from "@/lib/money";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard — Your Mehtaji" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { activeMembership } = useCompany();

  const stats = [
    { label: "Sales (this month)", value: formatINR(0), icon: TrendingUp, color: "text-success" },
    { label: "Receivables", value: formatINR(0), icon: Users, color: "text-primary" },
    { label: "Payables", value: formatINR(0), icon: ReceiptText, color: "text-warning" },
    { label: "Stock value", value: formatINR(0), icon: Package, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {activeMembership?.companies.name ?? "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Quick overview of your books. Use the sidebar to manage masters, vouchers and reports.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="num text-2xl font-semibold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Get started</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/app/ledgers">
              <Users className="mr-2 h-4 w-4" /> Add parties / ledgers
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/items">
              <Package className="mr-2 h-4 w-4" /> Add items / stock
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/vouchers">
              <ReceiptText className="mr-2 h-4 w-4" /> Create voucher
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/companies">
              <Building2 className="mr-2 h-4 w-4" /> Manage companies
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming up next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Phase 1 foundation is live: auth, multi-company workspace and the app shell. Upcoming
            iterations will add masters (ledgers / items), voucher entry with GST, inventory updates
            and full reports (P&L, Balance Sheet, GSTR-1/3B).
          </p>
          <p className="text-xs">
            Tip: use <kbd className="rounded border px-1.5 py-0.5 text-[10px]">Ctrl</kbd> +{" "}
            <kbd className="rounded border px-1.5 py-0.5 text-[10px]">B</kbd> to toggle the sidebar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
