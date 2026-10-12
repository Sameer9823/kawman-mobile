import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, Alert, Linking, TouchableOpacity } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { MeProfile, getMe, signOut } from '../../lib/api'
import { Card, s, colors, Avatar, Button, SectionHeader, SkeletonList, ErrorState } from '../../lib/ui'
import { Ionicons } from '@expo/vector-icons'
import { isOnDuty, startDuty, stopDuty, onDutyChange } from '../../lib/duty'
import { markSignedOut } from '../../lib/auth-store'
import Constants from 'expo-constants'
import { storage } from '../../lib/storage'

const DUTY_START_KEY = 'duty-start'

export default function Profile() {
  const router = useRouter()
  const [me, setMe] = useState<MeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onDuty, setOnDuty] = useState(isOnDuty())
  const [dutyStart, setDutyStart] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(() => Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    onDutyChange((s) => {
      setOnDuty(s.onDuty)
      if (s.onDuty) {
        storage.get(DUTY_START_KEY).then(setDutyStart)
      } else {
        storage.remove(DUTY_START_KEY)
        setDutyStart(null)
      }
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const m = await getMe()
      setMe(m)
      const start = await storage.get(DUTY_START_KEY)
      setDutyStart(start)
      setOnDuty(isOnDuty())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load().catch(() => {}) }, [load]))

  const toggleDuty = async () => {
    try {
      if (onDuty) {
        await stopDuty()
      } else {
        await storage.set(DUTY_START_KEY, new Date().toISOString())
        await startDuty()
      }
    } catch (e) {
      Alert.alert('Location permission', e instanceof Error ? e.message : 'Could not update duty status')
    }
  }

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); markSignedOut(); router.replace('/login') } },
    ])
  }

  const fieldTime = useMemo(() => {
    if (!dutyStart) return '—'
    const ms = now - new Date(dutyStart).getTime()
    const mins = Math.floor(ms / 60000)
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }, [dutyStart, now])

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
      <>
      <Card style={{ padding: 16, alignItems: 'center', gap: 8 }}>
        <Avatar name={me?.name ?? 'U'} size={72} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{me?.name ?? 'Loading…'}</Text>
          <Text style={s.sub}>{me?.designation ?? ''}</Text>
          <Text style={s.sub}>{me?.email}</Text>
        </View>
      </Card>

      <SectionHeader title="Duty & attendance" />
      <Card style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={[s.sub, { marginBottom: 4 }]}>Status</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: onDuty ? colors.danger : colors.text }}>
              {onDuty ? 'On duty' : 'Off duty'}
            </Text>
          </View>
          <Button title={onDuty ? 'End day' : 'Start day'} onPress={toggleDuty} variant={onDuty ? 'danger' : 'primary'} style={{ width: 120 }} />
        </View>
        {onDuty && dutyStart && (
          <View>
            <Text style={s.sub}>Started</Text>
            <Text style={{ fontSize: 14, color: colors.text }}>{new Date(dutyStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            <Text style={[s.sub, { marginTop: 8 }]}>Field time</Text>
            <Text style={{ fontSize: 14, color: colors.text }}>{fieldTime}</Text>
          </View>
        )}
        {!onDuty && (
          <View>
            <Text style={s.sub}>Location is only tracked while on duty.</Text>
            <Text style={[s.sub, { marginTop: 4 }]}>Tap Start day to begin live tracking.</Text>
          </View>
        )}
      </Card>

      <SectionHeader title="Targets" />
      <Card style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.sub}>Visits planned</Text>
          <Text style={{ fontWeight: '600', color: colors.text }}>—</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.sub}>Visits completed</Text>
          <Text style={{ fontWeight: '600', color: colors.text }}>—</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.sub}>Follow-ups closed</Text>
          <Text style={{ fontWeight: '600', color: colors.text }}>—</Text>
        </View>
      </Card>

      <SectionHeader title="Support" />
      <Card style={{ padding: 8 }}>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:digital@kawmanexact.com')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }} accessibilityLabel="Contact support">
          <Ionicons name="mail-outline" size={24} color={colors.primary} />
          <Text style={{ fontSize: 15, color: colors.text }}>Contact support</Text>
        </TouchableOpacity>
      </Card>

      <Card style={{ padding: 16, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.sub}>App version</Text>
          <Text style={{ fontWeight: '600', color: colors.text }}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.sub}>Device</Text>
          <Text style={{ fontWeight: '600', color: colors.text }}>{Constants?.deviceName ?? '—'}</Text>
        </View>
      </Card>

      <Button title="Sign out" variant="danger" onPress={handleSignOut} />
      </>
    )}
    </ScrollView>
  )
}
