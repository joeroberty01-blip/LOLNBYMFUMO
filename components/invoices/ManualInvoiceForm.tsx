"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  createManualInvoiceSchema,
  manualInvoicePaymentModes,
  MANUAL_INVOICE_PAYMENT_LABELS,
} from "@/lib/validators/manualInvoices";
import { createManualInvoice, updateManualInvoice } from "@/lib/actions/manualInvoices";
import { COMPANY_PROFILES } from "@/lib/companyInfo";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type FormValues = z.input<typeof createManualInvoiceSchema>;

const emptyItem = { description: "", partNumber: "", quantity: 1, unitPrice: 0 };

type Props = {
  mode: "create" | "edit";
  invoiceId?: string;
  defaultValues?: Partial<FormValues>;
};

/** Create/edit form for a freestanding "invoice ya kampuni" (ManualInvoice) — free-text
 * customer details and line items typed in by hand. Never touches Sale/Inventory/Part/Customer
 * (see prisma/schema.prisma's ManualInvoice doc comment and lib/actions/manualInvoices.ts). */
export function ManualInvoiceForm({ mode, invoiceId, defaultValues }: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof createManualInvoiceSchema>, unknown, z.output<typeof createManualInvoiceSchema>>({
    resolver: zodResolver(createManualInvoiceSchema),
    defaultValues: {
      companyKey: "lolnby",
      docType: "tax",
      paymentMode: "CASH",
      customerName: "",
      items: [emptyItem],
      ...defaultValues,
    },
  });
  const { fields, append, remove } = useFieldArray<FormValues>({ control, name: "items" });
  const items = watch("items");
  const total = (items ?? []).reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0),
    0
  );
  const currency = new Intl.NumberFormat("sw-TZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result =
      mode === "create" ? await createManualInvoice(data) : await updateManualInvoice(invoiceId as string, data);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    router.push(`/dashboard/admin/manual-invoices/${result.id}`);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Kampuni ya Kutoa Invoice</Label>
          <select {...register("companyKey")} className="w-full rounded-control border border-border bg-page px-3 py-2 text-sm text-primary">
            {(["lolnby", "woodland"] as const).map((key) => (
              <option key={key} value={key}>
                {COMPANY_PROFILES[key].name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Aina ya Hati</Label>
          <select {...register("docType")} className="w-full rounded-control border border-border bg-page px-3 py-2 text-sm text-primary">
            <option value="tax">Tax Invoice / Invoice</option>
            <option value="proforma">Proforma Invoice</option>
          </select>
        </div>
        <div>
          <Label>Payment Method</Label>
          <select {...register("paymentMode")} className="w-full rounded-control border border-border bg-page px-3 py-2 text-sm text-primary">
            {manualInvoicePaymentModes.map((mode) => (
              <option key={mode} value={mode}>
                {MANUAL_INVOICE_PAYMENT_LABELS[mode]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Brand (si lazima)</Label>
          <Input {...register("brand")} />
        </div>
        <div className="sm:col-span-2">
          <Label>Delivery Time (si lazima)</Label>
          <Input placeholder="mfano: Siku 3, Mara moja..." {...register("deliveryTime")} />
        </div>
      </div>

      <div className="rounded-card border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold text-primary">Taarifa za Mteja/Kampuni</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Jina la Mteja/Kampuni</Label>
            <Input {...register("customerName")} />
            {errors.customerName && <p className="mt-1 text-sm text-danger">{errors.customerName.message}</p>}
          </div>
          <div>
            <Label>Address (si lazima)</Label>
            <Input {...register("customerAddress")} />
          </div>
          <div>
            <Label>TIN (si lazima)</Label>
            <Input {...register("customerTin")} />
          </div>
          <div>
            <Label>VRN (si lazima)</Label>
            <Input {...register("customerVrn")} />
          </div>
          <div>
            <Label>Order Number (si lazima)</Label>
            <Input {...register("customerPoNumber")} />
          </div>
          <div>
            <Label>TRA Receipt No. (si lazima)</Label>
            <Input {...register("traReceiptNo")} />
          </div>
          <div className="sm:col-span-2">
            <Label>Period (si lazima)</Label>
            <Input placeholder="mfano: 01-07-2026 to 30-09-2026" {...register("period")} />
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold text-primary">Payment Details (si lazima)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Payment Method</Label>
            <Input placeholder="mfano: CRDB BANK" {...register("bankMethod")} />
          </div>
          <div>
            <Label>Account Name</Label>
            <Input {...register("bankAccountName")} />
          </div>
          <div>
            <Label>Account Number</Label>
            <Input {...register("bankAccountNumber")} />
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary">Items</h2>
          <Button type="button" variant="secondary" onClick={() => append(emptyItem)}>
            + Ongeza Item
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
              <div>
                <Label>Description</Label>
                <Input {...register(`items.${index}.description`)} />
              </div>
              <div>
                <Label>Part No. (si lazima)</Label>
                <Input className="w-28" {...register(`items.${index}.partNumber`)} />
              </div>
              <div>
                <Label>Qty</Label>
                <Input className="w-20" type="number" step="any" {...register(`items.${index}.quantity`)} />
              </div>
              <div>
                <Label>Unit Price</Label>
                <Input className="w-32" type="number" step="0.01" {...register(`items.${index}.unitPrice`)} />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={fields.length <= 1}
                onClick={() => remove(index)}
              >
                Toa
              </Button>
            </div>
          ))}
        </div>
        {errors.items && <p className="mt-2 text-sm text-danger">{errors.items.message as string}</p>}
        <p className="mt-4 text-right text-sm font-semibold text-primary">
          Jumla: TSh {currency.format(total)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Authorized By (si lazima)</Label>
          <Input placeholder="mfano: NIXON J KIWELU" {...register("authorizedBy")} />
        </div>
        <div>
          <Label>Maelezo ya Ndani (si lazima, hayaonekani kwenye PDF)</Label>
          <Input {...register("notes")} />
        </div>
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" variant="primary" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Inahifadhi..." : mode === "create" ? "Tengeneza Invoice" : "Hifadhi Mabadiliko"}
      </Button>
    </form>
  );
}
