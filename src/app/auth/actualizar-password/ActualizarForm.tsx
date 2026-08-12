"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { updatePassword } from "@/lib/auth/actions";
import { FormMessage } from "@/components/auth/AuthCard";
import { createClient } from "@/lib/supabase/client";

export function ActualizarForm() {
  const [state, formAction, pending] = useActionState(updatePassword, null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  // El link de recuperación entrega el token en el fragmento de la URL
  // (#access_token=...&type=recovery) — solo el navegador lo lee. El
  // cliente de Supabase lo detecta automáticamente al inicializarse
  // (detectSessionInUrl) y deja la sesión guardada en cookies, que es lo
  // que después usa el server action updatePassword para autenticar el
  // cambio. Hasta que eso pase, no tiene sentido mostrar el formulario.
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "invalid">("checking");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionState("ready");
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setSessionState("ready");
      }
    });

    const timeout = setTimeout(() => {
      setSessionState((current) => (current === "checking" ? "invalid" : current));
    }, 8000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (sessionState === "checking") {
    return <p className="text-center text-sm text-foreground/60">Verificando el link...</p>;
  }

  if (sessionState === "invalid") {
    return (
      <FormMessage error="El link de recuperación ya no es válido — puede haber expirado o ya haberse usado. Pedí uno nuevo." />
    );
  }

  return (
    <>
      <FormMessage error={state?.error} />
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-foreground/70">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={10}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-gold"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-foreground/40">
            Mínimo 10 caracteres, con al menos una letra y un número.
          </p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm text-foreground/70">
            Confirmar contraseña nueva
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              minLength={10}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-gold"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {mismatch && (
            <p className="mt-1 text-xs text-burgundy-hover">Las contraseñas no coinciden.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={pending || mismatch || confirmPassword.length === 0}
          className="w-full rounded-md bg-gold px-3 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar nueva contraseña"}
        </button>
      </form>
    </>
  );
}
