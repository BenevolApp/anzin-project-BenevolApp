"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

interface Stats {
  pendingProfiles: number;
  pendingApplications: number;
  missedInterventions: number;
  draftMissions: number;
  publishedMissions: number;
}

interface Alert {
  level: "red" | "orange" | "yellow";
  label: string;
  count: number;
  href?: string;
}

const ALERT_STYLES = {
  red: {
    wrap: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
    dot: "bg-red-500",
    text: "text-red-800 dark:text-red-200",
    count: "text-red-600 dark:text-red-300",
  },
  orange: {
    wrap: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
    dot: "bg-amber-500",
    text: "text-amber-800 dark:text-amber-200",
    count: "text-amber-600 dark:text-amber-300",
  },
  yellow: {
    wrap: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
    dot: "bg-yellow-400",
    text: "text-yellow-800 dark:text-yellow-200",
    count: "text-yellow-600 dark:text-yellow-300",
  },
};

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadStats = useCallback(async () => {
    setLoading(true);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    const [
      { count: pendingProfiles },
      { count: pendingApplications },
      { count: missedInterventions },
      { count: draftMissions },
      { count: publishedMissions },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("mission_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("mission_interventions").select("id", { count: "exact", head: true }).eq("status", "missed").gte("scheduled_date", sevenDaysAgoStr),
      supabase.from("missions").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("missions").select("id", { count: "exact", head: true }).eq("status", "published"),
    ]);

    setStats({
      pendingProfiles: pendingProfiles ?? 0,
      pendingApplications: pendingApplications ?? 0,
      missedInterventions: missedInterventions ?? 0,
      draftMissions: draftMissions ?? 0,
      publishedMissions: publishedMissions ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Realtime — rafraîchissement automatique sur mutations critiques
  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-web")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "mission_applications" }, loadStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "mission_interventions" }, loadStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadStats]);

  const alerts: Alert[] = stats
    ? [
        ...(stats.missedInterventions > 0
          ? [{ level: "red" as const, label: "Intervention(s) manquée(s) — 7 derniers jours", count: stats.missedInterventions }]
          : []),
        ...(stats.pendingProfiles > 0
          ? [{ level: "orange" as const, label: "Compte(s) en attente de validation", count: stats.pendingProfiles, href: "/admin/pending-users" }]
          : []),
        ...(stats.pendingApplications > 0
          ? [{ level: "orange" as const, label: "Candidature(s) à traiter", count: stats.pendingApplications, href: "/missions" }]
          : []),
        ...(stats.draftMissions > 0
          ? [{ level: "yellow" as const, label: "Mission(s) en brouillon non publiée(s)", count: stats.draftMissions, href: "/missions" }]
          : []),
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
        Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Résumé chiffres clés */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Missions actives", value: stats?.publishedMissions ?? 0 },
          { label: "Candidatures en attente", value: stats?.pendingApplications ?? 0 },
          { label: "Comptes à valider", value: stats?.pendingProfiles ?? 0 },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-zinc-200 bg-white p-5 text-center dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{kpi.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Alertes */}
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
          Alertes
        </h2>
        {alerts.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-800 dark:bg-emerald-950">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Tout est en ordre — aucune action requise.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, i) => {
              const s = ALERT_STYLES[alert.level];
              const inner = (
                <div className={`flex items-center justify-between rounded-xl border px-5 py-3 ${s.wrap}`}>
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.dot}`} />
                    <span className={`text-sm ${s.text}`}>{alert.label}</span>
                  </div>
                  <span className={`text-lg font-bold ml-4 ${s.count}`}>{alert.count}</span>
                </div>
              );
              return alert.href ? (
                <Link key={i} href={alert.href} className="block hover:opacity-90 transition-opacity">
                  {inner}
                </Link>
              ) : (
                <div key={i}>{inner}</div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
          Actions rapides
        </h2>
        <div className="space-y-2">
          {[
            { href: "/admin/pending-users", label: "Gérer les comptes en attente →" },
            { href: "/missions", label: "Voir toutes les missions →" },
            { href: "/admin/missions/new", label: "Créer une nouvelle mission →" },
            { href: "/admin/proxy-beneficiaire", label: "Comptes co-gérés (proxy) →" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="block rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm text-zinc-700 hover:border-zinc-400 transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Indicateur realtime */}
      <p className="text-xs text-zinc-400 text-right">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 align-middle" />
        Mise à jour automatique (Realtime)
      </p>
    </div>
  );
}
