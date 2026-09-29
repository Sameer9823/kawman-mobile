import { Tabs } from 'expo-router'
import { colors } from '../../lib/ui'

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerTitleStyle: { fontWeight: '700' } }}>
      <Tabs.Screen name="index" options={{ title: 'Visits', tabBarLabel: 'Visits' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan card', tabBarLabel: 'Scan card' }} />
      <Tabs.Screen name="profile" options={{ title: 'Me', tabBarLabel: 'Me' }} />
    </Tabs>
  )
}
