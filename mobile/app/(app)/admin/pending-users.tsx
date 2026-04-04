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
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

interface PendingUser {
  id: string;
  first_name: string | null;
  role: string;
  created_at: string;
  organisation_id: string;
  profiles_sensitive: { last_name: string | null; email: string | null } | null;
}

const ROLE_LABELS: Record<string, string> = {
  benevole: 'Bénévole',
  beneficiaire: 'Bénéficiaire',
};

export default function PendingUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAdminId(user.id);
    });
    fetchPending();
  }, []);

  async function fetchPending() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, role, created_at, organisation_id, profiles_sensitive(last_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setUsers((data as unknown as PendingUser[]) ?? []);
    setLoading(false);
  }

  async function updateStatus(
    user: PendingUser,
    status: 'active' | 'rejected'
  ) {
    setActionLoading(user.id);
    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', user.id);

    if (error) {
      Alert.alert('Erreur', error.message);
      setActionLoading(null);
      return;
    }

    const message =
      status === 'active'
        ? 'Votre compte a été validé. Bienvenue sur BénévolApp !'
        : "Votre inscription n'a pas pu être validée. Contactez l'administration.";

    await supabase.from('notifications').insert({
      user_id: user.id,
      organisation_id: user.organisation_id,
      type: status === 'active' ? 'account_approved' : 'account_rejected',
      title: status === 'active' ? 'Compte validé' : 'Inscription non retenue',
      message,
      is_human: true,
    });

    setActionLoading(null);
    fetchPending();
  }

  function confirmAction(user: PendingUser, status: 'active' | 'rejected') {
    const label = status === 'active' ? 'Approuver' : 'Rejeter';
    const fullName =
      [user.first_name, user.profiles_sensitive?.last_name]
        .filter(Boolean)
        .join(' ') || 'cet utilisateur';

    Alert.alert(
      `${label} le compte`,
      `Voulez-vous ${label.toLowerCase()} le compte de ${fullName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: label,
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: () => updateStatus(user, status),
        },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="px-6 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-sm text-zinc-500">← Retour</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-zinc-900">
          Comptes en attente
        </Text>
        <View className="w-12" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : users.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-zinc-500 text-center">
            Aucun compte en attente de validation.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8 gap-3">
          {users.map((user) => {
            const fullName =
              [user.first_name, user.profiles_sensitive?.last_name]
                .filter(Boolean)
                .join(' ') || 'Sans nom';
            const email = user.profiles_sensitive?.email ?? '—';
            const isLoading = actionLoading === user.id;

            return (
              <View
                key={user.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <Text className="font-medium text-zinc-900">{fullName}</Text>
                <Text className="text-sm text-zinc-500 mt-0.5">{email}</Text>
                <Text className="text-xs text-zinc-400 mt-1">
                  {ROLE_LABELS[user.role] ?? user.role} — inscrit le{' '}
                  {new Date(user.created_at).toLocaleDateString('fr-FR')}
                </Text>

                <View className="flex-row gap-2 mt-4">
                  <TouchableOpacity
                    className="flex-1 rounded-lg bg-emerald-600 py-2.5 items-center"
                    onPress={() => confirmAction(user, 'active')}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text className="text-white text-sm font-medium">Approuver</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 rounded-lg border border-red-300 py-2.5 items-center"
                    onPress={() => confirmAction(user, 'rejected')}
                    disabled={isLoading}
                  >
                    <Text className="text-red-600 text-sm font-medium">Rejeter</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  className="mt-2 rounded-lg border border-zinc-200 py-2 items-center"
                  onPress={() =>
                    router.push(
                      `/(app)/admin/send-message?user_id=${user.id}&user_name=${encodeURIComponent(fullName)}&organisation_id=${user.organisation_id}`
                    )
                  }
                >
                  <Text className="text-sm text-zinc-600">Envoyer un message</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
