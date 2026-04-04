import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { AnonymizeButton } from "./_components/anonymize-button";

export const metadata: Metadata = { title: "Mon compte — BénévolApp" };

export default async function MonComptePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, role, status")
    .eq("id", user!.id)
    .single();

  const { data: sensitive } = await supabase
    .from("profiles_sensitive")
    .select("last_name, email")
    .eq("id", user!.id)
    .single();

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-zinc-500 underline">
            ← Tableau de bord
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
          Mon compte
        </h1>

        {/* Informations */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-3 mb-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
            Informations personnelles
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-zinc-500">Prénom</span>
            <span className="text-zinc-900 dark:text-zinc-100">{profile?.first_name ?? "—"}</span>
            <span className="text-zinc-500">Nom</span>
            <span className="text-zinc-900 dark:text-zinc-100">{sensitive?.last_name ?? "—"}</span>
            <span className="text-zinc-500">Email</span>
            <span className="text-zinc-900 dark:text-zinc-100">{sensitive?.email ?? user?.email ?? "—"}</span>
            <span className="text-zinc-500">Rôle</span>
            <span className="text-zinc-900 dark:text-zinc-100">{profile?.role ?? "—"}</span>
            <span className="text-zinc-500">Statut</span>
            <span className="text-zinc-900 dark:text-zinc-100">{profile?.status ?? "—"}</span>
          </div>
        </div>

        {/* RGPD */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Mes droits RGPD
          </h2>
          <Link
            href="/mon-compte/export-donnees"
            className="block rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 hover:border-zinc-400 transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Exporter mes données (article 20) →
          </Link>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 mb-3">
              Le droit à l'effacement (article 17) anonymise vos données personnelles et supprime
              définitivement votre compte. Les missions et pointages sont conservés à des fins
              statistiques anonymes.
            </p>
            <AnonymizeButton />
          </div>
        </div>
      </div>
    </main>
  );
}
