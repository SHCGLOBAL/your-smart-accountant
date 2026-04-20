import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export interface GstinLookupResult {
  ok: boolean;
  error?: string;
  data?: {
    legalName: string;
    tradeName: string;
    address: string;
    stateCode: string | null;
    state: string | null;
    status: string | null;
  };
}

export const lookupGstin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ gstin: z.string().trim().toUpperCase().regex(GSTIN_REGEX) }))
  .handler(async ({ data }): Promise<GstinLookupResult> => {
    const key = process.env.APPYFLOW_GST_API_KEY;
    if (!key) return { ok: false, error: "GST lookup not configured" };
    try {
      const url = `https://appyflow.in/api/verifyGST?gstNo=${encodeURIComponent(data.gstin)}&key_secret=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) return { ok: false, error: `Lookup failed (${res.status})` };
      const json = (await res.json()) as {
        error?: boolean;
        message?: string;
        taxpayerInfo?: {
          lgnm?: string;
          tradeNam?: string;
          sts?: string;
          pradr?: { adr?: string };
        };
      };
      if (json.error || !json.taxpayerInfo) {
        return { ok: false, error: json.message || "GSTIN not found" };
      }
      const ti = json.taxpayerInfo;
      const stateCode = data.gstin.substring(0, 2);
      return {
        ok: true,
        data: {
          legalName: ti.lgnm || "",
          tradeName: ti.tradeNam || ti.lgnm || "",
          address: ti.pradr?.adr || "",
          stateCode,
          state: null,
          status: ti.sts || null,
        },
      };
    } catch (e) {
      console.error("GSTIN lookup error", e);
      return { ok: false, error: e instanceof Error ? e.message : "Lookup failed" };
    }
  });
