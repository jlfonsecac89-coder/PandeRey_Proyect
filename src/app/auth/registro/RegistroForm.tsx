"use client";

import { useActionState, useState } from "react";
import { signUp } from "@/lib/auth/actions";
import { FormMessage } from "@/components/auth/AuthCard";
import { formatRut, isValidRut } from "@/lib/rut";

export function RegistroForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signUp, null);
  const [rut, setRut] = useState("");
  const rutError = rut.trim().length > 0 && !isValidRut(rut);

  return (
    <>
      <FormMessage error={state?.error} />
      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="full_name" className="mb-1 block text-sm text-foreground/70">
            Nombre completo
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            autoComplete="name"
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-foreground/70">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-foreground/70">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
          <p className="mt-1 text-xs text-foreground/40">
            Mínimo 10 caracteres, con al menos una letra y un número.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="rut" className="mb-1 block text-sm text-foreground/70">
              RUT <span className="text-foreground/40">(opcional)</span>
            </label>
            <input
              id="rut"
              name="rut"
              type="text"
              placeholder="12345678-9"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              onBlur={() => rut && isValidRut(rut) && setRut(formatRut(rut))}
              className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
            {rutError && <p className="mt-1 text-xs text-red-400">RUT inválido.</p>}
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm text-foreground/70">
              Teléfono <span className="text-foreground/40">(opcional)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+56 9 1234 5678"
              autoComplete="tel"
              className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="gender" className="mb-1 block text-sm text-foreground/70">
              Género <span className="text-foreground/40">(opcional)</span>
            </label>
            <select
              id="gender"
              name="gender"
              defaultValue=""
              className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            >
              <option value="">Prefiero no decir</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label htmlFor="birth_date" className="mb-1 block text-sm text-foreground/70">
              Fecha de nacimiento <span className="text-foreground/40">(opcional)</span>
            </label>
            <input
              id="birth_date"
              name="birth_date"
              type="date"
              className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
        </div>
        <p className="text-xs text-foreground/40">
          Género y fecha de nacimiento son opcionales — nos sirven para saludos de cumpleaños y ofertas relevantes,
          nunca se comparten con terceros.
        </p>

        <label className="flex items-start gap-2 text-xs text-foreground/60">
          <input type="checkbox" name="accept_terms" required className="mt-0.5" />
          <span>
            Acepto los{" "}
            <a href="/terminos" className="text-gold-dark hover:text-gold-hover">
              Términos y Condiciones
            </a>
            .
          </span>
        </label>
        <button
          type="submit"
          disabled={pending || rutError}
          className="w-full rounded-md bg-gold px-3 py-2 text-sm font-medium text-background hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </>
  );
}
