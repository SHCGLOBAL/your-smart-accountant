import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/app/ledgers")({
  head: () => ({ meta: [{ title: "Ledgers — Your Mehtaji" }] }),
  component: () => (
    <Card>
      <CardHeader>
        <CardTitle>Ledgers / Parties</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Coming in the next iteration: customers, suppliers, expense heads with GSTIN, state and
        opening balances. The database is ready — UI follows.
      </CardContent>
    </Card>
  ),
});
