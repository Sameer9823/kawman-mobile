import { useCallback, useState } from 'react'
import { Alert, Image, ScrollView, Text, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { ApiError, checkIn, getVisits, setVisitStatus, submitReport, Visit, VisitStatus } from '../../lib/api'
import { getFix } from '../../lib/location'
import { compress, takePhoto, uploadToCloudinary } from '../../lib/media'
import { Button, Card, Field, colors, s } from '../../lib/ui'

export default function VisitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [rep, setRep] = useState({
    purpose: '', discussion: '', nextSteps: '', requirements: '',
    competitorInfo: '', customerFeedback: '',
  })
  const [errs, setErrs] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const all = await getVisits('all')
    const v = all.find((x) => x.id === id) ?? null
    setVisit(v)
    if (v) setRep((r) => (r.purpose ? r : { ...r, purpose: v.purpose }))
  }, [id])
  useFocusEffect(useCallback(() => { load().catch(() => {}) }, [load]))

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try { await fn(); await load() }
    catch (e) { Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong') }
    finally { setBusy(null) }
  }

  const changeStatus = (st: VisitStatus) => run(st, async () => { await setVisitStatus(id, st) })

  const doCheckIn = () => run('checkin', async () => {
    const shot = photo ?? (await takePhoto())
    if (!shot) return
    setPhoto(shot)
    const fix = await getFix()
    if (fix.mocked) throw new Error('Mock location detected. Turn off any fake-GPS app and try again.')
    const url = await uploadToCloudinary(await compress(shot))
    await checkIn(id, { latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy, mocked: fix.mocked, notes: notes || undefined, photoUrl: url })
    setPhoto(null); setNotes('')
    Alert.alert('Checked in', 'Your location and photo were recorded.')
  })

  const doReport = () => run('report', async () => {
    setErrs({})
    try {
      await submitReport(id, {
        ...rep,
        requirements: rep.requirements || undefined,
        competitorInfo: rep.competitorInfo || undefined,
        customerFeedback: rep.customerFeedback || undefined,
      })
      setShowReport(false)
      Alert.alert('Saved', 'Visit report submitted.')
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) { setErrs(e.fieldErrors); return }
      throw e
    }
  })

  if (!visit) return <View style={s.screen}><Text style={[s.sub, { padding: 20 }]}>Loading…</Text></View>
  const done = visit.status === 'COMPLETED' || visit.status === 'CANCELLED'

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={s.h1}>{visit.title}</Text>
        <Text style={s.sub}>{visit.purpose}</Text>
        <Text style={{ marginTop: 8, color: colors.text }}>{[visit.company, visit.contact].filter(Boolean).join(' · ')}</Text>
        {visit.address ? <Text style={s.sub}>{visit.address}</Text> : null}
        <Text style={s.sub}>{new Date(visit.scheduledAt).toLocaleString()}</Text>
        <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 6 }}>{visit.status.replace(/_/g, ' ')}</Text>
        {visit.lastCheckInAt ? <Text style={s.sub}>Last check-in: {new Date(visit.lastCheckInAt).toLocaleString()}</Text> : null}
      </Card>

      {!done && (
        <>
          <Button title="On the way" variant="ghost" onPress={() => changeStatus('ON_THE_WAY')} loading={busy === 'ON_THE_WAY'} />
          <Card>
            <Text style={{ fontWeight: '600', marginBottom: 8 }}>Check in on site</Text>
            {photo ? <Image source={{ uri: photo }} style={{ height: 160, borderRadius: 8, marginBottom: 8 }} /> : null}
            <Field label="Notes (optional)" value={notes} onChangeText={setNotes} />
            <Button title={photo ? 'Retry check-in' : 'Take photo & check in'} onPress={doCheckIn} loading={busy === 'checkin'} />
          </Card>
          <Button title="In meeting" variant="ghost" onPress={() => changeStatus('IN_MEETING')} loading={busy === 'IN_MEETING'} />
          <Button title="Mark completed" onPress={() => changeStatus('COMPLETED')} loading={busy === 'COMPLETED'} />
        </>
      )}

      <Button title={showReport ? 'Hide report' : 'Write visit report'} variant="ghost" onPress={() => setShowReport((v) => !v)} />
      {showReport && (
        <Card>
          <Field label="Purpose *" value={rep.purpose} onChangeText={(v) => setRep({ ...rep, purpose: v })} error={errs.purpose} />
          <Field label="What was discussed * (min 10 chars)" multiline value={rep.discussion} onChangeText={(v) => setRep({ ...rep, discussion: v })} error={errs.discussion} />
          <Field label="Requirements" multiline value={rep.requirements} onChangeText={(v) => setRep({ ...rep, requirements: v })} />
          <Field label="Competitor info" multiline value={rep.competitorInfo} onChangeText={(v) => setRep({ ...rep, competitorInfo: v })} />
          <Field label="Customer feedback" multiline value={rep.customerFeedback} onChangeText={(v) => setRep({ ...rep, customerFeedback: v })} />
          <Field label="Next steps *" multiline value={rep.nextSteps} onChangeText={(v) => setRep({ ...rep, nextSteps: v })} error={errs.nextSteps} />
          <Button title="Submit report" onPress={doReport} loading={busy === 'report'} />
        </Card>
      )}
    </ScrollView>
  )
}