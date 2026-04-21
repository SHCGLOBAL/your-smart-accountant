import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileCode2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company-context";
import { formatINR } from "@/lib/money";
import { upsertEinvoice } from "@/lib/einvoice";
import { toast } from "sonner";

export const Route = createFileRoute("/app/einvoice")({
  head: () => ({ meta: [{ title: "E-Invoice & E-Way Bill — Your Mehtaji" }] }),
  component: EinvoicePage,
});

interface Row {
  id: string; voucher_number: string; voucher_date: string; total_paise: number;
  ledgers: { name: string; gstin: string | null } | null;
  einvoice_details: { irn: string | null; status: string; ewb_no: string | null; ewb_valid_until: string | null } | null;
}

function EinvoicePage() {
  const { activeCompanyId } = useCompany();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!activeCompanyId) return;
    setLoading(true);
    const { data } = await supabase.from("vouchers")
      .select("id, voucher_number, voucher_date, total_paise, ledgers:party_ledger_id(name, gstin), einvoice_details(irn, status, ewb_no, ewb_valid_until)")
      .eq("company_id", activeCompanyId).eq("voucher_type", "sales")
      .order("voucher_date", { ascending: false }).limit(200);
    setRows((data || []) as unknown as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [activeCompanyId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">E-Invoice & E-Way Bill</h1>
        <p className="text-xs text-muted-foreground">
          Track IRN/QR generation status for sales invoices &gt; ₹5 Cr turnover. Connect your GSP credentials in Settings to auto-push.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Invoice #</TableHead><TableHead>Party</TableHead>
              <TableHead>GSTIN</TableHead><TableHead className="text-right">Amount</TableHead>
              <TableHead>IRN status</TableHead><TableHead>EWB</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="p-6 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="p-6 text-center text-sm text-muted-foreground">No sales invoices yet.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.voucher_date}</TableCell>
                  <TableCell className="font-medium">{r.voucher_number}</TableCell>
                  <TableCell>{r.ledgers?.name || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.ledgers?.gstin || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{formatINR(r.total_paise)}</TableCell>
                  <TableCell>
                    <Badge variant={r.einvoice_details?.irn ? "default" : "outline"}>
                      {r.einvoice_details?.irn ? "Generated" : (r.einvoice_details?.status || "Pending")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.einvoice_details?.ewb_no
                      ? <span className="font-mono">{r.einvoice_details.ewb_no}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <ManualEntry voucherId={r.id} companyId={activeCompanyId!} onSaved={load} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
          <p><strong>Manual entry mode:</strong> If you generate the IRN/EWB on the GST portal, paste the values back here so they appear on the invoice PDF.</p>
          <p><Link to="/app/settings" className="underline">Go to Settings</Link> to enable e-invoicing and add your UPI ID for payment-link QRs.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ManualEntry({ voucherId, companyId, onSaved }: { voucherId: string; companyId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [irn, setIrn] = useState("");
  const [ackNo, setAckNo] = useState("");
  const [ewbNo, setEwbNo] = useState("");
  const [ewbValid, setEwbValid] = useState("");
  const [vehicle, setVehicle] = useState("");

  async function save() {
    await upsertEinvoice({
      voucherId, companyId,
      irn: irn || undefined, ackNo: ackNo || undefined,
      status: irn ? "generated" : "pending",
      ewbNo: ewbNo || undefined, ewbValidUntil: ewbValid || undefined, vehicleNo: vehicle || undefined,
    });
    toast.success("Saved");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><FileCode2 className="h-3 w-3 mr-1" />Update</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>IRN / E-Way Bill details</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">IRN</Label><Input value={irn} onChange={(e) => setIrn(e.target.value)} placeholder="64-char IRN" /></div>
          <div className="space-y-1"><Label className="text-xs">Acknowledgement No.</Label><Input value={ackNo} onChange={(e) => setAckNo(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs flex items-center gap-1"><Truck className="h-3 w-3" /> EWB No.</Label><Input value={ewbNo} onChange={(e) => setEwbNo(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Valid until</Label><Input type="datetime-local" value={ewbValid} onChange={(e) => setEwbValid(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Vehicle No.</Label><Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="MH12AB1234" /></div>
        </div>
        <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
