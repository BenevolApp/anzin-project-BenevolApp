"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ScheduleAppointmentForm } from "./schedule-appointment-form";

interface PendingUser {
  id: string;
  first_name: string | null;
  role: string;
  created_at: string;
  organisation_id: string;
  profiles_sensitive: { last_name: string | null; email: string | null } | null;
}

interface Props {
  users: PendingUser[];
  adminId: string;
}

const ROLE_LABELS: Record<string, string> = {
  benevole: "Bénévole",
  beneficiaire: "Bénéficiaire",
};

export function PendingUsersList({ users, adminId }: Props) {
  const router = useRouter();
  const [schedulingFor, setSchedulingFor] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(
    userId: string,
    organisationId: string,
    status: "active" | "rejected"
  ) {
    setLoading(userId);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      setLoading(null);
      return;
    }

    // Notifier l'utilisateur
    const message =
      status === "active"
        ? "Votre compte a été validé. Bienvenue sur BénévolApp !"
        : "Votre inscription n'a pas pu être validée. Contactez l'administration.";

    await supabase.from("notifications").insert({
      user_id: userId,
      organisation_id: organisationId,
      type: status === "active" ? "account_approved" : "account_rejected",
      title: status === "active" ? "Compte validé" : "Inscription non retenue",
      message,
      is_human: true,
    });

    router.refresh();
    setLoading(null);
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-8 text-center">
        Aucun compte en attente de validation.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 dark:bg-red-950">
          {error}
        </p>
      )}

      {users.map((user) => {
        const fullName = [user.first_name, user.profiles_sensitive?.last_name]
          .filter(Boolean)
          .join(" ") || "Sans nom";
        const email = user.profiles_sensitive?.email ?? "—";
        const isScheduling = schedulingFor === user.id;
        const isLoading = loading === user.id;

        return (
          <div
            key={user.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {fullName}
                </p>
                <p className="text-sm text-zinc-500">{email}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {ROLE_LABELS[user.role] ?? user.role} — inscrit le{" "}
                  {new Date(user.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => updateStatus(user.id, user.organisation_id, "active")}
                  disabled={isLoading || isScheduling}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isLoading ? "…" : "Approuver"}
                </button>
                <button
                  onClick={() =>
                    setSchedulingFor(isScheduling ? null : user.id)
                  }
                  disabled={isLoading}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
                >
                  RDV
                </button>
                <button
                  onClick={() => updateStatus(user.id, user.organisation_id, "rejected")}
                  disabled={isLoading || isScheduling}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Rejeter
                </button>
              </div>
            </div>

            {isScheduling && (
              <ScheduleAppointmentForm
                userId={user.id}
                organisationId={user.organisation_id}
                adminId={adminId}
                onSuccess={() => {
                  setSchedulingFor(null);
                  router.refresh();
                }}
                onCancel={() => setSchedulingFor(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
