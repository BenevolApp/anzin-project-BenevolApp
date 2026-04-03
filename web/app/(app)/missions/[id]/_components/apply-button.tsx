"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface Props {
  missionId: string;
  userId: string;
  alreadyApplied: boolean;
  applicationCount: number;
}

export function ApplyButton({ missionId, userId, alreadyApplied, applicationCount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(alreadyApplied);

  async function handleApply() {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.from("mission_applications").insert({
      mission_id: missionId,
      benevole_id: userId,
      status: "pending",
      position: applicationCount + 1,
    });

    if (error) {
      setError(error.message);
    } else {
      setApplied(true);
      router.refresh();
    }
    setLoading(false);
  }

  if (applied) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
        Candidature envoyée — en attente de validation.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleApply}
        disabled={loading}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {loading ? "Envoi en cours…" : "Postuler à cette mission"}
      </button>
    </div>
  );
}
