import type { CalculationResult, Direction } from "../types";
import { formatAmount } from "../calc";

interface Props {
  result: CalculationResult;
  decimals: number;
  direction: Direction;
  currencySymbol: string;
}

export default function Ledger({ result, decimals, direction, currencySymbol }: Props) {
  const fmt = (v: number) => `${currencySymbol}${formatAmount(v, decimals)}`;

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-800/40">
      <div className="border-b border-ink-700 px-4 py-3">
        <h2 className="text-sm font-semibold text-ink-100">Calculation Ledger</h2>
        <p className="mt-0.5 text-xs text-ink-400">
          {direction === "build"
            ? "Building up from the net base to the final total."
            : "Net base solved backward from the final total you entered."}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wide text-ink-400">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Tax</th>
              <th className="px-4 py-2 font-medium">Stated Rate</th>
              <th className="px-4 py-2 text-right font-medium">Base Amount</th>
              <th className="px-4 py-2 text-right font-medium">Tax Amount</th>
              <th className="px-4 py-2 text-right font-medium">Effective Rate on Net</th>
              <th className="px-4 py-2 text-right font-medium">Running Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-ink-700/60 text-ink-300">
              <td className="px-4 py-2.5" />
              <td className="px-4 py-2.5 font-medium">Net Base</td>
              <td className="px-4 py-2.5" />
              <td className="tabular px-4 py-2.5 text-right">—</td>
              <td className="tabular px-4 py-2.5 text-right">—</td>
              <td className="tabular px-4 py-2.5 text-right">—</td>
              <td className="tabular px-4 py-2.5 text-right font-medium text-ink-100">
                {fmt(result.netBase)}
              </td>
            </tr>
            {result.lines.map((line, i) => (
              <tr key={line.tax.id} className="border-b border-ink-700/60 last:border-b-0">
                <td className="tabular px-4 py-2.5 text-ink-500">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-ink-100">{line.tax.name || "Unnamed tax"}</div>
                  <div className="text-xs text-ink-500">
                    {line.tax.mode === "exclusive" ? "Exclusive · adds on top" : "Inclusive · extracted only"}
                  </div>
                </td>
                <td className="tabular px-4 py-2.5 text-ink-300">{line.tax.statedRate}%</td>
                <td className="tabular px-4 py-2.5 text-right text-ink-300">{fmt(line.baseAmount)}</td>
                <td
                  className={`tabular px-4 py-2.5 text-right font-medium ${
                    line.tax.mode === "exclusive" ? "text-teal-400" : "text-gold-400"
                  }`}
                >
                  {line.tax.mode === "exclusive" ? "+ " : "⊂ "}
                  {fmt(line.taxAmount)}
                </td>
                <td className="tabular px-4 py-2.5 text-right text-ink-100">
                  {line.effectiveRateOnNet}%
                </td>
                <td className="tabular px-4 py-2.5 text-right font-medium text-ink-100">
                  {fmt(line.runningTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-ink-600 bg-ink-800/70">
              <td colSpan={4} className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-ink-400">
                Total exclusive tax added
              </td>
              <td className="tabular px-4 py-3 text-right font-medium text-teal-400">
                {fmt(result.totalExclusiveTax)}
              </td>
              <td colSpan={2} />
            </tr>
            {result.totalInclusiveTax > 0 && (
              <tr className="bg-ink-800/70">
                <td colSpan={4} className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-ink-400">
                  Total inclusive tax (embedded, informational)
                </td>
                <td className="tabular px-4 py-3 text-right font-medium text-gold-400">
                  {fmt(result.totalInclusiveTax)}
                </td>
                <td colSpan={2} />
              </tr>
            )}
            <tr className="bg-ink-800">
              <td colSpan={6} className="px-4 py-3 text-right text-sm font-semibold text-ink-100">
                Final Total
              </td>
              <td className="tabular px-4 py-3 text-right text-base font-semibold text-gold-400">
                {fmt(result.finalTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {direction === "extract" && (
        <p className="border-t border-ink-700 px-4 py-2.5 text-xs text-ink-500">
          Solved by working backward from your entered final total. Per-line rounding at{" "}
          {decimals} decimal{decimals === 1 ? "" : "s"} means the recomputed final total above can differ
          from what you typed by a fraction of a unit — that drift is real and is exactly what your ERP
          will also produce.
        </p>
      )}
    </div>
  );
}
