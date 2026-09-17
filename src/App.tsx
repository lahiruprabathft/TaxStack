import { useMemo, useState } from "react";
import type { Direction, TaxType } from "./types";
import { buildForward, extractFromGross } from "./calc";
import { sampleTaxes } from "./sampleData";
import { fromCSV, fromXLSX, toCSV, toXLSXBlob, downloadBlob } from "./utils/csv";
import TopBar from "./components/TopBar";
import TaxList from "./components/TaxList";
import Ledger from "./components/Ledger";

export default function App() {
  const [taxes, setTaxes] = useState<TaxType[]>(sampleTaxes());
  const [direction, setDirection] = useState<Direction>("build");
  const [amount, setAmount] = useState<number>(100000);
  const [decimals, setDecimals] = useState<number>(2);
  const [currencySymbol, setCurrencySymbol] = useState<string>("Rs.");
  const [importError, setImportError] = useState<string | null>(null);

  const result = useMemo(() => {
    return direction === "build"
      ? buildForward(amount, taxes, decimals)
      : extractFromGross(amount, taxes, decimals);
  }, [direction, amount, taxes, decimals]);

  const handleImportFile = async (file: File) => {
    setImportError(null);
    try {
      const imported = file.name.toLowerCase().endsWith(".xlsx")
        ? await fromXLSX(file)
        : fromCSV(await file.text());
      if (imported.length === 0) {
        setImportError("No tax rows found in that file.");
        return;
      }
      setTaxes(imported);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Could not read that file.");
    }
  };

  return (
    <div className="min-h-screen bg-ink-900">
      <TopBar
        direction={direction}
        onDirectionChange={setDirection}
        amount={amount}
        onAmountChange={setAmount}
        decimals={decimals}
        onDecimalsChange={setDecimals}
        currencySymbol={currencySymbol}
        onCurrencyChange={setCurrencySymbol}
        onExportCSV={() => downloadBlob(new Blob([toCSV(taxes)], { type: "text/csv" }), "tax-structure.csv")}
        onExportXLSX={() => toXLSXBlob(taxes).then((blob) => downloadBlob(blob, "tax-structure.xlsx"))}
        onImportFile={handleImportFile}
        onLoadSample={() => setTaxes(sampleTaxes())}
      />

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 p-3">
        {importError && (
          <div className="rounded-lg border border-danger-500/50 bg-danger-500/10 px-4 py-2.5 text-sm text-danger-400">
            {importError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-100">Tax Configuration</h2>
              <span className="text-xs text-ink-500">
                {taxes.length} tax{taxes.length === 1 ? "" : "es"} · drag to reorder
              </span>
            </div>
            <TaxList taxes={taxes} onChangeAll={setTaxes} />
          </section>

          <section>
            <Ledger result={result} decimals={decimals} direction={direction} currencySymbol={currencySymbol} />

            <div className="mt-4 rounded-xl border border-ink-700 bg-ink-800/40 p-4 text-xs leading-relaxed text-ink-400">
              <p className="font-medium text-ink-200">How to read this for ERP configuration</p>
              <p className="mt-1">
                <span className="text-ink-200">Stated Rate</span> is what the client told you.{" "}
                <span className="text-ink-200">Effective Rate on Net</span> is what that tax actually
                works out to once earlier taxes are folded into its base — that's the number that
                explains why, say, a 2.5% SSCL calculated on top of Service Charge lands closer to
                2.75-2.8% of the room rate. Configure each tax in your ERP against whichever base column
                matches its "Applies on" selection here, in the order shown.
              </p>
            </div>
          </section>
        </div>
      </main>
     <footer className="mx-auto max-w-full space-y-1 px-4 pb-8 pt-2 p-3 text-center text-xs text-ink-600 sm:px-6">
        <p>
          Runs entirely in your browser - nothing is saved or sent anywhere. Export a CSV/XLSX per client
          to keep a record.
        </p>
        <p>
          Developed by{" "}
          <a
            href="https://itservicelk.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink-400 underline decoration-ink-600 underline-offset-2 transition-colors hover:text-gold-400 hover:decoration-gold-400"
          >
            ITServiceLK
          </a>
        </p>
      </footer>
    </div>
  );
}
 