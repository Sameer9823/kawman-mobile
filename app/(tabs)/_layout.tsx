import React, { useEffect, useState } from 'react'
import { Image } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../lib/ui'
import { LOGO_HEADER } from '../../lib/brand'
import { BottomSheet } from '../../components/BottomSheet'
import { Fab } from '../../components/Fab'
import { getMe, MeProfile } from '../../lib/api'

export default function TabsLayout() {
  const router = useRouter()
  const [showSheet, setShowSheet] = useState(false)
  const [me, setMe] = useState<MeProfile | null>(null)

  const isAdmin = (me?.roles ?? []).some((r) => r === 'SUPER_ADMIN' || r === 'ADMIN') ||
    (me?.permissions ?? []).includes('field_visits.view_all')

  useEffect(() => {
    getMe().then(setMe).catch(() => {})
  }, [])

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.sub,
          headerTitleStyle: { fontWeight: '700' },
          headerTitle: () => (
            <Image source={LOGO_HEADER} style={{ width: 120, height: 32, resizeMode: 'contain' }} />
          ),
          tabBarStyle: {
            height: 80,
            paddingBottom: 20,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 4 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="visits" options={{ title: 'Visits', tabBarLabel: 'Visits', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="follow-ups" options={{ title: 'Follow-ups', tabBarLabel: 'Follow-ups', tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="contacts" options={{ title: 'Contacts', tabBarLabel: 'Contacts', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarLabel: 'Reports', tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} /> }} />
        {isAdmin && (
          <Tabs.Screen name="team" options={{ title: 'Team', tabBarLabel: 'Team', tabBarIcon: ({ color, size }) => <Ionicons name="people-circle-outline" size={size} color={color} /> }} />
        )}
        <Tabs.Screen name="profile" options={{ title: 'Me', tabBarLabel: 'Me', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }} />
      </Tabs>

      <Fab onPress={() => setShowSheet(true)} />

      <BottomSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        title="Quick action"
        actions={[
          { label: 'New visit', onPress: () => { setShowSheet(false); router.push('/visit/new') }, variant: 'primary' },
        ]}
      />
    </>
  )
}
