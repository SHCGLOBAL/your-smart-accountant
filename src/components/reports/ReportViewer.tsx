import * as React from "react";
import { cn } from "@/lib/utils";
import { useCompany } from "@/lib/company-context";

/**
 * ReportViewer — print-ready wrapper for any report.
 *
 * - On screen: renders children with an optional toolbar slot above.
 * - On print: hides all app chrome (sidebar, header, status bar, toolbar)
 *   via CSS rules in `src/styles.css`, and shows a header strip with
 *   Company Name, Report Title, Subtitle and Date Range on every page.
 *
 * Usage:
 *   <ReportViewer
 *     title="Cash Book"
 *     subtitle="Cash A/c"
 *     fromDate={from}
 *     toDate={to}
 *     toolbar={<ReportToolbar … />}
 *     orientation="landscape"
 *   >
 *     <table className="w-full">…</table>
 *   </ReportViewer>
 */
export interface ReportViewerProps {
  title: string;
  subtitle?: React.ReactNode;
  fromDate?: string;
  toDate?: string;
  asOf?: string;
  /** Toolbar / filters area — automatically hidden when printing. */
  toolbar?: React.ReactNode;
  /** Optional explicit company name override. Defaults to active company. */
  companyName?: string;
  orientation?: "portrait" | "landscape";
  className?: string;
  children: React.ReactNode;
}

export function ReportViewer({
  title,
  subtitle,
  fromDate,
  toDate,
  asOf,
  toolbar,
  companyName,
  orientation = "portrait",
  className,
  children,
}: ReportViewerProps) {
  const { activeMembership } = useCompany();
  const company = companyName ?? activeMembership?.companies?.name ?? "";
  const periodText = asOf
    ? `As on ${asOf}`
    : fromDate && toDate
      ? `From ${fromDate} to ${toDate}`
      : "";

  return (
    <div className={cn("report-print-root-wrap space-y-3", className)}>
      {toolbar && <div className="print:hidden">{toolbar}</div>}
      <div
        className={cn(
          "report-print-root",
          orientation === "landscape" && "report-print-landscape",
        )}
      >
        {/* Print-only header — repeats on every printed page via @page margins. */}
        <div className="report-print-header mb-3 border-b border-black pb-2 text-center">
          <div className="text-base font-bold uppercase tracking-wide">{company}</div>
          <div className="report-print-title text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs">{subtitle}</div>}
          {periodText && <div className="text-[11px]">{periodText}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
