import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function MonCompteScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="flex-1 px-6 py-8">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-zinc-900">Mon compte</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm text-zinc-500 underline">← Retour</Text>
          </TouchableOpacity>
        </View>

        <View className="rounded-2xl border border-zinc-200 bg-white p-5 gap-3">
          <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
            Mes données (RGPD)
          </Text>

          <TouchableOpacity
            className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3"
            onPress={() => router.push('/(app)/rgpd/export-donnees')}
          >
            <Text className="text-sm font-medium text-zinc-800">
              Exporter mes données →
            </Text>
            <Text className="text-xs text-zinc-500 mt-0.5">
              Télécharger toutes mes données personnelles (JSON)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3"
            onPress={() => router.push('/(app)/rgpd/supprimer-compte')}
          >
            <Text className="text-sm font-medium text-red-700">
              Supprimer mon compte →
            </Text>
            <Text className="text-xs text-red-500 mt-0.5">
              Anonymisation et suppression définitive
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
