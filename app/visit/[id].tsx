import { useCallback, useEffect, useState } from 'react'
import { Alert, Image, Platform, ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import {
  ApiError,
  checkIn,
  createFollowUp,
  deleteVisit,
  getCompanies,
  getProducts,
  getVisit,
  setVisitStatus,
  submitReport,
  Visit,
  VisitStatus,
  Company,
  Product,
} from '../../lib/api'
import { getFix } from '../../lib/location'
import { compress, takePhoto, uploadToCloudinary } from '../../lib/media'
import { Button, Card, Field, s, colors, StatusChip, SectionHeader, ErrorState } from '../../lib/ui'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

export default function VisitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
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
  const [error, setError] = useState<string | null>(null)

  const [companies, setCompanies] = useState<Company[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [followUpTitle, setFollowUpTitle] = useState('')
  const [followUpDueDate, setFollowUpDueDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [followUpPriority, setFollowUpPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [showFollowUp, setShowFollowUp] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    const [v, prods] = await Promise.all([getVisit(id), getProducts(true)])
    setVisit(v)
    setProducts(prods)
    setRep((r) => (r.purpose ? r : { ...r, purpose: v.purpose }))
    setFollowUpTitle(v.visitReport?.nextSteps ? `Follow up: ${v.visitReport.nextSteps}` : '')
    setSelectedCompanyId(v.companyId)
  }, [id])

  useFocusEffect(useCallback(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load visit'))
  }, [load]))

  useEffect(() => {
    getCompanies().then(setCompanies).catch(() => {})
  }, [])

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try { await fn(); await load() }
    catch (e) { Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong') }
    finally { setBusy(null) }
  }

  const changeStatus = (st: VisitStatus) => run(st, async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await setVisitStatus(id, st)
  })

  const doDelete = () => {
    Alert.alert('Delete visit', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => run('delete', async () => {
          await deleteVisit(id)
          Alert.alert('Deleted', 'Visit removed.')
          router.back()
        }),
      },
    ])
  }

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
      const result = await submitReport(id, {
        ...rep,
        requirements: rep.requirements || undefined,
        competitorInfo: rep.competitorInfo || undefined,
        customerFeedback: rep.customerFeedback || undefined,
      })
      setShowReport(false)
      Alert.alert(
        'Saved',
        result.dailyReportId
          ? 'Visit report submitted and added to today\'s daily report.'
          : 'Visit report submitted.',
      )
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) { setErrs(e.fieldErrors); return }
      throw e
    }
  })

  const doSaveFollowUp = () => run('followup', async () => {
    if (!followUpTitle.trim()) throw new Error('Title is required')
    if (!followUpDueDate) throw new Error('Due date is required')
    await createFollowUp({
      title: followUpTitle,
      dueDate: followUpDueDate.toISOString(),
      priority: followUpPriority,
      companyId: selectedCompanyId ?? undefined,
    })
    setShowFollowUp(false)
    setFollowUpTitle('')
    setFollowUpDueDate(null)
    setFollowUpPriority('MEDIUM')
    Alert.alert('Saved', 'Follow-up created.')
  })

  const doRevisit = () => {
    if (!visit) return
    router.push({ pathname: '/visit/new', params: { revisit: 'true', title: `Revisit: ${visit.title}`, company: visit.company ?? '' } })
  }

  const timelineEvents = [
    { label: 'Scheduled', date: visit?.scheduledAt, status: 'SCHEDULED' as const },
    { label: visit?.lastCheckInAt ? 'Checked in' : 'Not checked in', date: visit?.lastCheckInAt ?? undefined, status: visit?.lastCheckInAt ? 'CHECKED_IN' as const : undefined },
    { label: 'Completed', date: visit?.status === 'COMPLETED' ? (visit?.lastCheckInAt ?? visit?.scheduledAt) : undefined, status: visit?.status === 'COMPLETED' ? 'COMPLETED' as const : undefined },
  ].filter(Boolean)

  if (!visit && error) {
    return (
      <View style={[s.screen, s.pad]}>
        <ErrorState message={error} onRetry={() => load()} />
      </View>
    )
  }
  if (!visit) return <View style={s.screen}><View style={{ padding: 20 }}><Text style={s.sub}>Loading…</Text></View></View>

  const done = visit.status === 'COMPLETED' || visit.status === 'CANCELLED'

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Card style={{ padding: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 }}>{visit.title}</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/visit/new', params: { editId: visit.id } })}
              accessibilityLabel="Edit visit"
              style={{ padding: 4 }}
              hitSlop={16}
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
            <StatusChip status={visit.status} />
          </View>
        </View>
        {visit.purpose ? <Text style={{ color: colors.text, fontSize: 15, marginBottom: 8 }}>{visit.purpose}</Text> : null}
        {visit.purposeMeta && (visit.purposeMeta.productIds?.length || visit.purposeMeta.purposeOther) && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: '600', color: colors.text, marginBottom: 4 }}>Products discussed</Text>
            <Text style={{ color: colors.text, fontSize: 15 }}>
              {[
                ...(visit.purposeMeta.productIds?.map((pid) => products.find((p) => p.id === pid)?.label).filter(Boolean) ?? []),
                visit.purposeMeta.purposeOther ? `Other: ${visit.purposeMeta.purposeOther}` : null,
              ].filter(Boolean).join(', ') || '—'}
            </Text>
          </View>
        )}
        {[visit.company, visit.contact].filter(Boolean).length > 0 && (
          <Text style={[s.sub, { marginBottom: 4 }]}>{[visit.company, visit.contact].filter(Boolean).join(' · ')}</Text>
        )}
        {visit.address ? <Text style={s.sub}>{visit.address}</Text> : null}
        <Text style={s.sub}>{new Date(visit.scheduledAt).toLocaleString()}</Text>
        {visit.lastCheckInAt && (
          <Text style={[s.sub, { marginTop: 4 }]}>Last check-in: {new Date(visit.lastCheckInAt).toLocaleString()}</Text>
        )}
      </Card>

      <SectionHeader title="Timeline" />
      <Card style={{ padding: 12, marginBottom: 12 }}>
        {timelineEvents.map((ev, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: i < timelineEvents.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ev.status ? colors.primary : colors.sub }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{ev.label}</Text>
              {ev.date && <Text style={s.sub}>{new Date(ev.date).toLocaleString()}</Text>}
            </View>
            {ev.status && <StatusChip status={ev.status} />}
          </View>
        ))}
      </Card>

      {!done && (
        <>
          <SectionHeader title="Actions" />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <Button title="On the way" variant="secondary" onPress={() => changeStatus('ON_THE_WAY')} loading={busy === 'ON_THE_WAY'} style={{ flex: 1 }} />
            <Button title="In meeting" variant="secondary" onPress={() => changeStatus('IN_MEETING')} loading={busy === 'IN_MEETING'} style={{ flex: 1 }} />
          </View>

          <Card style={{ padding: 16, marginBottom: 12 }}>
            <Text style={{ fontWeight: '600', marginBottom: 8, color: colors.text }}>Check in on site</Text>
            {photo ? <Image source={{ uri: photo }} style={{ height: 160, borderRadius: 16, marginBottom: 8 }} /> : null}
            <Field label="Notes (optional)" value={notes} onChangeText={setNotes} />
            <Button title={photo ? 'Retry check-in' : 'Take photo & check in'} onPress={doCheckIn} loading={busy === 'checkin'} />
          </Card>

          <Button title="Mark completed" onPress={() => changeStatus('COMPLETED')} loading={busy === 'COMPLETED'} />
        </>
      )}

      <SectionHeader title="Visit report" icon={<Ionicons name="document-text-outline" size={20} color={colors.primary} />} />
      <Button title={showReport ? 'Hide report' : 'Write visit report'} variant="secondary" onPress={() => setShowReport((v) => !v)} />
      {showReport && (
        <Card style={{ padding: 16, marginBottom: 12 }}>
          <Field label="Purpose *" value={rep.purpose} onChangeText={(v) => setRep({ ...rep, purpose: v })} error={errs.purpose} />
          <Field label="What was discussed * (min 10 chars)" multiline value={rep.discussion} onChangeText={(v) => setRep({ ...rep, discussion: v })} error={errs.discussion} />
          <Field label="Requirements" multiline value={rep.requirements} onChangeText={(v) => setRep({ ...rep, requirements: v })} />
          <Field label="Competitor info" multiline value={rep.competitorInfo} onChangeText={(v) => setRep({ ...rep, competitorInfo: v })} />
          <Field label="Customer feedback" multiline value={rep.customerFeedback} onChangeText={(v) => setRep({ ...rep, customerFeedback: v })} />
          <Field label="Next steps *" multiline value={rep.nextSteps} onChangeText={(v) => setRep({ ...rep, nextSteps: v })} error={errs.nextSteps} />
          <Button title="Submit report" onPress={doReport} loading={busy === 'report'} />
        </Card>
      )}

      {done && visit.followUps.length > 0 && (
        <Card style={{ padding: 16, marginBottom: 12 }}>
          <SectionHeader title="Follow-ups from this visit" />
          {visit.followUps.map((fu) => (
            <View key={fu.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontWeight: '500', color: colors.text }}>{fu.title}</Text>
              <Text style={s.sub}>Due: {new Date(fu.dueDate).toLocaleDateString()} · <StatusChip status={fu.status} />&nbsp;</Text>
            </View>
          ))}
        </Card>
      )}

      {done && visit.visitReport && (
        <Card style={{ padding: 16, marginBottom: 12 }}>
          <SectionHeader title="Report filed" />
          <Text style={s.sub}>Submitted on {new Date(visit.visitReport.createdAt).toLocaleDateString()}</Text>
          {visit.visitReport.nextSteps && <Text style={{ color: colors.text, marginTop: 4 }}>Next steps: {visit.visitReport.nextSteps}</Text>}
        </Card>
      )}

      {done && (
        <>
          <Button title={showFollowUp ? 'Hide follow-up form' : 'Add follow-up'} variant="secondary" onPress={() => setShowFollowUp((v) => !v)} />
          {showFollowUp && (
            <Card style={{ padding: 16, marginBottom: 12 }}>
              <Field label="Title *" value={followUpTitle} onChangeText={setFollowUpTitle} />
              <Text style={s.label}>Company</Text>
              <Button
                title={selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId)?.name ?? 'Select company' : 'Select company'}
                variant="ghost"
                onPress={() => {
                  if (companies.length === 0) {
                    Alert.alert('No companies', 'No companies found in your organization.')
                    return
                  }
                  Alert.alert('Select company', 'Choose a company', [
                    { text: 'None', onPress: () => setSelectedCompanyId(null) },
                    ...companies.map((c) => ({ text: c.name, onPress: () => setSelectedCompanyId(c.id) })),
                  ])
                }}
              />
              <Text style={s.label}>Due date *</Text>
              {showDatePicker && (
                <DateTimePicker
                  value={followUpDueDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, selected) => {
                    setShowDatePicker(false)
                    if (selected) setFollowUpDueDate(selected)
                  }}
                />
              )}
              <Button
                title={followUpDueDate ? followUpDueDate.toLocaleDateString() : 'Pick due date'}
                variant="ghost"
                onPress={() => setShowDatePicker(true)}
              />
              <Text style={s.label}>Priority</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
                  <Button key={p} title={p} variant={followUpPriority === p ? 'primary' : 'ghost'} onPress={() => setFollowUpPriority(p)} style={{ flex: 1 }} />
                ))}
              </View>
              <Button title="Save follow-up" onPress={doSaveFollowUp} loading={busy === 'followup'} />
            </Card>
          )}

          <Button title="Schedule revisit" variant="secondary" onPress={doRevisit} />
        </>
      )}

      <Button title="Delete visit" variant="ghost" onPress={doDelete} loading={busy === 'delete'} />
    </ScrollView>
  )
}
