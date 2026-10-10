import { useState } from 'react'
import { Alert, Platform, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ApiError, createVisit } from '../../lib/api'
import { getFix } from '../../lib/location'
import { Button, Field, s } from '../../lib/ui'

export default function NewVisit() {
  const router = useRouter()
  const params = useLocalSearchParams<{ title?: string; company?: string }>()
  const [f, setF] = useState({
    title: params.title ?? '',
    purpose: '',
    company: params.company ?? '',
    contactName: '',
    contactEmail: '',
    contactMobile: '',
    address: '',
  })
  const [when, setWhen] = useState(() => new Date(Date.now() + 3600_000).toISOString().slice(0, 16))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  async function save(useHere: boolean) {
    setBusy(true); setErrs({})
    try {
      const fix = useHere ? await getFix() : null
      const d = new Date(when)
      if (Number.isNaN(d.getTime())) { setErrs({ scheduledAt: 'Invalid date/time' }); return }
      await createVisit({
        ...f, scheduledAt: d.toISOString(),
        company: f.company || undefined, contactName: f.contactName || undefined,
        contactEmail: f.contactEmail || undefined, contactMobile: f.contactMobile || undefined,
        address: f.address || undefined,
        latitude: fix?.latitude, longitude: fix?.longitude,
      })
      router.back()
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) setErrs(e.fieldErrors)
      else Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again')
    } finally { setBusy(false) }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Field label="Title *" value={f.title} onChangeText={set('title')} error={errs.title} />
      <Field label="Purpose *" value={f.purpose} onChangeText={set('purpose')} error={errs.purpose} />
      <Field
        label="Date & time *"
        value={when}
        onChangeText={setWhen}
        error={errs.scheduledAt}
        editable={Platform.OS === 'web'}
        keyboardType={undefined}
      />
      <Field label="Company" value={f.company} onChangeText={set('company')} />
      <Field label="Contact name" value={f.contactName} onChangeText={set('contactName')} />
      <Field label="Contact email" value={f.contactEmail} onChangeText={set('contactEmail')} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Contact mobile" value={f.contactMobile} onChangeText={set('contactMobile')} keyboardType="phone-pad" />
      <Field label="Address" value={f.address} onChangeText={set('address')} multiline />
      <Button title="Save visit" onPress={() => save(false)} loading={busy} />
      <Button title="Save with my current location" variant="ghost" onPress={() => save(true)} disabled={busy} />
    </ScrollView>
  )
}