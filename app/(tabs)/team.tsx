import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, View, Text } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { MeProfile, DutySessionInfo, getMe, getDutySessions } from '../../lib/api'
import { Card, s, colors, SectionHeader, EmptyState, ErrorState, SkeletonList, Avatar, StatusChip } from '../../lib/ui'

const isToday = (d: Date) => {
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

export default function Team() {
  const [me, setMe] = useState<MeProfile | null>(null)
  const [sessions, setSessions] = useState<DutySessionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = (me?.roles ?? []).some((r) => r === 'SUPER_ADMIN' || r === 'ADMIN') ||
    (me?.permissions ?? []).includes('field_visits.view_all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [meRes, sessionsRes] = await Promise.allSettled([getMe(), getDutySessions()])
      if (meRes.status === 'fulfilled') setMe(meRes.value)
      if (sessionsRes.status === 'fulfilled') {
        setSessions(sessionsRes.value)
      } else {
        setError(sessionsRes.reason instanceof Error ? sessionsRes.reason.message : 'Failed to load')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load().catch(() => {}) }, [load]))

  const todaySessions = sessions.filter((s) => {
    const start = new Date(s.startedAt)
    return isToday(start)
  })

  const formatTime = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (mins: number | null) => {
    if (mins === null) return '—'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  }

  if (!me && loading) {
    return (
      <View style={s.screen}>
        <View style={{ padding: 16 }}><SkeletonList count={5} /></View>
      </View>
    )
  }

  if (!isAdmin) {
    return (
      <View style={[s.screen, { padding: 16 }]}>
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>🔒</Text>}
          title="Team attendance is for admins only."
        />
      </View>
    )
  }

  const renderSession = ({ item }: { item: DutySessionInfo }) => (
    <Card style={{ padding: 12, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Avatar name={item.userName} size={32} />
          <View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{item.userName}</Text>
            <Text style={s.sub}>{item.userEmail}</Text>
          </View>
        </View>
        <StatusChip status={item.isActive ? 'ON_DUTY' : 'OFF_DUTY'} label={item.isActive ? 'On duty' : 'Off duty'} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <View>
          <Text style={s.sub}>Started</Text>
          <Text style={{ fontSize: 13, color: colors.text }}>{formatTime(item.startedAt)}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.sub}>Duration</Text>
          <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>{formatDuration(item.durationMinutes)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.sub}>Ended</Text>
          <Text style={{ fontSize: 13, color: colors.text }}>{formatTime(item.endedAt)}</Text>
        </View>
      </View>
    </Card>
  )

  return (
    <View style={s.screen}>
      <View style={{ padding: 16, gap: 12 }}>
        <SectionHeader title="Team attendance" subtitle={`${todaySessions.length} active today`} />

        {loading && sessions.length === 0 ? (
          <SkeletonList count={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : todaySessions.length === 0 ? (
          <EmptyState
            icon={<Text style={{ fontSize: 48 }}>😴</Text>}
            title="No employees on duty today."
          />
        ) : (
          <FlatList
            data={todaySessions}
            keyExtractor={(item) => item.id}
            renderItem={renderSession}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
          />
        )}

        {!loading && (
          <Text style={[s.sub, { textAlign: 'center', marginTop: 8, fontSize: 11 }]}>
            Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  )
}
