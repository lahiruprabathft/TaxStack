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

/**
 * The exact effective rate of each tax against the net base, independent of
 * the base amount itself — every tax's amount is a fixed proportion of the
 * net base regardless of scale, so this is found once by running the
 * cascade against a unit base (1) at full precision.
 */
function exactEffectiveRatios(taxes: TaxType[]): Map<string, number> {
  const unit = buildForward(1, taxes, Infinity);
  const ratios = new Map<string, number>();
  for (const line of unit.lines) {
    ratios.set(line.tax.id, line.taxAmount);
  }
  return ratios;
}

/**
 * "ERP flat-rate" mode: mirrors how a real tax engine that can't natively
 * cascade tax-on-tax is actually configured in practice. Instead of
 * re-deriving each tax's base from the running total every time, you
 * calculate the true effective rate once (exactly, via the cascade), round
 * *that percentage* to the working precision, and from then on treat every
 * exclusive tax as an independent flat percentage of the net base — the
 * same shortcut you'd type into an ERP tax-configuration screen.
 *
 * This deliberately reproduces the small drift against the exact cascade
 * that comes from rounding the rate itself before reusing it, since that's
 * the real-world source of the mismatch this mode exists to match.
 */
function flatRatesFromCascade(taxes: TaxType[], decimals: number): Map<string, number> {
  const exact = exactEffectiveRatios(taxes);
  const flat = new Map<string, number>();
  for (const tax of taxes) {
    const exactRatio = exact.get(tax.id) ?? 0;
    // Round the *percentage*, then convert back to a ratio, e.g. 2.8160% at
    // 4 decimals — this is what actually gets typed into an ERP field.
    const roundedPercent = roundTo(exactRatio * 100, decimals);
    flat.set(tax.id, roundedPercent / 100);
  }
  return flat;
}

/** Build-direction calculation using flat, pre-rounded effective rates instead of re-cascading bases. */
export function buildForwardFlat(netBase: number, taxes: TaxType[], decimals: number): CalculationResult {
  const ordered = sortedTaxes(taxes);
  const flatRates = flatRatesFromCascade(ordered, decimals);
  const round = (v: number) => roundTo(v, decimals);

  let runningTotal = round(netBase);
  let totalExclusiveTax = 0;
  let totalInclusiveTax = 0;
  const lines: CalculatedLine[] = [];

  for (const tax of ordered) {
    const ratio = flatRates.get(tax.id) ?? 0;
    const taxAmount = round(netBase * ratio);

    if (tax.mode === "exclusive") {
      runningTotal = round(runningTotal + taxAmount);
      totalExclusiveTax = round(totalExclusiveTax + taxAmount);
    } else {
      totalInclusiveTax = round(totalInclusiveTax + taxAmount);
    }

    lines.push({
      tax,
      baseAmount: round(netBase),
      taxAmount,
      effectiveRateOnNet: roundTo(ratio * 100, decimals),
      runningTotal,
    });
  }

  return { netBase: round(netBase), finalTotal: runningTotal, lines, totalExclusiveTax, totalInclusiveTax };
}

/**
 * Extract-direction calculation for ERP flat-rate mode: sums the rounded
 * flat percentages of every exclusive tax and solves the net base directly
 * — exactly the `Base = Gross / (1 + sum of flat rates)` shortcut a
 * non-cascading ERP uses, rounding drift and all.
 */
export function extractFromGrossFlat(grossTotal: number, taxes: TaxType[], decimals: number): CalculationResult {
  const ordered = sortedTaxes(taxes);
  const flatRates = flatRatesFromCascade(ordered, decimals);

  const sumExclusive = ordered
    .filter((t) => t.mode === "exclusive")
    .reduce((sum, t) => sum + (flatRates.get(t.id) ?? 0), 0);

  const netBase = sumExclusive > -1 ? grossTotal / (1 + sumExclusive) : grossTotal;
  return buildForwardFlat(netBase, ordered, decimals);
}

let counter = 0;
export function makeTaxId(): string {
  counter += 1;
  return `tax_${Date.now().toString(36)}_${counter}`;
}
