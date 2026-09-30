import { useEffect, useState } from 'react'
import { Alert, Switch, Text, View } from 'react-native'
import { request, signOut } from '../../lib/api'
import { markSignedOut } from '../../lib/auth-store'
import { isOnDuty, onDutyChange, startDuty, stopDuty } from '../../lib/duty'
import { Button, Card, colors, s } from '../../lib/ui'

export default function Profile() {
  const [me, setMe] = useState<{ name: string | null; email: string; roles: string[] } | null>(null)
  const [onDuty, setOnDuty] = useState(isOnDuty())
  const [mocked, setMocked] = useState(false)

  useEffect(() => {
    request<typeof me>('/api/mobile/me').then(setMe).catch(() => {})
    onDutyChange((st) => { setOnDuty(st.onDuty); setMocked(st.mockedWarning) })
    return () => onDutyChange(null)
  }, [])

  async function toggle(v: boolean) {
    try {
      if (v) await startDuty()
      else await stopDuty()
    } catch (e) { Alert.alert('Location', e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <View style={[s.screen, s.pad]}>
      <Card>
        <Text style={s.h1}>{me?.name ?? '…'}</Text>
        <Text style={s.sub}>{me?.email}</Text>
        <Text style={s.sub}>{me?.roles?.join(', ')}</Text>
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
