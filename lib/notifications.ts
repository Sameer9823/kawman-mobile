// expo-notifications is not available in Expo Go on SDK 53+
// We detect this at runtime and fall back to polling-only mode
let Notifications: typeof import('expo-notifications') | null = null
let getExpoPushTokenAsync: ((options: { projectId: string }) => Promise<{ data: string }>) | null = null

try {
  const mod = require('expo-notifications')
  Notifications = mod
  getExpoPushTokenAsync = mod.getExpoPushTokenAsync
} catch {
  // Running in Expo Go without push support — fall back to polling
}

import * as Device from 'expo-device'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { Platform, AppState, AppStateStatus } from 'react-native'
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import * as Haptics from 'expo-haptics'
import { registerPushToken, unregisterPushToken, getUnreadNotificationCount, getNotifications as fetchNotifications, markNotificationRead } from './api'
import { router } from 'expo-router'
import { logger } from './logger'
import { storage } from './storage'

const TOKEN_KEY = 'kf_push_token'
const SHOWN_NOTIFICATIONS_KEY = 'kf_shown_notifications'
const SOUND_SETTING_KEY = 'kf_sound_enabled'
const SOUND_FILE = require('../assets/sounds/visit_alert.wav')
const CHANNEL_ID = 'visit-assignments-v1'

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function isPushAvailable(): boolean {
  return Notifications !== null
}

// ---------------------------------------------------------------------------
// Channel setup — must happen before any notifications are sent/received
// ---------------------------------------------------------------------------

export async function registerNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return
  if (!isPushAvailable()) {
    logger.info('Push notifications not available in this environment (Expo Go)')
    return
  }

  await Notifications!.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Visit assignments',
    description: 'Notifications when a visit is assigned to you',
    importance: Notifications!.AndroidImportance.HIGH,
    sound: 'visit_alert.wav',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications!.AndroidNotificationVisibility.PUBLIC,
    enableLights: true,
    lightColor: '#603426',
    // NOTE: channel sound and importance cannot change after creation on Android.
    // Bump the channel id (e.g. 'visit-assignments-v2') if these need to change.
  })
}

// ---------------------------------------------------------------------------
// Permission handling
// ---------------------------------------------------------------------------

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isPushAvailable()) {
    // In Expo Go, permissions are managed by the system, but we can't set the handler
    return false
  }
  const { status } = await Notifications!.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  })
  return status === 'granted'
}

export async function checkNotificationPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  if (!isPushAvailable()) {
    return { granted: false, canAskAgain: false }
  }
  const { status, canAskAgain } = await Notifications!.getPermissionsAsync()
  return { granted: status === 'granted', canAskAgain }
}

// ---------------------------------------------------------------------------
// Push token registration
// ---------------------------------------------------------------------------

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    logger.warn('Push notifications not available on emulator')
    return null
  }

  if (!isPushAvailable()) {
    logger.info('Push notifications not available in this environment (Expo Go)')
    return null
  }

  const { granted, canAskAgain } = await checkNotificationPermission()
  if (!granted) {
    if (canAskAgain) {
      const ok = await requestNotificationPermission()
      if (!ok) return null
    } else {
      return null
    }
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
  if (!projectId) {
    logger.error('Missing EAS projectId — cannot get push token')
    return null
  }

  try {
    if (!getExpoPushTokenAsync) {
      logger.error('getExpoPushTokenAsync not available in this environment')
      return null
    }
    const res = await getExpoPushTokenAsync({ projectId })
    const token = res.data
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    await registerPushToken({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      deviceName: Device.deviceName ?? undefined,
    }).catch((e) => {
      logger.error('Failed to register push token with server', {}, e as Error)
    })
    return token
  } catch (e) {
    logger.error('Failed to get Expo push token', {}, e as Error)
    return null
  }
}

export async function unregisterPushTokenAsync(): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY)
  if (token) {
    await unregisterPushToken(token).catch((e) => {
      logger.error('Failed to unregister push token', {}, e as Error)
    })
    await SecureStore.deleteItemAsync(TOKEN_KEY)
  }
}

// ---------------------------------------------------------------------------
// Foreground notification handler
// ---------------------------------------------------------------------------

export function setForegroundNotificationHandler(): void {
  if (!isPushAvailable()) return
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldPlaySound: false,
      shouldShowList: false,
      shouldSetBadge: true,
    }),
  })
}

// ---------------------------------------------------------------------------
// In-app sound playback
// ---------------------------------------------------------------------------

let soundPlayer: AudioPlayer | null = null

