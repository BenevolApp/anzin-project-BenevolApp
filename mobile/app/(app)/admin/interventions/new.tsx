import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

interface AcceptedBenevole {
  id: string;
  first_name: string | null;
  benevole_id: string;
}

export default function NewInterventionScreen() {
  const { mission_id, beneficiaire_id } = useLocalSearchParams<{
    mission_id: string;
    beneficiaire_id: string;
  }>();
  const router = useRouter();

  const [benevoles, setBenevoles] = useState<AcceptedBenevole[]>([]);
  const [selectedBenevole, setSelectedBenevole] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      // Fetch bénévoles avec candidature acceptée sur cette mission
      const { data } = await supabase
        .from('mission_applications')
        .select('benevole_id, benevole:profiles(id, first_name)')
        .eq('mission_id', mission_id)
        .eq('status', 'accepted');

      const list = (data ?? []).map((row: any) => ({
        id: row.benevole_id,
        benevole_id: row.benevole_id,
        first_name: Array.isArray(row.benevole) ? row.benevole[0]?.first_name : row.benevole?.first_name,
      }));
      setBenevoles(list);
      setLoading(false);
    }
    load();
  }, [mission_id]);

  async function handleSave() {
    if (!selectedBenevole || !scheduledDate) {
      Alert.alert('Champs requis', 'Choisissez un bénévole et une date.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
      Alert.alert('Format incorrect', 'Date au format AAAA-MM-JJ.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('mission_interventions').insert({
      mission_id,
      benevole_id: selectedBenevole,
      scheduled_date: scheduledDate,
      start_time: startTime || null,
      end_time: endTime || null,
      status: 'planned',
    });

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Intervention planifiée', 'L\'intervention a été créée.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="px-6 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-sm text-zinc-500">← Retour</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-zinc-900">Planifier une intervention</Text>
        <View className="w-12" />
      </View>

      <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8 gap-5">
        {/* Sélection bénévole */}
        <View>
          <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Bénévole
          </Text>
          {benevoles.length === 0 ? (
            <Text className="text-sm text-zinc-400">
              Aucun bénévole accepté sur cette mission.
            </Text>
          ) : (
            <View className="gap-2">
              {benevoles.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  className={`rounded-xl border px-4 py-3 ${
                    selectedBenevole === b.id
                      ? 'border-zinc-900 bg-zinc-900'
                      : 'border-zinc-200 bg-white'
                  }`}
                  onPress={() => setSelectedBenevole(b.id)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedBenevole === b.id ? 'text-white' : 'text-zinc-800'
                    }`}
                  >
                    {b.first_name ?? 'Bénévole'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Date */}
        <View>
          <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
            Date
          </Text>
          <TextInput
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900"
            placeholder="AAAA-MM-JJ"
            value={scheduledDate}
            onChangeText={setScheduledDate}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* Horaires */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
              Début
            </Text>
            <TextInput
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900"
              placeholder="HH:MM"
              value={startTime}
              onChangeText={setStartTime}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
              Fin
            </Text>
            <TextInput
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900"
              placeholder="HH:MM"
              value={endTime}
              onChangeText={setEndTime}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <TouchableOpacity
          className="rounded-xl bg-zinc-900 py-3.5 items-center mt-2"
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-sm font-medium">Créer l'intervention</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
