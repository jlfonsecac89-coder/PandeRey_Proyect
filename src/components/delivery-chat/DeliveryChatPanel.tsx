"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendDeliveryMessage, listDeliveryMessages } from "@/lib/delivery-chat/actions";
import type { DeliveryMessage } from "@/lib/delivery-chat/types";

// Ventana de polling 15-20s pedida por el criterio de aceptación E06-T4 —
// sin websockets/Realtime, un intervalo simple alcanza para un chat de
// incidencia de baja frecuencia entre repartidor y tienda.
const POLL_MS = 18_000;

export function DeliveryChatPanel({
  orderId,
  viewerRole,
}: {
  orderId: string;
  viewerRole: "repartidor" | "tienda";
}) {
  const [messages, setMessages] = useState<DeliveryMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const data = await listDeliveryMessages(orderId);
      if (!cancelled) setMessages(data);
    }
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await sendDeliveryMessage(orderId, trimmed);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.message) {
        setMessages((prev) => [...prev, result.message as DeliveryMessage]);
      }
      setText("");
    });
  }

  return (
    <div className="rounded-lg border border-charcoal-border bg-background/60">
      <div ref={listRef} className="max-h-40 space-y-1.5 overflow-y-auto px-3 py-2">
        {messages.length === 0 && <p className="text-xs text-foreground/40">Sin mensajes todavía.</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-md px-2 py-1 text-xs ${
              m.sender_role === viewerRole
                ? "ml-auto bg-gold/15 text-foreground"
                : "bg-charcoal-light text-foreground/80"
            }`}
          >
            {m.message}
            <p className="mt-0.5 text-[10px] text-foreground/40">
              {new Date(m.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-1.5 border-t border-charcoal-border px-2 py-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribir mensaje..."
          maxLength={500}
          className="flex-1 rounded-md border border-charcoal-border bg-background px-2 py-1 text-xs"
        />
        <button
          type="submit"
          disabled={isPending || !text.trim()}
          className="rounded-md bg-gold px-2.5 py-1 text-xs font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
      {error && <p className="px-2 pb-1.5 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
