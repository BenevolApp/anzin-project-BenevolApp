"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface ExportData {
  profile: Record<string, unknown> | null;
  profile_sensitive: Record<string, unknown> | null;
  applications: unknown[];
  interventions: unknown[];
  pointages: unknown[];
  notifications: unknown[];
}

export function ExportJsonButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleExport() {
    setLoading(true);

    const [
      { data: profile },
      { data: profile_sensitive },
      { data: applications },
      { data: interventions },
      { data: pointages },
      { data: notifications },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("profiles_sensitive").select("*").eq("id", userId).single(),
      supabase.from("mission_applications").select("*").eq("benevole_id", userId),
      supabase.from("mission_interventions").select("*").eq("benevole_id", userId),
      supabase.from("pointages").select("*").eq("benevole_id", userId),
      supabase.from("notifications").select("*").eq("recipient_id", userId),
    ]);

    const exportData: ExportData = {
      profile: profile as Record<string, unknown> | null,
      profile_sensitive: profile_sensitive as Record<string, unknown> | null,
      applications: applications ?? [],
      interventions: interventions ?? [],
      pointages: pointages ?? [],
      notifications: notifications ?? [],
    };

    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `benevolapp-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors dark:bg-zinc-50 dark:text-zinc-900"
    >
      {loading ? "Préparation…" : "Télécharger mes données (JSON)"}
    </button>
  );
}
