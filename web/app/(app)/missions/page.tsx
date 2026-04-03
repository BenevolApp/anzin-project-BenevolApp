import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "Missions — BénévolApp" };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-zinc-100 text-zinc-600" },
  published: { label: "Publiée", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Annulée", cls: "bg-red-100 text-red-600" },
  completed: { label: "Terminée", cls: "bg-blue-100 text-blue-700" },
};

export default async function MissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = (user?.user_metadata?.role as string | undefined) ?? "benevole";

  let query = supabase
    .from("missions")
    .select("id, title, description, status, created_at, service:types_service(libelle)")
    .order("created_at", { ascending: false });

  // Bénéficiaire : uniquement ses propres missions
  if (role === "beneficiaire") {
    query = query.eq("beneficiaire_id", user!.id);
  }

  const { data: missions, error } = await query;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Missions</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {missions?.length ?? 0} mission(s) disponible(s)
            </p>
          </div>
          <div className="flex items-center gap-4">
            {role === "admin" && (
              <Link
                href="/admin/missions/new"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
              >
                + Nouvelle mission
              </Link>
            )}
            <Link href="/dashboard" className="text-sm text-zinc-500 underline">
              ← Tableau de bord
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950">
            Erreur : {error.message}
          </div>
        )}

        {!missions?.length ? (
          <p className="text-sm text-zinc-500 py-12 text-center">
            Aucune mission disponible pour le moment.
          </p>
        ) : (
          <div className="space-y-3">
            {missions.map((m) => {
              const s = STATUS_LABELS[m.status] ?? STATUS_LABELS.draft;
              const service = Array.isArray(m.service) ? m.service[0] : m.service;
              return (
                <Link
                  key={m.id}
                  href={`/missions/${m.id}`}
                  className="block rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-400 transition-colors dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                        {m.title}
                      </p>
                      {service?.libelle && (
                        <p className="text-sm text-zinc-500 mt-0.5">{service.libelle}</p>
                      )}
                      {m.description && (
                        <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                          {m.description}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-3">
                    Créée le {new Date(m.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
