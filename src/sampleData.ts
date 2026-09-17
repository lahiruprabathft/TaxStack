import type { TaxType } from "./types";

/**
 * A typical Sri Lankan hotel cascade: Service Charge on the room rate,
 * SSCL calculated on (rate + SC), VAT calculated on (rate + SC + SSCL).
 * This mirrors the example given when the tool was scoped, and doubles as
 * a working starting point rather than an empty screen.
 */
export function sampleTaxes(): TaxType[] {
  const sc: TaxType = {
    id: "sample_sc",
    name: "Service Charge (SC)",
    statedRate: 10,
    mode: "exclusive",
    order: 1,
    appliesOnBase: true,
    appliesOnTaxIds: [],
  };
  const sscl: TaxType = {
    id: "sample_sscl",
    name: "SSCL",
    statedRate: 2.5,
    mode: "exclusive",
    order: 2,
    appliesOnBase: true,
    appliesOnTaxIds: [sc.id],
  };
  const vat: TaxType = {
    id: "sample_vat",
    name: "VAT",
    statedRate: 18,
    mode: "exclusive",
    order: 3,
    appliesOnBase: true,
    appliesOnTaxIds: [sc.id, sscl.id],
  };
  return [sc, sscl, vat];
}
