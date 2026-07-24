import { paymentMethods } from "@/lib/validators/sales";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

type Props = {
  action: string;
  branches: { id: string; name: string }[];
  staff?: { id: string; name: string }[];
  values: {
    branchId?: string;
    userId?: string;
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
    manualOnly?: string;
  };
};

export function SalesFilterBar({ action, branches, staff, values }: Props) {
  return (
    <form action={action} method="GET" className="flex flex-wrap items-end gap-2 mb-6">
      <div>
        <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Kutoka</label>
        <input
          type="date"
          name="dateFrom"
          defaultValue={values.dateFrom}
          className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Hadi</label>
        <input
          type="date"
          name="dateTo"
          defaultValue={values.dateTo}
          className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Branch</label>
        <select
          name="branchId"
          defaultValue={values.branchId ?? ""}
          className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Branches zote</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      {staff && (
        <div>
          <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Sales Staff</label>
          <select
            name="userId"
            defaultValue={values.userId ?? ""}
            className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Wote</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Payment</label>
        <select
          name="paymentMethod"
          defaultValue={values.paymentMethod ?? ""}
          className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Zote</option>
          {paymentMethods.map((pm) => (
            <option key={pm} value={pm}>
              {PAYMENT_LABEL[pm]}
            </option>
          ))}
        </select>
      </div>
      {staff && (
        <label className="flex items-center gap-1.5 text-sm pb-2">
          <input type="checkbox" name="manualOnly" value="1" defaultChecked={values.manualOnly === "1"} />
          Manual Items Only
        </label>
      )}
      <button
        type="submit"
        className="rounded-md border border-black/15 dark:border-white/20 px-4 py-2 text-sm"
      >
        Chuja
      </button>
    </form>
  );
}
