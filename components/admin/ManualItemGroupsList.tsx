"use client";

import { useState } from "react";
import type { ManualItemGroup } from "@/lib/data/sales";
import { ConvertManualItemModal } from "@/components/admin/ConvertManualItemModal";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Boxes } from "lucide-react";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function ManualItemGroupsList({
  groups,
  branches,
}: {
  groups: ManualItemGroup[];
  branches: { id: string; name: string }[];
}) {
  const t = useTranslations();
  const [converting, setConverting] = useState<ManualItemGroup | null>(null);

  if (groups.length === 0) {
    return <EmptyState icon={<Boxes size={20} />} title={t.adminOps.manualItems.empty} />;
  }

  return (
    <>
      <Table>
        <THead>
          <THeadRow>
            <Th>{t.adminCatalog.parts.nameLabel}</Th>
            <Th>{t.adminCatalog.parts.partNumberLabel}</Th>
            <Th className="text-right">{t.adminOps.manualItems.timesSold}</Th>
            <Th className="text-right">{t.adminCatalog.parts.sellingPrice}</Th>
            <Th className="text-right">{t.adminCatalog.parts.buyingPrice}</Th>
            <Th>{t.common.actions}</Th>
          </THeadRow>
        </THead>
        <TBody>
          {groups.map((g, i) => (
            <Tr key={g.name} index={i}>
              <Td className="font-medium text-primary">{g.name}</Td>
              <Td className="text-secondary">{g.partNumber ?? "—"}</Td>
              <Td className="text-right tabular-nums">
                {g.timesSold} {t.adminOps.manualItems.times}
              </Td>
              <Td className="text-right tabular-nums">{currency.format(g.lastUnitPrice)}</Td>
              <Td className="text-right tabular-nums">{currency.format(g.lastCostPrice)}</Td>
              <Td>
                <Button type="button" variant="secondary" onClick={() => setConverting(g)}>
                  {t.adminOps.manualItems.convertButton}
                </Button>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>

      {converting && (
        <ConvertManualItemModal
          groupName={converting.name}
          suggestedPartNumber={converting.partNumber}
          suggestedUnitPrice={converting.lastUnitPrice}
          suggestedCostPrice={converting.lastCostPrice}
          branches={branches}
          onClose={() => setConverting(null)}
        />
      )}
    </>
  );
}
