import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  benevole: 'Bénévole',
  beneficiaire: 'Bénéficiaire',
};

export default function DashboardScreen() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const role = (user?.user_metadata?.role as string | undefined) ?? 'benevole';
  const firstName = (user?.user_metadata?.first_name as string | undefined) ?? '';

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="flex-1 px-6 py-8">
        <Text className="text-2xl font-bold text-zinc-900">
          Bonjour{firstName ? `, ${firstName}` : ''} 👋
        </Text>
        <Text className="text-sm text-zinc-500 mt-1">
          {ROLE_LABELS[role] ?? role}
        </Text>

        <View className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <Text className="text-sm text-zinc-500">
            Tableau de bord en cours de construction — Epic 3 à venir.
          </Text>
        </View>

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
