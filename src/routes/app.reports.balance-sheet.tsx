import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportToolbar, defaultFyRange } from "@/components/reports/ReportToolbar";
import { TAccount, type TRow } from "@/components/reports/TAccount";
import { useCompany } from "@/lib/company-context";
import { formatINR } from "@/lib/money";
import { downloadCsv } from "@/lib/csv";
import { downloadPdfTable, downloadXlsx, r } from "@/lib/exporters";
import {
  fetchLedgerBalances,
  PL_INCOME,
  PL_EXPENSE,
  BS_ASSET,
  BS_LIAB,
  type LedgerBalance,
} from "@/lib/reports";

export const Route = createFileRoute("/app/reports/balance-sheet")({
  head: () => ({ meta: [{ title: "Balance Sheet — Reports" }] }),
  component: BalanceSheet,
});

function BalanceSheet() {
  const { activeCompanyId } = useCompany();
  const navigate = useNavigate();
  const initial = defaultFyRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [balances, setBalances] = useState<LedgerBalance[]>([]);

  useEffect(() => {
    if (!activeCompanyId) return;
    fetchLedgerBalances(activeCompanyId, to).then(setBalances);
  }, [activeCompanyId, to]);

  const { assets, liabilities, totalA, totalL, profit } = useMemo(() => {
    const assets = balances
      .filter((b) => BS_ASSET.has(b.type))
      .map((b) => ({ ...b, value: b.closing_paise }));
    const liabilities = balances
      .filter((b) => BS_LIAB.has(b.type))
      .map((b) => ({ ...b, value: -b.closing_paise }));
    const incomeTotal = balances.filter((b) => PL_INCOME.has(b.type)).reduce((s, b) => s + -b.closing_paise, 0);
    const expenseTotal = balances.filter((b) => PL_EXPENSE.has(b.type)).reduce((s, b) => s + b.closing_paise, 0);
    const profit = incomeTotal - expenseTotal;
    const totalA = assets.reduce((s, x) => s + x.value, 0);
    const totalL = liabilities.reduce((s, x) => s + x.value, 0);
    return { assets, liabilities, totalA, totalL, profit };
  }, [balances]);

  const liabExtended = profit >= 0
    ? [...liabilities.filter((x) => x.value), { id: "__pl", name: "Net Profit (current period)", type: "capital", value: profit }]
    : liabilities.filter((x) => x.value);
  const assetExtended = profit < 0
    ? [...assets.filter((x) => x.value), { id: "__pl", name: "Net Loss (current period)", type: "current_asset", value: -profit }]
    : assets.filter((x) => x.value);
  const grandL = totalL + Math.max(0, profit);
  const grandA = totalA + Math.max(0, -profit);

  const liabRows: TRow[] = liabExtended.map((x) => ({
    label: x.name,
    amount: formatINR(x.value),
    onClick: x.id !== "__pl"
      ? () => navigate({ to: "/app/reports/ledger", search: { ledgerId: x.id, from, to } })
      : undefined,
    emphasis: x.id === "__pl" ? "bold" : "normal",
  }));
  const assetRows: TRow[] = assetExtended.map((x) => ({
    label: x.name,
    amount: formatINR(x.value),
    onClick: x.id !== "__pl"
      ? () => navigate({ to: "/app/reports/ledger", search: { ledgerId: x.id, from, to } })
      : undefined,
    emphasis: x.id === "__pl" ? "bold" : "normal",
  }));

  const csvRows = (): (string | number)[][] => {
    const max = Math.max(liabExtended.length, assetExtended.length);
    return [
      [`Balance Sheet as on ${to}`, "", "", ""],
      ["Liabilities", "Amount (₹)", "Assets", "Amount (₹)"],
      ...Array.from({ length: max }).map((_, i) => [
        liabExtended[i]?.name ?? "",
        liabExtended[i] ? (liabExtended[i].value / 100).toFixed(2) : "",
        assetExtended[i]?.name ?? "",
        assetExtended[i] ? (assetExtended[i].value / 100).toFixed(2) : "",
      ]),
      ["Total", (grandL / 100).toFixed(2), "Total", (grandA / 100).toFixed(2)],
    ];
  };

  const onExportCsv = () => downloadCsv(`balance-sheet-${to}.csv`, csvRows());
  const onExportXlsx = () =>
    downloadXlsx(`balance-sheet-${to}.xlsx`, [{ name: "Balance Sheet", rows: csvRows() }]);
  const onExportPdf = () => {
    const max = Math.max(liabExtended.length, assetExtended.length);
    downloadPdfTable({
      title: "Balance Sheet",
      subtitle: `As on ${to}`,
      head: [["Liabilities", "Amount (₹)", "Assets", "Amount (₹)"]],
      body: Array.from({ length: max }).map((_, i) => [
        liabExtended[i]?.name ?? "",
        liabExtended[i] ? r(liabExtended[i].value).toFixed(2) : "",
        assetExtended[i]?.name ?? "",
        assetExtended[i] ? r(assetExtended[i].value).toFixed(2) : "",
      ]),
      foot: [["Total", r(grandL).toFixed(2), "Total", r(grandA).toFixed(2)]],
      fileName: `balance-sheet-${to}.pdf`,
      orientation: "l",
      rightAlignCols: [1, 3],
    });
  };

  return (
    <div className="space-y-3">
      <Card className="print:hidden">
        <CardContent className="p-3">
          <ReportToolbar
            from={from}
            to={to}
            onFrom={setFrom}
            onTo={setTo}
            onExportCsv={onExportCsv}
            onExportXlsx={onExportXlsx}
            onExportPdf={onExportPdf}
            onPrint={() => window.print()}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Closing position as on <strong>{to}</strong>. Net P/L for the period auto-balances the sheet.
          </p>
        </CardContent>
      </Card>
      <TAccount
        title="Balance Sheet"
        subtitle={`as on ${to}`}
        leftHeader="Liabilities"
        rightHeader="Assets"
        leftRows={liabRows}
        rightRows={assetRows}
        leftTotal={formatINR(grandL)}
        rightTotal={formatINR(grandA)}
      />
    </div>
  );
}
