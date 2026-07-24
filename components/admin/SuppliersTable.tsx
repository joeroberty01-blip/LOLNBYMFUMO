"use client";

import { useState } from "react";
import Link from "next/link";
import { RecordPaymentModal } from "@/components/admin/RecordPaymentModal";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number;
};

export function SuppliersTable({
  suppliers,
  branches,
}: {
  suppliers: Supplier[];
  branches: { id: string; name: string }[];
}) {
  const [paying, setPaying] = useState<Supplier | null>(null);

  if (suppliers.length === 0) {
    return <p className="text-sm text-black/60 dark:text-white/60">Hakuna suppliers bado.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15 text-left">
              <th className="py-2 pr-3 font-medium">Jina</th>
              <th className="py-2 pr-3 font-medium">Simu</th>
              <th className="py-2 pr-3 font-medium">Balance (Tunalodaiwa)</th>
              <th className="py-2 pr-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-black/5 dark:border-white/10">
                <td className="py-2 pr-3">{s.name}</td>
                <td className="py-2 pr-3">{s.phone ?? "—"}</td>
                <td className="py-2 pr-3">
                  <span className={s.balance > 0 ? "text-red-600 font-medium" : ""}>
                    {currency.format(s.balance)}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/admin/suppliers/${s.id}/edit`}
                      className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPaying(s)}
                      className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm"
                    >
                      Record Payment
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paying && (
        <RecordPaymentModal
          supplierId={paying.id}
          supplierName={paying.name}
          currentBalance={paying.balance}
          branches={branches}
          onClose={() => setPaying(null)}
        />
      )}
    </>
  );
}
