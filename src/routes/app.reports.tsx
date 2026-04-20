import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports — Your Mehtaji" }] }),
  component: () => (
    <Card>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Coming next: Day Book, Ledger statement, Trial Balance, P&L, Balance Sheet, GSTR-1, GSTR-3B
        and Stock Summary — with date filters and CSV/print export.
      </CardContent>
    </Card>
  ),
});
