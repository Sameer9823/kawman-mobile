import { useState, useCallback } from 'react'
import { FlatList, View, Text, TouchableOpacity, RefreshControl } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { getNotifications, markAllNotificationsRead, markNotificationRead, Notification } from '../lib/api'
import { Button, StatusChip, ErrorState, s, colors } from '../lib/ui'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { markNotificationShown } from '../lib/notifications'

export default function NotificationsScreen() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await getNotifications(50, 0)
      setNotifications(data.notifications)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [load]))

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handlePress = async (n: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (!n.isRead) {
      await markNotificationRead(n.id).catch(() => {})
    }
    if (n.visitId) {
      void markNotificationShown(n.id)
      router.push(`/visit/${n.visitId}` as any)
    }
  }

  const handleMarkAllRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await markAllNotificationsRead().catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const renderItem = ({ item }: { item: Notification }) => {
    const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return (
      <TouchableOpacity
        onPress={() => handlePress(item)}
        style={{
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: item.isRead ? colors.card : '#f0f9ff',
        }}
        accessibilityLabel={item.title}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: item.isRead ? '500' : '700', color: colors.text, marginBottom: 2 }}>{item.title}</Text>
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>{item.message}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <Text style={s.sub}>{time}</Text>
              <StatusChip status={item.type} label={item.type.replace(/_/g, ' ')} />
            </View>
          </View>
          {!item.isRead && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}
        </View>
      </TouchableOpacity>
    )
  }

  if (loading && !refreshing) {
    return (
      <View style={[s.screen, s.pad]}>
        <Text style={s.sub}>Loading…</Text>
      </View>
    )
  }

  if (error && notifications.length === 0) {
    return (
      <View style={[s.screen, s.pad]}>
        <ErrorState message={error} onRetry={load} />
      </View>
    )
  }

  return (
    <View style={s.screen}>
      {unreadCount > 0 && (
        <View style={{ padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.sub, fontSize: 14 }}>{unreadCount} unread</Text>
          <Button title="Mark all read" variant="ghost" onPress={handleMarkAllRead} />
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Ionicons name="notifications-outline" size={64} color={colors.sub} />
            <Text style={[s.sub, { textAlign: 'center', marginTop: 12 }]}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  )
}
