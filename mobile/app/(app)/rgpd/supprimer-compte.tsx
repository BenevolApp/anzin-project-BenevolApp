import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';

export default function SupprimerCompteScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Vos données seront anonymisées et votre compte définitivement supprimé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer la suppression',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) throw new Error('Session expirée.');

              const res = await fetch(`${BACKEND_URL}/api/rgpd/anonymize`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!res.ok) {
                const body = (await res.json()) as { error?: string };
                throw new Error(body.error ?? 'Erreur serveur');
              }

              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Erreur inconnue';
              Alert.alert('Erreur', msg);
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="flex-1 px-6 py-8">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-zinc-900">Supprimer mon compte</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm text-zinc-500 underline">← Retour</Text>
          </TouchableOpacity>
        </View>

        <View className="rounded-2xl border border-red-200 bg-red-50 p-5 gap-4">
          <Text className="text-sm font-semibold text-red-800">
            Action irréversible
          </Text>
          <Text className="text-sm text-red-700">
            En supprimant votre compte, vos données personnelles seront anonymisées
            (Article 17 RGPD — droit à l'effacement) et votre accès à la plateforme
            sera définitivement révoqué.
          </Text>

          <View className="rounded-xl border border-red-100 bg-white p-4 gap-1">
            <Text className="text-xs font-medium text-red-500 uppercase tracking-wide">
              Ce qui sera anonymisé
            </Text>
            {[
              'Nom, prénom, photo de profil',
              'Email, téléphone, adresse',
              'Date de naissance, situation RSA',
            ].map((item) => (
              <Text key={item} className="text-sm text-red-700">
                · {item}
              </Text>
            ))}
          </View>

          <TouchableOpacity
            className="rounded-xl bg-red-600 px-4 py-3 items-center flex-row justify-center gap-2"
            onPress={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : null}
            <Text className="text-sm font-medium text-white">
              {loading ? 'Suppression en cours…' : 'Supprimer définitivement mon compte'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
