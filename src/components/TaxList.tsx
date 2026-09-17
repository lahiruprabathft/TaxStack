import { useState } from "react";
import type { TaxType } from "../types";
import TaxRow from "./TaxRow";
import { makeTaxId } from "../calc";

interface Props {
  taxes: TaxType[];
  onChangeAll: (taxes: TaxType[]) => void;
}

/** Drops appliesOnTaxIds references that are no longer earlier in the sequence. */
function pruneInvalidDeps(taxes: TaxType[]): TaxType[] {
  const orderById = new Map(taxes.map((t) => [t.id, t.order]));
  return taxes.map((t) => ({
    ...t,
    appliesOnTaxIds: t.appliesOnTaxIds.filter((id) => (orderById.get(id) ?? 0) < t.order),
  }));
}

function renumber(taxes: TaxType[]): TaxType[] {
  const sorted = [...taxes].sort((a, b) => a.order - b.order);
  const renumbered = sorted.map((t, i) => ({ ...t, order: i + 1 }));
  return pruneInvalidDeps(renumbered);
}

export default function TaxList({ taxes, onChangeAll }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const sorted = [...taxes].sort((a, b) => a.order - b.order);

  const handleChange = (id: string, patch: Partial<TaxType>) => {
    const next = taxes.map((t) => (t.id === id ? { ...t, ...patch } : t));
    onChangeAll(pruneInvalidDeps(next));
  };

  const handleRemove = (id: string) => {
    const next = taxes
      .filter((t) => t.id !== id)
      .map((t) => ({ ...t, appliesOnTaxIds: t.appliesOnTaxIds.filter((d) => d !== id) }));
    onChangeAll(renumber(next));
  };

  const handleMove = (id: string, dir: "up" | "down") => {
    const idx = sorted.findIndex((t) => t.id === id);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    const next = [...sorted];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    onChangeAll(renumber(next));
  };

  const handleDrop = () => {
    if (!draggedId || !dragOverId || draggedId === dragOverId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const fromIdx = sorted.findIndex((t) => t.id === draggedId);
    const toIdx = sorted.findIndex((t) => t.id === dragOverId);
    const next = [...sorted];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChangeAll(renumber(next));
    setDraggedId(null);
    setDragOverId(null);
  };

  const addTax = () => {
    const nextOrder = sorted.length + 1;
    onChangeAll([
      ...taxes,
      {
        id: makeTaxId(),
        name: "",
        statedRate: 0,
        mode: "exclusive",
        order: nextOrder,
        appliesOnBase: true,
        appliesOnTaxIds: [],
      },
    ]);
  };

  return (
    <div className="space-y-2">
      {sorted.map((tax, i) => (
        <TaxRow
          key={tax.id}
          tax={tax}
          index={i}
          total={sorted.length}
          earlierTaxes={sorted.slice(0, i)}
          onChange={handleChange}
          onRemove={handleRemove}
          onMove={handleMove}
          onDragStart={setDraggedId}
          onDragOver={setDragOverId}
          onDrop={handleDrop}
          dragOverId={dragOverId}
        />
      ))}

      {sorted.length === 0 && (
        <p className="rounded-lg border border-dashed border-ink-700 p-6 text-center text-sm text-ink-400">
          No taxes configured yet. Add one below, or import a client's config.
        </p>
      )}

      <button
        type="button"
        onClick={addTax}
        className="w-full rounded-lg border border-dashed border-ink-600 py-2.5 text-sm font-medium text-ink-300 transition-colors hover:border-gold-500 hover:text-gold-400"
      >
        + Add tax
      </button>
    </div>
  );
}
