import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { Button, Field, colors, s } from '../lib/ui'
import { signIn } from '../lib/api'
import { markSignedIn } from '../lib/auth-store'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
      markSignedIn()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign in failed'
      // Replace technical error with user-friendly message
      let friendly = msg
      if (msg.includes('no token') || msg.includes('bearer')) {
        friendly = 'Unable to sign in. Server configuration issue — please contact support.'
      } else if (msg.includes('401') || msg.includes('Unauthorized')) {
        friendly = 'Invalid email or password.'
      } else if (msg.includes('429') || msg.includes('Too many')) {
        friendly = 'Too many attempts. Please wait a minute.'
      } else if (msg.includes('network') || msg.includes('Network')) {
        friendly = 'Network error. Please check your connection.'
      }
      setError(friendly)
    } finally { setBusy(false) }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.screen, { justifyContent: 'center', padding: 24 }]}>
      <Text style={[s.h1, { fontSize: 28, marginBottom: 4 }]}>Kawman Field</Text>
      <Text style={[s.sub, { marginBottom: 24 }]}>Sign in with your @kawmanexact.com account</Text>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={error || undefined} />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" error={error || undefined} />
      <View style={{ height: 8 }} />
      <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={submit} loading={busy} disabled={!email || !password} />
      {error && <Text style={{ color: colors.danger, textAlign: 'center', marginTop: 12 }}>{error}</Text>}
    </KeyboardAvoidingView>
  )
}