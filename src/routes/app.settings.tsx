import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompany } from "@/lib/company-context";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Your Mehtaji" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { activeMembership } = useCompany();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between border-b border-border py-2">
          <span className="text-muted-foreground">Active company</span>
          <span className="font-medium">{activeMembership?.companies.name ?? "—"}</span>
        </div>
        <div className="flex justify-between border-b border-border py-2">
          <span className="text-muted-foreground">Your role</span>
          <span className="uppercase tracking-wide text-xs">
            {activeMembership?.role ?? "—"}
          </span>
        </div>
        <p className="pt-3 text-xs text-muted-foreground">
          Theme, financial-year selector, voucher numbering prefixes, invite users — all coming next.
        </p>
      </CardContent>
    </Card>
  );
}
