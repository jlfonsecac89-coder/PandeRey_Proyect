"use client";

import { useState, useTransition } from "react";
import { toggleModule } from "@/lib/settings/module-actions";
import { MODULES, type ModuleFlags, type ModuleKey } from "@/lib/settings/module-keys";

export function ModulosForm({ flags }: { flags: ModuleFlags }) {
  const [current, setCurrent] = useState(flags);
  const [message, setMessage] = useState<{ error?: string; success?: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<ModuleKey | null>(null);
  const [, startTransition] = useTransition();

  function onToggle(key: ModuleKey) {
    const next = !current[key];
    setPendingKey(key);
    setMessage(null);
    startTransition(async () => {
      const result = await toggleModule(key, next);
      if (!result.error) setCurrent((prev) => ({ ...prev, [key]: next }));
      setMessage(result);
      setPendingKey(null);
    });
  }

  return (
    <div>
      {message?.error && <p className="mb-3 text-sm text-burgundy-hover">{message.error}</p>}
      {message?.success && <p className="mb-3 text-sm text-gold-hover">{message.success}</p>}
      <ul className="divide-y divide-white/10">
        {MODULES.map((m) => {
          const on = current[m.key];
          return (
            <li key={m.key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="mt-0.5 text-xs text-foreground/50">{m.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${m.label}: ${on ? "activado" : "desactivado"}`}
                disabled={pendingKey === m.key}
                onClick={() => onToggle(m.key)}
                className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition disabled:opacity-50 ${
                  on ? "border-gold bg-gold" : "border-charcoal-border bg-background"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full transition ${
                    on ? "translate-x-6 bg-ink" : "translate-x-1 bg-foreground/50"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
