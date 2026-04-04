import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

interface TypeService { id: string; libelle: string }
interface Beneficiaire {
  id: string;
  first_name: string | null;
  profiles_sensitive: { last_name: string | null } | null;
}

type RecurrenceType = 'one_time' | 'multi_day' | 'weekly';
type DayOfWeek = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';

interface FormValues {
  title: string;
  description: string;
  service_id: string;
  beneficiaire_id: string;
  competences: string;
  recurrence_type: RecurrenceType;
  start_date: string;
  end_date: string;
  day_of_week: DayOfWeek | '';
  start_time: string;
  end_time: string;
}

interface Props {
  organisationId: string;
  adminId: string;
  services: TypeService[];
  beneficiaires: Beneficiaire[];
  missionId?: string;
  defaultValues?: Partial<FormValues>;
}

const RECURRENCES: { value: RecurrenceType; label: string }[] = [
  { value: 'one_time', label: 'Ponctuelle' },
  { value: 'multi_day', label: 'Multi-jours' },
  { value: 'weekly', label: 'Hebdomadaire' },
];

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'lundi', label: 'Lun' },
  { value: 'mardi', label: 'Mar' },
  { value: 'mercredi', label: 'Mer' },
  { value: 'jeudi', label: 'Jeu' },
  { value: 'vendredi', label: 'Ven' },
  { value: 'samedi', label: 'Sam' },
  { value: 'dimanche', label: 'Dim' },
];

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-zinc-700 mb-1">{label}</Text>
      {children}
      {error && <Text className="text-xs text-red-600 mt-1">{error}</Text>}
    </View>
  );
}

const inputCls = 'border border-zinc-300 rounded-xl px-3 py-2.5 text-sm text-zinc-900 bg-white';

