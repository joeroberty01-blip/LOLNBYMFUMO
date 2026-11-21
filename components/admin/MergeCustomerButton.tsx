"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mergeCustomers } from "@/lib/actions/customers";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

type Option = { id: string; name: string; balance: number };

/** Fixes a duplicate customer created from a misspelled name (e.g. "Lama" typed instead of
 * reusing the existing "Rama") — picks another customer and merges them into THIS one: their
 * Sale/CustomerPayment history and balance move over, and the other record is archived. See
 * mergeCustomers in lib/actions/customers.ts for exactly what moves. */
export function MergeCustomerButton({
  customerId,
  customerName,
  otherCustomers,
}: {
  customerId: string;
  customerName: string;
  otherCustomers: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Option | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

  const matches = useMemo(() => {
    const typed = search.trim().toLowerCase();
    if (!typed || selected) return [];
    return otherCustomers.filter((c) => c.name.toLowerCase().includes(typed)).slice(0, 6);
  }, [search, selected, otherCustomers]);

  function reset() {
    setOpen(false);
    setSearch("");
    setSelected(null);
    setError(null);
  }

  function doMerge() {
    if (!selected) return;
    startSubmit(async () => {
      const result = await mergeCustomers(selected.id, customerId);
      if (!result.success) {
        setError(result.error);
        setConfirmOpen(false);
        return;
      }
      reset();
      setConfirmOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Unganisha na mteja mwingine
      </Button>
    );
  }

  return (
    <div className="w-full rounded-card border border-border bg-surface-elevated p-3 sm:w-80">
      <p className="mb-1.5 text-sm font-medium text-primary">
        Jina lingine la mteja huyu huyu (atafutwa kwenye orodha)
      </p>
      <div className="relative">
        <Input
          type="text"
          placeholder="Andika jina..."
          value={search}
          autoComplete="off"
          onChange={(e) => {
            setSearch(e.target.value);
            setSelected(null);
            setError(null);
          }}
        />
        {matches.length > 0 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-control border border-border bg-surface shadow-lg">
            {matches.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelected(c);
                  setSearch(c.name);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface"
              >
                <span className="text-primary">{c.name}</span>
                {c.balance > 0 && (
                  <span className="tabular-nums text-xs text-warning">{currency.format(c.balance)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="secondary" onClick={reset}>
          Ghairi
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!selected || isSubmitting}
          onClick={() => setConfirmOpen(true)}
        >
          Unganisha
        </Button>
      </div>

      {confirmOpen && selected && (
        <ConfirmDialog
          title="Unganisha wateja"
          warning={`"${selected.name}" ataunganishwa ndani ya "${customerName}" — historia yote ya mauzo na deni itahamia kwa "${customerName}", na "${selected.name}" ataondolewa kwenye orodha ya wateja (hataondolewa kabisa).`}
          confirmLabel="Ndiyo, unganisha"
          onConfirm={doMerge}
          onCancel={() => setConfirmOpen(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
