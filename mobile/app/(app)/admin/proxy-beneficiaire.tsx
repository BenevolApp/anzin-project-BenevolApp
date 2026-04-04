/**
 * Story 6.4 — Compte co-géré (proxy admin)
 *
 * Permet à un admin d'agir en tant que proxy pour un bénéficiaire non-autonome :
 *  - Lister les bénéficiaires dont il est le proxy (managed_by_admin_id = auth.uid())
 *  - Accéder à la fiche bénéficiaire (QR, missions)
 *  - Associer un bénéficiaire à son compte (set managed_by_admin_id)
 *  - Chaque action proxy est tracée dans audit_logs
 */
import { useCallback, useEffect, useState } from 'react';
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

interface BeneficiaireProxy {
  id: string;
  first_name: string | null;
  status: string;
  created_at: string;
  profiles_sensitive: { last_name: string | null; email: string | null } | null;
}

interface AllBeneficiaire {
  id: string;
  first_name: string | null;
  managed_by_admin_id: string | null;
  profiles_sensitive: { last_name: string | null } | null;
}

export default function ProxyBeneficiaireScreen() {
  const router = useRouter();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [managed, setManaged] = useState<BeneficiaireProxy[]>([]);
  const [unmanaged, setUnmanaged] = useState<AllBeneficiaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setAdminId(user.id);

    // Organisation de l'admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('organisation_id')
      .eq('id', user.id)
      .single();

    const org_id = profile?.organisation_id as string | undefined;
    if (org_id) setOrgId(org_id);

    // Bénéficiaires dont l'admin est proxy
    const { data: managedData } = await supabase
      .from('profiles')
      .select('id, first_name, status, created_at, profiles_sensitive(last_name, email)')
      .eq('role', 'beneficiaire')
      .eq('managed_by_admin_id', user.id)
      .order('first_name');

    // Bénéficiaires actifs sans proxy dans la même org
    const { data: unmanagedData } = await supabase
      .from('profiles')
      .select('id, first_name, managed_by_admin_id, profiles_sensitive(last_name)')
      .eq('role', 'beneficiaire')
      .eq('status', 'active')
      .is('managed_by_admin_id', null)
      .eq('organisation_id', org_id ?? '');

    setManaged((managedData as unknown as BeneficiaireProxy[]) ?? []);
    setUnmanaged((unmanagedData as unknown as AllBeneficiaire[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function assignProxy(beneficiaire_id: string, name: string) {
    Alert.alert(
      'Prendre en charge',
      `Devenir le proxy de ${name} ? Vous pourrez agir en son nom.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setAssigning(beneficiaire_id);
            const { error } = await supabase
              .from('profiles')
              .update({ managed_by_admin_id: adminId })
              .eq('id', beneficiaire_id);

            if (error) {
              Alert.alert('Erreur', error.message);
            } else {
              // Tracer l'action dans audit_logs
              await supabase.from('audit_logs').insert({
                user_id: adminId,
                organisation_id: orgId,
                action: 'proxy_assigned',
                entity_type: 'profile',
                entity_id: beneficiaire_id,
                metadata: { proxy_admin_id: adminId },
              });
              load();
            }
            setAssigning(null);
          },
        },
      ]
    );
  }

  async function removeProxy(beneficiaire_id: string, name: string) {
    Alert.alert(
      'Retirer la gestion',
      `Retirer votre accès proxy pour ${name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            setAssigning(beneficiaire_id);
            await supabase
              .from('profiles')
              .update({ managed_by_admin_id: null })
              .eq('id', beneficiaire_id);

            await supabase.from('audit_logs').insert({
              user_id: adminId,
              organisation_id: orgId,
              action: 'proxy_removed',
              entity_type: 'profile',
              entity_id: beneficiaire_id,
              metadata: { proxy_admin_id: adminId },
            });
            load();
            setAssigning(null);
          },
        },
      ]
    );
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
        <Text className="text-base font-semibold text-zinc-900">Comptes co-gérés</Text>
        <View className="w-12" />
      </View>

      <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8">
        {/* Mes bénéficiaires en proxy */}
        <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
          Mes bénéficiaires ({managed.length})
        </Text>

        {managed.length === 0 ? (
          <View className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 mb-6 items-center">
            <Text className="text-sm text-zinc-400">
              Vous ne gérez aucun bénéficiaire pour l'instant.
            </Text>
          </View>
        ) : (
          <View className="gap-2 mb-6">
            {managed.map((b) => {
              const sens = Array.isArray(b.profiles_sensitive)
                ? b.profiles_sensitive[0]
                : b.profiles_sensitive;
              const name =
                [b.first_name, sens?.last_name].filter(Boolean).join(' ') || 'Sans nom';
              const isWorking = assigning === b.id;

              return (
                <View
                  key={b.id}
                  className="rounded-2xl border border-blue-200 bg-blue-50 p-4 gap-2"
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-sm font-semibold text-blue-900">{name}</Text>
                      {sens?.email && (
                        <Text className="text-xs text-blue-600 mt-0.5">{sens.email}</Text>
                      )}
                    </View>
                    <View className="rounded-full bg-blue-100 px-2 py-0.5">
                      <Text className="text-xs text-blue-700 font-medium">Proxy actif</Text>
                    </View>
                  </View>

                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="flex-1 rounded-lg border border-blue-300 py-2 items-center"
                      onPress={() =>
                        router.push(`/(app)/beneficiaire/qr?proxy_id=${b.id}`)
                      }
                    >
                      <Text className="text-xs text-blue-700">Voir QR →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 rounded-lg border border-red-200 py-2 items-center"
                      onPress={() => removeProxy(b.id, name)}
                      disabled={isWorking}
                    >
                      {isWorking ? (
                        <ActivityIndicator size="small" color="#dc2626" />
                      ) : (
                        <Text className="text-xs text-red-600">Retirer</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Bénéficiaires sans proxy */}
        {unmanaged.length > 0 && (
          <>
            <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
              Bénéficiaires sans proxy ({unmanaged.length})
            </Text>

            <View className="gap-2">
              {unmanaged.map((b) => {
                const sens = Array.isArray(b.profiles_sensitive)
                  ? b.profiles_sensitive[0]
                  : b.profiles_sensitive;
                const name =
                  [b.first_name, sens?.last_name].filter(Boolean).join(' ') || 'Sans nom';
                const isWorking = assigning === b.id;

                return (
                  <View
                    key={b.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 flex-row items-center justify-between"
                  >
                    <Text className="text-sm text-zinc-800">{name}</Text>
                    <TouchableOpacity
                      className="rounded-lg bg-zinc-900 px-3 py-2"
                      onPress={() => assignProxy(b.id, name)}
                      disabled={isWorking}
                    >
                      {isWorking ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-white text-xs font-medium">Prendre en charge</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
