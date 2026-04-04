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

const STATUS_BANNER = {
  pending: {
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
    title: "Compte en attente de validation",
    message:
      "Votre inscription a bien été reçue. Un administrateur va valider votre compte prochainement. Vous recevrez une notification dès que votre accès sera activé.",
  },
  rejected: {
    bg: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
    text: "text-red-800 dark:text-red-200",
    title: "Inscription non retenue",
    message:
      "Votre demande d'inscription n'a pas pu être validée. Contactez l'administration pour plus d'informations.",
  },
  suspended: {
    bg: "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800",
    text: "text-orange-800 dark:text-orange-200",
    title: "Compte suspendu",
    message:
      "Votre compte est temporairement suspendu. Contactez l'administration.",
  },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = (user?.user_metadata?.role as string | undefined) ?? "benevole";
  const firstName = (user?.user_metadata?.first_name as string | undefined) ?? "";

  // Récupère le statut réel depuis profiles (nécessite RLS policies appliquées)
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user!.id)
    .single();

  const status = (profile?.status as string | undefined) ?? "active";
  const banner = STATUS_BANNER[status as keyof typeof STATUS_BANNER];
  const isActive = status === "active";

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Bonjour{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {ROLE_LABELS[role] ?? role} — {user?.email}
        </p>

        {/* Banner statut — affiché si compte non actif */}
        {banner && (
          <div className={`mt-6 rounded-xl border p-4 ${banner.bg}`}>
            <p className={`text-sm font-semibold ${banner.text}`}>{banner.title}</p>
            <p className={`mt-1 text-sm ${banner.text} opacity-80`}>{banner.message}</p>
          </div>
        )}

        {/* Contenu principal — uniquement si actif */}
        {isActive && (
          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Accès rapide</p>
            <a
              href="/missions"
              className="block rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 hover:border-zinc-300 transition-colors dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Voir les missions →
            </a>
          </div>
        )}

        {/* Raccourci admin */}
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
