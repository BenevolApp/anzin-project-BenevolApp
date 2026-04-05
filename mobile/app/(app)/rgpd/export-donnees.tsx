import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/utils/supabase/client';

export default function ExportDonneesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const [
        { data: profile },
        { data: profileSensitive },
        { data: applications },
        { data: interventions },
        { data: notifications },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('profiles_sensitive').select('*').eq('id', user.id).single(),
        supabase.from('mission_applications').select('*').eq('benevole_id', user.id),
        supabase
          .from('mission_interventions')
          .select('*, pointage:pointages(*)')
          .eq('benevole_id', user.id),
        supabase.from('notifications').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profile ?? null,
        profile_sensitive: profileSensitive ?? null,
        mission_applications: applications ?? [],
        mission_interventions: interventions ?? [],
        notifications: notifications ?? [],
      };

      const json = JSON.stringify(exportData, null, 2);
      const filename = `benevolapp-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Exporter mes données',
        });
      } else {
        Alert.alert('Exporté', `Fichier sauvegardé : ${filename}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="flex-1 px-6 py-8">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-zinc-900">Mes données</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm text-zinc-500 underline">← Retour</Text>
          </TouchableOpacity>
        </View>

        <View className="rounded-2xl border border-zinc-200 bg-white p-5 gap-4">
          <Text className="text-sm text-zinc-600">
            Exportez toutes vos données personnelles dans un fichier JSON conforme au droit
            d'accès RGPD (Article 15).
          </Text>

          <View className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 gap-1">
            <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Données incluses
            </Text>
            {[
              'Profil et coordonnées',
              'Candidatures aux missions',
              'Interventions et pointages',
              'Notifications reçues',
            ].map((item) => (
              <Text key={item} className="text-sm text-zinc-600">
                · {item}
              </Text>
            ))}
          </View>

          <TouchableOpacity
            className="rounded-xl bg-zinc-900 px-4 py-3 items-center flex-row justify-center gap-2"
            onPress={handleExport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : null}
            <Text className="text-sm font-medium text-white">
              {loading ? 'Préparation…' : 'Télécharger mes données (JSON)'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
