import { useCallback, useState } from 'react'
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { FollowUp, FollowUpStatus, getFollowUps, updateFollowUpStatus } from '../../lib/api'
import { Card, colors, s } from '../../lib/ui'

const STATUSES: FollowUpStatus[] = ['PENDING', 'COMPLETED', 'OVERDUE', 'CANCELLED']
const STATUS_LABELS: Record<FollowUpStatus, string> = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: colors.primary,
  COMPLETED: '#16a34a',
  OVERDUE: colors.danger,
  CANCELLED: '#9ca3af',
}

export default function FollowUps() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      setFollowUps(await getFollowUps())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const changeStatus = (fu: FollowUp) => {
    Alert.alert('Change status', `Set "${fu.title}" to:`, [
      { text: 'Cancel', style: 'cancel' },
      ...STATUSES.map((st) => ({
        text: STATUS_LABELS[st],
        onPress: () => updateStatus(fu.id, st),
      })),
    ] as never)
  }

  const updateStatus = async (id: string, status: FollowUpStatus) => {
    try {
      await updateFollowUpStatus(id, status)
      await load()
      Alert.alert('Updated', 'Follow-up status changed.')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update')
    }
  }

  const isOverdue = (fu: FollowUp): boolean =>
    fu.status === 'PENDING' && new Date(fu.dueDate) < new Date()

  return (
    <View style={s.screen}>
      <View style={{ padding: 12 }}>
        <Text style={s.h1}>My Follow-ups</Text>
      </View>
      {error ? (
        <Text style={{ color: colors.danger, paddingHorizontal: 16 }}>{error}</Text>
      ) : null}
      <FlatList
        data={followUps}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={[s.sub, { textAlign: 'center', marginTop: 40 }]}>No follow-ups yet.</Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => changeStatus(item)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontWeight: '600', fontSize: 16, color: colors.text }}>{item.title}</Text>
                  {[item.company, item.contact, item.deal, item.lead].filter(Boolean).length > 0 && (
                    <Text style={s.sub}>{[item.company, item.contact, item.deal, item.lead].filter(Boolean).join(' · ')}</Text>
                  )}
                  {item.description ? <Text style={s.sub} numberOfLines={2}>{item.description}</Text> : null}
                  <Text style={s.sub}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: STATUS_COLOR[item.status], fontWeight: '700', fontSize: 12, textTransform: 'uppercase' }}>
                    {STATUS_LABELS[item.status as FollowUpStatus]}{isOverdue(item) ? ' (overdue)' : ''}
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </View>
  )
}
