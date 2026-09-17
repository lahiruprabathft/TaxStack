export type TaxMode = "exclusive" | "inclusive";

export interface TaxType {
  id: string;
  name: string;
  /** The rate exactly as the client stated it, e.g. 2.5 for 2.5% */
  statedRate: number;
  mode: TaxMode;
  /** Position in the calculation sequence, 1-based, contiguous */
  order: number;
  /** Whether this tax's base includes the net bill amount */
  appliesOnBase: boolean;
  /** IDs of earlier taxes (lower order) whose amounts feed into this tax's base */
  appliesOnTaxIds: string[];
}

export type Direction = "build" | "extract";

export interface CalculatedLine {
  tax: TaxType;
  /** The amount this tax was calculated on */
  baseAmount: number;
  /** The tax amount itself, rounded to the working precision */
  taxAmount: number;
  /**
   * The tax's effective rate against the original net base amount.
   * This is the number the user is really after: what SSCL "actually is"
   * once it cascades on top of SC, etc.
   */
  effectiveRateOnNet: number;
  /** Running total after this line is applied (inclusive taxes don't add) */
  runningTotal: number;
}

export interface CalculationResult {
  netBase: number;
  finalTotal: number;
  lines: CalculatedLine[];
  /** Sum of all exclusive tax amounts (the total tax burden added on top) */
  totalExclusiveTax: number;
  /** Sum of all inclusive tax amounts (extracted, already inside the total) */
  totalInclusiveTax: number;
}
