"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { changePasswordFirstLogin } from "@/lib/auth/actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function CambiarForm() {
  const [state, formAction, pending] = useActionState(changePasswordFirstLogin, null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

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
          {pending ? "Guardando..." : "Guardar y continuar"}
        </button>
      </form>
    </>
  );
}
