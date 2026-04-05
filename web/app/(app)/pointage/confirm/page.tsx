"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

interface Intervention {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  mission: { title: string } | null;
  benevole: { first_name: string | null } | null;
}

interface Pointage {
  id: string;
  check_in_time: string | null;
  check_out_time: string | null;
}

export default function ConfirmPage() {
  const params = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const beneficiary_id = params.get("beneficiary_id") ?? "";
  const token = params.get("token") ?? "";

  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [pointage, setPointage] = useState<Pointage | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!beneficiary_id || !token) {
      setValidationError("Paramètres manquants.");
      setLoading(false);
      return;
    }

    async function load() {
      // Valider le token QR
      const { data: qr } = await supabase
        .from("beneficiary_qr")
        .select("qr_token")
        .eq("beneficiary_id", beneficiary_id)
        .eq("qr_token", token)
        .maybeSingle();

      if (!qr) {
        setValidationError("QR code invalide ou expiré.");
        setLoading(false);
        return;
      }

      // Trouver l'intervention planifiée aujourd'hui pour ce bénéficiaire
      const today = new Date().toISOString().slice(0, 10);
      const { data: interventions } = await supabase
        .from("mission_interventions")
        .select(
          "id, scheduled_date, start_time, end_time, status, mission:missions(title), benevole:profiles(first_name)"
        )
        .eq("status", "planned")
        .eq("scheduled_date", today)
        .order("start_time", { ascending: true })
        .limit(1);

      // Filter on beneficiary via mission join
      const { data: fullInterventions } = await supabase
        .from("mission_interventions")
        .select(
          "id, scheduled_date, start_time, end_time, status, mission:missions!inner(title, beneficiaire_id), benevole:profiles(first_name)"
        )
        .eq("status", "planned")
        .eq("scheduled_date", today)
        .eq("mission.beneficiaire_id", beneficiary_id)
        .order("start_time", { ascending: true })
        .limit(1);

      void interventions;
      const found = fullInterventions?.[0] ?? null;

      if (!found) {
        setValidationError(
          "Aucune intervention planifiée aujourd'hui pour ce bénéficiaire."
        );
        setLoading(false);
        return;
      }

      const missionData = Array.isArray(found.mission)
        ? found.mission[0]
        : found.mission;
      const benevoleData = Array.isArray(found.benevole)
        ? found.benevole[0]
        : found.benevole;

      setIntervention({
        ...found,
        mission: missionData ? { title: missionData.title } : null,
        benevole: benevoleData ?? null,
      });

      // Chercher un pointage existant
      const { data: existingPointage } = await supabase
        .from("pointages")
        .select("id, check_in_time, check_out_time")
        .eq("intervention_id", found.id)
        .maybeSingle();

      setPointage(existingPointage ?? null);
      setLoading(false);
    }

    load();
  }, [beneficiary_id, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!intervention) throw new Error("Pas d'intervention");
      const { error } = await supabase.from("pointages").insert({
        intervention_id: intervention.id,
        check_in_time: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => router.push("/dashboard"),
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!pointage) throw new Error("Pas de pointage");
      const { error } = await supabase
        .from("pointages")
        .update({ check_out_time: new Date().toISOString() })
        .eq("id", pointage.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => router.push("/dashboard"),
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8 flex items-center justify-center">
        <p className="text-sm text-zinc-500">Vérification en cours…</p>
      </main>
    );
  }

  if (validationError) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
        <div className="max-w-sm mx-auto rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">
            Erreur
          </p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {validationError}
          </p>
          <a
            href="/pointage/scan"
            className="mt-4 inline-block text-sm text-zinc-600 underline"
          >
            ← Réessayer
          </a>
        </div>
      </main>
    );
  }

  const isCheckIn = !pointage?.check_in_time;
  const isCheckOut =
    !!pointage?.check_in_time && !pointage?.check_out_time;
  const isDone = !!pointage?.check_out_time;

  const mutError =
    checkInMutation.error?.message ?? checkOutMutation.error?.message ?? null;
  const mutLoading =
    checkInMutation.isPending || checkOutMutation.isPending;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-sm mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Confirmer le pointage
          </h1>
          <a href="/pointage/scan" className="text-sm text-zinc-500 underline">
            ← Retour
          </a>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Mission</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              {intervention?.mission?.title ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Bénévole</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {intervention?.benevole?.first_name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Date</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {intervention?.scheduled_date
                ? new Date(intervention.scheduled_date).toLocaleDateString("fr-FR")
                : "—"}
            </p>
          </div>

          {isDone && (
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Pointage complet — arrivée et départ enregistrés.
            </div>
          )}

          {mutError && (
            <p className="text-sm text-red-600">{mutError}</p>
          )}

          {!isDone && (
            <button
              onClick={() =>
                isCheckIn
                  ? checkInMutation.mutate()
                  : checkOutMutation.mutate()
              }
              disabled={mutLoading}
              className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {mutLoading
                ? "Enregistrement…"
                : isCheckIn
                ? "Enregistrer l'arrivée"
                : isCheckOut
                ? "Enregistrer le départ"
                : ""}
            </button>
          )}

          {isDone && (
            <a
              href="/dashboard"
              className="block w-full text-center rounded-lg border border-zinc-300 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
            >
              Retour au tableau de bord
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
