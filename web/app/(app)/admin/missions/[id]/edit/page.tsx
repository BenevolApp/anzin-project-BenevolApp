import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { MissionForm } from "../../_components/mission-form";

export const metadata: Metadata = { title: "Modifier la mission — BénévolApp" };

export default async function EditMissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: mission }, { data: profile }] = await Promise.all([
    supabase
      .from("missions")
      .select("id, title, description, service_id, beneficiaire_id, competences, schedules:mission_schedules(recurrence_type, start_date, end_date, day_of_week, start_time, end_time)")
      .eq("id", id)
      .single(),
    supabase.from("profiles").select("organisation_id").eq("id", user!.id).single(),
  ]);

  if (!mission) notFound();

  const [{ data: services }, { data: beneficiaires }] = await Promise.all([
    supabase.from("types_service").select("id, libelle").order("libelle"),
    supabase.from("profiles").select("id, first_name, profiles_sensitive(last_name)").eq("role", "beneficiaire").eq("status", "active").order("first_name"),
  ]);

  const schedule = Array.isArray(mission.schedules) ? mission.schedules[0] : mission.schedules;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href={`/missions/${id}`} className="text-sm text-zinc-500 underline">
            ← Retour à la mission
          </Link>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
            Modifier la mission
          </h1>
          <MissionForm
            organisationId={profile?.organisation_id as string ?? ""}
            adminId={user!.id}
            services={services ?? []}
            beneficiaires={(beneficiaires as never) ?? []}
            missionId={id}
            defaultValues={{
              title: mission.title,
              description: mission.description ?? undefined,
              service_id: mission.service_id,
              beneficiaire_id: mission.beneficiaire_id,
              competences: mission.competences?.join(", ") ?? "",
              recurrence_type: schedule?.recurrence_type ?? "one_time",
              start_date: schedule?.start_date ?? "",
              end_date: schedule?.end_date ?? undefined,
              day_of_week: schedule?.day_of_week ?? undefined,
              start_time: schedule?.start_time?.slice(0, 5) ?? "",
              end_time: schedule?.end_time?.slice(0, 5) ?? "",
            }}
          />
        </div>
      </div>
    </main>
  );
}
