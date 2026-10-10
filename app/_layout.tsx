import { useEffect } from 'react'
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { Ionicons } from '@expo/vector-icons'
import { initAuth, useAuthState } from '../lib/auth-store'

SplashScreen.preventAutoHideAsync()

const ioniconsFont = Ionicons.font

export default function RootLayout() {
  const { ready, authed } = useAuthState()
  const segments = useSegments()
  const router = useRouter()
  const [fontsLoaded, fontError] = useFonts(ioniconsFont)

  useEffect(() => { initAuth() }, [])

  useEffect(() => {
    if (!ready) return
    const onLogin = segments[0] === 'login'
    if (!authed && !onLogin) router.replace('/login')
    else if (authed && onLogin) router.replace('/')
  }, [ready, authed, segments, router])

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    return null
  }

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
