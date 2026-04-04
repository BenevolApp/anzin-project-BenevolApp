import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

interface InboxMessage {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  account_approved: '✅',
  account_rejected: '❌',
  admin_message: '💬',
};

export default function InboxScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, message, is_read, created_at')
      .eq('is_human', true)
      .order('created_at', { ascending: false });

    setMessages((data as InboxMessage[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Marquer tous les non-lus comme lus à l'ouverture
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_human', true)
      .eq('is_read', false)
      .then(() => {
        setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
      });
  }, [userId]);

  const unreadCount = messages.filter((m) => !m.is_read).length;

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
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-semibold text-zinc-900">Messagerie</Text>
          {unreadCount > 0 && (
            <View className="rounded-full bg-red-500 px-1.5 py-0.5">
              <Text className="text-white text-xs font-bold">{unreadCount}</Text>
            </View>
          )}
        </View>
        <View className="w-12" />
      </View>

      {messages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-zinc-400 text-center">
            Aucun message pour l'instant.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8 gap-3">
          {messages.map((msg) => {
            const icon = TYPE_ICONS[msg.type] ?? '📩';
            const dateStr = new Date(msg.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <View
                key={msg.id}
                className={`rounded-2xl border p-4 gap-1 ${
                  msg.is_read
                    ? 'bg-white border-zinc-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-row items-center gap-2 flex-1">
                    <Text className="text-base">{icon}</Text>
                    <Text
                      className={`text-sm font-semibold flex-1 ${
                        msg.is_read ? 'text-zinc-700' : 'text-blue-900'
                      }`}
                    >
                      {msg.title}
                    </Text>
                  </View>
                  {!msg.is_read && (
                    <View className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
                  )}
                </View>

                {msg.message && (
                  <Text className="text-sm text-zinc-600 leading-5 ml-6">
                    {msg.message}
                  </Text>
                )}
                <Text className="text-xs text-zinc-400 ml-6 mt-1">{dateStr}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
