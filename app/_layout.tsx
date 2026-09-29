import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { initAuth, useAuthState } from '../lib/auth-store'

export default function RootLayout() {
  const { ready, authed } = useAuthState()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => { initAuth() }, [])

  useEffect(() => {
    if (!ready) return
    const onLogin = segments[0] === 'login'
    if (!authed && !onLogin) router.replace('/login')
    else if (authed && onLogin) router.replace('/')
  }, [ready, authed, segments, router])

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTitleStyle: { fontWeight: '700' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="visit/new" options={{ title: 'New visit', presentation: 'modal' }} />
        <Stack.Screen name="visit/[id]" options={{ title: 'Visit' }} />
      </Stack>
    </>
  )
}
