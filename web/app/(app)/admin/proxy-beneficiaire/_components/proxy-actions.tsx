"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface Managed {
  id: string;
  name: string;
  email: string | null;
}

interface Unmanaged {
  id: string;
  name: string;
}

interface ProxyActionsProps {
  managed: Managed[];
  unmanaged: Unmanaged[];
  adminId: string;
  orgId: string;
}

export function ProxyActions({ managed, unmanaged, adminId, orgId }: ProxyActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [working, setWorking] = useState<string | null>(null);

  async function assignProxy(beneficiaireId: string) {
    if (!confirm("Devenir le proxy de ce bénéficiaire ? Vous pourrez agir en son nom.")) return;
    setWorking(beneficiaireId);

    await supabase
      .from("profiles")
      .update({ managed_by_admin_id: adminId })
      .eq("id", beneficiaireId);

    await supabase.from("audit_logs").insert({
      user_id: adminId,
      organisation_id: orgId,
      action: "proxy_assigned",
      entity_type: "profile",
      entity_id: beneficiaireId,
      metadata: { proxy_admin_id: adminId },
    });

    setWorking(null);
    router.refresh();
  }

  async function removeProxy(beneficiaireId: string) {
    if (!confirm("Retirer votre accès proxy pour ce bénéficiaire ?")) return;
    setWorking(beneficiaireId);

    await supabase
      .from("profiles")
      .update({ managed_by_admin_id: null })
      .eq("id", beneficiaireId);

    await supabase.from("audit_logs").insert({
      user_id: adminId,
      organisation_id: orgId,
      action: "proxy_removed",
      entity_type: "profile",
      entity_id: beneficiaireId,
      metadata: { proxy_admin_id: adminId },
    });

    setWorking(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Bénéficiaires gérés */}
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
          Mes bénéficiaires ({managed.length})
        </h2>

        {managed.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-400">
              Vous ne gérez aucun bénéficiaire pour l&apos;instant.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {managed.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {b.name}
                    </p>
                    {b.email && (
                      <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">{b.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                      Proxy actif
                    </span>
                    <button
                      onClick={() => removeProxy(b.id)}
                      disabled={working === b.id}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors dark:border-red-800 dark:bg-transparent dark:text-red-400"
                    >
                      {working === b.id ? "…" : "Retirer"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bénéficiaires sans proxy */}
      {unmanaged.length > 0 && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
            Bénéficiaires sans proxy ({unmanaged.length})
          </h2>
          <div className="space-y-2">
            {unmanaged.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-sm text-zinc-800 dark:text-zinc-200">{b.name}</p>
                <button
                  onClick={() => assignProxy(b.id)}
                  disabled={working === b.id}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors dark:bg-zinc-50 dark:text-zinc-900"
                >
                  {working === b.id ? "…" : "Prendre en charge"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
