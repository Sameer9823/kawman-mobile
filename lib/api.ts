import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string) ?? 'https://kawman-dashboard.vercel.app'

const TOKEN_KEY = 'kf_token'
let token: string | null = null
let onUnauthorized: (() => void) | null = null

export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }
export const hasToken = () => token !== null

export async function loadToken() {
  token = await SecureStore.getItemAsync(TOKEN_KEY)
  return token
}

export async function signIn(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
  // better-auth `bearer` plugin returns the session token in this header.
  const t = res.headers.get('set-auth-token')
  if (!res.ok || !t) {
    const j = await res.json().catch(() => ({}))
    throw new Error(res.status === 429 ? 'Too many attempts. Wait a minute.' : j.message ?? 'Invalid email or password')
  }
  token = t
  await SecureStore.setItemAsync(TOKEN_KEY, t)
}

export async function signOut() {
  try { await request('/api/auth/sign-out', { method: 'POST', body: '{}' }) } catch {}
  token = null
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public fieldErrors?: Record<string, string>) { super(message) }
}

export async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) }
  if (token) headers.Authorization = `Bearer ${token}`
  if (typeof init.body === 'string') headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    token = null
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    onUnauthorized?.()
  }
  if (!res.ok) throw new ApiError(data.error ?? data.message ?? `Request failed (${res.status})`, res.status, data.fieldErrors)
  return data as T
}

const post = <T,>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })

// ---- Types ----
export type VisitStatus = 'SCHEDULED' | 'ON_THE_WAY' | 'CHECKED_IN' | 'IN_MEETING' | 'COMPLETED' | 'CANCELLED'
export interface Visit {
  id: string; title: string; purpose: string; status: VisitStatus; scheduledAt: string
  address: string | null; latitude: number | null; longitude: number | null
  company: string | null; contact: string | null; lastCheckInAt: string | null
}
export interface ScannedCard {
  name: string; company: string; designation: string; phone: string; mobile: string; email: string; website: string; address: string
}

// ---- Endpoints ----
export const getVisits = (scope: 'today' | 'upcoming' | 'all') =>
  request<{ visits: Visit[] }>(`/api/mobile/visits?scope=${scope}`).then((r) => r.visits)

export const createVisit = (b: {
  title: string; purpose: string; scheduledAt: string; company?: string; contactName?: string
  contactMobile?: string; address?: string; latitude?: number; longitude?: number
}) => post<{ id: string }>('/api/mobile/visits', b)

export const setVisitStatus = (id: string, status: VisitStatus) => post(`/api/mobile/visits/${id}/status`, { status })

export const checkIn = (id: string, b: {
  latitude: number; longitude: number; accuracy?: number; mocked?: boolean; notes?: string; photoUrl?: string
}) => post<{ ok: true }>(`/api/mobile/visits/${id}/check-in`, b)

export const submitReport = (id: string, b: {
  purpose: string; discussion: string; nextSteps: string; requirements?: string; competitorInfo?: string; customerFeedback?: string
}) => post(`/api/mobile/visits/${id}/report`, b)

export const saveContact = (c: Partial<ScannedCard>) =>
  post<{ id: string }>('/api/mobile/contacts', {
    name: c.name, company: c.company, designation: c.designation, email: c.email,
    phone: c.phone, mobile: c.mobile, address: c.address,
  })

export const pingLocation = (b: { latitude: number; longitude: number; accuracy?: number; heading?: number; speed?: number }) =>
  post('/api/field-sales/live-location', b)
export const stopLocation = () => request('/api/field-sales/live-location', { method: 'DELETE' })

/** Business card OCR — reuses the dashboard's existing AI scan endpoint. */
export async function scanCard(uri: string): Promise<ScannedCard> {
  const form = new FormData()
  form.append('file', { uri, name: 'card.jpg', type: 'image/jpeg' } as unknown as Blob)
  const r = await request<{ contact: ScannedCard }>('/api/contacts/scan', { method: 'POST', body: form })
  return r.contact
}
