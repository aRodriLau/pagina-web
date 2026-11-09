import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useAuth } from '../../lib/auth';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ColorValue } from 'react-native';
import { colors } from '../../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size + 2} />;

export default function TabsLayout() {
  if (!useAuth().signedIn) return <Redirect href="/login" />;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: { height: 64, paddingBottom: 8 },
        headerTitleStyle: { fontSize: 22, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Per te', tabBarIcon: icon('compass-outline') }} />
      <Tabs.Screen name="explore" options={{ title: 'Esplora', tabBarIcon: icon('search-outline') }} />
      <Tabs.Screen name="create" options={{ title: 'Condividi', tabBarIcon: icon('add-circle-outline') }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: icon('chatbubbles-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profilo', tabBarIcon: icon('person-circle-outline') }} />
    </Tabs>
  );
}
