import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '@/utils/supabase/client';

export default function BeneficiaireQrScreen() {
  const router = useRouter();
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadQr();
  }, []);

  async function loadQr() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('beneficiary_qr')
      .select('qr_token')
      .eq('beneficiary_id', user.id)
      .maybeSingle();

    if (data) {
      setQrToken(data.qr_token);
    }
    setLoading(false);
  }

  async function generateQr() {
    setGenerating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Générer un token unique (UUID v4 via crypto)
    const token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    const { data, error } = await supabase
      .from('beneficiary_qr')
      .insert({ beneficiary_id: user.id, qr_token: token })
      .select('qr_token')
      .single();

    if (!error && data) {
      setQrToken(data.qr_token);
    }
    setGenerating(false);
  }

  // Code court pour fallback (6 premiers chars sans tirets)
  const shortCode = qrToken?.replace(/-/g, '').slice(0, 6).toUpperCase();

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
        <Text className="text-base font-semibold text-zinc-900">Mon QR de pointage</Text>
        <View className="w-12" />
      </View>

      <View className="flex-1 items-center justify-center px-6 gap-8">
        {qrToken ? (
          <>
            <View className="bg-white rounded-3xl p-6 shadow-sm items-center gap-4">
              <QRCode value={qrToken} size={220} />
              <Text className="text-xs text-zinc-400 text-center">
                Montrez ce QR code au bénévole pour valider la présence
              </Text>
            </View>

            <View className="items-center gap-1">
              <Text className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
                Code de secours
              </Text>
              <Text className="text-3xl font-bold text-zinc-900 tracking-widest">
                {shortCode}
              </Text>
              <Text className="text-xs text-zinc-400 text-center mt-1">
                Si le scan ne fonctionne pas, donnez ce code au bénévole
              </Text>
            </View>
          </>
        ) : (
          <View className="items-center gap-4 px-6">
            <Text className="text-zinc-500 text-sm text-center">
              Vous n'avez pas encore de QR code de pointage.
            </Text>
            <TouchableOpacity
              className="rounded-xl bg-zinc-900 px-6 py-3.5 items-center"
              onPress={generateQr}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-sm font-medium">Générer mon QR code</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
