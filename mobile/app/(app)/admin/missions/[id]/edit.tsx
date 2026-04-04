import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';
import { MissionForm } from '../_components/mission-form';

export default function EditMissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [organisationId, setOrganisationId] = useState('');
  const [adminId, setAdminId] = useState('');
  const [services, setServices] = useState<{ id: string; libelle: string }[]>([]);
  const [beneficiaires, setBeneficiaires] = useState<never[]>([]);
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setAdminId(user.id);

      const [{ data: profile }, { data: mission }, { data: s }, { data: b }] = await Promise.all([
        supabase.from('profiles').select('organisation_id').eq('id', user!.id).single(),
        supabase
          .from('missions')
          .select('id, title, description, service_id, beneficiaire_id, competences, schedules:mission_schedules(recurrence_type, start_date, end_date, day_of_week, start_time, end_time)')
          .eq('id', id)
          .single(),
        supabase.from('types_service').select('id, libelle').order('libelle'),
        supabase.from('profiles').select('id, first_name, profiles_sensitive(last_name)').eq('role', 'beneficiaire').eq('status', 'active').order('first_name'),
      ]);

      if (profile?.organisation_id) setOrganisationId(profile.organisation_id as string);
      setServices(s ?? []);
      setBeneficiaires((b as never[]) ?? []);

      if (mission) {
        const schedule = Array.isArray(mission.schedules) ? mission.schedules[0] : mission.schedules;
        setDefaultValues({
          title: mission.title ?? '',
          description: mission.description ?? '',
          service_id: mission.service_id ?? '',
          beneficiaire_id: mission.beneficiaire_id ?? '',
          competences: (mission.competences as string[] | null)?.join(', ') ?? '',
          recurrence_type: schedule?.recurrence_type ?? 'one_time',
          start_date: schedule?.start_date ?? '',
          end_date: schedule?.end_date ?? '',
          day_of_week: schedule?.day_of_week ?? '',
          start_time: (schedule?.start_time as string | null)?.slice(0, 5) ?? '',
          end_time: (schedule?.end_time as string | null)?.slice(0, 5) ?? '',
        });
      }

      setReady(true);
    }
    load();
  }, [id]);

  if (!ready) {
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
        <Text className="text-base font-semibold text-zinc-900">Modifier la mission</Text>
        <View className="w-12" />
      </View>

      <MissionForm
        organisationId={organisationId}
        adminId={adminId}
        services={services}
        beneficiaires={beneficiaires}
        missionId={id}
        defaultValues={defaultValues as never}
      />
    </SafeAreaView>
  );
}
