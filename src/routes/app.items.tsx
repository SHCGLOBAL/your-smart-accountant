import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/app/items")({
  head: () => ({ meta: [{ title: "Items — Your Mehtaji" }] }),
  component: () => (
    <Card>
      <CardHeader>
        <CardTitle>Items / Stock</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Coming in the next iteration: items with HSN, unit, GST rate and opening stock.
      </CardContent>
    </Card>
  ),
});
