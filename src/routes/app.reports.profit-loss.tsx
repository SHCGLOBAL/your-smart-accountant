import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportToolbar, defaultFyRange } from "@/components/reports/ReportToolbar";
import { TAccount, type TRow } from "@/components/reports/TAccount";
import { useCompany } from "@/lib/company-context";
import { formatINR } from "@/lib/money";
import { downloadCsv } from "@/lib/csv";
import { downloadPdfTable, downloadXlsx, r } from "@/lib/exporters";
import { fetchLedgerBalances, type LedgerBalance } from "@/lib/reports";

export const Route = createFileRoute("/app/reports/profit-loss")({
  head: () => ({ meta: [{ title: "Profit & Loss — Reports" }] }),
  component: ProfitLoss,
});

function ProfitLoss() {
  const { activeCompanyId } = useCompany();
  const navigate = useNavigate();
  const initial = defaultFyRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [balances, setBalances] = useState<LedgerBalance[]>([]);

  useEffect(() => {
    if (!activeCompanyId) return;
    fetchLedgerBalances(activeCompanyId, to, from).then(setBalances);
  }, [activeCompanyId, from, to]);

  const { incomes, expenses, totalInc, totalExp, profit } = useMemo(() => {
    // Exclude direct income / direct expense — those belong to Trading A/c.
    // Indirect items are P&L items.
    const incomes = balances
      .filter((b) => b.type === "income_indirect")
      .map((b) => ({ ...b, value: -b.closing_paise }));
    const expenses = balances
      .filter((b) => b.type === "expense_indirect")
      .map((b) => ({ ...b, value: b.closing_paise }));
    const totalInc = incomes.reduce((s, x) => s + x.value, 0);
    const totalExp = expenses.reduce((s, x) => s + x.value, 0);
    return { incomes, expenses, totalInc, totalExp, profit: totalInc - totalExp };
  }, [balances]);

  // T-account rows
  const expenseRows: TRow[] = expenses
    .filter((e) => e.value)
    .map((e) => ({
      label: <>To {e.name}</>,
      amount: formatINR(e.value),
      onClick: () => navigate({ to: "/app/reports/ledger", search: { ledgerId: e.id, from, to } }),
    }));
  if (profit > 0) {
    expenseRows.push({
      label: "To Net Profit c/d",
      amount: formatINR(profit),
      emphasis: "bold",
    });
  }
  const incomeRows: TRow[] = incomes
    .filter((e) => e.value)
    .map((e) => ({
      label: <>By {e.name}</>,
      amount: formatINR(e.value),
      onClick: () => navigate({ to: "/app/reports/ledger", search: { ledgerId: e.id, from, to } }),
    }));
  if (profit < 0) {
    incomeRows.push({
      label: "By Net Loss c/d",
      amount: formatINR(-profit),
      emphasis: "bold",
    });
  }
  const grandLeft = totalExp + Math.max(0, profit);
  const grandRight = totalInc + Math.max(0, -profit);

  const csvRows = (): (string | number)[][] => [
    [`Profit & Loss A/c: ${from} to ${to}`, "", "", ""],
    ["Dr. Particulars", "Amount (₹)", "Cr. Particulars", "Amount (₹)"],
    ...Array.from({ length: Math.max(expenseRows.length, incomeRows.length) }).map((_, i) => [
      typeof expenseRows[i]?.label === "string" ? (expenseRows[i].label as string) : "",
      expenseRows[i] ? r(expenses[i]?.value ?? (profit > 0 && i === expenseRows.length - 1 ? profit : 0)).toFixed(2) : "",
      typeof incomeRows[i]?.label === "string" ? (incomeRows[i].label as string) : "",
      incomeRows[i] ? r(incomes[i]?.value ?? (profit < 0 && i === incomeRows.length - 1 ? -profit : 0)).toFixed(2) : "",
    ]),
    ["Total", (grandLeft / 100).toFixed(2), "Total", (grandRight / 100).toFixed(2)],
  ];

  const onExportCsv = () => downloadCsv(`profit-loss-${from}_to_${to}.csv`, csvRows());
  const onExportXlsx = () =>
    downloadXlsx(`profit-loss-${from}_to_${to}.xlsx`, [{ name: "P&L", rows: csvRows() }]);
  const onExportPdf = () =>
    downloadPdfTable({
      title: "Profit & Loss A/c",
      subtitle: `${from} to ${to}`,
      head: [["Dr. Particulars", "Amount (₹)", "Cr. Particulars", "Amount (₹)"]],
      body: Array.from({ length: Math.max(expenses.length + (profit > 0 ? 1 : 0), incomes.length + (profit < 0 ? 1 : 0)) }).map((_, i) => {
        const lExp = expenses.filter((e) => e.value);
        const lInc = incomes.filter((e) => e.value);
        const lLabel = i < lExp.length ? `To ${lExp[i].name}` : profit > 0 && i === lExp.length ? "To Net Profit c/d" : "";
        const lAmt = i < lExp.length ? r(lExp[i].value).toFixed(2) : profit > 0 && i === lExp.length ? r(profit).toFixed(2) : "";
        const rLabel = i < lInc.length ? `By ${lInc[i].name}` : profit < 0 && i === lInc.length ? "By Net Loss c/d" : "";
        const rAmt = i < lInc.length ? r(lInc[i].value).toFixed(2) : profit < 0 && i === lInc.length ? r(-profit).toFixed(2) : "";
        return [lLabel, lAmt, rLabel, rAmt];
      }),
      foot: [["Total", r(grandLeft).toFixed(2), "Total", r(grandRight).toFixed(2)]],
      fileName: `profit-loss-${from}_to_${to}.pdf`,
      orientation: "l",
      rightAlignCols: [1, 3],
    });

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
            Indirect Income & Indirect Expenses only. Gross Profit/Loss flows in from the <strong>Trading Account</strong>.
          </p>
        </CardContent>
      </Card>
      <TAccount
        title="Profit & Loss Account"
        subtitle={`for the period ${from} to ${to}`}
        leftRows={expenseRows}
        rightRows={incomeRows}
        leftTotal={formatINR(grandLeft)}
        rightTotal={formatINR(grandRight)}
      />
    </div>
  );
}
