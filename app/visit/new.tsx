import { useState, useCallback, useEffect } from 'react'
import { Alert, Platform, ScrollView, TouchableOpacity, View, Text } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { ApiError, Company, createVisit, getVisit, getCompanies, getProducts, Product, updateVisit, type Visit } from '../../lib/api'
import { Button, SelectField, MultiSelectField, s, colors, ErrorState, SkeletonList, Field, SelectFieldOption } from '../../lib/ui'

const TITLE_OPTIONS: SelectFieldOption[] = [
  { label: 'Introductory', value: 'Introductory' },
  { label: 'Follow-up', value: 'Follow-up' },
  { label: 'Other', value: 'other' },
]

function toLocalDateTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function NewVisit() {
  const router = useRouter()
  const params = useLocalSearchParams<{ title?: string; company?: string; revisit?: string; editId?: string }>()

  const matchedTitle = params.title
    ? TITLE_OPTIONS.find((o) => o.value.toLowerCase() === params.title?.toLowerCase())
    : undefined

  const [f, setF] = useState({
    title: matchedTitle ? matchedTitle.value : (params.title ? 'other' : ''),
    purpose: '',
    company: params.company || '',
    contactName: '',
    contactEmail: '',
    contactMobile: '',
    address: '',
  })
  const [titleOther, setTitleOther] = useState(() => (params.title && !matchedTitle ? params.title : ''))
  const [companyOther, setCompanyOther] = useState('')
  const [productIds, setProductIds] = useState<string[]>([])
  const [purposeOther, setPurposeOther] = useState('')
  const [when, setWhen] = useState(() => new Date(Date.now() + 3600_000).toISOString().slice(0, 16))
  const [showTime, setShowTime] = useState(false)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const applyVisit = useCallback((v: Visit, comps: Company[]) => {
    const matched = TITLE_OPTIONS.find((o) => o.value.toLowerCase() === (v.title ?? '').toLowerCase())
    if (matched) setF((p) => ({ ...p, title: matched.value }))
    else { setF((p) => ({ ...p, title: 'other' })); setTitleOther(v.title ?? '') }
    setWhen(v.scheduledAt ? toLocalDateTime(v.scheduledAt) : new Date(Date.now() + 3600_000).toISOString().slice(0, 16))
    setF((p) => ({ ...p, address: v.address ?? '', contactName: v.contact ?? '' }))
    const company = v.company ?? ''
    if (company) {
      if (comps.some((c) => c.name === company)) setF((p) => ({ ...p, company }))
      else { setF((p) => ({ ...p, company: 'other' })); setCompanyOther(company) }
    } else {
      setF((p) => ({ ...p, company: '' }))
    }
    setProductIds(v.purposeMeta?.productIds ?? [])
    setPurposeOther(v.purposeMeta?.purposeOther ?? '')
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [prods, comps] = await Promise.all([getProducts(true), getCompanies()])
      setProducts(prods)
      setCompanies(comps)
      if (params.editId) {
        const v = await getVisit(params.editId)
        applyVisit(v, comps)
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [params.editId, applyVisit])

  useEffect(() => {
    // Load products + companies on mount with force refresh to bypass cache
    const id = setTimeout(() => { void loadData() }, 0)
    return () => clearTimeout(id)
  }, [loadData])

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!f.title) {
      errors.title = 'Title is required'
    } else if (f.title === 'other' && (!titleOther || titleOther.trim().length < 2)) {
      errors.title = 'Specify title (min 2 chars)'
    }
    if (productIds.length === 0 && (!purposeOther || purposeOther.trim().length < 2)) {
      errors.purpose = 'Select at least one product or specify other'
    } else if (purposeOther && purposeOther.trim().length > 120) {
      errors.purpose = 'Other purpose max 120 chars'
    }
    if (!f.company && !companyOther && !f.contactName) {
      errors.company = 'Company or Contact is required'
    } else if (f.company === 'other' && (!companyOther || companyOther.trim().length < 2)) {
      errors.company = 'Company name required (min 2 chars)'
    }
    if (!when || Number.isNaN(new Date(when).getTime())) {
      errors.scheduledAt = 'Invalid date/time'
    }
    setErrs(errors)
    return Object.keys(errors).length === 0
  }

  async function save(useHere: boolean) {
    if (!validateForm()) return
    setBusy(true)
    try {
      const fix = useHere ? await import('../../lib/location').then((m) => m.getFix()) : null
      const d = new Date(when)
      if (Number.isNaN(d.getTime())) {
        setErrs({ scheduledAt: 'Invalid date/time' })
        return
      }

      const finalTitle = f.title === 'other' ? titleOther.trim() : f.title
      const finalCompany = f.company === 'other' ? companyOther.trim() : f.company
      const finalPurpose = [
        ...products.filter((p) => productIds.includes(p.id)).map((p) => p.label),
        purposeOther.trim() ? `Other: ${purposeOther.trim()}` : null,
      ].filter(Boolean).join(', ')

      const payload = {
        title: finalTitle,
        purpose: finalPurpose,
        scheduledAt: d.toISOString(),
        company: finalCompany || undefined,
        contactName: f.contactName || undefined,
        contactEmail: f.contactEmail || undefined,
        contactMobile: f.contactMobile || undefined,
        address: f.address || undefined,
        latitude: fix?.latitude,
        longitude: fix?.longitude,
        productIds: productIds.length ? productIds : undefined,
        purposeOther: purposeOther.trim() || undefined,
      }
      if (params.editId) await updateVisit(params.editId, payload)
      else await createVisit(payload)
      router.back()
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) {
        setErrs(e.fieldErrors)
      } else {
        Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again')
      }
    } finally {
      setBusy(false)
    }
  }

  const handlePurposeChange = (ids: string[], other: string) => {
    setProductIds(ids)
    setPurposeOther(other)
    setErrs((prev) => {
      const next = { ...prev }
      if (ids.length > 0 || (other && other.trim().length >= 2)) {
        delete next.purpose
      }
      return next
    })
  }

  const handleTitleChange = (val: string) => {
    setF((p) => ({ ...p, title: val }))
    if (val !== 'other') setTitleOther('')
  }

  const handleTitleOtherChange = (val: string) => {
    setTitleOther(val)
    setErrs((prev) => {
      const next = { ...prev }
      if (val.trim().length >= 2) {
        delete next.title
      }
      return next
    })
  }

  const companyOptions: SelectFieldOption[] = [
    { label: 'Other', value: 'other' },
    ...companies.map((c) => ({ label: c.name, value: c.name })),
  ]

  if (loading) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
        <SkeletonList count={6} />
      </ScrollView>
    )
  }

  if (loadError) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
        <ErrorState message={loadError} onRetry={() => loadData()} />
      </ScrollView>
    )
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <SelectField
        label="Title"
        value={f.title}
        onChange={handleTitleChange}
        options={TITLE_OPTIONS}
        placeholder="Select visit type"
        error={errs.title}
        otherOptionValue="other"
        otherLabel="Specify title"
        otherValue={titleOther}
        onOtherChange={handleTitleOtherChange}
        accessibilityLabel="Visit title"
        required
      />

      <MultiSelectField
        label="Purpose (products)"
        selectedIds={productIds}
        otherText={purposeOther}
        onChange={handlePurposeChange}
        options={products}
        placeholder="Select products"
        error={errs.purpose}
        othersLabel="Other purpose / product"
        accessibilityLabel="Visit purpose products"
        required
      />

      <TouchableOpacity onPress={() => setShowTime(true)} accessibilityLabel="Set date and time" style={{ marginBottom: 16 }}>
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 }}>
          <Text style={{ fontSize: 13, color: colors.sub, marginBottom: 4 }}>Date & time *</Text>
          <Text style={{ fontSize: 16, color: colors.text }}>{new Date(when).toLocaleString()}</Text>
          {errs.scheduledAt ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{errs.scheduledAt}</Text> : null}
        </View>
      </TouchableOpacity>
      {showTime && (
        <DateTimePicker
          value={new Date(when)}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShowTime(false)
            if (selected) setWhen(selected.toISOString().slice(0, 16))
          }}
        />
      )}

      <SelectField
        label="Company"
        value={f.company}
        onChange={(v) => setF((p) => ({ ...p, company: v }))}
        options={companyOptions}
        placeholder="Select company"
        error={errs.company}
        otherOptionValue="other"
        otherLabel="Company name"
        otherValue={companyOther}
        onOtherChange={(v) => setCompanyOther(v)}
        accessibilityLabel="Company"
        required={false}
      />

      <Field
        label="Contact name"
        value={f.contactName}
        onChangeText={(v) => setF((p) => ({ ...p, contactName: v }))}
        error={errs.contactName}
      />

      <Field label="Contact email" value={f.contactEmail} onChangeText={(v) => setF((p) => ({ ...p, contactEmail: v }))} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Contact mobile" value={f.contactMobile} onChangeText={(v) => setF((p) => ({ ...p, contactMobile: v }))} keyboardType="phone-pad" />
      <Field label="Address" value={f.address} onChangeText={(v) => setF((p) => ({ ...p, address: v }))} multiline />

      <Button title="Save visit" onPress={() => save(false)} loading={busy} />
      <Button title="Save with my current location" variant="secondary" onPress={() => save(true)} disabled={busy} />
    </ScrollView>
  )
}
