import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../lib/ui'
import { Image } from 'react-native'

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary,
      headerTitleStyle: { fontWeight: '700' },
      headerTitle: () => (
        <Image
          source={require('../../assets/logo-header.png')}
          style={{ width: 120, height: 32, resizeMode: 'contain' }}
        />
      ),
    }}>
      <Tabs.Screen name="index" options={{ title: 'Visits', tabBarLabel: 'Visits', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="contacts" options={{ title: 'Contacts', tabBarLabel: 'Contacts', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="follow-ups" options={{ title: 'Follow-ups', tabBarLabel: 'Follow-ups', tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarLabel: 'Reports', tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Me', tabBarLabel: 'Me', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }} />
    </Tabs>
  )
}
