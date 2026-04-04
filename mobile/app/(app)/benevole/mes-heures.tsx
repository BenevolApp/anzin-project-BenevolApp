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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/utils/supabase/client';

interface PointageRecord {
  id: string;
  check_in_time: string;
  check_out_time: string;
  intervention: {
    scheduled_date: string;
    mission: { title: string } | null;
  } | null;
}

function calcDurationMinutes(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000
  );
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
}

export default function MesHeuresScreen() {
  const router = useRouter();
  const [pointages, setPointages] = useState<PointageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data } = await supabase
      .from('pointages')
      .select(`
        id, check_in_time, check_out_time,
        intervention:mission_interventions!inner(
          scheduled_date,
          mission:missions!inner(title)
        )
      `)
      .not('check_in_time', 'is', null)
      .not('check_out_time', 'is', null)
      .order('check_in_time', { ascending: false });

    setPointages(data as unknown as PointageRecord[]);
    setLoading(false);
  }

  const totalMinutes = pointages.reduce((acc, p) => {
    if (!p.check_in_time || !p.check_out_time) return acc;
    return acc + calcDurationMinutes(p.check_in_time, p.check_out_time);
  }, 0);

  async function handleExport() {
    if (pointages.length === 0) {
      Alert.alert('Aucune donnée', 'Pas de pointages à exporter.');
      return;
    }

    setExporting(true);
    try {
      const header = 'Date,Mission,Heure arrivée,Heure départ,Durée (min)';
      const rows = pointages.map((p) => {
        const iv = Array.isArray(p.intervention) ? p.intervention[0] : p.intervention;
        const mission = Array.isArray(iv?.mission) ? iv?.mission[0] : iv?.mission;
        const date = iv?.scheduled_date
          ? new Date(iv.scheduled_date).toLocaleDateString('fr-FR')
          : '';
        const checkIn = new Date(p.check_in_time).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const checkOut = new Date(p.check_out_time).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const duration = calcDurationMinutes(p.check_in_time, p.check_out_time);
        const title = (mission?.title ?? '').replace(/,/g, ';');
        return `${date},${title},${checkIn},${checkOut},${duration}`;
      });

      const csv = [header, ...rows].join('\n');
      const filename = `heures_benevole_${new Date().toISOString().slice(0, 10)}.csv`;
      const path = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(path, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'text/csv',
          dialogTitle: 'Exporter mes heures de bénévolat',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Export disponible', `Fichier enregistré : ${filename}`);
      }
    } catch {
      Alert.alert('Erreur', "Impossible de générer l'export.");
    }
    setExporting(false);
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
        <Text className="text-base font-semibold text-zinc-900">Mes heures</Text>
        <View className="w-12" />
      </View>

      <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8">
        {/* Total */}
        <View className="rounded-2xl bg-white border border-zinc-200 p-5 mb-4">
          <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
            Total bénévolat
          </Text>
          <Text className="text-3xl font-bold text-zinc-900">
            {formatDuration(totalMinutes)}
          </Text>
          <Text className="text-sm text-zinc-400 mt-1">
            {pointages.length} intervention{pointages.length !== 1 ? 's' : ''} effectuée
            {pointages.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Export */}
        <TouchableOpacity
          className={`rounded-xl py-3.5 items-center mb-6 ${exporting ? 'bg-zinc-300' : 'bg-zinc-900'}`}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-sm font-medium">Exporter en CSV</Text>
          )}
        </TouchableOpacity>

        {/* Liste */}
        <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
          Historique
        </Text>

        {pointages.length === 0 ? (
          <View className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 items-center">
            <Text className="text-sm text-zinc-400">
              Aucune intervention pointée pour l'instant.
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {pointages.map((p) => {
              const iv = Array.isArray(p.intervention) ? p.intervention[0] : p.intervention;
              const mission = Array.isArray(iv?.mission) ? iv?.mission[0] : iv?.mission;
              const dateStr = iv?.scheduled_date
                ? new Date(iv.scheduled_date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                  })
                : '';
              const checkIn = new Date(p.check_in_time).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const checkOut = new Date(p.check_out_time).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const duration = calcDurationMinutes(p.check_in_time, p.check_out_time);

              return (
                <View
                  key={p.id}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-3 gap-1"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-zinc-800 capitalize">
                      {dateStr}
                    </Text>
                    <Text className="text-sm font-semibold text-emerald-700">
                      {formatDuration(duration)}
                    </Text>
                  </View>
                  <Text className="text-sm text-zinc-500">{mission?.title ?? '—'}</Text>
                  <Text className="text-xs text-zinc-400">
                    {checkIn} – {checkOut}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
