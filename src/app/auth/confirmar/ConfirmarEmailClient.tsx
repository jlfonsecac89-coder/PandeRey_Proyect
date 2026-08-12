"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { createClient } from "@/lib/supabase/client";

// Mismo motivo que ActualizarForm: el link de confirmación de registro
// entrega el token en el fragmento de la URL (#access_token=...), no como
// "?code=" — solo el navegador lo puede leer, por eso este paso no puede
// resolverse en /auth/callback (ruta de servidor).
function safeNext(next?: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export function ConfirmarEmailClient({ next }: { next?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "invalid">("checking");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(safeNext(next));
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace(safeNext(next));
    });

    const timeout = setTimeout(() => setState("invalid"), 8000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [next, router]);

  if (state === "invalid") {
    return (
      <AuthCard title="Link inválido">
        <p className="text-center text-sm text-burgundy-hover">
          Este link de confirmación ya no es válido — puede haber expirado o ya haberse usado.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link href="/auth/login" className="text-gold hover:text-gold-hover">
            Volver a iniciar sesión
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Confirmando tu cuenta">
      <p className="text-center text-sm text-foreground/60">Un momento...</p>
    </AuthCard>
  );
}
