import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '@/utils/supabase/client';

export default function ScanQrScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);
    await resolveToken(data);
    setProcessing(false);
  }

  async function resolveToken(token: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Chercher le bénéficiaire par son qr_token
    const { data: qrRow } = await supabase
      .from('beneficiary_qr')
      .select('beneficiary_id')
      .eq('qr_token', token)
      .maybeSingle();

    if (!qrRow) {
      Alert.alert('QR invalide', 'Ce code ne correspond à aucun bénéficiaire.', [
        { text: 'Réessayer', onPress: () => setScanned(false) },
      ]);
      return;
    }

    await navigateToIntervention(user.id, qrRow.beneficiary_id);
  }

  async function navigateToIntervention(benevoleId: string, beneficiaireId: string) {
    const today = new Date().toISOString().slice(0, 10);

    // Trouver l'intervention du jour pour ce bénévole / ce bénéficiaire
    const { data: interventions } = await supabase
      .from('mission_interventions')
      .select('id, status, mission:missions(title, beneficiaire_id)')
      .eq('benevole_id', benevoleId)
      .eq('scheduled_date', today)
      .in('status', ['planned', 'done']);

    const match = (interventions ?? []).find((i: any) => {
      const mission = Array.isArray(i.mission) ? i.mission[0] : i.mission;
      return mission?.beneficiaire_id === beneficiaireId;
    });

    if (!match) {
      Alert.alert(
        'Aucune intervention',
        "Aucune intervention planifiée aujourd'hui avec ce bénéficiaire.",
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
      return;
    }

    router.push(`/(app)/pointage/confirm?intervention_id=${match.id}`);
  }

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <Text className="text-sm text-zinc-500">Chargement des permissions...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center px-6">
        <Text className="text-zinc-700 text-base font-semibold mb-2 text-center">
          Accès caméra requis
        </Text>
        <Text className="text-zinc-500 text-sm text-center mb-6">
          BénévolApp a besoin de la caméra pour scanner les QR codes de pointage.
        </Text>
        <TouchableOpacity
          className="rounded-xl bg-zinc-900 px-6 py-3 items-center"
          onPress={requestPermission}
        >
          <Text className="text-white text-sm font-medium">Autoriser la caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-sm text-zinc-500">Annuler</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="absolute top-0 left-0 right-0 z-10 px-6 pt-10 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-white text-sm">← Retour</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-semibold">Scanner le QR</Text>
        <View className="w-12" />
      </View>

      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Viseur */}
      <View className="flex-1 items-center justify-center">
        <View
          style={{
            width: 240,
            height: 240,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.8)',
            backgroundColor: 'transparent',
          }}
        />
      </View>

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 pb-12 px-6 items-center gap-3">
        <Text className="text-white text-sm opacity-70">
          {processing ? 'Vérification en cours...' : 'Pointez la caméra vers le QR code'}
        </Text>
        <TouchableOpacity
          className="rounded-xl border border-white/40 px-6 py-3"
          onPress={() => router.push('/(app)/pointage/fallback')}
        >
          <Text className="text-white text-sm">Saisir le code manuellement</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
