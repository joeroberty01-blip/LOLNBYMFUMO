import "server-only";
import { prisma } from "@/lib/db";
import { paginated, type PageArgs, type Paginated } from "@/lib/pagination";

export type AuditLogRow = {
  id: string;
  createdAt: Date;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
};

export type AuditLogFilters = {
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getAuditLogs(
  page: PageArgs,
  filters: AuditLogFilters = {}
): Promise<Paginated<AuditLogRow>> {
  const where: {
    action?: string;
    entityType?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
  };
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(`${filters.dateFrom}T00:00:00`);
    if (filters.dateTo) where.createdAt.lte = new Date(`${filters.dateTo}T23:59:59`);
  }

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page.skip,
      take: page.take,
      select: {
        id: true,
        createdAt: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        user: { select: { name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const mapped = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    userName: r.user.name,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    metadata: r.metadata as Record<string, unknown> | null,
  }));

  return paginated(mapped, total, page);
}

export async function getAuditLogActionsAndEntityTypes(): Promise<{
  actions: string[];
  entityTypes: string[];
}> {
  const [actions, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
  ]);
  return {
    actions: actions.map((a) => a.action),
    entityTypes: entityTypes.map((e) => e.entityType),
  };
}
