"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface Benevole {
  id: string;
  name: string;
}

interface InterventionFormProps {
  missionId: string;
  benevoles: Benevole[];
}

export function InterventionForm({ missionId, benevoles }: InterventionFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedBenevole, setSelectedBenevole] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedBenevole) {
      setError("Sélectionnez un bénévole.");
      return;
    }
    if (!scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
      setError("Date requise au format AAAA-MM-JJ.");
      return;
    }

    setSaving(true);
    const { error: err } = await supabase.from("mission_interventions").insert({
      mission_id: missionId,
      benevole_id: selectedBenevole,
      scheduled_date: scheduledDate,
      start_time: startTime || null,
      end_time: endTime || null,
      status: "planned",
    });
    setSaving(false);

    if (err) {
      setError(err.message);
      return;
    }

    router.back();
  }

  if (benevoles.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Aucun bénévole accepté sur cette mission. Acceptez d&apos;abord une candidature.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sélection bénévole */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">
          Bénévole
        </label>
        <div className="space-y-2">
          {benevoles.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBenevole(b.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                selectedBenevole === b.id
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1.5">
          Date
        </label>
        <input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {/* Horaires */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1.5">
            Heure début
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1.5">
            Heure fin
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors dark:bg-zinc-50 dark:text-zinc-900"
      >
        {saving ? "Enregistrement…" : "Créer l'intervention"}
      </button>
    </form>
  );
}
