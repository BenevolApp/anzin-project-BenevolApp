import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';
import { enqueuePointage, flushQueue } from '@/utils/offline-queue';

interface InterventionDetail {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  mission: { title: string; beneficiaire: { first_name: string | null } | null } | null;
  pointage: { check_in_time: string | null; check_out_time: string | null } | null;
}

export default function ConfirmPointageScreen() {
  const { intervention_id } = useLocalSearchParams<{ intervention_id: string }>();
  const router = useRouter();
  const [intervention, setIntervention] = useState<InterventionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!intervention_id) return;
    loadIntervention();
  }, [intervention_id]);

  async function loadIntervention() {
    const { data } = await supabase
      .from('mission_interventions')
      .select(`
        id, scheduled_date, start_time, end_time, status,
        mission:missions(title, beneficiaire:profiles!missions_beneficiaire_id_fkey(first_name)),
        pointage:pointages(check_in_time, check_out_time)
      `)
      .eq('id', intervention_id)
      .single();

    setIntervention(data as unknown as InterventionDetail);
    setLoading(false);
  }

  // Détermine si c'est un check-in ou check-out
  const isCheckIn = !intervention?.pointage?.check_in_time;
  const alreadyComplete = !!intervention?.pointage?.check_out_time;

  async function handleConfirm() {
    if (!intervention) return;
    setConfirming(true);

    const now = new Date().toISOString();

    try {
      if (isCheckIn) {
        const { error } = await supabase.from('pointages').insert({
          intervention_id: intervention.id,
          check_in_time: now,
        });
        if (error) throw error;
        // Marquer l'intervention comme "done"
        await supabase
          .from('mission_interventions')
          .update({ status: 'done' })
          .eq('id', intervention.id);
      } else {
        const { error } = await supabase
          .from('pointages')
          .update({ check_out_time: now })
          .eq('intervention_id', intervention.id);
        if (error) throw error;
      }

      // Tenter de vider la file offline
      await flushQueue();

      Alert.alert(
        isCheckIn ? 'Check-in confirmé' : 'Check-out confirmé',
        isCheckIn
          ? 'La présence a été enregistrée. N\'oubliez pas de scanner à la fin.'
          : 'La fin d\'intervention a été enregistrée.',
        [{ text: 'OK', onPress: () => router.replace('/(app)') }]
      );
    } catch {
      // Hors ligne : stocker localement
      enqueuePointage({
        intervention_id: intervention.id,
        type: isCheckIn ? 'check_in' : 'check_out',
        timestamp: now,
      });
      Alert.alert(
        'Sauvegardé hors-ligne',
        'Pas de connexion. Le pointage a été sauvegardé et sera synchronisé automatiquement.',
        [{ text: 'OK', onPress: () => router.replace('/(app)') }]
      );
    }

    setConfirming(false);
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!intervention) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <Text className="text-sm text-zinc-500">Intervention introuvable.</Text>
      </SafeAreaView>
    );
  }

  const mission = Array.isArray(intervention.mission)
    ? intervention.mission[0]
    : intervention.mission;
  const beneficiaire = Array.isArray(mission?.beneficiaire)
    ? mission?.beneficiaire[0]
    : mission?.beneficiaire;

  const dateStr = new Date(intervention.scheduled_date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="px-6 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-sm text-zinc-500">← Retour</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-zinc-900">
          {alreadyComplete ? 'Intervention terminée' : isCheckIn ? 'Check-in' : 'Check-out'}
        </Text>
        <View className="w-12" />
      </View>

      <View className="flex-1 px-6 justify-center gap-6">
        {/* Carte mission */}
        <View className="rounded-2xl bg-white border border-zinc-200 p-5 gap-3">
          <Text className="text-lg font-bold text-zinc-900">{mission?.title}</Text>
          {beneficiaire?.first_name && (
            <Text className="text-sm text-zinc-500">
              Bénéficiaire : {beneficiaire.first_name}
            </Text>
          )}
          <Text className="text-sm text-zinc-500 capitalize">{dateStr}</Text>
          {intervention.start_time && intervention.end_time && (
            <Text className="text-sm text-zinc-400">
              {(intervention.start_time as string).slice(0, 5)} –{' '}
              {(intervention.end_time as string).slice(0, 5)}
            </Text>
          )}
        </View>

        {/* État du pointage */}
        {intervention.pointage?.check_in_time && (
          <View className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <Text className="text-sm text-emerald-700">
              Check-in : {new Date(intervention.pointage.check_in_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {intervention.pointage.check_out_time && (
              <Text className="text-sm text-emerald-700 mt-1">
                Check-out : {new Date(intervention.pointage.check_out_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        )}

        {/* Action */}
        {alreadyComplete ? (
          <View className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
            <Text className="text-sm text-blue-700 text-center">
              Cette intervention est déjà complète.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${
              isCheckIn ? 'bg-emerald-600' : 'bg-blue-600'
            }`}
            onPress={handleConfirm}
            disabled={confirming}
          >
            {confirming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">
                {isCheckIn ? 'Confirmer le check-in' : 'Confirmer le check-out'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.replace('/(app)')}>
          <Text className="text-sm text-zinc-400 text-center">Annuler</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
