import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

interface DashboardStats {
  pendingProfiles: number;
  pendingApplications: number;
  missedInterventions: number;
  draftMissions: number;
  publishedMissions: number;
}

interface AlertItem {
  level: 'red' | 'orange' | 'yellow';
  label: string;
  count: number;
  route?: string;
}

const ALERT_COLORS = {
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
    text: 'text-red-800',
    count: 'text-red-600',
  },
  orange: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    text: 'text-amber-800',
    count: 'text-amber-600',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    dot: 'bg-yellow-400',
    text: 'text-yellow-800',
    count: 'text-yellow-600',
  },
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('mission_applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('mission_interventions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'missed')
        .gte('scheduled_date', sevenDaysAgoStr),
      supabase
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),
      supabase
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
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

  // Realtime — rafraîchissement automatique à chaque mutation sur les tables critiques
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_applications' }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_interventions' }, loadStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadStats]);

  const alerts: AlertItem[] = stats
    ? [
        ...(stats.missedInterventions > 0
          ? [
              {
                level: 'red' as const,
                label: 'Intervention(s) manquée(s) — 7 derniers jours',
                count: stats.missedInterventions,
              },
            ]
          : []),
        ...(stats.pendingProfiles > 0
          ? [
              {
                level: 'orange' as const,
                label: 'Compte(s) en attente de validation',
                count: stats.pendingProfiles,
                route: '/(app)/admin/pending-users',
              },
            ]
          : []),
        ...(stats.pendingApplications > 0
          ? [
              {
                level: 'orange' as const,
                label: 'Candidature(s) à traiter',
                count: stats.pendingApplications,
                route: '/(app)/missions',
              },
            ]
          : []),
        ...(stats.draftMissions > 0
          ? [
              {
                level: 'yellow' as const,
                label: 'Mission(s) en brouillon non publiée(s)',
                count: stats.draftMissions,
                route: '/(app)/missions',
              },
            ]
          : []),
      ]
    : [];

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="px-6 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-sm text-zinc-500">← Retour</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-zinc-900">Tableau de bord</Text>
        <TouchableOpacity onPress={loadStats} disabled={loading}>
          <Text className="text-sm text-zinc-500">↻ Actualiser</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8">
          {/* Résumé */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 rounded-2xl bg-white border border-zinc-200 p-4 items-center">
              <Text className="text-2xl font-bold text-zinc-900">
                {stats?.publishedMissions ?? 0}
              </Text>
              <Text className="text-xs text-zinc-500 mt-1 text-center">Missions actives</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white border border-zinc-200 p-4 items-center">
              <Text className="text-2xl font-bold text-zinc-900">
                {stats?.pendingApplications ?? 0}
              </Text>
              <Text className="text-xs text-zinc-500 mt-1 text-center">Candidatures</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white border border-zinc-200 p-4 items-center">
              <Text className="text-2xl font-bold text-zinc-900">
                {stats?.pendingProfiles ?? 0}
              </Text>
              <Text className="text-xs text-zinc-500 mt-1 text-center">Comptes en attente</Text>
            </View>
          </View>

          {/* Alertes */}
          <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
            Alertes
          </Text>

          {alerts.length === 0 ? (
            <View className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 items-center mb-6">
              <Text className="text-sm font-medium text-emerald-700">Tout est en ordre</Text>
              <Text className="text-xs text-emerald-600 mt-1 text-center">
                Aucune action requise pour le moment.
              </Text>
            </View>
          ) : (
            <View className="gap-2 mb-6">
              {alerts.map((alert, i) => {
                const colors = ALERT_COLORS[alert.level];
                const card = (
                  <View
                    className={`rounded-xl border ${colors.bg} ${colors.border} px-4 py-3 flex-row items-center justify-between`}
                  >
                    <View className="flex-row items-center gap-2 flex-1">
                      <View className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                      <Text className={`text-sm ${colors.text} flex-1`}>{alert.label}</Text>
                    </View>
                    <Text className={`text-lg font-bold ${colors.count} ml-3`}>
                      {alert.count}
                    </Text>
                  </View>
                );

                return alert.route ? (
                  <TouchableOpacity
                    key={i}
                    onPress={() => router.push(alert.route as Parameters<typeof router.push>[0])}
                  >
                    {card}
                  </TouchableOpacity>
                ) : (
                  <View key={i}>{card}</View>
                );
              })}
            </View>
          )}

          {/* Actions rapides */}
          <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
            Actions rapides
          </Text>

          <View className="gap-2">
            <TouchableOpacity
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
              onPress={() => router.push('/(app)/admin/pending-users')}
            >
              <Text className="text-sm text-zinc-700">Gérer les comptes en attente →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
              onPress={() => router.push('/(app)/missions')}
            >
              <Text className="text-sm text-zinc-700">Voir toutes les missions →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
              onPress={() => router.push('/(app)/admin/missions/new')}
            >
              <Text className="text-sm text-zinc-700">Créer une nouvelle mission →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
              onPress={() => router.push('/(app)/admin/proxy-beneficiaire')}
            >
              <Text className="text-sm text-blue-700">Comptes co-gérés (proxy) →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
