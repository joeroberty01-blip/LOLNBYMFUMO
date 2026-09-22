import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAuditLogs, getAuditLogActionsAndEntityTypes } from "@/lib/data/audit-logs";
import { displayMetadata } from "@/lib/auditLogDisplay";
import { AuditLogFilterBar } from "@/components/admin/AuditLogFilterBar";
import { AuditLogsTable } from "@/components/admin/AuditLogsTable";
import { getServerDictionary } from "@/lib/i18n/server";
import { Pagination } from "@/components/ui/Pagination";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { parsePageParams } from "@/lib/pagination";

type SearchParams = {
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  pageSize?: string;
};

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { page: pageParam, pageSize, ...filters } = await searchParams;
  const { t } = await getServerDictionary();
  const pageArgs = parsePageParams({ page: pageParam, pageSize });
  const [logs, options] = await Promise.all([
    getAuditLogs(pageArgs, filters),
    getAuditLogActionsAndEntityTypes(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">{t.adminOps.auditLogs.title}</h1>
        <p className="text-sm text-secondary">{t.adminOps.auditLogs.subtitle}</p>
      </div>

      <AuditLogFilterBar
        action="/dashboard/admin/logs"
        actions={options.actions}
        entityTypes={options.entityTypes}
        values={filters}
      />

      <ListToolbar
        filename="audit-logs"
        headers={["Date", "Action", "Type", "Entity ID", "Performed By", "Details"]}
        rows={logs.rows.map((r) => {
          const metadata = displayMetadata(r.metadata);
          return [
            r.createdAt.toLocaleString("sw-TZ"),
            r.action,
            r.entityType,
            r.entityId,
            r.userName,
            metadata ? JSON.stringify(metadata) : "",
          ];
        })}
      />

      <AuditLogsTable rows={logs.rows} t={t} />

      <Pagination
        baseHref="/dashboard/admin/logs"
        params={{ ...filters, pageSize }}
        page={logs.page}
        pageSize={logs.pageSize}
        total={logs.total}
        totalPages={logs.totalPages}
      />
    </div>
  );
}
