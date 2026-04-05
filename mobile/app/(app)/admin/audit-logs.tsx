import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  account_anonymized: 'Compte anonymisé (RGPD)',
  proxy_assigned: 'Proxy assigné',
  proxy_removed: 'Proxy retiré',
  mission_status_changed: 'Statut mission modifié',
  application_accepted: 'Candidature acceptée',
  application_rejected: 'Candidature refusée',
  fraud_flag_device_shared: 'Fraude — device partagé',
  fraud_flag_ip_mass_checkin: 'Fraude — IP masse',
  fraud_flag_rapid_consecutive_checkin: 'Fraude — check-in rapide',
};

export default function AuditLogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('audit_logs')
      .select('id, user_id, action, entity_type, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setLogs((data as AuditLog[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="px-6 pt-8 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-zinc-900">Audit trail</Text>
          <Text className="text-sm text-zinc-500 mt-0.5">100 dernières actions</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-sm text-zinc-500 underline">← Retour</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#71717a" />
        </View>
      ) : logs.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-zinc-500 text-center">
            Aucune entrée dans l'audit trail.
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pb-8 gap-2"
          renderItem={({ item }) => (
            <View className="rounded-xl border border-zinc-200 bg-white px-4 py-3 gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-zinc-800 flex-1 mr-2">
                  {ACTION_LABELS[item.action] ?? item.action}
                </Text>
                <Text className="text-xs text-zinc-400 shrink-0">
                  {new Date(item.created_at).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </Text>
              </View>

              <View className="flex-row gap-2 flex-wrap">
                {item.entity_type && (
                  <View className="rounded bg-zinc-100 px-1.5 py-0.5">
                    <Text className="text-xs font-mono text-zinc-500">
                      {item.entity_type}
                    </Text>
                  </View>
                )}
                {item.entity_id && (
                  <Text className="text-xs font-mono text-zinc-400">
                    {item.entity_id.slice(0, 8)}…
                  </Text>
                )}
              </View>

              {item.user_id && (
                <Text className="text-xs text-zinc-400 font-mono">
                  Acteur : {item.user_id.slice(0, 8)}…
                </Text>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
