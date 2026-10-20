import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, View, Text, TouchableOpacity, TextInput, Linking } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Contact, getContacts } from '../../lib/api'
import { Card, s, colors, Avatar, EmptyState, ErrorState, SkeletonList } from '../../lib/ui'
import { Ionicons } from '@expo/vector-icons'

export default function ContactsTab() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const c = await getContacts()
      setContacts(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load().catch(() => {}) }, [load]))

  const filtered = search
    ? contacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.company?.toLowerCase().includes(search.toLowerCase()) ?? false))
    : contacts

  const call = (phone: string | null) => {
    if (phone) Linking.openURL(`tel:${phone}`)
  }
  const sms = (phone: string | null) => {
    if (phone) Linking.openURL(`sms:${phone}`)
  }
  const email = (addr: string | null) => {
    if (addr) Linking.openURL(`mailto:${addr}`)
  }

  const renderItem = ({ item }: { item: Contact }) => (
    <Card style={{ padding: 12, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={item.name} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{item.name}</Text>
          {item.designation ? <Text style={s.sub}>{item.designation}</Text> : null}
          {item.company ? <Text style={s.sub}>{item.company}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {item.mobile ? <Ionicons name="call-outline" size={22} color={colors.primary} onPress={() => call(item.mobile)} /> : null}
          {item.mobile ? <Ionicons name="logo-whatsapp" size={22} color="#22c55e" onPress={() => sms(item.mobile)} /> : null}
          {item.email ? <Ionicons name="mail-outline" size={22} color={colors.blue} onPress={() => email(item.email)} /> : null}
        </View>
      </View>
    </Card>
  )

  return (
    <View style={s.screen}>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[s.h1, { fontSize: 24 }]}>Contacts</Text>
          <TouchableOpacity
            onPress={() => router.push('/contacts/scan')}
            accessibilityLabel="Scan business card"
            style={{ backgroundColor: colors.primary, borderRadius: 28, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="camera-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, height: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="search-outline" size={18} color={colors.sub} style={{ position: 'absolute', left: 12, zIndex: 1 }} />
          <TextInput
            placeholder="Search contacts..."
            placeholderTextColor={colors.sub}
            style={{ fontSize: 15, color: colors.text, paddingLeft: 32, height: 44 }}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}><SkeletonList count={6} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="people-outline" size={48} color={colors.sub} />}
          title="No contacts found."
          action="Scan a business card"
          onAction={() => router.push('/contacts/scan')}
        />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        />
      )}
    </View>
  )
}