export async function playVisitAlertSound(): Promise<void> {
  try {
    if (soundPlayer) {
      soundPlayer.remove()
    }
    soundPlayer = createAudioPlayer(SOUND_FILE)
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'doNotMix' })
    soundPlayer.play()
    setTimeout(() => {
      if (soundPlayer) {
        soundPlayer.remove()
        soundPlayer = null
      }
    }, 2000)
  } catch (e) {
    // Silent fallthrough — sound is a nice-to-have, not critical
  }
}

// ---------------------------------------------------------------------------
// In-app banner queue
// ---------------------------------------------------------------------------

export type BannerType = 'VISIT_ASSIGNED' | 'default'

export interface BannerData {
  type: BannerType
  title: string
  message: string
  visitId?: string
  notificationId?: string
}

type BannerCallback = (data: BannerData) => void
let bannerCallback: BannerCallback | null = null

export function setBannerHandler(cb: BannerCallback): void {
  bannerCallback = cb
}

export function clearBannerHandler(): void {
  bannerCallback = null
}

function dispatchBanner(data: BannerData): void {
  if (bannerCallback) {
    bannerCallback(data)
  }
}

// ---------------------------------------------------------------------------
// Tracking shown notifications (to avoid duplicates in polling fallback)
// ---------------------------------------------------------------------------

export async function markNotificationShown(notificationId: string): Promise<void> {
  const shown = await getShownNotifications()
  if (!shown.includes(notificationId)) {
    shown.push(notificationId)
    const trimmed = shown.slice(-100)
    await SecureStore.setItemAsync(SHOWN_NOTIFICATIONS_KEY, JSON.stringify(trimmed))
  }
}

export async function getShownNotifications(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(SHOWN_NOTIFICATIONS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Notification response (tap) handling
// ---------------------------------------------------------------------------

export function setupNotificationResponseListener(): void {
  if (!isPushAvailable()) return
  Notifications!.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined
    const visitId = data?.visitId as string | undefined
    if (visitId && data?.type === 'VISIT_ASSIGNED') {
      void router.push(`/visit/${visitId}` as any)
    }
  })
}

export async function handleColdStartNotification(): Promise<void> {
  if (!isPushAvailable()) return
  const response = await Notifications!.getLastNotificationResponseAsync()
  if (response) {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined
    const visitId = data?.visitId as string | undefined
    if (visitId && data?.type === 'VISIT_ASSIGNED') {
      void router.push(`/visit/${visitId}` as any)
    }
  }
}

// ---------------------------------------------------------------------------
// Polling fallback (when push is unavailable)
// ---------------------------------------------------------------------------

let lastUnreadCount = 0
let pollingInterval: ReturnType<typeof setInterval> | null = null

export async function startPollingFallback(): Promise<void> {
  try {
    lastUnreadCount = await getUnreadNotificationCount()
  } catch {
    lastUnreadCount = 0
  }

  pollingInterval = setInterval(async () => {
    try {
      const count = await getUnreadNotificationCount()
      if (count > lastUnreadCount) {
        const shown = await getShownNotifications()
        const { notifications } = await fetchNotifications(10, 0, true)
        for (const n of notifications) {
          if (shown.includes(n.id)) continue
          await markNotificationShown(n.id)

          const visitId = n.data?.visitId as string | undefined

          dispatchBanner({
            type: n.type === 'VISIT_ASSIGNED' ? 'VISIT_ASSIGNED' : 'default',
            title: n.title,
            message: n.message,
            visitId,
            notificationId: n.id,
          })

          // Play sound + haptic for in-app notification (if sound is enabled)
          const soundEnabled = await storage.get(SOUND_SETTING_KEY)
          if (soundEnabled !== '0') {
            void playVisitAlertSound()
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
      }
      lastUnreadCount = count
    } catch (e) {
      logger.error('Polling fallback error', {}, e as Error)
    }
  }, 30000) // 30 seconds
}

export function stopPollingFallback(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

export function setupAppStatePolling(): void {
  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      startPollingFallback()
    } else {
      stopPollingFallback()
    }
  })
}

// ---------------------------------------------------------------------------
// Full setup — call once after sign-in
// ---------------------------------------------------------------------------

export async function setupNotifications(): Promise<void> {
  await registerNotificationChannel()
  setForegroundNotificationHandler()

  const token = await registerForPushNotificationsAsync()

  if (token) {
    setupNotificationResponseListener()
    await handleColdStartNotification()
  } else {
    startPollingFallback()
    setupAppStatePolling()
  }
}

export async function handleTokenRefresh(): Promise<void> {
  const oldToken = await SecureStore.getItemAsync(TOKEN_KEY)
  const newToken = await registerForPushNotificationsAsync()
  if (newToken && oldToken && newToken !== oldToken) {
    await unregisterPushTokenAsync()
  }
}

export { isPushAvailable }