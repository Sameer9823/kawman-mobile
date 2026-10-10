import { useEffect, useState } from 'react'
import { Alert, Switch, Text, View } from 'react-native'
import { request, signOut } from '../../lib/api'
import { markSignedOut } from '../../lib/auth-store'
import { isOnDuty, onDutyChange, startDuty, stopDuty } from '../../lib/duty'
import { Button, Card, Field, colors, s } from '../../lib/ui'
import type { MeProfile } from '../../lib/api'

export default function Profile() {
  const [me, setMe] = useState<MeProfile | null>(null)
  const [onDuty, setOnDuty] = useState(isOnDuty())
  const [mocked, setMocked] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [designation, setDesignation] = useState('')

  useEffect(() => {
    request<MeProfile>('/api/mobile/me')
      .then((data) => {
        setMe(data)
        setName(data.name ?? '')
        setPhone(data.phone ?? '')
        setDesignation(data.designation ?? '')
      })
      .catch(() => {})
    onDutyChange((st) => { setOnDuty(st.onDuty); setMocked(st.mockedWarning) })
    return () => onDutyChange(null)
  }, [])

  async function toggle(v: boolean) {
    try {
      if (v) await startDuty()
      else await stopDuty()
    } catch (e) { Alert.alert('Location', e instanceof Error ? e.message : 'Failed') }
  }

  const doSave = async () => {
    if (!me) return
    try {
      await updateMe({ name: name || undefined, phone: phone || undefined, designation: designation || undefined })
      const updated = await request<MeProfile>('/api/mobile/me')
      setMe(updated)
      setEditing(false)
      Alert.alert('Saved', 'Profile updated.')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update')
    }
  }

  if (!me) {
    return (
      <View style={[s.screen, s.pad]}>
        <Text style={[s.sub, { padding: 20 }]}>Loading…</Text>
      </View>
    )
  }

  return (
    <View style={[s.screen, s.pad]}>
      <Card>
        <Text style={s.h1}>Profile</Text>
        {editing ? (
          <>
            <Field label="Name" value={name} onChangeText={setName} />
            <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label="Designation" value={designation} onChangeText={setDesignation} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button title="Save" onPress={doSave} />
              <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 4 }}>{me.name ?? 'Unnamed'}</Text>
            <Text style={s.sub}>{me.email}</Text>
            {me.phone ? <Text style={s.sub}>Phone: {me.phone}</Text> : null}
            {me.designation ? <Text style={s.sub}>Designation: {me.designation}</Text> : null}
            <Text style={s.sub}>Roles: {me.roles.join(', ')}</Text>
            <Button title="Edit" variant="ghost" onPress={() => setEditing(true)} />
          </>
        )}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontWeight: '600' }}>On duty (share live location)</Text>
            <Text style={s.sub}>Shows you on the dashboard Live Map while this app is open.</Text>
          </View>
          <Switch value={onDuty} onValueChange={toggle} trackColor={{ true: colors.primary }} />
        </View>
        {mocked ? <Text style={{ color: colors.danger, marginTop: 8 }}>Mock location detected — positions are not being sent.</Text> : null}
      </Card>

      <Button title="Sign out" variant="danger" onPress={async () => { await stopDuty(); await signOut(); markSignedOut() }} />
    </View>
  )
}

async function updateMe(body: { name?: string; phone?: string; designation?: string }) {
  return request('/api/mobile/me', { method: 'PATCH', body: JSON.stringify(body) })
}
