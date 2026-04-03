import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { PendingUsersList } from "./_components/pending-users-list";

export const metadata: Metadata = {
  title: "Comptes en attente — BénévolApp",
};

export default async function PendingUsersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Récupère les profils pending de l'organisation de l'admin
  const { data: pendingUsers, error } = await supabase
    .from("profiles")
    .select(
      `id, first_name, role, created_at, organisation_id,
       profiles_sensitive(last_name, email)`
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Comptes en attente
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {pendingUsers?.length ?? 0} compte(s) à valider
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Tableau de bord
          </a>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            Erreur de chargement : {error.message}
            <p className="mt-1 text-xs opacity-75">
              Vérifiez que les policies RLS sont bien appliquées dans Supabase
              (voir backend/prisma/policies/).
            </p>
          </div>
        )}

        <PendingUsersList
          users={(pendingUsers as never) ?? []}
          adminId={user!.id}
        />
      </div>
    </main>
  );
}
