import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../lib/brand'
import { BannerData, playVisitAlertSound, markNotificationShown } from '../lib/notifications'
import { markNotificationRead } from '../lib/api'
import { storage } from '../lib/storage'

let bannerQueue: BannerData[] = []
let currentVisible = false
const bannerSetters: Set<React.Dispatch<React.SetStateAction<BannerData | null>>> = new Set()

function getIcon(type: BannerData['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'VISIT_ASSIGNED':
      return 'calendar-outline'
    default:
      return 'notifications-outline'
  }
}

function getAccentColor(type: BannerData['type']): string {
  switch (type) {
    case 'VISIT_ASSIGNED':
      return colors.primary
    default:
      return colors.blue
  }
}

export function showBanner(data: BannerData): void {
  if (currentVisible) {
    bannerQueue.push(data)
    return
  }
  currentVisible = true
  for (const setter of bannerSetters) {
    setter(data)
  }
}

function dismissCurrent(): void {
  currentVisible = false
  for (const setter of bannerSetters) {
    setter(null)
  }

  if (bannerQueue.length > 0) {
    const next = bannerQueue.shift()
    if (next) {
      currentVisible = true
      for (const setter of bannerSetters) {
        setter(next)
      }
    }
  }
}

export function NotificationBannerHost(): React.ReactNode {
  const [data, setData] = useState<BannerData | null>(null)
  const insets = useSafeAreaInsets()
  const router = useRouter()

  useEffect(() => {
    bannerSetters.add(setData)
    return () => {
      bannerSetters.delete(setData)
    }
  }, [setData])

  const translateX = useMemo(() => new Animated.Value(380), [])
  const opacity = useMemo(() => new Animated.Value(0), [])

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: 380, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => dismissCurrent())
  }, [translateX, opacity])

  useEffect(() => {
    if (data) {
      void storage.get('kf_sound_enabled').then((v) => {
        if (v !== '0') {
          void playVisitAlertSound()
        }
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start()

      const timer = setTimeout(dismiss, 6000)
      return () => clearTimeout(timer)
    }
  }, [data, translateX, opacity, dismiss])

  if (!data) return null

  const { width } = Dimensions.get('window')
  const bannerWidth = Math.min(width * 0.92, 360)
  const accentColor = getAccentColor(data.type)
  const icon = getIcon(data.type)

  const handleBannerPress = async () => {
    if (data.notificationId) {
      await markNotificationRead(data.notificationId).catch(() => {})
      await markNotificationShown(data.notificationId)
    }
    if (data.visitId) {
      void router.push(`/visit/${data.visitId}` as any)
    }
    dismiss()
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          right: 12,
          width: bannerWidth,
          transform: [{ translateX }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.banner, { borderLeftColor: accentColor }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name={icon} size={20} color={accentColor} />
            <Text style={styles.title} numberOfLines={1}>{data.title}</Text>
            <Pressable
              onPress={dismiss}
              hitSlop={8}
              accessibilityLabel="Close notification"
            >
              <Ionicons name="close" size={18} color={colors.sub} />
            </Pressable>
          </View>
          <Pressable onPress={handleBannerPress} style={{ flex: 1 }}>
            <Text style={styles.message} numberOfLines={2}>{data.message}</Text>
          </Pressable>
        </View>
      </View>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 10,
  },
  banner: {
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  content: {
    padding: 12,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  message: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  viewButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
})
