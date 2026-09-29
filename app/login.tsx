import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { Button, Field, s } from '../lib/ui'
import { signIn } from '../lib/api'
import { markSignedIn } from '../lib/auth-store'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await signIn(email, password)
      markSignedIn()
    } catch (e) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Try again')
    } finally { setBusy(false) }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.screen, { justifyContent: 'center', padding: 24 }]}>
      <Text style={[s.h1, { fontSize: 28, marginBottom: 4 }]}>Kawman Field</Text>
      <Text style={[s.sub, { marginBottom: 24 }]}>Sign in with your @kawmanexact.com account</Text>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <View style={{ height: 8 }} />
      <Button title="Sign in" onPress={submit} loading={busy} disabled={!email || !password} />
    </KeyboardAvoidingView>
  )
}
