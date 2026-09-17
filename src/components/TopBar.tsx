import { useRef } from "react";
import type { Direction } from "../types";

interface Props {
  direction: Direction;
  onDirectionChange: (d: Direction) => void;
  amount: number;
  onAmountChange: (v: number) => void;
  decimals: number;
  onDecimalsChange: (d: number) => void;
  currencySymbol: string;
  onCurrencyChange: (s: string) => void;
  onExportCSV: () => void;
  onExportXLSX: () => void;
  onImportFile: (file: File) => void;
  onLoadSample: () => void;
  erpMode: boolean;
  onErpModeChange: (v: boolean) => void;
}

export default function TopBar({
  direction,
  onDirectionChange,
  amount,
  onAmountChange,
  decimals,
  onDecimalsChange,
  currencySymbol,
  onCurrencyChange,
  onExportCSV,
  onExportXLSX,
  onImportFile,
  onLoadSample,
  erpMode,
  onErpModeChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="border-b border-ink-700 bg-ink-900/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧮</span>
            <div>
              <h1 className="text-sm font-semibold leading-none text-ink-50">TaxStack</h1>
              <p className="text-xs leading-none text-ink-400 mt-1">Cascading tax structure calculator</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-md border border-ink-600">
              <button
                type="button"
                onClick={() => onDirectionChange("build")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  direction === "build" ? "bg-teal-500 text-ink-950" : "bg-ink-800 text-ink-300 hover:text-ink-100"
                }`}
                title="Enter the net (tax-exclusive) base, build up to the final total"
              >
                Build ↑ from net
              </button>
              <button
                type="button"
                onClick={() => onDirectionChange("extract")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  direction === "extract" ? "bg-gold-500 text-ink-950" : "bg-ink-800 text-ink-300 hover:text-ink-100"
                }`}
                title="Enter the final all-inclusive total, extract the net base"
              >
                Extract ↓ from gross
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="amount" className="text-xs text-ink-400">
              {direction === "build" ? "Net base" : "Final total"}
            </label>
            <input
              value={currencySymbol}
              onChange={(e) => onCurrencyChange(e.target.value.slice(0, 3))}
              className="tabular w-10 rounded-md border border-ink-600 bg-ink-800 px-1.5 py-1.5 text-center text-xs text-ink-300 outline-none focus:border-gold-500"
              aria-label="Currency symbol"
            />
            <input
              id="amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
              className="tabular w-32 rounded-md border border-ink-600 bg-ink-800 px-2.5 py-1.5 text-right text-sm font-medium text-ink-50 outline-none focus:border-gold-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="decimals" className="text-xs text-ink-400">
              Decimals
            </label>
            <select
              id="decimals"
              value={decimals}
              onChange={(e) => onDecimalsChange(Number(e.target.value))}
              className="tabular rounded-md border border-ink-600 bg-ink-800 px-2 py-1.5 text-sm text-ink-50 outline-none focus:border-gold-500"
            >
              {[0, 1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <label
            className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              erpMode
                ? "border-gold-500 bg-gold-500/15 text-gold-400"
                : "border-ink-600 text-ink-300 hover:border-ink-500"
            }`}
            title="Round each effective rate to the decimals above and apply it as an independent flat percentage, matching a non-cascading ERP tax engine — instead of re-cascading exact bases."
          >
            <input
              type="checkbox"
              checked={erpMode}
              onChange={(e) => onErpModeChange(e.target.checked)}
              className="hidden"
            />
            ERP flat-rate mode
          </label>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onLoadSample}
              className="rounded-md border border-ink-600 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:border-ink-500 hover:text-ink-100"
            >
              Load sample
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-ink-600 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:border-ink-500 hover:text-ink-100"
            >
              Import CSV / XLSX
            </button>
            <button
              type="button"
              onClick={onExportCSV}
              className="rounded-md border border-teal-600 bg-teal-500/10 px-2.5 py-1.5 text-xs font-medium text-teal-400 hover:bg-teal-500/20"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={onExportXLSX}
              className="rounded-md border border-gold-600 bg-gold-500/10 px-2.5 py-1.5 text-xs font-medium text-gold-400 hover:bg-gold-500/20"
            >
              Export XLSX
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
