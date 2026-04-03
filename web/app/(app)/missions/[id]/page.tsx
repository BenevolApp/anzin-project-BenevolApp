import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ApplyButton } from "./_components/apply-button";
import { MissionStatusActions } from "./_components/mission-status-actions";

export const metadata: Metadata = { title: "Mission — BénévolApp" };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-zinc-100 text-zinc-600" },
  published: { label: "Publiée", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Annulée", cls: "bg-red-100 text-red-600" },
  completed: { label: "Terminée", cls: "bg-blue-100 text-blue-700" },
};

const RECURRENCE_LABELS: Record<string, string> = {
  one_time: "Ponctuelle",
  multi_day: "Multi-jours",
  weekly: "Hebdomadaire",
};

const DAYS_FR: Record<string, string> = {
  lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi",
  jeudi: "Jeudi", vendredi: "Vendredi", samedi: "Samedi", dimanche: "Dimanche",
};

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = (user?.user_metadata?.role as string | undefined) ?? "benevole";

  const { data: mission } = await supabase
    .from("missions")
    .select(`
      id, title, description, status, competences, created_at,
      service:types_service(libelle, description),
      schedules:mission_schedules(recurrence_type, start_date, end_date, day_of_week, start_time, end_time)
    `)
    .eq("id", id)
    .single();

  if (!mission) notFound();

  // Vérifier si bénévole a déjà postulé
  const { data: existingApp } = await supabase
    .from("mission_applications")
    .select("id")
    .eq("mission_id", id)
    .eq("benevole_id", user!.id)
    .maybeSingle();

  // Compter les candidatures existantes (pour la position)
  const { count: applicationCount } = await supabase
    .from("mission_applications")
    .select("id", { count: "exact", head: true })
    .eq("mission_id", id);

  const s = STATUS_LABELS[mission.status] ?? STATUS_LABELS.draft;
  const service = Array.isArray(mission.service) ? mission.service[0] : mission.service;
  const schedule = Array.isArray(mission.schedules) ? mission.schedules[0] : mission.schedules;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/missions" className="text-sm text-zinc-500 underline">
            ← Retour aux missions
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{mission.title}</h1>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
              {s.label}
            </span>
          </div>

          {/* Service */}
          {service && (
            <div className="mb-4">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {service.libelle}
              </p>
              {service.description && (
                <p className="text-sm text-zinc-500 mt-0.5">{service.description}</p>
              )}
            </div>
          )}

          {/* Description */}
          {mission.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 whitespace-pre-line">
              {mission.description}
            </p>
          )}

          {/* Compétences */}
          {mission.competences?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                Compétences souhaitées
              </p>
              <div className="flex flex-wrap gap-1.5">
                {mission.competences.map((c: string) => (
                  <span key={c} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Planning */}
          {schedule && (
            <div className="mb-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 p-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                Planning
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {RECURRENCE_LABELS[schedule.recurrence_type] ?? schedule.recurrence_type}
                {schedule.day_of_week ? ` — ${DAYS_FR[schedule.day_of_week] ?? schedule.day_of_week}` : ""}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                Du {new Date(schedule.start_date).toLocaleDateString("fr-FR")}
                {schedule.end_date ? ` au ${new Date(schedule.end_date).toLocaleDateString("fr-FR")}` : ""}
              </p>
              {schedule.start_time && schedule.end_time && (
                <p className="text-sm text-zinc-500">
                  {schedule.start_time.slice(0, 5)} – {schedule.end_time.slice(0, 5)}
                </p>
              )}
            </div>
          )}

          {/* Candidatures count (admin) */}
          {role === "admin" && (
            <p className="text-sm text-zinc-500 mb-4">
              {applicationCount ?? 0} candidature(s)
            </p>
          )}

          {/* Actions */}
          <div className="mt-6 space-y-3">
            {role === "benevole" && mission.status === "published" && (
              <ApplyButton
                missionId={id}
                userId={user!.id}
                alreadyApplied={!!existingApp}
                applicationCount={applicationCount ?? 0}
              />
            )}
            {role === "admin" && (
              <>
                <MissionStatusActions
                  missionId={id}
                  currentStatus={mission.status as "draft" | "published" | "cancelled" | "completed"}
                />
                <Link
                  href={`/admin/missions/${id}/edit`}
                  className="block text-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Modifier la mission
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
