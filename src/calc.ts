import type { CalculatedLine, CalculationResult, TaxType } from "./types";

/** Standard round-half-up to a given number of decimal places, floating-point safe. */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  // Add a tiny epsilon before rounding to counter binary floating point
  // representation error (e.g. 1.005 * 100 landing on 100.49999999999999).
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function sortedTaxes(taxes: TaxType[]): TaxType[] {
  return [...taxes].sort((a, b) => a.order - b.order);
}

/**
 * Runs the cascading calculation forward from a known net (tax-exclusive
 * starting point) base amount. Exclusive taxes add to the running total;
 * inclusive taxes are extracted/reported from within their base but do not
 * add anything further, since they are already embedded in the amount they
 * were calculated on.
 *
 * When `decimals` is finite, each line is rounded to that precision before
 * feeding into any later tax's base — this mirrors how a real ERP rounds
 * each ledger line, and is what actually produces the "2.5% becomes 2.8%"
 * effective-rate drift the tool exists to surface. Pass `Infinity` for
 * unrounded, exact arithmetic (used internally to solve the reverse/extract
 * direction).
 */
export function buildForward(
  netBase: number,
  taxes: TaxType[],
  decimals: number
): CalculationResult {
  const ordered = sortedTaxes(taxes);
  const round = (v: number) => (Number.isFinite(decimals) ? roundTo(v, decimals) : v);

  const amounts = new Map<string, number>();
  const lines: CalculatedLine[] = [];
  let runningTotal = round(netBase);
  let totalExclusiveTax = 0;
  let totalInclusiveTax = 0;

  for (const tax of ordered) {
    let baseAmount = tax.appliesOnBase ? netBase : 0;
    for (const depId of tax.appliesOnTaxIds) {
      baseAmount += amounts.get(depId) ?? 0;
    }
    baseAmount = round(baseAmount);

    const rate = tax.statedRate / 100;
    let taxAmount: number;

    if (tax.mode === "exclusive") {
      taxAmount = round(baseAmount * rate);
      runningTotal = round(runningTotal + taxAmount);
      totalExclusiveTax = round(totalExclusiveTax + taxAmount);
    } else {
      // Inclusive: baseAmount already contains this tax; extract it.
      // amount = base - base / (1 + rate) = base * rate / (1 + rate)
      taxAmount = round((baseAmount * rate) / (1 + rate));
      totalInclusiveTax = round(totalInclusiveTax + taxAmount);
    }

    amounts.set(tax.id, taxAmount);

    const effectiveRateOnNet = netBase !== 0 ? round((taxAmount / netBase) * 100) : 0;

    lines.push({
      tax,
      baseAmount,
      taxAmount,
      effectiveRateOnNet,
      runningTotal,
    });
  }

  return {
    netBase: round(netBase),
    finalTotal: runningTotal,
    lines,
    totalExclusiveTax,
    totalInclusiveTax,
  };
}

/**
 * Solves for the net base given a known final (gross) total, then returns
 * the full forward breakdown at the display precision requested.
 *
 * Because every tax's base is a non-negative combination of the net base and
 * other taxes' amounts, the unrounded final total is a monotonically
 * non-decreasing, effectively linear function of the net base. That makes a
 * plain bisection search reliable and precision-independent: we solve
 * against the *unrounded* function, then run one more forward pass at the
 * requested display precision so the breakdown shown matches exactly what a
 * real ERP would compute line by line (rounding drift and all).
 */
export function extractFromGross(
  grossTotal: number,
  taxes: TaxType[],
  decimals: number
): CalculationResult {
  if (grossTotal <= 0 || taxes.length === 0) {
    return buildForward(grossTotal, taxes, decimals);
  }

  let lo = 0;
  let hi = grossTotal;

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const total = buildForward(mid, taxes, Infinity).finalTotal;
    if (total > grossTotal) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const netBase = (lo + hi) / 2;
  return buildForward(netBase, taxes, decimals);
}

export function formatAmount(value: number, decimals: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

let counter = 0;
export function makeTaxId(): string {
  counter += 1;
  return `tax_${Date.now().toString(36)}_${counter}`;
}
