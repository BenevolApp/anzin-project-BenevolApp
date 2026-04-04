"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type MissionStatus = "draft" | "published" | "cancelled" | "completed";

const TRANSITIONS: Record<MissionStatus, { label: string; next: MissionStatus; cls: string }[]> = {
  draft: [{ label: "Publier", next: "published", cls: "bg-emerald-600 text-white hover:bg-emerald-700" }],
  published: [
    { label: "Marquer terminée", next: "completed", cls: "bg-blue-600 text-white hover:bg-blue-700" },
    { label: "Annuler", next: "cancelled", cls: "border border-red-300 text-red-600 hover:bg-red-50" },
  ],
  cancelled: [],
  completed: [],
};

interface Props {
  missionId: string;
  currentStatus: MissionStatus;
}

export function MissionStatusActions({ missionId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<MissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = TRANSITIONS[currentStatus] ?? [];
  if (!actions.length) return null;

  async function updateStatus(next: MissionStatus) {
    setLoading(next);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("missions")
      .update({ status: next })
      .eq("id", missionId);

    if (error) setError(error.message);
    else router.refresh();
    setLoading(null);
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.next}
            onClick={() => updateStatus(a.next)}
            disabled={loading !== null}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${a.cls}`}
          >
            {loading === a.next ? "…" : a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
