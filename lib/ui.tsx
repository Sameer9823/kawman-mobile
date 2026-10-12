import React, { useState, useRef, useEffect } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle, DimensionValue, FlatList, Keyboard, Modal, ScrollView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'

import { colors, APP_NAME } from './brand'
export { colors, APP_NAME }

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({ title, onPress, loading, variant = 'primary', disabled, style, accessibilityLabel }: {
  title: string; onPress: () => void; loading?: boolean; variant?: Variant
  disabled?: boolean; style?: ViewStyle; accessibilityLabel?: string
}) {
  const bg = variant === 'primary' ? colors.primary
    : variant === 'danger' ? colors.danger
    : variant === 'secondary' ? colors.card
    : 'transparent'
  const fg = variant === 'ghost' || variant === 'secondary' ? colors.primary
    : variant === 'danger' ? '#fff'
    : '#fff'
  const borderWidth = variant === 'ghost' || variant === 'secondary' ? 1 : 0
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }
  return (
    <Pressable onPress={handlePress} disabled={loading || disabled} accessibilityLabel={accessibilityLabel ?? title}
      style={[s.btn, { backgroundColor: bg, opacity: loading || disabled ? 0.6 : 1, borderWidth, borderColor: colors.primary }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: '600', fontSize: 16 }}>{title}</Text>}
    </Pressable>
  )
}

export function Field({ label, error, ...p }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.sub}
        {...p}
        style={[s.input, p.multiline && { height: 96, textAlignVertical: 'top', paddingTop: 10 }, error ? { borderColor: colors.danger } : null]}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
    </View>
  )
}

export const Card = ({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) => (
  <View style={[s.card, style]}>{children}</View>
)

export const SectionHeader = ({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) => (
  <View style={{ marginBottom: 12, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    {icon}
    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{title}</Text>
    {subtitle ? <Text style={[s.sub, { marginTop: 2 }]}>{subtitle}</Text> : null}
  </View>
)

export const StatusChip = ({ status, label }: { status: string; label?: string }) => {
  const colors_map: Record<string, { bg: string; text: string }> = {
    SCHEDULED: { bg: '#eff6ff', text: '#1d4ed8' },
    ON_THE_WAY: { bg: '#fffbeb', text: '#92400d' },
    CHECKED_IN: { bg: '#dcfce7', text: '#15803d' },
    IN_MEETING: { bg: '#f3e8fd', text: '#7e22ce' },
    COMPLETED: { bg: '#dcfce7', text: '#15803d' },
    CANCELLED: { bg: '#fee2e2', text: '#b91c1c' },
    PENDING: { bg: '#fffbeb', text: '#92400d' },
    OVERDUE: { bg: '#fee2e2', text: '#b91c1c' },
  }
  const c = colors_map[status] || { bg: '#f1f5f9', text: '#475569' }
  const display = label ?? status.replace(/_/g, ' ')
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Text style={{ color: c.text, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 }}>{display}</Text>
    </View>
  )
}

export const Badge = ({ count, color = colors.danger }: { count: number; color?: string }) => {
  if (count <= 0) return null
  const display = count > 99 ? '99+' : String(count)
  return (
    <View style={{ backgroundColor: color, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{display}</Text>
    </View>
  )
}

export const Avatar = ({ name, size = 36 }: { name: string; size?: number }) => {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '700' }}>{initials}</Text>
    </View>
  )
}

export function EmptyState({ icon, title, action, onAction }: { icon: React.ReactNode; title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: 'center', padding: 24, gap: 12 }}>
      {icon}
      <Text style={[s.sub, { textAlign: 'center', fontSize: 14 }]}>{title}</Text>
      {action && <Button title={action} onPress={onAction ?? (() => {})} />}
    </View>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ alignItems: 'center', padding: 24, gap: 12 }}>
      <Text style={{ color: colors.danger, fontSize: 14, textAlign: 'center' }}>{message}</Text>
      <Button title="Retry" onPress={onRetry} />
    </View>
  )
}

