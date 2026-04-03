import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Tableau de bord — BénévolApp",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  benevole: "Bénévole",
  beneficiaire: "Bénéficiaire",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = (user?.user_metadata?.role as string | undefined) ?? "benevole";
  const firstName = (user?.user_metadata?.first_name as string | undefined) ?? "";

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Bonjour{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {ROLE_LABELS[role] ?? role} — {user?.email}
        </p>

        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500 text-sm">
            Tableau de bord en cours de construction — Epic 3 à venir.
          </p>
        </div>

        {role === "admin" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Administration
            </p>
            <a
              href="/admin/pending-users"
              className="mt-2 inline-block text-sm text-amber-700 underline hover:text-amber-900 dark:text-amber-300"
            >
              Gérer les comptes en attente →
            </a>
          </div>
        )}

        <form action="/auth/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
