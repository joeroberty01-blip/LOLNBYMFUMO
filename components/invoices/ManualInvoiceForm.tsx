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
  genuineOptions,
} from "@/lib/validators/manualInvoices";
import {
  createManualInvoice,
  updateManualInvoice,
  saveManualInvoiceDraft,
  updateManualInvoiceDraft,
} from "@/lib/actions/manualInvoices";
import { COMPANY_PROFILES } from "@/lib/companyInfo";
import type { ManualInvoiceCustomerOption } from "@/lib/data/manualInvoices";
import { ManualInvoicePreviewCard } from "@/components/invoices/ManualInvoicePreviewCard";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type FormValues = z.input<typeof createManualInvoiceSchema>;

const emptyItem = {
  description: "",
  partNumber: "",
  countryOfOrigin: "",
  stockAvailable: "",
  genuine: "",
  quantity: 1,
  unitPrice: 0,
};
const CUSTOMER_DATALIST_ID = "manual-invoice-known-customers";

/** Each company banks with a different institution/account, so the Payment Details fields
 * default to the right ones for whichever company is selected — the admin can still type over
 * them for a one-off invoice. */
const BANK_METHOD_DEFAULTS: Record<"lolnby" | "woodland", string> = {
  lolnby: "CRDB BANK",
  woodland: "AZANIA BANK",
};
const BANK_ACCOUNT_NUMBER_DEFAULTS: Record<"lolnby" | "woodland", string> = {
  lolnby: "0150487208600",
  woodland: "00200022687",
};
const BANK_ACCOUNT_NAME_DEFAULTS: Record<"lolnby" | "woodland", string> = {
  lolnby: COMPANY_PROFILES.lolnby.name,
  woodland: COMPANY_PROFILES.woodland.name,
};

type Props = {
  mode: "create" | "edit";
  invoiceId?: string;
  defaultValues?: Partial<FormValues>;
  customers?: ManualInvoiceCustomerOption[];
  /** Only known in edit mode (a draft/invoice already has these) — the live preview falls back
   * to "...." for the number and today's date when creating a brand new one. */
  invoiceNumber?: number;
  createdAt?: Date;
};

/** Create/edit form for a freestanding "invoice ya kampuni" (ManualInvoice) — free-text
 * customer details and line items typed in by hand. Never touches Sale/Inventory/Part/Customer
 * (see prisma/schema.prisma's ManualInvoice doc comment and lib/actions/manualInvoices.ts). A
 * live preview of the actual letterhead renders alongside the form (ManualInvoicePreviewCard,
 * shared with the finished view/print page) so the admin can see the real invoice take shape
 * while filling it in, instead of only after saving. */
