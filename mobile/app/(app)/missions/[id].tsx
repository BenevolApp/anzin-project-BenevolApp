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

interface Intervention {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  benevole: { first_name: string | null } | null;
  pointage: { check_in_time: string | null; check_out_time: string | null } | null;
}

const INTERVENTION_STATUS: Record<string, { label: string; dot: string }> = {
  planned: { label: 'Planifiée', dot: 'bg-amber-400' },
  done: { label: 'Effectuée', dot: 'bg-emerald-500' },
  missed: { label: 'Manquée', dot: 'bg-red-400' },
};

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
  const [interventions, setInterventions] = useState<Intervention[]>([]);

  useEffect(() => {
    if (!id) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        const r = (user.user_metadata?.role as string | undefined) ?? 'benevole';
        setRole(r);
        if (r === 'admin') fetchInterventions();
      }
    });
    fetchMission();
  }, [id]);

  async function fetchInterventions() {
    const { data } = await supabase
      .from('mission_interventions')
      .select(`
        id, scheduled_date, start_time, end_time, status,
        benevole:profiles!mission_interventions_benevole_id_fkey(first_name),
        pointage:pointages(check_in_time, check_out_time)
      `)
      .eq('mission_id', id)
      .order('scheduled_date', { ascending: true });

    setInterventions(data as unknown as Intervention[]);
  }

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

        {/* Section interventions — admin */}
        {role === 'admin' && (
          <View className="mt-6 mb-2">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Interventions ({interventions.length})
              </Text>
              {mission.status === 'published' && (
                <TouchableOpacity
                  className="rounded-full bg-zinc-900 px-3 py-1"
                  onPress={() =>
                    router.push(`/(app)/admin/interventions/new?mission_id=${id}`)
                  }
                >
                  <Text className="text-white text-xs font-medium">+ Planifier</Text>
                </TouchableOpacity>
              )}
            </View>

            {interventions.length === 0 ? (
              <View className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <Text className="text-sm text-zinc-400">
                  Aucune intervention planifiée pour cette mission.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {interventions.map((iv) => {
                  const benevole = Array.isArray(iv.benevole) ? iv.benevole[0] : iv.benevole;
                  const pointage = Array.isArray(iv.pointage) ? iv.pointage[0] : iv.pointage;
                  const ivStatus = INTERVENTION_STATUS[iv.status] ?? { label: iv.status, dot: 'bg-zinc-400' };
                  const dateStr = new Date(iv.scheduled_date).toLocaleDateString('fr-FR', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  });
                  return (
                    <View
                      key={iv.id}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-3 gap-1"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-medium text-zinc-800 capitalize">{dateStr}</Text>
                        <View className="flex-row items-center gap-1.5">
                          <View className={`w-2 h-2 rounded-full ${ivStatus.dot}`} />
                          <Text className="text-xs text-zinc-500">{ivStatus.label}</Text>
                        </View>
                      </View>
                      {benevole?.first_name && (
                        <Text className="text-xs text-zinc-500">Bénévole : {benevole.first_name}</Text>
                      )}
                      {iv.start_time && iv.end_time && (
                        <Text className="text-xs text-zinc-400">
                          {iv.start_time.slice(0, 5)} – {iv.end_time.slice(0, 5)}
                        </Text>
                      )}
                      {pointage?.check_in_time && (
                        <Text className="text-xs text-emerald-600">
                          Check-in : {new Date(pointage.check_in_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {pointage.check_out_time
                            ? ` — Check-out : ${new Date(pointage.check_out_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                            : ''}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Actions admin */}
        {role === 'admin' && (
          <View className="mt-2 gap-2">
            <TouchableOpacity
              className="rounded-xl border border-zinc-300 py-3 items-center"
              onPress={() => router.push(`/(app)/admin/missions/${id}/edit`)}
            >
              <Text className="text-zinc-700 text-sm font-medium">Modifier la mission</Text>
            </TouchableOpacity>
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
