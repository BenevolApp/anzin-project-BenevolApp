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
    </Stack>
  );
}
