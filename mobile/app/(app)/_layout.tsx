import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="missions/index" />
      <Stack.Screen name="missions/[id]" />
      <Stack.Screen name="admin/pending-users" />
      <Stack.Screen name="admin/missions/new" />
      <Stack.Screen name="admin/missions/[id]/edit" />
      <Stack.Screen name="admin/interventions/new" />
      <Stack.Screen name="admin/dashboard" />
      <Stack.Screen name="admin/send-message" />
      <Stack.Screen name="inbox/index" />
      <Stack.Screen name="beneficiaire/qr" />
      <Stack.Screen name="benevole/mes-heures" />
      <Stack.Screen name="pointage/scan" />
      <Stack.Screen name="pointage/fallback" />
      <Stack.Screen name="pointage/confirm" />
    </Stack>
  );
}
