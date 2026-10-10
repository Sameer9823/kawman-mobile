import { useCallback, useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { getDailyReportDraft, submitDailyReport, DailyReportDraft } from '../../lib/api'
import { Button, Field, colors, s } from '../../lib/ui'

export default function Reports() {
  const [draft, setDraft] = useState<DailyReportDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workDescription, setWorkDescription] = useState('')
  const [completedWork, setCompletedWork] = useState('')
  const [pendingWork, setPendingWork] = useState('')
  const [blockers, setBlockers] = useState('')
  const [tomorrowPlan, setTomorrowPlan] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const d = await getDailyReportDraft()
      setDraft(d)
      if (d.existingReport) {
        setWorkDescription(d.existingReport.workDescription ?? '')
        setCompletedWork(d.existingReport.completedWork ?? '')
        setPendingWork(d.existingReport.pendingWork ?? '')
        setBlockers(d.existingReport.blockers ?? '')
        setTomorrowPlan(d.existingReport.tomorrowPlan ?? '')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleSubmit = async () => {
    if (!draft) return
    try {
      await submitDailyReport({
        workDescription,
        completedWork,
        pendingWork,
        blockers,
        tomorrowPlan,
        tasksCompletedCount: draft.tasksCompletedCount,
        crmRecordsUpdatedCount: draft.crmRecordsUpdatedCount,
        leadsWorkedOnCount: draft.leadsWorkedOnCount,
        filesUploadedCount: draft.filesUploadedCount,
        activeWorkingTimeMinutes: draft.activeWorkingTimeMinutes,
      })
      Alert.alert('Submitted', 'Daily report submitted successfully.')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit')
    }
  }

  if (!draft && loading) return <View style={[s.screen, s.pad]}><Text style={s.sub}>Loading…</Text></View>
  if (error) {
    return (
      <View style={[s.screen, s.pad]}>
        <Text style={{ color: colors.danger, marginBottom: 16 }}>{error}</Text>
        <Button title="Retry" onPress={load} />
      </View>
    )
  }
  if (!draft) return null

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Today&apos;s Daily Report</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <StatPill label="Tasks" value={draft.tasksCompletedCount} />
        <StatPill label="CRM updates" value={draft.crmRecordsUpdatedCount} />
        <StatPill label="Leads worked" value={draft.leadsWorkedOnCount} />
        <StatPill label="Files uploaded" value={draft.filesUploadedCount} />
        <StatPill label="Active minutes" value={draft.activeWorkingTimeMinutes} />
        <StatPill label="Visit reports" value={draft.visitReportsCount} />
        <StatPill label="Check-ins" value={draft.checkInsCount} />
      </View>

      <Field label="Work description" value={workDescription} onChangeText={setWorkDescription} multiline />
      <Field label="Completed work" value={completedWork} onChangeText={setCompletedWork} multiline />
      <Field label="Pending work" value={pendingWork} onChangeText={setPendingWork} multiline />
      <Field label="Blockers" value={blockers} onChangeText={setBlockers} multiline />
      <Field label="Tomorrow's plan" value={tomorrowPlan} onChangeText={setTomorrowPlan} multiline />

      <Text style={{ color: colors.danger, marginBottom: 8 }}>
        Note: activity counts are auto-filled from today and cannot be edited from mobile.
      </Text>

      <Button title="Submit daily report" onPress={handleSubmit} />
    </ScrollView>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 10, padding: 10, minWidth: 80, alignItems: 'center' }}>
      <Text style={{ fontSize: 10, color: colors.sub, textTransform: 'uppercase', fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{value}</Text>
    </View>
  )
}
