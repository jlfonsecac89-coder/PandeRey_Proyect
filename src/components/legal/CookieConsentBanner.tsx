"use client";

import { useEffect, useRef, useState } from "react";
import { saveCookieConsent } from "@/lib/legal/cookie-consent";

const STORAGE_KEY = "pdr_cookie_consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [saving, setSaving] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Se carga después del montaje a propósito (no en un lazy initializer):
  // localStorage no existe en el render de servidor, y leerlo en el primer
  // render de cliente causaría un mismatch de hidratación.
  useEffect(() => {
    const decided = localStorage.getItem(STORAGE_KEY);
    if (!decided) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
  }, []);

  // El banner es `fixed` al fondo del viewport — sin este padding, tapa
  // (e intercepta clics de) cualquier botón que también viva al fondo de la
  // página, ej. el formulario de baja de cuenta en /cuenta/datos. Se mide el
  // alto real porque "Personalizar" cambia la altura del banner.
  useEffect(() => {
    if (!visible) {
      document.body.style.paddingBottom = "";
      return;
    }
    const el = bannerRef.current;
    if (!el) return;
    const applyPadding = () => {
      document.body.style.paddingBottom = `${el.offsetHeight}px`;
    };
    applyPadding();
    const observer = new ResizeObserver(applyPadding);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [visible, customizing]);

  async function decide(nextAnalytics: boolean, nextMarketing: boolean) {
    setSaving(true);
    await saveCookieConsent(nextAnalytics, nextMarketing);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ analytics: nextAnalytics, marketing: nextMarketing, decidedAt: new Date().toISOString() }),
    );
    setVisible(false);
    setSaving(false);
  }

  if (!visible) return null;

  return (
    <div
      ref={bannerRef}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-charcoal-border bg-charcoal-light/95 p-4 backdrop-blur"
    >
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-foreground/80">
          Usamos cookies necesarias para que el sitio funcione (carrito, sesión) y, si nos das permiso, cookies de
          analítica y marketing. Podés elegir qué aceptar.
        </p>

        {customizing && (
          <div className="mt-3 space-y-2 text-sm">
            <label className="flex items-center gap-2 text-foreground/60">
              <input type="checkbox" checked disabled className="accent-gold" />
              Necesarias (siempre activas)
            </label>
            <label className="flex items-center gap-2 text-foreground/80">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="accent-gold"
              />
              Analítica
            </label>
            <label className="flex items-center gap-2 text-foreground/80">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="accent-gold"
              />
              Marketing
            </label>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {customizing ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => decide(analytics, marketing)}
              className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
            >
              Guardar preferencias
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => decide(true, true)}
                className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
              >
                Aceptar todas
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => decide(false, false)}
                className="rounded-md border border-charcoal-border px-4 py-1.5 text-sm text-foreground/70 hover:border-gold-dark hover:text-gold disabled:opacity-50"
              >
                Solo necesarias
              </button>
              <button
                type="button"
                onClick={() => setCustomizing(true)}
                className="rounded-md px-4 py-1.5 text-sm text-foreground/50 hover:text-gold"
              >
                Personalizar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
