import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { MissionForm } from "../_components/mission-form";

export const metadata: Metadata = { title: "Nouvelle mission — BénévolApp" };

export default async function NewMissionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user!.id)
    .single();

  const organisationId = profile?.organisation_id as string | undefined;

  const [{ data: services }, { data: beneficiaires }] = await Promise.all([
    supabase.from("types_service").select("id, libelle").order("libelle"),
    supabase
      .from("profiles")
      .select("id, first_name, profiles_sensitive(last_name)")
      .eq("role", "beneficiaire")
      .eq("status", "active")
      .order("first_name"),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/missions" className="text-sm text-zinc-500 underline">
            ← Retour aux missions
          </Link>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
            Nouvelle mission
          </h1>
          <MissionForm
            organisationId={organisationId ?? ""}
            adminId={user!.id}
            services={services ?? []}
            beneficiaires={(beneficiaires as never) ?? []}
          />
        </div>
      </div>
    </main>
  );
}
