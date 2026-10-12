import { useCallback, useEffect, useState } from 'react'
import { Alert, FlatList, RefreshControl, ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Card, s, colors, StatusChip, SectionHeader, EmptyState, ErrorState, SkeletonList, Avatar } from '../../lib/ui'
import { Ionicons } from '@expo/vector-icons'
import { MeProfile, Visit, FollowUp, getMe, getVisits, getFollowUps } from '../../lib/api'
import { isOnDuty, startDuty, stopDuty, onDutyChange } from '../../lib/duty'
import { storage } from '../../lib/storage'

const SYNC_KEY = 'last-sync'

export default function Home() {
  const router = useRouter()
  const [me, setMe] = useState<MeProfile | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [onDuty, setOnDuty] = useState(isOnDuty())

  useEffect(() => {
    onDutyChange((s) => setOnDuty(s.onDuty))
  }, [])

  const load = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const [meRes, visitsRes, fusRes] = await Promise.allSettled([
        getMe(),
        getVisits('today'),
        getFollowUps(),
      ])
      if (meRes.status === 'fulfilled') setMe(meRes.value)
      if (visitsRes.status === 'fulfilled') {
        setVisits(visitsRes.value)
      } else {
        setError(visitsRes.reason instanceof Error ? visitsRes.reason.message : 'Failed')
      }
      if (fusRes.status === 'fulfilled') setFollowUps(fusRes.value)

      const now = new Date().toISOString()
      await storage.set(SYNC_KEY, now)
      setLastSync(now)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load().catch(() => {}) }, [load]))

  const todayVisits = visits.filter((v) => {
    const d = new Date(v.scheduledAt)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })
  const completedToday = todayVisits.filter((v) => v.status === 'COMPLETED').length
  const plannedToday = todayVisits.length
  const dueFus = followUps.filter((f) => f.status === 'PENDING' || f.status === 'OVERDUE').length
  const nextVisit = visits.find((v) => ['SCHEDULED', 'ON_THE_WAY'].includes(v.status))

  const toggleDuty = async () => {
    try {
      if (onDuty) {
        await stopDuty()
      } else {
        await startDuty()
      }
    } catch (e) {
      Alert.alert('Location permission', e instanceof Error ? e.message : 'Could not update duty status')
    }
  }

  const renderVisit = ({ item }: { item: Visit }) => (
    <TouchableOpacity onPress={() => router.push(`/visit/${item.id}`)} activeOpacity={0.7} accessibilityLabel={`Visit: ${item.title}`}>
      <Card style={{ padding: 12, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item.title}</Text>
          <StatusChip status={item.status} />
        </View>
        {item.company ? <Text style={s.sub}>{item.company}</Text> : null}
        <Text style={s.sub}>{new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </Card>
    </TouchableOpacity>
  )

  return (
    <ScrollView
      style={s.screen}
      refreshControl={<RefreshControl refreshing={syncing} onRefresh={load} tintColor={colors.primary} />}
    >
      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 14, color: colors.sub }}>Hello,</Text>
            <Text style={[s.h1, { fontSize: 22 }]}>{me?.name ?? '...'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')} accessibilityLabel="Profile">
            <Avatar name={me?.name ?? 'U'} size={44} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={toggleDuty} style={{ flex: 1 }} accessibilityLabel={onDuty ? 'End day' : 'Start day'} activeOpacity={0.8}>
            <Card style={{ padding: 16, alignItems: 'center', flexDirection: 'row', gap: 8 }}>
              <Ionicons name={onDuty ? 'pause-circle' : 'play-circle-outline'} size={24} color={onDuty ? colors.danger : colors.primary} />
              <Text style={{ fontWeight: '600', color: colors.text }}>{onDuty ? 'On duty' : 'Start day'}</Text>
            </Card>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}} style={{ flex: 1 }} accessibilityLabel="End day" activeOpacity={0.8}>
            <Card style={{ padding: 16, alignItems: 'center', flexDirection: 'row', gap: 8 }}>
              <Ionicons name="stop-circle-outline" size={24} color={colors.primary} />
              <Text style={{ fontWeight: '600', color: colors.text }}>End day</Text>
            </Card>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>{plannedToday - completedToday}</Text>
            <Text style={s.sub}>Visits left</Text>
          </Card>
          <Card style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>{completedToday}</Text>
            <Text style={s.sub}>Visits done</Text>
          </Card>
          <Card style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>{dueFus}</Text>
            <Text style={s.sub}>Follow-ups due</Text>
          </Card>
          <Card style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>—</Text>
            <Text style={s.sub}>Sales today</Text>
          </Card>
        </View>

        {nextVisit && (
          <Card style={{ padding: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.sub, textTransform: 'uppercase' }}>Next visit</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 4 }}>{nextVisit.title}</Text>
            {nextVisit.company ? <Text style={s.sub}>{nextVisit.company}</Text> : null}
            <Text style={s.sub}>{new Date(nextVisit.scheduledAt).toLocaleString()}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => {}}
                style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, flex: 1, alignItems: 'center' }}
                accessibilityLabel="Navigate to visit"
                activeOpacity={0.8}
              >
                <Ionicons name="navigate-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', marginTop: 4, fontSize: 13 }}>Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/visit/${nextVisit.id}`)}
                style={{ backgroundColor: colors.blue, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, flex: 1, alignItems: 'center' }}
                accessibilityLabel="Check in"
                activeOpacity={0.8}
              >
                <Ionicons name="location-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', marginTop: 4, fontSize: 13 }}>Check in</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        <SectionHeader title="Today's visits" subtitle={`${completedToday} of ${plannedToday} completed`} />

        {loading ? (
          <SkeletonList count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : todayVisits.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="calendar-outline" size={48} color={colors.sub} />}
            title="No visits scheduled for today."
            action="Plan a visit"
            onAction={() => router.push('/visit/new')}
          />
        ) : (
          <FlatList
            data={todayVisits.slice(0, 8)}
            keyExtractor={(item) => item.id}
            renderItem={renderVisit}
            scrollEnabled={false}
            refreshControl={<RefreshControl refreshing={syncing} onRefresh={load} tintColor={colors.primary} />}
          />
        )}

        {lastSync && (
          <Text style={[s.sub, { textAlign: 'center', marginTop: 8, fontSize: 11 }]}>
            Last synced: {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </ScrollView>
  )
}
