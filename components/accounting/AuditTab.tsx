import Link from "next/link";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { AuditSummary, IntegrityCheck } from "@/lib/data/reports/accounting";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

const ACTION_LABEL: Record<string, string> = {
  SALE_COMPLETED: "Mauzo yamekamilika",
  SALE_VOIDED: "Mauzo yamefutwa",
  SALE_UPDATED: "Mauzo yamehaririwa",
  PURCHASE_CREATED: "Manunuzi yameongezwa",
  PURCHASE_UPDATED: "Manunuzi yamehaririwa",
  PURCHASE_DELETED: "Manunuzi yamefutwa",
  EXPENSE_CREATED: "Matumizi yameongezwa",
  EXPENSE_UPDATED: "Matumizi yamehaririwa",
  EXPENSE_DELETED: "Matumizi yamefutwa",
  CUSTOMER_PAYMENT_RECORDED: "Malipo ya mteja",
  CUSTOMER_PAYMENT_DELETED: "Malipo ya mteja yamefutwa",
  SUPPLIER_PAYMENT_RECORDED: "Malipo kwa supplier",
  SUPPLIER_PAYMENT_DELETED: "Malipo kwa supplier yamefutwa",
  STOCK_ADJUSTED: "Stock imerekebishwa",
  PARTS_BULK_IMPORTED: "Parts zimeingizwa kwa wingi",
  MANUAL_ITEM_CONVERTED: "Manual item imebadilishwa",
  BACKUP_RESTORED: "Backup imerudishwa",
  USER_CREATED: "Mtumiaji ameongezwa",
  USER_UPDATED: "Mtumiaji amehaririwa",
  STORE_CREATED: "Store imeongezwa",
  STORE_UPDATED: "Store imehaririwa",
};

function label(action: string) {
  return ACTION_LABEL[action] ?? action;
}

export function AuditTab({
  audit,
  checks,
  rangeLabel,
}: {
  audit: AuditSummary;
  checks: IntegrityCheck[];
  rangeLabel: string;
}) {
  const problems = checks.filter((c) => c.count > 0);
  const clean = checks.filter((c) => c.count === 0);

  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold text-primary">Ukaguzi wa Data</h2>
      <p className="mb-3 text-xs text-secondary">
        Hali halisi zilizosomwa moja kwa moja kutoka kwenye data — si makadirio.
      </p>

      <div className="mb-8 flex flex-col gap-2">
        {problems.map((c) => (
          <div
            key={c.key}
            className={`flex items-start gap-3 rounded-card border p-3 ${
              c.severity === "danger"
                ? "border-danger/40 bg-danger/5"
                : "border-warning/40 bg-warning/5"
            }`}
          >
            <span className={c.severity === "danger" ? "text-danger" : "text-warning"}>
              {c.severity === "danger" ? <ShieldAlert size={18} /> : <AlertTriangle size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary">
                {c.label}:{" "}
                <span className={c.severity === "danger" ? "text-danger" : "text-warning"}>
                  {c.count}
                </span>
              </p>
              <p className="text-xs text-secondary">{c.detail}</p>
            </div>
            {c.href && (
              <Link href={c.href} className="shrink-0 text-xs text-accent hover:underline">
                Angalia →
              </Link>
            )}
          </div>
        ))}

        {clean.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-border bg-surface p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-success">
              <CheckCircle2 size={14} /> Bila tatizo:
            </span>
            {clean.map((c) => (
              <span key={c.key} className="text-xs text-secondary">
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <h2 className="mb-1 text-sm font-semibold text-primary">
        Vitendo Nyeti — {rangeLabel} ({audit.sensitiveCount})
      </h2>
      <p className="mb-3 text-xs text-secondary">
        Kufuta, kuhariri, na kurekebisha stock — vitendo vinavyobadilisha rekodi baada ya
        kuandikwa. Kuongeza kwa kawaida hakupo hapa.
      </p>
      <div className="mb-8">
        {audit.sensitive.length === 0 ? (
          <EmptyState title="Hakuna kitendo nyeti kwenye kipindi hiki." />
        ) : (
          <Table>
            <THead>
              <THeadRow>
                <Th>Tarehe</Th>
                <Th>Kitendo</Th>
                <Th>Aina</Th>
                <Th>Nani</Th>
              </THeadRow>
            </THead>
            <TBody>
              {audit.sensitive.map((r, i) => (
                <Tr key={r.id} index={i}>
                  <Td className="whitespace-nowrap text-secondary">
                    {r.createdAt.toLocaleString("sw-TZ")}
                  </Td>
                  <Td className="font-medium">{label(r.action)}</Td>
                  <Td className="text-secondary">{r.entityType}</Td>
                  <Td>{r.userName}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
        {audit.sensitiveCount > audit.sensitive.length && (
          <p className="mt-2 text-xs text-secondary">
            Zinaonyeshwa {audit.sensitive.length} kati ya {audit.sensitiveCount}.{" "}
            <Link href="/dashboard/admin/logs" className="text-accent hover:underline">
              Ona zote kwenye Audit Logs →
            </Link>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-1 text-sm font-semibold text-primary">Vitendo kwa Aina</h2>
          <p className="mb-3 text-xs text-secondary">Jumla: {audit.totalEvents} matukio</p>
          {audit.byAction.length === 0 ? (
            <EmptyState title="Hakuna matukio." />
          ) : (
            <Table>
              <THead>
                <THeadRow>
                  <Th>Kitendo</Th>
                  <Th className="text-right">Idadi</Th>
                </THeadRow>
              </THead>
              <TBody>
                {audit.byAction.map((a, i) => (
                  <Tr key={a.action} index={i}>
                    <Td>{label(a.action)}</Td>
                    <Td className="text-right tabular-nums">{a.count}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold text-primary">Vitendo kwa Mtumiaji</h2>
          <p className="mb-3 text-xs text-secondary">Nani amefanya nini kwenye kipindi hiki.</p>
          {audit.byUser.length === 0 ? (
            <EmptyState title="Hakuna matukio." />
          ) : (
            <Table>
              <THead>
                <THeadRow>
                  <Th>Mtumiaji</Th>
                  <Th className="text-right">Idadi</Th>
                </THeadRow>
              </THead>
              <TBody>
                {audit.byUser.map((u, i) => (
                  <Tr key={u.userName} index={i}>
                    <Td>{u.userName}</Td>
                    <Td className="text-right tabular-nums">{u.count}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
