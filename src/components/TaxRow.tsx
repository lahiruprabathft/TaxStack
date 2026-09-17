import type { TaxType } from "../types";

interface Props {
  tax: TaxType;
  index: number;
  total: number;
  earlierTaxes: TaxType[];
  onChange: (id: string, patch: Partial<TaxType>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: () => void;
  dragOverId: string | null;
}

export default function TaxRow({
  tax,
  index,
  total,
  earlierTaxes,
  onChange,
  onRemove,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverId,
}: Props) {
  const toggleDep = (depId: string) => {
    const has = tax.appliesOnTaxIds.includes(depId);
    onChange(tax.id, {
      appliesOnTaxIds: has
        ? tax.appliesOnTaxIds.filter((id) => id !== depId)
        : [...tax.appliesOnTaxIds, depId],
    });
  };

  const isDragTarget = dragOverId === tax.id;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(tax.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(tax.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={`group rounded-lg border transition-colors ${
        isDragTarget ? "border-gold-500 bg-ink-800/80" : "border-ink-700 bg-ink-800/40"
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Drag handle + order badge + up/down for accessibility */}
        <div className="flex flex-col items-center gap-1 pt-1 select-none">
          <span
            className="tabular flex h-6 w-6 items-center justify-center rounded-full bg-ink-700 text-xs font-medium text-ink-200"
            title="Calculation order"
          >
            {index + 1}
          </span>
          <div className="flex flex-col text-ink-400">
            <button
              type="button"
              onClick={() => onMove(tax.id, "up")}
              disabled={index === 0}
              className="cursor-grab px-1 leading-none hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-30 active:cursor-grabbing"
              aria-label="Move earlier"
              title="Move earlier in sequence"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => onMove(tax.id, "down")}
              disabled={index === total - 1}
              className="cursor-grab px-1 leading-none hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-30 active:cursor-grabbing"
              aria-label="Move later"
              title="Move later in sequence"
            >
              ▼
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {/* Name / rate / mode row */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={tax.name}
              onChange={(e) => onChange(tax.id, { name: e.target.value })}
              placeholder="Tax name (e.g. SSCL)"
              className="min-w-[10rem] flex-1 rounded-md border border-ink-600 bg-ink-900 px-2.5 py-1.5 text-sm font-medium text-ink-50 outline-none placeholder:text-ink-500 focus:border-gold-500"
            />
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                inputMode="decimal"
                step="0.001"
                value={tax.statedRate}
                onChange={(e) => onChange(tax.id, { statedRate: parseFloat(e.target.value) || 0 })}
                className="tabular w-24 rounded-md border border-ink-600 bg-ink-900 px-2.5 py-1.5 text-right text-sm text-ink-50 outline-none focus:border-gold-500"
              />
              <span className="tabular text-sm text-ink-400">%</span>
            </div>
            <div className="flex overflow-hidden rounded-md border border-ink-600">
              <button
                type="button"
                onClick={() => onChange(tax.id, { mode: "exclusive" })}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  tax.mode === "exclusive"
                    ? "bg-teal-500 text-ink-950"
                    : "bg-ink-900 text-ink-300 hover:text-ink-100"
                }`}
                title="Adds on top of its base"
              >
                Exclusive
              </button>
              <button
                type="button"
                onClick={() => onChange(tax.id, { mode: "inclusive" })}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  tax.mode === "inclusive"
                    ? "bg-gold-500 text-ink-950"
                    : "bg-ink-900 text-ink-300 hover:text-ink-100"
                }`}
                title="Already embedded in its base; extracted, not added"
              >
                Inclusive
              </button>
            </div>
            <button
              type="button"
              onClick={() => onRemove(tax.id)}
              className="ml-auto rounded-md px-2 py-1.5 text-xs text-ink-400 hover:bg-danger-500/10 hover:text-danger-400"
              aria-label={`Remove ${tax.name || "tax"}`}
            >
              Remove
            </button>
          </div>

          {/* Applies-on toggles */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="mr-1 text-ink-400">Applies on:</span>
            <label
              className={`cursor-pointer rounded-full border px-2.5 py-1 transition-colors ${
                tax.appliesOnBase
                  ? "border-teal-500 bg-teal-500/15 text-teal-400"
                  : "border-ink-600 text-ink-400 hover:border-ink-500"
              }`}
            >
              <input
                type="checkbox"
                checked={tax.appliesOnBase}
                onChange={(e) => onChange(tax.id, { appliesOnBase: e.target.checked })}
                className="hidden"
              />
              Net base
            </label>
            {earlierTaxes.length === 0 && (
              <span className="italic text-ink-500">no earlier taxes yet</span>
            )}
            {earlierTaxes.map((dep) => {
              const active = tax.appliesOnTaxIds.includes(dep.id);
              return (
                <label
                  key={dep.id}
                  className={`cursor-pointer rounded-full border px-2.5 py-1 transition-colors ${
                    active
                      ? "border-gold-500 bg-gold-500/15 text-gold-400"
                      : "border-ink-600 text-ink-400 hover:border-ink-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleDep(dep.id)}
                    className="hidden"
                  />
                  {dep.name || "Unnamed tax"}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
