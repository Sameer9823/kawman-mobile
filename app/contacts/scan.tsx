import { useState } from 'react'
import { View, Text, Alert, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { takePhoto, compress, uploadToCloudinary } from '../../lib/media'
import { scanCard, saveContact, ScannedCard } from '../../lib/api'
import { Button, Card, Field, s, colors, SectionHeader, ErrorState } from '../../lib/ui'
import { Ionicons } from '@expo/vector-icons'

export default function ContactScan() {
  const router = useRouter()
  const [photo, setPhoto] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScannedCard | null>(null)
  const [error, setError] = useState<string | null>(null)

  const doScan = async () => {
    setScanning(true)
    setError(null)
    setPhoto(null)
    setResult(null)
    try {
      const shot = await takePhoto()
      if (!shot) return
      setPhoto(shot)
      const compressed = await compress(shot)
      const url = await uploadToCloudinary(compressed)
      const r = await scanCard(url)
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    try {
      await saveContact(result)
      Alert.alert('Saved', 'Contact added successfully.')
      router.back()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
    }
  }

  return (
    <View style={[s.screen, { padding: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={[s.h1, { fontSize: 20 }]}>Scan business card</Text>
      </View>

      {!photo && !result && (
        <Card style={{ alignItems: 'center', padding: 32, gap: 16, borderWidth: 2, borderStyle: 'dashed' }}>
          <Ionicons name="camera-outline" size={48} color={colors.sub} />
          <Text style={s.sub}>Take a photo of a business card to scan</Text>
          <Button title="Take photo" onPress={doScan} loading={scanning} />
        </Card>
      )}

      {photo && scanning && (
        <Card style={{ alignItems: 'center', padding: 32, gap: 16 }}>
          <Image source={{ uri: photo }} style={{ width: 200, height: 140, borderRadius: 8 }} />
          <Text style={s.sub}>Scanning card…</Text>
          <ErrorState message="If this takes too long, try again." onRetry={doScan} />
        </Card>
      )}

      {result && (
        <Card style={{ padding: 16, gap: 16 }}>
          <SectionHeader title="Review & edit" />
          <Field label="Name" value={result.name} onChangeText={(v) => setResult({ ...result, name: v })} />
          <Field label="Company" value={result.company} onChangeText={(v) => setResult({ ...result, company: v })} />
          <Field label="Designation" value={result.designation} onChangeText={(v) => setResult({ ...result, designation: v })} />
          <Field label="Email" value={result.email} onChangeText={(v) => setResult({ ...result, email: v })} />
          <Field label="Phone" value={result.phone} onChangeText={(v) => setResult({ ...result, phone: v })} />
          <Field label="Mobile" value={result.mobile} onChangeText={(v) => setResult({ ...result, mobile: v })} />
          <Field label="Address" value={result.address} onChangeText={(v) => setResult({ ...result, address: v })} multiline />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Button title="Save" onPress={handleSave} style={{ flex: 1 }} />
            <Button title="Retake" variant="secondary" onPress={() => { setPhoto(null); setResult(null) }} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {error && <ErrorState message={error} onRetry={doScan} />}
    </View>
  )
}