export function Skeleton({ width = '100%', height = 16, style }: { width?: DimensionValue; height?: number; style?: ViewStyle }) {
  return (
    <View style={[{ backgroundColor: '#e5e7eb', borderRadius: 8, width, height }, style]} />
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  const items = Array.from({ length: count })
  return (
    <View style={{ gap: 12 }}>
      {items.map((_, i) => (
        <View key={i} style={{ gap: 8 }}>
          <Skeleton height={18} width="80%" />
          <Skeleton height={14} width="60%" />
          <Skeleton height={14} width="40%" />
        </View>
      ))}
    </View>
  )
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16, gap: 12 },
  btn: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  label: { fontSize: 13, color: colors.sub, marginBottom: 4, fontWeight: '500' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  h1: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { color: colors.sub, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
})

export function useTabBarPadding() {
  const insets = useSafeAreaInsets()
  return {
    paddingBottom: 64 + insets.bottom + 24,
  }
}

// ============================================================
// SelectField — single-select dropdown with optional "Other" text input
// ============================================================

export type SelectFieldOption = { label: string; value: string }

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectFieldOption[]
  placeholder?: string
  error?: string
  otherOptionValue?: string // when selected, shows additional text input
  otherLabel?: string
  otherValue?: string
  onOtherChange?: (v: string) => void
  accessibilityLabel?: string
  required?: boolean
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select',
  error,
  otherOptionValue = 'other',
  otherLabel = 'Specify',
  otherValue = '',
  onOtherChange,
  accessibilityLabel,
  required = true,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const insets = useSafeAreaInsets()
  const isOtherSelected = value === otherOptionValue
  const displayValue = isOtherSelected ? otherValue : options.find((o) => o.value === value)?.label ?? placeholder

  const handleOptionSelect = (opt: SelectFieldOption) => {
    onChange(opt.value)
    if (opt.value === otherOptionValue && onOtherChange) {
      // Focus will be handled by the text input
    }
    setOpen(false)
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}{required ? ' *' : ''}</Text>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOpen(true) }}
        style={[s.input, { justifyContent: 'space-between', paddingRight: 36 }, error && { borderColor: colors.danger }]}
        accessibilityRole="combobox"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ expanded: open }}
      >
        <Text style={{ color: value ? colors.text : colors.sub, fontSize: 16 }}>{displayValue}</Text>
        <Ionicons name="chevron-down" size={24} color={colors.sub} />
      </Pressable>
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ justifyContent: 'flex-end', maxHeight: '80%' }}>
            <Pressable onPress={(e) => e.preventDefault()} style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 24 + insets.bottom, maxHeight: '100%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{label}</Text>
                <Pressable onPress={() => setOpen(false)} accessibilityLabel="Close" hitSlop={12}>
                  <Ionicons name="close" size={28} color={colors.sub} />
                </Pressable>
              </View>
              <FlatList
                data={options}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleOptionSelect(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      minHeight: 48,
                    }}
                    accessibilityRole="menuitem"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: item.value === value }}
                  >
                    <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{item.label}</Text>
                    {item.value === value && <Ionicons name="checkmark" size={24} color={colors.primary} />}
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
              />
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {isOtherSelected && (
        <Field
          label={otherLabel + ' *'}
          value={otherValue}
          onChangeText={onOtherChange}
          error={error}
          accessibilityLabel={otherLabel}
        />
      )}
    </View>
  )
}

// ============================================================
// MultiSelectField — searchable multi-select with chips + "Others" input
// ============================================================

type MultiSelectOption = { id: string; label: string; category?: string | null }
type MultiSelectOnChange = (selectedIds: string[], otherText: string) => void

interface MultiSelectFieldProps {
  label: string
  selectedIds: string[]
  otherText: string
  onChange: MultiSelectOnChange
  options: MultiSelectOption[]
  placeholder?: string
  error?: string
  othersOptionId?: string // id for "Others" option
  othersLabel?: string
  accessibilityLabel?: string
  required?: boolean
}

