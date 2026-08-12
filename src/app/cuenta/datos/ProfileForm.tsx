"use client";

import { useActionState, useState } from "react";
import { updateProfileInfo, type AccountActionState } from "@/lib/account/actions";
import { FormMessage } from "@/components/auth/AuthCard";
import { formatRut, isValidRut } from "@/lib/rut";

export function ProfileForm({
  email,
  fullName,
  phone,
  rut: initialRut,
  gender,
  birthDate,
}: {
  email: string;
  fullName: string;
  phone: string | null;
  rut: string;
  gender: string;
  birthDate: string;
}) {
  const [state, formAction, pending] = useActionState<AccountActionState, FormData>(
    updateProfileInfo,
    null,
  );
  const [rut, setRut] = useState(initialRut);
  const rutError = rut.trim().length > 0 && !isValidRut(rut);

  return (
    <div className="max-w-md">
      <FormMessage error={state?.error} success={state?.success} />
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs text-foreground/60">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            disabled
            readOnly
            className="w-full cursor-not-allowed rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-foreground/50 outline-none"
          />
          <p className="mt-1 text-xs text-foreground/40">El email no se puede modificar.</p>
        </div>
        <div>
          <label htmlFor="full_name" className="mb-1 block text-xs text-foreground/60">
            Nombre completo
          </label>
          <input
            id="full_name"
            name="full_name"
            defaultValue={fullName}
            required
            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-xs text-foreground/60">
            Teléfono
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={phone ?? ""}
            placeholder="+56 9 1234 5678"
            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="rut" className="mb-1 block text-xs text-foreground/60">
            RUT <span className="text-foreground/40">(opcional)</span>
          </label>
          <input
            id="rut"
            name="rut"
            placeholder="12345678-9"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            onBlur={() => rut && isValidRut(rut) && setRut(formatRut(rut))}
            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-gold"
          />
          {rutError && <p className="mt-1 text-xs text-burgundy-hover">RUT inválido.</p>}
        </div>
        <div>
          <label htmlFor="gender" className="mb-1 block text-xs text-foreground/60">
            Género <span className="text-foreground/40">(opcional)</span>
          </label>
          <select
            id="gender"
            name="gender"
            defaultValue={gender}
            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-gold"
          >
            <option value="">Prefiero no decir</option>
            <option value="femenino">Femenino</option>
            <option value="masculino">Masculino</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label htmlFor="birth_date" className="mb-1 block text-xs text-foreground/60">
            Fecha de nacimiento <span className="text-foreground/40">(opcional)</span>
          </label>
          <input
            id="birth_date"
            name="birth_date"
            type="date"
            defaultValue={birthDate}
            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          disabled={pending || rutError}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
