import Papa from "papaparse";
import type { TaxMode, TaxType } from "../types";
import { makeTaxId } from "../calc";

const COLUMNS = ["Order", "Tax Name", "Rate (%)", "Mode", "Applies On Base", "Applies On Taxes"] as const;

interface Row {
  Order: string | number;
  "Tax Name": string;
  "Rate (%)": string | number;
  Mode: string;
  "Applies On Base": string;
  "Applies On Taxes": string;
}

function toRow(tax: TaxType, allTaxes: TaxType[]): Row {
  const depNames = tax.appliesOnTaxIds
    .map((id) => allTaxes.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .join("; ");
  return {
    Order: tax.order,
    "Tax Name": tax.name,
    "Rate (%)": tax.statedRate,
    Mode: tax.mode === "exclusive" ? "Exclusive" : "Inclusive",
    "Applies On Base": tax.appliesOnBase ? "Yes" : "No",
    "Applies On Taxes": depNames,
  };
}

export function toCSV(taxes: TaxType[]): string {
  const ordered = [...taxes].sort((a, b) => a.order - b.order);
  const rows = ordered.map((t) => toRow(t, ordered));
  return Papa.unparse({ fields: [...COLUMNS], data: rows.map((r) => COLUMNS.map((c) => r[c])) });
}

export async function toXLSXBlob(taxes: TaxType[]): Promise<Blob> {
  const XLSX = await import("xlsx");
  const ordered = [...taxes].sort((a, b) => a.order - b.order);
  const rows = ordered.map((t) => toRow(t, ordered));
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...COLUMNS] });
  worksheet["!cols"] = [{ wch: 8 }, { wch: 26 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 36 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tax Structure");
  const out = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function rowsToTaxes(rows: Row[]): TaxType[] {
  // First pass: create taxes with ids, keyed by name for dependency resolution.
  const byName = new Map<string, TaxType>();
  const taxes: TaxType[] = rows
    .filter((r) => (r["Tax Name"] ?? "").toString().trim().length > 0)
    .map((r, idx) => {
      const mode: TaxMode = /inclusive/i.test(String(r.Mode ?? "")) ? "inclusive" : "exclusive";
      const tax: TaxType = {
        id: makeTaxId(),
        name: String(r["Tax Name"]).trim(),
        statedRate: Number(r["Rate (%)"]) || 0,
        mode,
        order: Number(r.Order) || idx + 1,
        appliesOnBase: /^(y|yes|true|1)$/i.test(String(r["Applies On Base"] ?? "").trim()),
        appliesOnTaxIds: [],
      };
      byName.set(tax.name.toLowerCase(), tax);
      return tax;
    });

  // Second pass: resolve "Applies On Taxes" name references now that every
  // tax in the file has an id.
  rows.forEach((r, idx) => {
    const tax = taxes[idx];
    if (!tax) return;
    const raw = String(r["Applies On Taxes"] ?? "").trim();
    if (!raw) return;
    tax.appliesOnTaxIds = raw
      .split(/[;,]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .map((name) => byName.get(name)?.id)
      .filter((id): id is string => Boolean(id));
  });

  return taxes.sort((a, b) => a.order - b.order);
}

export function fromCSV(content: string): TaxType[] {
  const parsed = Papa.parse<Row>(content, { header: true, skipEmptyLines: true });
  return rowsToTaxes(parsed.data);
}

export async function fromXLSX(file: File): Promise<TaxType[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
  return rowsToTaxes(rows);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
