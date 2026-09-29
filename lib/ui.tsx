import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native'

export const colors = { bg: '#f6f7f9', card: '#fff', text: '#111827', sub: '#6b7280', primary: '#0f766e', danger: '#b91c1c', border: '#e5e7eb' }

export function Button({ title, onPress, loading, variant = 'primary', disabled }: {
  title: string; onPress: () => void; loading?: boolean; variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean
}) {
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : 'transparent'
  const fg = variant === 'ghost' ? colors.primary : '#fff'
  return (
    <Pressable onPress={onPress} disabled={loading || disabled}
      style={[s.btn, { backgroundColor: bg, opacity: loading || disabled ? 0.6 : 1, borderWidth: variant === 'ghost' ? 1 : 0, borderColor: colors.primary }]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: '600', fontSize: 16 }}>{title}</Text>}
    </Pressable>
  )
}

export function Field({ label, error, ...p }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#9ca3af" {...p} style={[s.input, p.multiline && { height: 90, textAlignVertical: 'top' }, error ? { borderColor: colors.danger } : null]} />
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 2 }}>{error}</Text> : null}
    </View>
  )
}

export const Card = ({ children }: { children: React.ReactNode }) => <View style={s.card}>{children}</View>

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16, gap: 12 },
  btn: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  label: { fontSize: 13, color: colors.sub, marginBottom: 4, fontWeight: '500' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  h1: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { color: colors.sub, fontSize: 13 },
})
