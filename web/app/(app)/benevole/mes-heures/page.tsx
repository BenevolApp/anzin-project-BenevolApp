import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ExportButtons } from "./_components/export-buttons";

export const metadata: Metadata = { title: "Mes heures — BénévolApp" };

function calcDuration(checkIn: string, checkOut: string) {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000
  );
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
}

export default async function MesHeuresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("pointages")
    .select(`
      id, check_in_time, check_out_time,
      intervention:mission_interventions!inner(
        scheduled_date,
        mission:missions!inner(title)
      )
    `)
    .not("check_in_time", "is", null)
    .not("check_out_time", "is", null)
    .order("check_in_time", { ascending: false });

  // Normalise les jointures imbriquées (tableau ou objet selon Supabase)
  const pointages = (rows ?? []).map((p) => {
    const iv = Array.isArray(p.intervention) ? p.intervention[0] : p.intervention;
    const mission = Array.isArray(iv?.mission) ? iv?.mission[0] : iv?.mission;
    return {
      id: p.id,
      check_in_time: p.check_in_time as string,
      check_out_time: p.check_out_time as string,
      scheduled_date: (iv?.scheduled_date ?? "") as string,
      mission_title: (mission?.title ?? "—") as string,
    };
  });

  const totalMinutes = pointages.reduce(
    (acc, p) => acc + calcDuration(p.check_in_time, p.check_out_time),
    0
  );

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-3xl mx-auto">
        {/* En-tête */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Mes heures de bénévolat
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {pointages.length} intervention{pointages.length !== 1 ? "s" : ""} effectuée
              {pointages.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-zinc-500 underline">
            ← Tableau de bord
          </Link>
        </div>

        {/* Total */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">
            Total bénévolat
          </p>
          <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            {formatDuration(totalMinutes)}
          </p>
        </div>

        {/* Boutons export */}
        <div className="mb-8">
          <ExportButtons pointages={pointages} benevoleId={user!.id} />
        </div>

        {/* Historique */}
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
          Historique
        </h2>

        {pointages.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-400">
              Aucune intervention pointée pour l&apos;instant.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pointages.map((p) => {
              const duration = calcDuration(p.check_in_time, p.check_out_time);
              const dateStr = p.scheduled_date
                ? new Date(p.scheduled_date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—";
              const checkIn = new Date(p.check_in_time).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const checkOut = new Date(p.check_out_time).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 capitalize">
                        {dateStr}
                      </p>
                      <p className="text-sm text-zinc-500 mt-0.5 truncate">{p.mission_title}</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {checkIn} – {checkOut}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatDuration(duration)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
