import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';
import { MissionForm } from './_components/mission-form';

export default function NewMissionScreen() {
  const router = useRouter();
  const [organisationId, setOrganisationId] = useState('');
  const [adminId, setAdminId] = useState('');
  const [services, setServices] = useState<{ id: string; libelle: string }[]>([]);
  const [beneficiaires, setBeneficiaires] = useState<never[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setAdminId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('organisation_id')
        .eq('id', user!.id)
        .single();
      if (profile?.organisation_id) setOrganisationId(profile.organisation_id as string);

      const [{ data: s }, { data: b }] = await Promise.all([
        supabase.from('types_service').select('id, libelle').order('libelle'),
        supabase
          .from('profiles')
          .select('id, first_name, profiles_sensitive(last_name)')
          .eq('role', 'beneficiaire')
          .eq('status', 'active')
          .order('first_name'),
      ]);
      setServices(s ?? []);
      setBeneficiaires((b as never[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

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
        <Text className="text-base font-semibold text-zinc-900">Nouvelle mission</Text>
        <View className="w-12" />
      </View>

      <MissionForm
        organisationId={organisationId}
        adminId={adminId}
        services={services}
        beneficiaires={beneficiaires}
      />
    </SafeAreaView>
  );
}
