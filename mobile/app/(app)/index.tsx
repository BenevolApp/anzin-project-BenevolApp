import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  benevole: 'Bénévole',
  beneficiaire: 'Bénéficiaire',
};

const STATUS_BANNER = {
  pending: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    title: 'Compte en attente de validation',
    message:
      'Votre inscription a bien été reçue. Un administrateur va valider votre compte prochainement.',
  },
  rejected: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    title: 'Inscription non retenue',
    message:
      "Votre demande d'inscription n'a pas pu être validée. Contactez l'administration.",
  },
  suspended: {
    bg: 'bg-orange-50 border-orange-200',
    text: 'text-orange-800',
    title: 'Compte suspendu',
    message: "Votre compte est temporairement suspendu. Contactez l'administration.",
  },
};

export default function DashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<string>('active');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from('profiles')
          .select('status')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.status) setStatus(data.status as string);
          });
      }
    });
  }, []);

  const role = (user?.user_metadata?.role as string | undefined) ?? 'benevole';
  const firstName = (user?.user_metadata?.first_name as string | undefined) ?? '';
  const banner = STATUS_BANNER[status as keyof typeof STATUS_BANNER];
  const isActive = status === 'active';

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="flex-1 px-6 py-8">
        <Text className="text-2xl font-bold text-zinc-900">
          Bonjour{firstName ? `, ${firstName}` : ''} 👋
        </Text>
        <Text className="text-sm text-zinc-500 mt-1">
          {ROLE_LABELS[role] ?? role}
        </Text>

        {/* Banner statut */}
        {banner && (
          <View className={`mt-6 rounded-2xl border p-4 ${banner.bg}`}>
            <Text className={`text-sm font-semibold ${banner.text}`}>
              {banner.title}
            </Text>
            <Text className={`text-sm mt-1 ${banner.text} opacity-80`}>
              {banner.message}
            </Text>
          </View>
        )}

        {/* Contenu principal — uniquement si actif */}
        {isActive && (
          <View className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5">
            <Text className="text-sm font-medium text-zinc-700 mb-3">Accès rapide</Text>
            <TouchableOpacity
              className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3"
              onPress={() => router.push('/(app)/missions')}
            >
              <Text className="text-sm text-zinc-700">Voir les missions →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Raccourci admin */}
        {role === 'admin' && (
          <TouchableOpacity
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"
            onPress={() => router.push('/(app)/admin/pending-users')}
          >
            <Text className="text-sm font-medium text-amber-800">Administration</Text>
            <Text className="text-sm text-amber-700 mt-1">
              Gérer les comptes en attente →
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className="mt-6"
          onPress={() => supabase.auth.signOut()}
        >
          <Text className="text-sm text-zinc-400 underline text-center">
            Se déconnecter
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
