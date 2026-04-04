import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ExportJsonButton } from "./_components/export-json-button";

export const metadata: Metadata = { title: "Export données — BénévolApp" };

export default async function ExportDonneesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href="/mon-compte" className="text-sm text-zinc-500 underline">
            ← Mon compte
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Export de mes données
        </h1>
        <p className="text-sm text-zinc-500 mb-8">
          Conformément au RGPD, vous pouvez télécharger l'intégralité des données personnelles
          associées à votre compte au format JSON.
        </p>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Le fichier contiendra : profil, données sensibles, candidatures, interventions,
            pointages et notifications.
          </p>
          <ExportJsonButton userId={user!.id} />
        </div>
      </div>
    </main>
  );
}