export function MissionForm({
  organisationId,
  adminId,
  services,
  beneficiaires,
  missionId,
  defaultValues,
}: Props) {
  const router = useRouter();
  const isEdit = !!missionId;

  const [values, setValues] = useState<FormValues>({
    title: defaultValues?.title ?? '',
    description: defaultValues?.description ?? '',
    service_id: defaultValues?.service_id ?? '',
    beneficiaire_id: defaultValues?.beneficiaire_id ?? '',
    competences: defaultValues?.competences ?? '',
    recurrence_type: defaultValues?.recurrence_type ?? 'one_time',
    start_date: defaultValues?.start_date ?? '',
    end_date: defaultValues?.end_date ?? '',
    day_of_week: defaultValues?.day_of_week ?? '',
    start_time: defaultValues?.start_time ?? '',
    end_time: defaultValues?.end_time ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues | 'root', string>>>({});

  function set(key: keyof FormValues, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!values.title.trim()) e.title = 'Titre requis';
    if (!values.service_id) e.service_id = 'Service requis';
    if (!values.beneficiaire_id) e.beneficiaire_id = 'Bénéficiaire requis';
    if (!values.start_date) e.start_date = 'Date requise';
    if (!values.start_time) e.start_time = 'Heure requise';
    if (!values.end_time) e.end_time = 'Heure requise';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit() {
    if (!validate()) return;
    setLoading(true);

    const competences = values.competences
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    let targetMissionId = missionId;

    if (isEdit) {
      const { error } = await supabase
        .from('missions')
        .update({
          title: values.title,
          description: values.description || null,
          service_id: values.service_id,
          beneficiaire_id: values.beneficiaire_id,
          competences,
        })
        .eq('id', missionId!);
      if (error) {
        Alert.alert('Erreur', error.message);
        setLoading(false);
        return;
      }
      await supabase.from('mission_schedules').delete().eq('mission_id', missionId!);
    } else {
      const { data: mission, error } = await supabase
        .from('missions')
        .insert({
          title: values.title,
          description: values.description || null,
          service_id: values.service_id,
          beneficiaire_id: values.beneficiaire_id,
          organisation_id: organisationId,
          created_by_admin_id: adminId,
          status: 'draft',
          competences,
        })
        .select('id')
        .single();
      if (error || !mission) {
        Alert.alert('Erreur', error?.message ?? 'Erreur création');
        setLoading(false);
        return;
      }
      targetMissionId = mission.id;
    }

    await supabase.from('mission_schedules').insert({
      mission_id: targetMissionId,
      recurrence_type: values.recurrence_type,
      start_date: values.start_date,
      end_date: values.end_date || null,
      day_of_week: values.recurrence_type === 'weekly' ? values.day_of_week || null : null,
      start_time: values.start_time,
      end_time: values.end_time,
    });

    setLoading(false);
    router.replace(`/(app)/missions/${targetMissionId}`);
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-6 py-6 pb-12">
      <Field label="Titre" error={errors.title}>
        <TextInput
          className={inputCls}
          value={values.title}
          onChangeText={(v) => set('title', v)}
          placeholder="Titre de la mission"
        />
      </Field>

      <Field label="Description">
        <TextInput
          className={`${inputCls} h-20`}
          value={values.description}
          onChangeText={(v) => set('description', v)}
          placeholder="Description (optionnel)"
          multiline
          textAlignVertical="top"
        />
      </Field>

      <Field label="Type de service" error={errors.service_id}>
        <View className="gap-2">
          {services.map((s) => (
            <TouchableOpacity
              key={s.id}
              className={`rounded-xl border px-4 py-3 flex-row items-center gap-3 ${
                values.service_id === s.id
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 bg-white'
              }`}
              onPress={() => set('service_id', s.id)}
            >
              <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                values.service_id === s.id ? 'border-zinc-900' : 'border-zinc-300'
              }`}>
                {values.service_id === s.id && (
                  <View className="w-2 h-2 rounded-full bg-zinc-900" />
                )}
              </View>
              <Text className="text-sm text-zinc-900">{s.libelle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>

      <Field label="Bénéficiaire" error={errors.beneficiaire_id}>
        <View className="gap-2">
          {beneficiaires.map((b) => {
            const sensitive = Array.isArray(b.profiles_sensitive) ? b.profiles_sensitive[0] : b.profiles_sensitive;
            const name = [b.first_name, sensitive?.last_name].filter(Boolean).join(' ') || b.id.slice(0, 8);
            return (
              <TouchableOpacity
                key={b.id}
                className={`rounded-xl border px-4 py-3 flex-row items-center gap-3 ${
                  values.beneficiaire_id === b.id
                    ? 'border-zinc-900 bg-zinc-50'
                    : 'border-zinc-200 bg-white'
                }`}
                onPress={() => set('beneficiaire_id', b.id)}
              >
                <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                  values.beneficiaire_id === b.id ? 'border-zinc-900' : 'border-zinc-300'
                }`}>
                  {values.beneficiaire_id === b.id && (
                    <View className="w-2 h-2 rounded-full bg-zinc-900" />
                  )}
                </View>
                <Text className="text-sm text-zinc-900">{name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Field>

      <Field label="Compétences souhaitées (séparées par virgule)">
        <TextInput
          className={inputCls}
          value={values.competences}
          onChangeText={(v) => set('competences', v)}
          placeholder="conduite, jardinage, cuisine"
        />
      </Field>

      {/* Planning */}
      <View className="border border-zinc-200 rounded-2xl p-4 mb-4">
        <Text className="text-sm font-medium text-zinc-700 mb-3">Planning</Text>

        <Text className="text-xs text-zinc-500 mb-2">Récurrence</Text>
        <View className="flex-row gap-2 mb-4">
          {RECURRENCES.map((r) => (
            <TouchableOpacity
              key={r.value}
              className={`flex-1 rounded-lg border py-2 items-center ${
                values.recurrence_type === r.value
                  ? 'border-zinc-900 bg-zinc-900'
                  : 'border-zinc-200 bg-white'
              }`}
              onPress={() => set('recurrence_type', r.value)}
            >
              <Text className={`text-xs font-medium ${
                values.recurrence_type === r.value ? 'text-white' : 'text-zinc-700'
              }`}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {values.recurrence_type === 'weekly' && (
          <>
            <Text className="text-xs text-zinc-500 mb-2">Jour de la semaine</Text>
            <View className="flex-row gap-1 mb-4 flex-wrap">
              {DAYS.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  className={`rounded-lg border px-2.5 py-1.5 ${
                    values.day_of_week === d.value
                      ? 'border-zinc-900 bg-zinc-900'
                      : 'border-zinc-200 bg-white'
                  }`}
                  onPress={() => set('day_of_week', d.value)}
                >
                  <Text className={`text-xs font-medium ${
                    values.day_of_week === d.value ? 'text-white' : 'text-zinc-700'
                  }`}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View className="flex-row gap-3 mb-3">
          <View className="flex-1">
            <Text className="text-xs text-zinc-500 mb-1">Date début (AAAA-MM-JJ)</Text>
            <TextInput
              className={inputCls}
              value={values.start_date}
              onChangeText={(v) => set('start_date', v)}
              placeholder="2026-05-01"
              keyboardType="numbers-and-punctuation"
            />
            {errors.start_date && <Text className="text-xs text-red-600 mt-1">{errors.start_date}</Text>}
          </View>
          {values.recurrence_type !== 'one_time' && (
            <View className="flex-1">
              <Text className="text-xs text-zinc-500 mb-1">Date fin</Text>
              <TextInput
                className={inputCls}
                value={values.end_date}
                onChangeText={(v) => set('end_date', v)}
                placeholder="2026-06-01"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          )}
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-xs text-zinc-500 mb-1">Heure début (HH:MM)</Text>
            <TextInput
              className={inputCls}
              value={values.start_time}
              onChangeText={(v) => set('start_time', v)}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
            />
            {errors.start_time && <Text className="text-xs text-red-600 mt-1">{errors.start_time}</Text>}
          </View>
          <View className="flex-1">
            <Text className="text-xs text-zinc-500 mb-1">Heure fin</Text>
            <TextInput
              className={inputCls}
              value={values.end_time}
              onChangeText={(v) => set('end_time', v)}
              placeholder="11:00"
              keyboardType="numbers-and-punctuation"
            />
            {errors.end_time && <Text className="text-xs text-red-600 mt-1">{errors.end_time}</Text>}
          </View>
        </View>
      </View>

      <TouchableOpacity
        className="rounded-xl bg-zinc-900 py-3.5 items-center"
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-sm font-medium">
            {isEdit ? 'Enregistrer les modifications' : 'Créer la mission (brouillon)'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