export function ManualInvoiceForm({
  mode,
  invoiceId,
  defaultValues,
  customers = [],
  invoiceNumber,
  createdAt,
}: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof createManualInvoiceSchema>, unknown, z.output<typeof createManualInvoiceSchema>>({
    resolver: zodResolver(createManualInvoiceSchema),
    defaultValues: {
      companyKey: "lolnby",
      docType: "tax",
      paymentMode: "CASH",
      customerName: "",
      items: [emptyItem],
      bankMethod: BANK_METHOD_DEFAULTS[(defaultValues?.companyKey as "lolnby" | "woodland") ?? "lolnby"],
      bankAccountNumber:
        BANK_ACCOUNT_NUMBER_DEFAULTS[(defaultValues?.companyKey as "lolnby" | "woodland") ?? "lolnby"],
      bankAccountName:
        BANK_ACCOUNT_NAME_DEFAULTS[(defaultValues?.companyKey as "lolnby" | "woodland") ?? "lolnby"],
      ...defaultValues,
    },
  });
  const { fields, append, remove } = useFieldArray<FormValues>({ control, name: "items" });
  const currency = new Intl.NumberFormat("sw-TZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const customerNameField = register("customerName");

  const watched = watch();
  const previewItems = (watched.items ?? []).map((item) => {
    const quantity = Number(item?.quantity) || 0;
    const unitPrice = Number(item?.unitPrice) || 0;
    return {
      description: item?.description ?? "",
      partNumber: item?.partNumber,
      countryOfOrigin: item?.countryOfOrigin,
      stockAvailable: item?.stockAvailable,
      genuine: item?.genuine,
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
    };
  });
  const total = previewItems.reduce((sum, item) => sum + item.amount, 0);

  function applyKnownCustomer(name: string) {
    const match = customers.find((c) => c.name === name);
    if (!match) return;
    setValue("customerAddress", match.address ?? "");
    setValue("customerTin", match.tin ?? "");
    setValue("customerVrn", match.vrn ?? "");
    setValue("customerPoNumber", match.poNumber ?? "");
  }

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result =
      mode === "create" ? await createManualInvoice(data) : await updateManualInvoice(invoiceId as string, data);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    // Back to the list, not the view page — the form "closes" once the invoice is saved
    // rather than opening straight into another page to click away from.
    router.push("/dashboard/admin/manual-invoices");
    router.refresh();
  });

  async function handleSaveDraft() {
    setFormError(null);
    setIsSavingDraft(true);
    try {
      const raw = getValues();
      const result =
        mode === "create"
          ? await saveManualInvoiceDraft(raw)
          : await updateManualInvoiceDraft(invoiceId as string, raw);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      router.push(`/dashboard/admin/manual-invoices/${result.id}/edit`);
      router.refresh();
    } finally {
      setIsSavingDraft(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
    <form onSubmit={onSubmit} className="flex w-full max-w-3xl flex-1 flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Kampuni ya Kutoa Invoice</Label>
          <select
            {...register("companyKey", {
              onChange: (e) => {
                const key = e.target.value as "lolnby" | "woodland";
                const syncBankField = (
                  field: "bankMethod" | "bankAccountNumber" | "bankAccountName",
                  defaults: Record<"lolnby" | "woodland", string>
                ) => {
                  const current = getValues(field);
                  if (!current || Object.values(defaults).includes(current)) {
                    setValue(field, defaults[key]);
                  }
                };
                syncBankField("bankMethod", BANK_METHOD_DEFAULTS);
                syncBankField("bankAccountNumber", BANK_ACCOUNT_NUMBER_DEFAULTS);
                syncBankField("bankAccountName", BANK_ACCOUNT_NAME_DEFAULTS);
              },
            })}
            className="w-full rounded-control border border-border bg-page px-3 py-2 text-sm text-primary"
          >
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
            <option value="delivery">Delivery Note</option>
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
            <Input
              list={CUSTOMER_DATALIST_ID}
              placeholder="Chagua kutoka waliopo, au andika jina jipya"
              {...customerNameField}
              onChange={(e) => {
                customerNameField.onChange(e);
                applyKnownCustomer(e.target.value);
              }}
            />
            <datalist id={CUSTOMER_DATALIST_ID}>
              {customers.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
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
            <div key={field.id} className="rounded-control border border-border/60 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
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
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <Label>Country of Origin (si lazima)</Label>
                  <Input placeholder="mfano: Japan" {...register(`items.${index}.countryOfOrigin`)} />
                </div>
                <div>
                  <Label>Stock Available (si lazima)</Label>
                  <Input
                    placeholder="mfano: Available, On Order"
                    {...register(`items.${index}.stockAvailable`)}
                  />
                </div>
                <div>
                  <Label>Genuine (si lazima)</Label>
                  <select
                    {...register(`items.${index}.genuine`)}
                    className="w-full rounded-control border border-border bg-page px-3 py-2 text-sm text-primary"
                  >
                    {genuineOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt || "—"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" disabled={isSubmitting || isSavingDraft}>
          {isSubmitting ? "Inahifadhi..." : mode === "create" ? "Tengeneza Invoice" : "Hifadhi Mabadiliko"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting || isSavingDraft}
          onClick={handleSaveDraft}
        >
          {isSavingDraft ? "Inahifadhi Draft..." : "Hifadhi Draft"}
        </Button>
        <span className="text-xs text-secondary">
          Draft haihitaji kujazwa kamili — unaweza kuendelea nayo baadaye.
        </span>
      </div>
    </form>

      <div className="no-print w-full xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:w-[460px] xl:shrink-0 xl:overflow-y-auto">
        <p className="mb-2 text-xs font-semibold text-secondary">Preview — jinsi invoice itakavyoonekana</p>
        {/* Shrunk to comfortably fit the viewport height alongside the form instead of running
            off-screen, and bolded throughout — this live preview is a quick-glance reference
            while filling the form, not the printed page (ManualInvoiceView), so it favours
            legibility at a small size over matching print weight exactly. `zoom` (not
            `transform: scale`) shrinks the actual layout box, not just the paint, so it doesn't
            leave dead space around it. */}
        <div className="origin-top font-semibold" style={{ zoom: 0.68 }}>
        <ManualInvoicePreviewCard
          data={{
            invoiceNumber: invoiceNumber ?? null,
            customerName: watched.customerName ?? "",
            customerAddress: watched.customerAddress,
            customerTin: watched.customerTin,
            customerVrn: watched.customerVrn,
            customerPoNumber: watched.customerPoNumber,
            brand: watched.brand,
            deliveryTime: watched.deliveryTime,
            period: watched.period,
            paymentMode: watched.paymentMode ?? "CASH",
            traReceiptNo: watched.traReceiptNo,
            bankMethod: watched.bankMethod,
            bankAccountName: watched.bankAccountName,
            bankAccountNumber: watched.bankAccountNumber,
            authorizedBy: watched.authorizedBy,
            createdAt: createdAt ?? new Date(),
            items: previewItems,
            total,
          }}
          companyKey={watched.companyKey ?? "lolnby"}
          docType={watched.docType ?? "tax"}
        />
        </div>
      </div>
    </div>
  );
}
