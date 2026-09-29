import { useCallback, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { getVisits, Visit } from '../../lib/api'
import { Button, Card, colors, s } from '../../lib/ui'

const SCOPES = ['today', 'upcoming', 'all'] as const

export default function Visits() {
  const router = useRouter()
  const [scope, setScope] = useState<(typeof SCOPES)[number]>('today')
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setVisits(await getVisits(scope)) } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [scope])

  useFocusEffect(useCallback(() => { load() }, [load]))

  return (
    <View style={s.screen}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        {SCOPES.map((k) => (
          <Pressable key={k} onPress={() => setScope(k)}
            style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: scope === k ? colors.primary : '#e5e7eb' }}>
            <Text style={{ color: scope === k ? '#fff' : colors.text, textTransform: 'capitalize', fontWeight: '600' }}>{k}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={{ color: colors.danger, paddingHorizontal: 16 }}>{error}</Text> : null}
      <FlatList
        data={visits}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading ? <Text style={[s.sub, { textAlign: 'center', marginTop: 40 }]}>No visits {scope === 'all' ? 'yet' : scope}.</Text> : undefined}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/visit/[id]', params: { id: item.id } })}>
            <Card>
              <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>{item.title}</Text>
              <Text style={s.sub}>{[item.company, item.contact].filter(Boolean).join(' · ') || item.purpose}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={s.sub}>{new Date(item.scheduledAt).toLocaleString()}</Text>
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>{item.status.replace(/_/g, ' ')}</Text>
              </View>
            </Card>
          </Pressable>
        )}
      />
      <View style={{ padding: 12 }}>
        <Button title="+ New visit" onPress={() => router.push('/visit/new')} />
      </View>
    </View>
  )
}
