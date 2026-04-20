import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/app/vouchers")({
  head: () => ({ meta: [{ title: "Vouchers — Your Mehtaji" }] }),
  component: () => (
    <Card>
      <CardHeader>
        <CardTitle>Vouchers</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Coming next: Sales, Purchase, Receipt, Payment, Journal, Contra, Credit/Debit notes with
        Busy-style hotkeys (Alt+S, Alt+P, Alt+R, Alt+J, Ctrl+S to save).
      </CardContent>
    </Card>
  ),
});
