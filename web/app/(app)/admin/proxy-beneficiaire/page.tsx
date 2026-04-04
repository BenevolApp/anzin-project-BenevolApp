import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ProxyActions } from "./_components/proxy-actions";

export const metadata: Metadata = { title: "Comptes co-gérés — BénévolApp" };

export default async function ProxyBeneficiairePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminId = user!.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", adminId)
    .single();

  const orgId = (profile?.organisation_id as string | undefined) ?? "";

  // Bénéficiaires dont l'admin est proxy
  const { data: managedRaw } = await supabase
    .from("profiles")
    .select("id, first_name, profiles_sensitive(last_name, email)")
    .eq("role", "beneficiaire")
    .eq("managed_by_admin_id", adminId)
    .order("first_name");

  // Bénéficiaires actifs sans proxy dans la même org
  const { data: unmanagedRaw } = await supabase
    .from("profiles")
    .select("id, first_name, profiles_sensitive(last_name)")
    .eq("role", "beneficiaire")
    .eq("status", "active")
    .is("managed_by_admin_id", null)
    .eq("organisation_id", orgId);

  const managed = (managedRaw ?? []).map((b) => {
    const sens = Array.isArray(b.profiles_sensitive) ? b.profiles_sensitive[0] : b.profiles_sensitive;
    return {
      id: b.id,
      name: [b.first_name, sens?.last_name].filter(Boolean).join(" ") || "Sans nom",
      email: (sens?.email as string | null | undefined) ?? null,
    };
  });

  const unmanaged = (unmanagedRaw ?? []).map((b) => {
    const sens = Array.isArray(b.profiles_sensitive) ? b.profiles_sensitive[0] : b.profiles_sensitive;
    return {
      id: b.id,
      name: [b.first_name, sens?.last_name].filter(Boolean).join(" ") || "Sans nom",
    };
  });

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Comptes co-gérés
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Gérez les bénéficiaires dont vous êtes le proxy
            </p>
          </div>
          <Link href="/admin/dashboard" className="text-sm text-zinc-500 underline">
            ← Dashboard
          </Link>
        </div>

        <ProxyActions
          managed={managed}
          unmanaged={unmanaged}
          adminId={adminId}
          orgId={orgId}
        />
      </div>
    </main>
  );
}
