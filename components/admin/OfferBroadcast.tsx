"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { MessagingCustomer } from "@/lib/data/customers";
import { offerMessage, toWhatsAppNumber } from "@/lib/messaging";
import { WhatsAppButton, SmsButton } from "@/components/ui/MessageButtons";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/**
 * Sending an offer is one tap per customer (see lib/whatsapp.ts for why it cannot be automatic),
 * which makes losing your place the real problem on a list of hundreds. So each row is ticked off
 * once opened and the progress count stays visible. The ticks live only in this screen's state:
 * they record "I opened this chat", which is not the same as "the customer received it", and
 * storing an unverifiable claim as if it were a delivery record would be worse than not storing
 * it at all.
 */
export function OfferBroadcast({
  customers,
  storeName,
}: {
  customers: MessagingCustomer[];
  /** Signs the customer-facing message. The STORE's name, never APP_NAME — see config/app.ts. */
  storeName: string;
}) {
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [onlyDebtors, setOnlyDebtors] = useState(false);
  const [opened, setOpened] = useState<Set<string>>(new Set());

  const reachable = useMemo(
    () => customers.filter((c) => toWhatsAppNumber(c.phone) !== null),
    [customers]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (onlyDebtors && c.balance <= 0) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q);
    });
  }, [customers, search, onlyDebtors]);

  const ready = body.trim().length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Label>Maandishi ya tangazo</Label>
        <textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"Mfano:\nTuna ofa ya brake pads kwa bei ya punguzo wiki hii.\nKaribu dukani kwetu."}
          className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <p className="mt-1 text-xs text-secondary">
          Jina la mteja na jina la duka vinaongezwa vyenyewe. Andika maandishi ya tangazo pekee.
        </p>
      </div>

      {ready && (
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="mb-2 text-xs font-medium text-secondary">Ujumbe utakavyoonekana:</p>
          <pre className="whitespace-pre-wrap font-sans text-sm text-primary">
            {offerMessage({ customerName: "[jina la mteja]", storeName, body })}
          </pre>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Label>Tafuta</Label>
          <Input
            type="text"
            placeholder="Jina au namba..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-primary">
          <input
            type="checkbox"
            checked={onlyDebtors}
            onChange={(e) => setOnlyDebtors(e.target.checked)}
          />
          Wenye deni pekee
        </label>
        {opened.size > 0 && (
          <Button type="button" variant="secondary" onClick={() => setOpened(new Set())}>
            Anza upya
          </Button>
        )}
      </div>

      <p className="text-sm text-secondary">
        Wateja {customers.length} · wenye namba inayosomeka{" "}
        <span className="font-medium text-primary">{reachable.length}</span> · umefungua{" "}
        <span className="font-medium text-primary">{opened.size}</span>
      </p>

      {!ready ? (
        <EmptyState title="Andika maandishi ya tangazo kwanza." />
      ) : visible.length === 0 ? (
        <EmptyState title="Hakuna mteja anayelingana." />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th className="w-8"></Th>
              <Th>Jina</Th>
              <Th>Simu</Th>
              <Th className="text-right">Salio</Th>
              <Th className="text-right">Tuma</Th>
            </THeadRow>
          </THead>
          <TBody>
            {visible.map((c, i) => (
              <Tr key={c.id} index={i}>
                <Td>
                  {opened.has(c.id) && <Check size={15} className="text-success" aria-label="Imefunguliwa" />}
                </Td>
                <Td className="font-medium text-primary">{c.name}</Td>
                <Td className="text-secondary">{c.phone ?? "—"}</Td>
                <Td className="text-right tabular-nums text-secondary">
                  {c.balance > 0 ? currency.format(c.balance) : "—"}
                </Td>
                <Td className="text-right">
                  <div
                    className="flex justify-end gap-2"
                    onClick={() => setOpened((prev) => new Set(prev).add(c.id))}
                  >
                    <WhatsAppButton
                      phone={c.phone}
                      label="WhatsApp"
                      message={offerMessage({ customerName: c.name, storeName, body })}
                    />
                    <SmsButton
                      phone={c.phone}
                      label="SMS"
                      message={offerMessage({ customerName: c.name, storeName, body })}
                    />
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
