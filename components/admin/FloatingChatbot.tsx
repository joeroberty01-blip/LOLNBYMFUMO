"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, Loader2 } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

/** Floating "ask the data" widget, present on every admin page. Stateless on the server — each
 * request resends the recent message window (see app/api/admin/chat/route.ts) and the model
 * answers by calling read-only tools over customers/debts/suppliers/parts/sales (see
 * lib/chatbot/tools.ts). No conversation is persisted; closing the panel loses the history, by
 * design — this is a quick lookup tool, not a saved thread. */
export function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isSending]);

  async function send() {
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");
    setError(null);
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setIsSending(true);

    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Hitilafu imetokea.");
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Imeshindwa kuwasiliana na seva. Jaribu tena.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed right-5 bottom-24 z-50 flex h-[28rem] w-80 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-3 py-2">
            <p className="text-sm font-semibold text-primary">Uliza Data</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Funga"
              className="text-secondary hover:text-primary"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-xs text-secondary">
                Uliza chochote kuhusu wateja, madeni, suppliers, parts, au mauzo — mfano:
                &quot;jumla ya madeni ya wateja ni kiasi gani?&quot; au &quot;brake pad imeuzwa mara ngapi mwezi huu?&quot;
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-control px-2.5 py-1.5 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto bg-accent text-white"
                    : "bg-surface-elevated text-primary"
                }`}
              >
                {m.content}
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <Loader2 size={12} className="animate-spin" /> Inatafuta...
              </div>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Andika swali lako..."
              disabled={isSending}
              className="flex-1 rounded-control border border-border bg-page px-2.5 py-1.5 text-sm text-primary outline-none focus:border-accent disabled:opacity-50"
            />
            <button
              type="button"
              onClick={send}
              disabled={isSending || !input.trim()}
              aria-label="Tuma"
              className="rounded-control bg-accent p-2 text-white disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Funga chatbot" : "Fungua chatbot"}
        className="fixed right-5 bottom-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:brightness-110"
      >
        {open ? <X size={28} /> : <Bot size={28} />}
      </button>
    </>
  );
}
