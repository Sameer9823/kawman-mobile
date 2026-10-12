import { useCallback, useState } from 'react'
import { RefreshControl, View, Text, TouchableOpacity, SectionList } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { FollowUp, getFollowUps, updateFollowUpStatus } from '../../lib/api'
import { s, colors, StatusChip, EmptyState, ErrorState, SkeletonList, Badge, Card } from '../../lib/ui'
import { Ionicons } from '@expo/vector-icons'

type FollowUpSection = {
  title: string
  data: FollowUp[]
  color: string
}

export default function FollowUpsTab() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFollowUps()
      setFollowUps(data.filter((f) => f.status !== 'COMPLETED'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load follow-ups')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load().catch(() => {}) }, [load]))

  const now = new Date()
  const groups: FollowUpSection[] = [
    {
      title: 'Overdue',
      data: followUps.filter((f) => f.status === 'OVERDUE' || (new Date(f.dueDate) < now && f.status === 'PENDING')),
      color: colors.danger,
    },
    {
      title: 'Today',
      data: followUps.filter((f) => new Date(f.dueDate).toDateString() === now.toDateString() && (f.status === 'PENDING' || f.status === 'OVERDUE')),
      color: colors.primary,
    },
    {
      title: 'Upcoming',
      data: followUps.filter(
        (f) => new Date(f.dueDate) > now && (f.status === 'PENDING' || f.status === 'OVERDUE'),
      ),
      color: colors.sub,
    },
  ].filter((g) => g.title !== 'Today' || g.data.length > 0)

  const handleComplete = (id: string) => {
    updateFollowUpStatus(id, 'COMPLETED').then(() => load()).catch(() => {})
  }

  const renderItem = ({ item }: { item: FollowUp }) => (
    <Card style={{ padding: 14, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 }}>{item.title}</Text>
        <StatusChip status={item.status} />
      </View>
      {item.description ? <Text style={s.sub}>{item.description}</Text> : null}
      <Text style={[s.sub, { marginTop: 4 }]}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
      {item.company && <Text style={s.sub}>{item.company}</Text>}
      {item.contact && <Text style={s.sub}>{item.contact}</Text>}
      {item.deal && <Text style={s.sub}>Deal: {item.deal}</Text>}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <TouchableOpacity onPress={() => handleComplete(item.id)} style={{ flex: 1 }} accessibilityLabel={`Complete: ${item.title}`}>
          <View style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 2 }}>Done</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {}}
          style={{ flex: 1 }}
          accessibilityLabel={`Postpone: ${item.title}`}
        >
          <View style={{ backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
            <Ionicons name="time-outline" size={20} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginTop: 2 }}>Snooze</Text>
          </View>
        </TouchableOpacity>
        {item.contact && (
          <TouchableOpacity onPress={() => {}} style={{ flex: 1 }} accessibilityLabel="Call contact">
            <View style={{ backgroundColor: '#f0fdf4', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
              <Ionicons name="call-outline" size={20} color="#15803d" />
              <Text style={{ color: '#15803d', fontSize: 12, fontWeight: '600', marginTop: 2 }}>Call</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  )

  return (
    <View style={s.screen}>
      <View style={{ padding: 16, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={[s.h1, { fontSize: 24 }]}>Follow-ups</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Badge count={followUps.length} />
            <Text style={s.sub}>{followUps.length} open</Text>
          </View>
        </View>

        {loading ? (
          <SkeletonList count={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : followUps.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="checkmark-circle-outline" size={48} color={colors.sub} />}
            title="All caught up! No pending follow-ups."
          />
        ) : (
          <SectionList
            sections={groups}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderSectionHeader={({ section }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingVertical: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: section.color }} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{section.title}</Text>
                <Badge count={section.data.length} color={section.color} />
              </View>
            )}
            refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
            stickySectionHeadersEnabled={false}
          />
        )}
      </View>
    </View>
  )
}
