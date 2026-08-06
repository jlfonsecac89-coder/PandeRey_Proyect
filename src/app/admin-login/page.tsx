import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { AuthCard } from "@/components/auth/AuthCard";
import { AdminLoginForm } from "./AdminLoginForm";

export default async function AdminLoginPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "customer") {
    redirect(profile.role === "repartidor" ? "/repartidor" : "/admin");
  }

  return (
    <AuthCard title="Panel Pan de Rey" subtitle="Acceso interno de staff — usuario y contraseña.">
      <AdminLoginForm />
    </AuthCard>
  );
}
