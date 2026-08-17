"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Image as ImageIcon, Download, Trash2, Eye } from "lucide-react";
import type { SupplierInvoiceRow } from "@/lib/data/suppliers";
import {
  uploadSupplierInvoice,
  deleteSupplierInvoice,
} from "@/lib/actions/supplierInvoices";
import { MAX_INVOICE_BYTES } from "@/lib/validators/supplierInvoices";
import { Button } from "@/components/ui/Button";
import { Input, DateInput, Label } from "@/components/ui/Input";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function SupplierInvoices({
  supplierId,
  invoices,
}: {
  supplierId: string;
  invoices: SupplierInvoiceRow[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("supplierId", supplierId);

    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Chagua faili la invoice");
      return;
    }
    // Checked here too so an oversized file is rejected before it is sent — the platform
    // rejects bodies over ~4.5 MB itself, which would otherwise surface as an opaque failure.
    if (file.size > MAX_INVOICE_BYTES) {
      setError(`Faili ni kubwa mno (${(file.size / 1024 / 1024).toFixed(1)} MB). Kikomo ni 4 MB.`);
      return;
    }

    startTransition(async () => {
      const result = await uploadSupplierInvoice(data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      form.reset();
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Futa invoice "${name}"? Haiwezi kurudishwa.`)) return;
    setError(null);
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteSupplierInvoice(id);
      setDeletingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const totalSize = invoices.reduce((s, i) => s + i.sizeBytes, 0);

  return (
    <div className="mb-8">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className="text-sm font-semibold text-primary">Invoice za Supplier</h2>
        <div className="no-print flex items-center gap-3">
          {invoices.length > 0 && (
            <span className="text-xs text-secondary">
              {invoices.length} faili · {fmtSize(totalSize)}
            </span>
          )}
          <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)}>
            <Upload size={14} /> {open ? "Funga" : "Pakia Invoice"}
          </Button>
        </div>
      </div>

      {open && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="no-print mb-4 rounded-card border border-border bg-surface p-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Faili (PDF, JPG, PNG, WEBP — hadi 4 MB) *</Label>
              <input
                type="file"
                name="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-primary file:mr-3 file:rounded-control file:border-0 file:bg-white/[0.08] file:px-3 file:py-1 file:text-sm file:text-primary"
              />
            </div>
            <div>
              <Label>Namba ya Invoice</Label>
              <Input type="text" name="invoiceNo" placeholder="mf. INV-1024" />
            </div>
            <div>
              <Label>Tarehe ya Invoice</Label>
              <DateInput name="invoiceDate" />
            </div>
            <div>
              <Label>Kiasi (TZS)</Label>
              <Input type="number" name="amount" min={0} step="any" placeholder="0" />
            </div>
            <div>
              <Label>Maelezo</Label>
              <Input type="text" name="notes" placeholder="hiari" />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Ghairi
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Inapakia..." : "Pakia"}
            </Button>
          </div>
        </form>
      )}

      {error && !open && <p className="mb-3 text-sm text-danger">{error}</p>}

      {invoices.length === 0 ? (
        <EmptyState title="Hakuna invoice iliyopakiwa kwa supplier huyu." />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>Faili</Th>
              <Th>Namba</Th>
              <Th>Tarehe ya Invoice</Th>
              <Th className="text-right">Kiasi</Th>
              <Th>Ilipakiwa</Th>
              <Th>Nani</Th>
              <Th className="text-right">Vitendo</Th>
            </THeadRow>
          </THead>
          <TBody>
            {invoices.map((inv, i) => (
              <Tr key={inv.id} index={i}>
                <Td className="max-w-0 truncate" title={inv.fileName}>
                  <span className="flex items-center gap-2">
                    <span className="shrink-0 text-secondary">
                      {inv.mimeType === "application/pdf" ? (
                        <FileText size={15} />
                      ) : (
                        <ImageIcon size={15} />
                      )}
                    </span>
                    <span className="truncate font-medium">{inv.fileName}</span>
                    <span className="shrink-0 text-xs text-secondary">
                      {fmtSize(inv.sizeBytes)}
                    </span>
                  </span>
                </Td>
                <Td className="text-secondary">{inv.invoiceNo ?? "—"}</Td>
                <Td className="whitespace-nowrap text-secondary">
                  {inv.invoiceDate ? inv.invoiceDate.toLocaleDateString("sw-TZ") : "—"}
                </Td>
                <Td className="text-right tabular-nums whitespace-nowrap">
                  {inv.amount === null ? "—" : currency.format(inv.amount)}
                </Td>
                <Td className="whitespace-nowrap text-secondary">
                  {inv.createdAt.toLocaleDateString("sw-TZ")}
                </Td>
                <Td className="max-w-0 truncate text-secondary" title={inv.uploadedByName}>
                  {inv.uploadedByName}
                </Td>
                <Td className="text-right">
                  <div className="no-print flex items-center justify-end gap-1">
                    <a
                      href={`/api/supplier-invoices/${inv.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Angalia"
                      title="Angalia"
                      className="rounded-control p-1.5 text-secondary hover:bg-white/[0.06] hover:text-primary"
                    >
                      <Eye size={15} />
                    </a>
                    <a
                      href={`/api/supplier-invoices/${inv.id}?download=1`}
                      aria-label="Pakua"
                      title="Pakua"
                      className="rounded-control p-1.5 text-secondary hover:bg-white/[0.06] hover:text-primary"
                    >
                      <Download size={15} />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(inv.id, inv.fileName)}
                      disabled={deletingId === inv.id}
                      aria-label="Futa"
                      title="Futa"
                      className="rounded-control p-1.5 text-secondary hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
