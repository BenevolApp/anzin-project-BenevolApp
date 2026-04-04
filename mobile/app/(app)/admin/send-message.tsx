import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

export default function SendMessageScreen() {
  const router = useRouter();
  const { user_id, user_name, organisation_id } = useLocalSearchParams<{
    user_id: string;
    user_name: string;
    organisation_id: string;
  }>();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!title.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir un objet.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir un message.');
      return;
    }

    setSending(true);

    const { error } = await supabase.from('notifications').insert({
      user_id,
      organisation_id,
      type: 'admin_message',
      title: title.trim(),
      message: message.trim(),
      is_human: true,
      is_read: false,
    });

    setSending(false);

    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }

    Alert.alert(
      'Message envoyé',
      `Votre message a bien été envoyé à ${user_name ?? 'l\'utilisateur'}.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="px-6 pt-4 pb-3 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm text-zinc-500">← Retour</Text>
          </TouchableOpacity>
          <Text className="text-base font-semibold text-zinc-900">
            Nouveau message
          </Text>
          <View className="w-16" />
        </View>

        <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8">
          {/* Destinataire */}
          <View className="rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-3 mb-4">
            <Text className="text-xs text-zinc-500">À</Text>
            <Text className="text-sm font-medium text-zinc-800 mt-0.5">
              {user_name ?? 'Utilisateur'}
            </Text>
          </View>

          {/* Objet */}
          <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
            Objet
          </Text>
          <TextInput
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 mb-4"
            placeholder="Ex : Informations sur votre compte"
            placeholderTextColor="#a1a1aa"
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />

          {/* Message */}
          <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
            Message
          </Text>
          <TextInput
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 mb-6"
            placeholder="Rédigez votre message ici..."
            placeholderTextColor="#a1a1aa"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            style={{ minHeight: 140 }}
          />

          <TouchableOpacity
            className={`rounded-xl py-3.5 items-center ${sending ? 'bg-zinc-300' : 'bg-zinc-900'}`}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-sm font-medium">Envoyer</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
