import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { Ionicons } from '@expo/vector-icons'
import { initAuth, useAuthState } from '../lib/auth-store'
import CustomSplash from './splash'

SplashScreen.preventAutoHideAsync()

const ioniconsFont = Ionicons.font

export default function RootLayout() {
  const { ready, authed } = useAuthState()
  const segments = useSegments()
  const router = useRouter()
  const [fontsLoaded, fontError] = useFonts(ioniconsFont)
  const [showCustomSplash, setShowCustomSplash] = useState(false)

  useEffect(() => { initAuth() }, [])

  useEffect(() => {
    if (!fontsLoaded && !fontError) return
    SplashScreen.hideAsync()
    setTimeout(() => setShowCustomSplash(true), 0)
  }, [fontsLoaded, fontError])

  useEffect(() => {
    if (!ready || showCustomSplash) return
    const onLogin = segments[0] === 'login'
    if (!authed && !onLogin) router.replace('/login')
    else if (authed && onLogin) router.replace('/')
  }, [ready, authed, segments, router, showCustomSplash])

  if (!fontsLoaded && !fontError) {
    return null
  }

  if (showCustomSplash) {
    return <CustomSplash onComplete={() => setShowCustomSplash(false)} />
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
