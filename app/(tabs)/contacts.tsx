import { useCallback, useEffect, useState } from 'react'
import { Alert, Image, ScrollView, Text, View, ActivityIndicator } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { ApiError, saveContact, scanCard, ScannedCard } from '../../lib/api'
import { compress, pickFromGallery, takePhoto } from '../../lib/media'
import { Button, Card, Field, colors, s } from '../../lib/ui'

const clean = (v?: string) => (!v || v === '-' ? '' : v)

const FIELDS: [keyof ScannedCard, string, object?][] = [
  ['name', 'Name *'], ['designation', 'Designation'], ['company', 'Company'],
  ['mobile', 'Mobile', { keyboardType: 'phone-pad' }], ['phone', 'Phone', { keyboardType: 'phone-pad' }],
  ['email', 'Email', { keyboardType: 'email-address', autoCapitalize: 'none' }],
  ['website', 'Website', { keyboardType: 'url', autoCapitalize: 'none' }],
  ['address', 'Address'],
]

export default function Contacts() {
  const router = useRouter()
  const [uri, setUri] = useState<string | null>(null)
  const [card, setCard] = useState<ScannedCard | null>(null)
  const [busy, setBusy] = useState<'scan' | 'save' | null>(null)
  const [errs, setErrs] = useState<Record<string, string>>({})

  async function capture(fromGallery: boolean) {
    try {
      const raw = fromGallery ? await pickFromGallery() : await takePhoto()
      if (!raw) return
      setBusy('scan'); setCard(null); setErrs({})
      const small = await compress(raw, 1600)
      setUri(small)
      const r = await scanCard(small)
      // Fill missing fields with '-' as per requirements
      setCard({
        name: clean(r.name) || '-',
        company: clean(r.company) || '-',
        designation: clean(r.designation) || '-',
        phone: clean(r.phone) || '-',
        mobile: clean(r.mobile) || '-',
        email: clean(r.email) || '-',
        website: clean(r.website) || '-',
        address: clean(r.address) || '-',
      })
    } catch (e) {
      Alert.alert('Scan failed', e instanceof Error ? e.message : 'Try again with better light.')
    } finally { setBusy(null) }
  }

  async function save() {
    if (!card) return
    setBusy('save'); setErrs({})
    const v = (s?: string) => (!s || s.trim() === '-' ? '' : s.trim())
    if (v(card.name).length < 2) {
      setErrs({ name: 'Name is required' })
      setBusy(null)
      return
    }
    try {
      await saveContact(card)
      Alert.alert('Saved', `${card.name !== '-' ? card.name : 'Contact'} was added to Contacts.`)
      setCard(null); setUri(null)
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) setErrs(e.fieldErrors)
      else Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again')
    } finally { setBusy(null) }
  }

  function discard() {
    setCard(null)
    setUri(null)
    setErrs({})
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      {!card && (
        <>
          <Text style={[s.sub, { marginBottom: 16 }]}>Photograph a business card flat, in good light. The details are read for you and you can correct them before saving.</Text>
          <Button title="Scan with camera" onPress={() => capture(false)} loading={busy === 'scan'} />
          <Button title="Choose from gallery" variant="ghost" onPress={() => capture(true)} disabled={busy === 'scan'} />
          {busy === 'scan' ? <Text style={[s.sub, { textAlign: 'center', marginTop: 8 }]}>Reading card…</Text> : null}
        </>
      )}

      {uri ? <Image source={{ uri }} style={{ height: 150, borderRadius: 10 }} resizeMode="contain" /> : null}

      {card && (
        <View>
          <Text style={[s.h1, { marginBottom: 12 }]}>Scanned Contact</Text>
          {FIELDS.map(([k, label, extra]) => (
            <Field key={k} label={label} value={card[k]} onChangeText={(v) => setCard({ ...card, [k]: v })} error={errs[k]} {...extra} />
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <Button title="Save contact" onPress={save} loading={busy === 'save'} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Discard" variant="ghost" onPress={discard} />
            </View>
          </View>
          <Text style={{ color: colors.sub, fontSize: 12, marginTop: 8 }}>Saved contacts appear in the dashboard under Contacts.</Text>
        </View>
      )}
    </ScrollView>
  )
}