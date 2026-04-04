import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  service: { libelle: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Brouillon', bg: 'bg-zinc-100', text: 'text-zinc-600' },
  published: { label: 'Publiée', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelled: { label: 'Annulée', bg: 'bg-red-100', text: 'text-red-600' },
  completed: { label: 'Terminée', bg: 'bg-blue-100', text: 'text-blue-700' },
};

export default function MissionsScreen() {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<string>('benevole');
  const isAdmin = role === 'admin';

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setRole((user?.user_metadata?.role as string | undefined) ?? 'benevole');
    });
    fetchMissions();
  }, []);

  async function fetchMissions() {
    const { data: { user } } = await supabase.auth.getUser();
    const userRole = (user?.user_metadata?.role as string | undefined) ?? 'benevole';

    let query = supabase
      .from('missions')
      .select('id, title, description, status, created_at, service:types_service(libelle)')
      .order('created_at', { ascending: false });

    if (userRole === 'beneficiaire' && user) {
      query = query.eq('beneficiaire_id', user.id);
    }

    const { data } = await query;
    setMissions((data as unknown as Mission[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  function onRefresh() {
    setRefreshing(true);
    fetchMissions();
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="px-6 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-sm text-zinc-500">← Retour</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-zinc-900">Missions</Text>
        {isAdmin ? (
          <TouchableOpacity onPress={() => router.push('/(app)/admin/missions/new')}>
            <Text className="text-sm font-medium text-zinc-900">+ Nouvelle</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-16" />
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : missions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-zinc-500 text-center">
            Aucune mission disponible pour le moment.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6"
          contentContainerClassName="pb-8 gap-3"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {missions.map((m) => {
            const s = STATUS_LABELS[m.status] ?? STATUS_LABELS.draft;
            const service = Array.isArray(m.service) ? m.service[0] : m.service;
            return (
              <TouchableOpacity
                key={m.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4"
                onPress={() => router.push(`/(app)/missions/${m.id}`)}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-semibold text-zinc-900" numberOfLines={2}>
                      {m.title}
                    </Text>
                    {service?.libelle && (
                      <Text className="text-sm text-zinc-500 mt-0.5">{service.libelle}</Text>
                    )}
                    {m.description && (
                      <Text className="text-sm text-zinc-400 mt-1" numberOfLines={2}>
                        {m.description}
                      </Text>
                    )}
                  </View>
                  <View className={`rounded-full px-2.5 py-0.5 ${s.bg}`}>
                    <Text className={`text-xs font-medium ${s.text}`}>{s.label}</Text>
                  </View>
                </View>
                <Text className="text-xs text-zinc-400 mt-3">
                  {new Date(m.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
