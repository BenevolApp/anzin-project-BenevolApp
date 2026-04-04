import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "Audit trail — BénévolApp" };

const ACTION_LABELS: Record<string, string> = {
  account_anonymized: "Compte anonymisé (RGPD)",
  proxy_assigned: "Proxy assigné",
  proxy_removed: "Proxy retiré",
  mission_status_changed: "Statut mission modifié",
  application_accepted: "Candidature acceptée",
  application_rejected: "Candidature refusée",
};

export default async function AuditLogsPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/dashboard" className="text-sm text-zinc-500 underline">
            ← Tableau de bord admin
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          Audit trail
        </h1>
        <p className="text-sm text-zinc-500 mb-8">
          200 dernières actions enregistrées — lecture seule.
        </p>

        {(!logs || logs.length === 0) ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">Aucune entrée dans l'audit trail.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Cible</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Acteur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200 font-medium">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                      {log.target_type && (
                        <span className="mr-1 rounded bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5">
                          {log.target_type}
                        </span>
                      )}
                      {log.target_id ? log.target_id.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                      {log.actor_id ? log.actor_id.slice(0, 8) + "…" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
