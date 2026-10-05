"use client";

import { useState, useTransition } from "react";
import {
  scheduleCampaignPickupDates,
  setCampaignActive,
  setCampaignDateCapacity,
  setCampaignDateOpen,
  removeCampaignPickupDate,
  rescheduleCampaignWindow,
  type CampaignActionState,
} from "@/lib/campaigns/actions";
import { formatPickupDate, type CampaignPhase } from "@/lib/campaigns/types";

export type CampaignView = {
  id: string;
  name: string;
  productName: string;
  isActive: boolean;
  phase: CampaignPhase;
  opensAt: string;
  closesAt: string;
  dates: { id: string; date: string; capacity: number; reserved: number; isOpen: boolean }[];
};

const PHASE_LABEL: Record<CampaignPhase, { text: string; className: string }> = {
  open: { text: "Recibiendo pedidos", className: "border-gold text-gold" },
  before: { text: "Activa — aún no abre (venta normal)", className: "border-charcoal-border text-foreground-muted" },
  closed: { text: "Pedidos cerrados", className: "border-red-500/60 text-red-400" },
  off: { text: "Desactivada (venta general)", className: "border-charcoal-border text-foreground-muted" },
};

const inputClass =
  "rounded-md border border-charcoal-border bg-background px-2 py-1 text-sm outline-none focus:border-gold";

export function CampaignCard({ campaign }: { campaign: CampaignView }) {
  const [message, setMessage] = useState<CampaignActionState>(null);
  const [pending, startTransition] = useTransition();
  const [capacities, setCapacities] = useState<Record<string, string>>({});
  const [opensAt, setOpensAt] = useState(campaign.opensAt);
  const [closesAt, setClosesAt] = useState(campaign.closesAt);
  const [range, setRange] = useState({ from: "", to: "", capacity: "" });

  function run(fn: () => Promise<CampaignActionState>) {
    setMessage(null);
    startTransition(async () => setMessage(await fn()));
  }

  const phase = PHASE_LABEL[campaign.phase];
  const totalCapacity = campaign.dates.reduce((s, d) => s + d.capacity, 0);
  const totalReserved = campaign.dates.reduce((s, d) => s + d.reserved, 0);

  return (
    <section className="rounded-2xl border border-white/10 bg-background-alt p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-foreground">{campaign.name}</h2>
          <p className="text-xs text-foreground-muted">
            Producto: {campaign.productName} · {totalReserved} de {totalCapacity} unidades comprometidas
          </p>
          <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] ${phase.className}`}>
            {phase.text}
          </span>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setCampaignActive(campaign.id, !campaign.isActive))}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
            campaign.isActive
              ? "border border-charcoal-border text-foreground-muted hover:border-red-400 hover:text-red-400"
              : "bg-gold text-ink hover:bg-gold-hover"
          }`}
        >
          {campaign.isActive ? "Desactivar campaña" : "Activar campaña"}
        </button>
      </div>

      {message?.error && <p className="mt-3 text-sm text-burgundy-hover">{message.error}</p>}
      {message?.success && <p className="mt-3 text-sm text-gold-hover">{message.success}</p>}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-foreground-muted">
          Apertura (hora de Chile)
          <input
            type="datetime-local"
            value={opensAt}
            onChange={(e) => setOpensAt(e.target.value)}
            className={`mt-1 block ${inputClass}`}
          />
        </label>
        <label className="text-xs text-foreground-muted">
          Cierre (hora de Chile)
          <input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className={`mt-1 block ${inputClass}`}
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => rescheduleCampaignWindow(campaign.id, opensAt, closesAt))}
          className="rounded-md border border-charcoal-border px-3 py-1.5 text-xs text-foreground-muted hover:border-gold-dark hover:text-gold disabled:opacity-50"
        >
          Guardar ventana
        </button>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground-muted">
              <th className="py-2 pr-3 font-normal">Día de retiro</th>
              <th className="py-2 pr-3 font-normal">Cupo (unidades)</th>
              <th className="py-2 pr-3 font-normal">Comprometidas</th>
              <th className="py-2 pr-3 font-normal">Estado</th>
              <th className="py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {campaign.dates.map((d) => {
              const draft = capacities[d.id] ?? String(d.capacity);
              return (
                <tr key={d.id} className="border-b border-charcoal-border/50">
                  <td className="py-2 pr-3 capitalize text-foreground">{formatPickupDate(d.date)}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={draft}
                        onChange={(e) => setCapacities((prev) => ({ ...prev, [d.id]: e.target.value }))}
                        className={`w-24 ${inputClass}`}
                        aria-label={`Cupo del ${formatPickupDate(d.date)}`}
                      />
                      {draft !== String(d.capacity) && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setCampaignDateCapacity(d.id, Number(draft)))}
                          className="text-xs text-gold hover:underline disabled:opacity-50"
                        >
                          Guardar
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-foreground-muted">
                    {d.reserved} / {d.capacity}
                  </td>
                  <td className="py-2 pr-3 text-xs">{d.isOpen ? "Abierta" : "Cerrada"}</td>
                  <td className="space-x-3 py-2 text-right text-xs">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => setCampaignDateOpen(d.id, !d.isOpen))}
                      className="text-foreground-muted hover:text-gold disabled:opacity-50"
                    >
                      {d.isOpen ? "Cerrar" : "Abrir"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => removeCampaignPickupDate(d.id))}
                      className="text-foreground-muted hover:text-red-400 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {campaign.dates.length === 0 && (
          <p className="mt-3 text-sm text-foreground-muted">Aún no hay fechas de retiro. Agrégalas por rango:</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-white/10 pt-4">
        <label className="text-xs text-foreground-muted">
          Desde
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className={`mt-1 block ${inputClass}`}
          />
        </label>
        <label className="text-xs text-foreground-muted">
          Hasta
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className={`mt-1 block ${inputClass}`}
          />
        </label>
        <label className="text-xs text-foreground-muted">
          Cupo diario (unidades)
          <input
            type="number"
            min={0}
            value={range.capacity}
            onChange={(e) => setRange((r) => ({ ...r, capacity: e.target.value }))}
            className={`mt-1 block w-32 ${inputClass}`}
          />
        </label>
        <button
          type="button"
          disabled={pending || !range.from || !range.to || range.capacity === ""}
          onClick={() =>
            run(() => scheduleCampaignPickupDates(campaign.id, range.from, range.to, Number(range.capacity)))
          }
          className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          Agregar fechas
        </button>
      </div>
    </section>
  );
}
