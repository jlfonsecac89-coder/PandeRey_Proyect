"use client";

import { useActionState } from "react";
import { Mail, Lock } from "lucide-react";
import { signIn, signInWithGoogle } from "@/lib/auth/actions";
import { FormMessage } from "@/components/auth/AuthCard";
import { GoogleIcon } from "@/components/auth/GoogleIcon";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-background py-3 pl-11 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-muted/60 focus:border-gold";

export function LoginForm({ next, oauthError }: { next?: string; oauthError?: string }) {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <>
      <FormMessage
        error={
          state?.error ??
          (oauthError ? "No se pudo completar el inicio de sesión. Intentá de nuevo." : undefined)
        }
      />

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next ?? ""} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-white p-3 text-sm font-bold text-black transition-colors hover:bg-neutral-200"
        >
          <GoogleIcon className="h-5 w-5" />
          Continuar con Google
        </button>
      </form>

      <div className="relative py-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background-alt px-2 text-[10px] uppercase tracking-widest text-foreground-muted">
            o usá tu email
          </span>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="relative">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted/60" />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Correo electrónico"
            className={inputClass}
          />
        </div>
        <div className="relative">
          <label htmlFor="password" className="sr-only">
            Contraseña
          </label>
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted/60" />
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Contraseña"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-gold px-3 py-3 text-xs font-bold uppercase tracking-widest text-ink transition-all duration-200 hover:bg-gold-hover active:scale-95 disabled:opacity-50"
        >
          {pending ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </>
  );
}
