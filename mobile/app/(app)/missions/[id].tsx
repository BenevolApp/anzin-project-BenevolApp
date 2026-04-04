import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

interface Schedule {
  recurrence_type: string;
  start_date: string;
  end_date: string | null;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
}

interface Mission {
  id: string;
  title: string;
  description: string | null;
  status: string;
  competences: string[];
  created_at: string;
  service: { libelle: string; description: string | null } | null;
  schedules: Schedule[];
}

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Brouillon', bg: 'bg-zinc-100', text: 'text-zinc-600' },
  published: { label: 'Publiée', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelled: { label: 'Annulée', bg: 'bg-red-100', text: 'text-red-600' },
  completed: { label: 'Terminée', bg: 'bg-blue-100', text: 'text-blue-700' },
};

const RECURRENCE_LABELS: Record<string, string> = {
  one_time: 'Ponctuelle',
  multi_day: 'Multi-jours',
  weekly: 'Hebdomadaire',
};

const DAYS_FR: Record<string, string> = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
  jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche',
};

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string>('benevole');
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const [applyLoading, setApplyLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setRole((user.user_metadata?.role as string | undefined) ?? 'benevole');
      }
    });
    fetchMission();
  }, [id]);

  async function fetchMission() {
    const { data } = await supabase
      .from('missions')
      .select(`
        id, title, description, status, competences, created_at,
        service:types_service(libelle, description),
        schedules:mission_schedules(recurrence_type, start_date, end_date, day_of_week, start_time, end_time)
      `)
      .eq('id', id)
      .single();

    setMission(data as unknown as Mission);

    // Vérifier candidature existante
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: app } = await supabase
        .from('mission_applications')
        .select('id')
        .eq('mission_id', id)
        .eq('benevole_id', user.id)
        .maybeSingle();
      setAlreadyApplied(!!app);
    }

    const { count } = await supabase
      .from('mission_applications')
      .select('id', { count: 'exact', head: true })
      .eq('mission_id', id);
    setApplicationCount(count ?? 0);

    setLoading(false);
  }

  async function handleApply() {
    if (!userId || !id) return;
    setApplyLoading(true);
    const { error } = await supabase.from('mission_applications').insert({
      mission_id: id,
      benevole_id: userId,
      status: 'pending',
      position: applicationCount + 1,
    });

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      setAlreadyApplied(true);
      setApplicationCount((c) => c + 1);
      Alert.alert('Candidature envoyée', 'Votre candidature est en attente de validation.');
    }
    setApplyLoading(false);
  }

  async function updateStatus(next: string) {
    const { error } = await supabase
      .from('missions')
      .update({ status: next })
      .eq('id', id);
    if (error) Alert.alert('Erreur', error.message);
    else fetchMission();
  }

  function confirmStatusChange(label: string, next: string) {
    Alert.alert(`${label} la mission`, `Confirmer : ${label.toLowerCase()} cette mission ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: label, onPress: () => updateStatus(next) },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!mission) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <Text className="text-sm text-zinc-500">Mission introuvable.</Text>
      </SafeAreaView>
    );
  }

  const s = STATUS_LABELS[mission.status] ?? STATUS_LABELS.draft;
  const service = Array.isArray(mission.service) ? mission.service[0] : mission.service;
  const schedule = mission.schedules?.[0];

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="px-6 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-sm text-zinc-500">← Retour</Text>
        </TouchableOpacity>
        <View className={`rounded-full px-2.5 py-0.5 ${s.bg}`}>
          <Text className={`text-xs font-medium ${s.text}`}>{s.label}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8">
        <Text className="text-xl font-bold text-zinc-900 mb-2">{mission.title}</Text>

        {service && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-zinc-700">{service.libelle}</Text>
            {service.description && (
              <Text className="text-sm text-zinc-500 mt-0.5">{service.description}</Text>
            )}
          </View>
        )}

        {mission.description && (
          <Text className="text-sm text-zinc-600 mb-4 leading-5">{mission.description}</Text>
        )}

        {mission.competences?.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
              Compétences souhaitées
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {mission.competences.map((c) => (
                <View key={c} className="rounded-full bg-zinc-100 px-2.5 py-0.5">
                  <Text className="text-xs text-zinc-700">{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {schedule && (
          <View className="mb-4 rounded-2xl bg-zinc-100 p-4">
            <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
              Planning
            </Text>
            <Text className="text-sm text-zinc-700">
              {RECURRENCE_LABELS[schedule.recurrence_type] ?? schedule.recurrence_type}
              {schedule.day_of_week ? ` — ${DAYS_FR[schedule.day_of_week] ?? schedule.day_of_week}` : ''}
            </Text>
            <Text className="text-sm text-zinc-500 mt-1">
              Du {new Date(schedule.start_date).toLocaleDateString('fr-FR')}
              {schedule.end_date ? ` au ${new Date(schedule.end_date).toLocaleDateString('fr-FR')}` : ''}
            </Text>
            {schedule.start_time && schedule.end_time && (
              <Text className="text-sm text-zinc-500">
                {schedule.start_time.slice(0, 5)} – {schedule.end_time.slice(0, 5)}
              </Text>
            )}
          </View>
        )}

        {role === 'admin' && (
          <Text className="text-sm text-zinc-500 mb-4">{applicationCount} candidature(s)</Text>
        )}

        {/* Action bénévole */}
        {role === 'benevole' && mission.status === 'published' && (
          <View className="mt-2">
            {alreadyApplied ? (
              <View className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <Text className="text-sm text-emerald-700">
                  Candidature envoyée — en attente de validation.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                className="rounded-xl bg-zinc-900 py-3.5 items-center"
                onPress={handleApply}
                disabled={applyLoading}
              >
                {applyLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-sm font-medium">
                    Postuler à cette mission
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions admin */}
        {role === 'admin' && (
          <View className="mt-2 gap-2">
            {mission.status === 'draft' && (
              <TouchableOpacity
                className="rounded-xl bg-emerald-600 py-3 items-center"
                onPress={() => confirmStatusChange('Publier', 'published')}
              >
                <Text className="text-white text-sm font-medium">Publier</Text>
              </TouchableOpacity>
            )}
            {mission.status === 'published' && (
              <>
                <TouchableOpacity
                  className="rounded-xl bg-blue-600 py-3 items-center"
                  onPress={() => confirmStatusChange('Terminer', 'completed')}
                >
                  <Text className="text-white text-sm font-medium">Marquer terminée</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-xl border border-red-300 py-3 items-center"
                  onPress={() => confirmStatusChange('Annuler', 'cancelled')}
                >
                  <Text className="text-red-600 text-sm font-medium">Annuler</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