export function MultiSelectField({
  label,
  selectedIds,
  otherText,
  onChange,
  options,
  placeholder = 'Select products',
  error,
  othersOptionId = 'others',
  othersLabel = 'Other purpose / product',
  accessibilityLabel,
  required = true,
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [localSelectedIds, setLocalSelectedIds] = useState(selectedIds)
  const [localOtherText, setLocalOtherText] = useState(otherText)
  const insets = useSafeAreaInsets()

  const isOthersChecked = localSelectedIds.includes(othersOptionId)
  const filteredOptions = search
    ? options.filter((o) =>
        o.id !== othersOptionId &&
        (o.label.toLowerCase().includes(search.toLowerCase()) ||
          (o.category ?? '').toLowerCase().includes(search.toLowerCase()))
      )
    : options.filter((o) => o.id !== othersOptionId)

  const toggleOption = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setLocalSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const clearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setLocalSelectedIds([])
    setLocalOtherText('')
  }

  const handleDone = () => {
    onChange(localSelectedIds.filter((id) => id !== othersOptionId), isOthersChecked ? localOtherText : '')
    setOpen(false)
  }

  // Sync local state when props change
  useEffect(() => {
    setLocalSelectedIds(selectedIds)
  }, [selectedIds])
  useEffect(() => {
    setLocalOtherText(otherText)
  }, [otherText])

  const selectedProducts = options.filter((o) => localSelectedIds.includes(o.id) && o.id !== othersOptionId)

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}{required ? ' *' : ''}</Text>

      {/* Selected chips */}
      {(selectedProducts.length > 0 || (isOthersChecked && otherText)) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selectedProducts.map((p) => (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary,
                borderRadius: 16,
                paddingHorizontal: 10,
                paddingVertical: 4,
                gap: 6,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>{p.label}</Text>
              <Pressable
                onPress={() => toggleOption(p.id)}
                accessibilityLabel={`Remove ${p.label}`}
                hitSlop={8}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          ))}
          {isOthersChecked && otherText && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.danger,
                borderRadius: 16,
                paddingHorizontal: 10,
                paddingVertical: 4,
                gap: 6,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>Other: {otherText}</Text>
              <Pressable
                onPress={() => { toggleOption(othersOptionId); setLocalOtherText('') }}
                accessibilityLabel="Remove other"
                hitSlop={8}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Trigger button */}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOpen(true); setSearch('') }}
        style={[s.input, { justifyContent: 'space-between', paddingRight: 36 }, error && { borderColor: colors.danger }]}
        accessibilityRole="combobox"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ expanded: open }}
      >
        <Text
          style={{
            color: selectedProducts.length > 0 || (isOthersChecked && otherText) ? colors.text : colors.sub,
            fontSize: 16,
          }}
        >
          {selectedProducts.length > 0
            ? selectedProducts.map((p) => p.label).join(', ') + (isOthersChecked && otherText ? `, Other: ${otherText}` : '')
            : isOthersChecked && otherText
            ? `Other: ${otherText}`
            : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={24} color={colors.sub} />
      </Pressable>
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ justifyContent: 'flex-end', maxHeight: '85%' }}>
            <Pressable onPress={(e) => e.preventDefault()} style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '100%' }}>
              <View style={{ padding: 16, paddingBottom: 12 + insets.bottom }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{label}</Text>
                  <Text style={{ color: colors.sub, fontSize: 14 }}>{localSelectedIds.filter((id) => id !== othersOptionId).length} selected</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <Pressable
                    onPress={clearAll}
                    disabled={localSelectedIds.length === 0}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: localSelectedIds.length > 0 ? colors.danger : colors.border,
                    }}
                    accessibilityLabel="Clear all"
                  >
                    <Text style={{ color: localSelectedIds.length > 0 ? '#fff' : colors.sub, fontWeight: '600' }}>Clear</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDone}
                    disabled={localSelectedIds.filter((id) => id !== othersOptionId).length === 0 && (!isOthersChecked || !localOtherText.trim())}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: colors.primary,
                    }}
                    accessibilityLabel="Done"
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
                  </Pressable>
                </View>

                <Field
                  label="Search"
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Type to filter..."
                  autoFocus
                />

                <FlatList
                  data={filteredOptions}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => toggleOption(item.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        minHeight: 48,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      accessibilityState={{ checked: localSelectedIds.includes(item.id) }}
                    >
                      <Ionicons
                        name={localSelectedIds.includes(item.id) ? 'checkmark-circle' : 'checkmark-circle-outline'}
                        size={24}
                        color={localSelectedIds.includes(item.id) ? colors.primary : colors.sub}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontSize: 16, color: colors.text }}>{item.label}</Text>
                        {item.category && <Text style={s.sub}>{item.category}</Text>}
                      </View>
                    </Pressable>
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
                />

                {/* Others option pinned at bottom */}
                <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12 }}>
                  <Pressable
                    onPress={() => toggleOption(othersOptionId)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      minHeight: 48,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={othersLabel}
                    accessibilityState={{ checked: isOthersChecked }}
                  >
                    <Ionicons
                      name={isOthersChecked ? 'checkmark-circle' : 'checkmark-circle-outline'}
                      size={24}
                      color={isOthersChecked ? colors.primary : colors.sub}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>{othersLabel}</Text>
                      <Text style={s.sub}>Manually specify a product not in the catalog</Text>
                    </View>
                  </Pressable>

                  {isOthersChecked && (
                    <Field
                      label={othersLabel}
                      value={localOtherText}
                      onChangeText={setLocalOtherText}
                      placeholder="e.g., sample for new formulation"
                      error={error}
                    />
                  )}
                </View>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}
