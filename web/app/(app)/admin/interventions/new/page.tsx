import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { InterventionForm } from "./_components/intervention-form";

export const metadata: Metadata = { title: "Planifier une intervention — BénévolApp" };

interface Props {
  searchParams: Promise<{ mission_id?: string }>;
}

export default async function NewInterventionPage({ searchParams }: Props) {
  const params = await searchParams;
  const missionId = params.mission_id ?? "";

  if (!missionId) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
        <div className="max-w-xl mx-auto">
          <p className="text-sm text-red-600">Paramètre mission_id manquant.</p>
          <Link href="/missions" className="mt-4 inline-block text-sm text-zinc-500 underline">
            ← Missions
          </Link>
        </div>
      </main>
    );
  }

  const supabase = await createClient();

  // Mission title
  const { data: mission } = await supabase
    .from("missions")
    .select("title")
    .eq("id", missionId)
    .single();

  // Bénévoles avec candidature acceptée
  const { data: applications } = await supabase
    .from("mission_applications")
    .select("benevole_id, benevole:profiles(id, first_name)")
    .eq("mission_id", missionId)
    .eq("status", "accepted");

  const benevoles = (applications ?? []).map((row) => {
    const b = Array.isArray(row.benevole) ? row.benevole[0] : row.benevole;
    return {
      id: row.benevole_id,
      name: (b?.first_name as string | null | undefined) ?? "Bénévole",
    };
  });

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Planifier une intervention
            </h1>
            {mission?.title && (
              <p className="mt-1 text-sm text-zinc-500">{mission.title}</p>
            )}
          </div>
          <Link
            href={`/missions/${missionId}`}
            className="text-sm text-zinc-500 underline"
          >
            ← Mission
          </Link>
        </div>

        <InterventionForm missionId={missionId} benevoles={benevoles} />
      </div>
    </main>
  );
}
