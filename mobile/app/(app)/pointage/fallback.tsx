import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

export default function FallbackCodeScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      Alert.alert('Code invalide', 'Le code doit contenir 6 caractères.');
      return;
    }

    setLoading(true);

    // Le code court = 6 premiers chars du qr_token (sans tirets, uppercase)
    // On cherche un qr_token commençant par ce préfixe
    const { data: rows } = await supabase
      .from('beneficiary_qr')
      .select('beneficiary_id, qr_token');

    const match = (rows ?? []).find(
      (r: { qr_token: string; beneficiary_id: string }) =>
        r.qr_token.replace(/-/g, '').slice(0, 6).toUpperCase() === trimmed
    );

    if (!match) {
      Alert.alert('Code introuvable', 'Aucun bénéficiaire ne correspond à ce code.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const today = new Date().toISOString().slice(0, 10);

    const { data: interventions } = await supabase
      .from('mission_interventions')
      .select('id, status, mission:missions(title, beneficiaire_id)')
      .eq('benevole_id', user.id)
      .eq('scheduled_date', today)
      .in('status', ['planned', 'done']);

    const intervention = (interventions ?? []).find((i: any) => {
      const mission = Array.isArray(i.mission) ? i.mission[0] : i.mission;
      return mission?.beneficiaire_id === match.beneficiary_id;
    });

    if (!intervention) {
      Alert.alert(
        'Aucune intervention',
        "Aucune intervention planifiée aujourd'hui avec ce bénéficiaire."
      );
      setLoading(false);
      return;
    }

    router.push(`/(app)/pointage/confirm?intervention_id=${intervention.id}`);
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="px-6 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-sm text-zinc-500">← Retour</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-zinc-900">Code de secours</Text>
        <View className="w-12" />
      </View>

      <KeyboardAvoidingView
        className="flex-1 px-6 justify-center"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text className="text-zinc-600 text-sm text-center mb-6">
          Demandez au bénéficiaire le code à 6 caractères affiché sous son QR code.
        </Text>

        <TextInput
          className="rounded-xl border border-zinc-300 bg-white px-4 py-4 text-center text-2xl font-bold text-zinc-900 tracking-widest"
          placeholder="------"
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().slice(0, 6))}
          autoCapitalize="characters"
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <TouchableOpacity
          className="rounded-xl bg-zinc-900 py-3.5 items-center mt-4"
          onPress={handleSubmit}
          disabled={loading || code.trim().length !== 6}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-sm font-medium">Valider</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
