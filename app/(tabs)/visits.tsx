import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, View, Text, TouchableOpacity, TextInput } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Visit, getVisits } from '../../lib/api'
import { s, colors, StatusChip, EmptyState, ErrorState, SkeletonList, Badge, Card } from '../../lib/ui'
import { Ionicons } from '@expo/vector-icons'

const FILTERS = ['Today', 'Upcoming', 'Done'] as const
type Filter = (typeof FILTERS)[number]

export default function VisitsTab() {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('Today')
  const [search, setSearch] = useState('')
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const scope = filter === 'Today' ? 'today' : filter === 'Upcoming' ? 'upcoming' : 'all'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getVisits(scope)
      setVisits(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load visits')
    } finally {
      setLoading(false)
    }
  }, [scope])

  useFocusEffect(useCallback(() => { load().catch(() => {}) }, [load]))

  const filtered = search
    ? visits.filter((v) =>
        `${v.title} ${v.company ?? ''} ${v.contact ?? ''}`.toLowerCase().includes(search.toLowerCase()),
      )
    : visits

  const todayVisits = filter === 'Today' ? filtered : filtered.filter((v) => {
    if (filter === 'Upcoming') return ['SCHEDULED', 'ON_THE_WAY', 'IN_MEETING', 'CHECKED_IN'].includes(v.status)
    // Done
    return ['COMPLETED', 'CANCELLED'].includes(v.status)
  })

  const nextVisit = todayVisits.find((v) =>
    ['SCHEDULED', 'ON_THE_WAY'].includes(v.status),
  ) ?? todayVisits.find((v) => v.status !== 'COMPLETED')

  const completedCount = visits.filter((v) => v.status === 'COMPLETED').length
  const pendingCount = visits.filter((v) => v.status !== 'COMPLETED' && v.status !== 'CANCELLED').length

  const renderItem = ({ item }: { item: Visit }) => (
    <TouchableOpacity
      onPress={() => router.push(`/visit/${item.id}`)}
      accessibilityLabel={`Visit: ${item.title}`}
      activeOpacity={0.7}
    >
      <Card style={{ marginBottom: 12, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 }}>{item.title}</Text>
          <StatusChip status={item.status} />
        </View>
        {item.purpose ? <Text style={[s.sub, { marginBottom: 6 }]}>{item.purpose}</Text> : null}
        {item.company ? <Text style={s.sub}>{item.company} · {new Date(item.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text> : null}
        {item.contact ? <Text style={[s.sub, { marginTop: 2 }]}>{item.contact}</Text> : null}
        {nextVisit?.id === item.id && (
          <View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Next up</Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  )

  return (
    <View style={s.screen}>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[s.h1, { fontSize: 24 }]}>Visits</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Badge count={pendingCount} color={colors.primary} />
            <Text style={s.sub}>{pendingCount} pending · {completedCount} done</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.border }}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 }, filter === f && { backgroundColor: colors.primary }]}
              onPress={() => setFilter(f)}
              accessibilityLabel={`Filter: ${f}`}
            >
              <Text style={{ color: filter === f ? '#fff' : colors.sub, fontSize: 13, fontWeight: '600' }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, height: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="search-outline" size={18} color={colors.sub} style={{ position: 'absolute', left: 12, zIndex: 1 }} />
          <TextInput
            placeholder="Search visits..."
            placeholderTextColor={colors.sub}
            style={{ fontSize: 15, color: colors.text, paddingLeft: 32, height: 44 }}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}><SkeletonList count={5} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : todayVisits.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="calendar-outline" size={48} color={colors.sub} />}
          title={search ? 'No visits match your search.' : filter === 'Today' ? 'No visits scheduled for today.' : filter === 'Upcoming' ? 'No upcoming visits.' : 'No completed visits yet.'}
        />
      ) : (
        <FlatList
          data={todayVisits}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        />
      )}
    </View>
  )
}
