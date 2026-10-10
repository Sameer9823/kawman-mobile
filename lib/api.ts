import { storage } from './storage'
import Constants from 'expo-constants'
import { File } from 'expo-file-system'

export const API_URL: string = (
  process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string) ?? 'https://kawmanexact-crm.vercel.app'
).replace(/\/+$/, '')

const TOKEN_KEY = 'kf_token'
let token: string | null = null
let onUnauthorized: (() => void) | null = null

export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }
export const hasToken = () => token !== null

export async function loadToken() {
  token = await storage.get(TOKEN_KEY)
  return token
}

export async function signIn(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = j.error ?? j.message ?? 'Sign in failed'
    throw new Error(
      res.status === 429
        ? 'Too many attempts. Wait a minute.'
        : `${msg} (HTTP ${res.status})`,
    )
  }
  // better-auth `bearer` plugin returns the session token in this header.
  const t = res.headers.get('set-auth-token')
  if (!t) {
    throw new Error('Login worked but the server sent no token. Ensure the bearer plugin is deployed.')
  }
  token = t
  await storage.set(TOKEN_KEY, t)
}

export async function signOut() {
  try { await request('/api/auth/sign-out', { method: 'POST', body: '{}' }) } catch {}
  token = null
  await storage.remove(TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public fieldErrors?: Record<string, string>) { super(message) }
}

/**
 * Create a FormData entry from a local file URI.
 *
 * SDK 57 note: expo-file-system's `File` constructor takes **path segments only**
 * (`new File(...uris)`). The older `new File(uri, { name, type })` from pre-SDK-57
 * is gone — passing the options object makes PathUtilities.join read `path.uri`
 * off the options (which is `undefined`), and `encodeURLChars(undefined)` does
 * `path.charAt(...)` → "cannot read property 'charAt' of undefined". That crash
 * broke business-card scan (POST /api/contacts/scan) and check-in photo uploads
 * (Cloudinary).
 *
 * Build a path-only expo `File` for its `bytes()`, then append a Blob-like part
 * `{ bytes, name, type }`. Expo's fetch serializer (convertFormDataAsync) accepts
 * any part that exposes a `bytes()` method, so this gives us explicit control
 * over the filename and Content-Type (the CRM scan route validates
 * `file.type.startsWith('image/')`) without buffering the image eagerly. The
 * bytes are only read when the request is actually sent.
 */
export function createFileFormData(uri: string, fieldName = 'file', fileName = `upload-${Date.now()}.jpg`, mimeType = 'image/jpeg'): FormData {
  const form = new FormData()
  const src = new File(uri)
  // @ts-expect-error - Expo's fetch accepts any Blob-like part (bytes()+name+type); the DOM type only allows string | Blob.
  form.append(fieldName, { bytes: () => src.bytes(), name: fileName, type: mimeType })
  return form
}

/**
 * Add a text field to an existing FormData.
 */
export function appendFormData(form: FormData, key: string, value: string | number | boolean | null | undefined): FormData {
  if (value !== undefined && value !== null) {
    form.append(key, String(value))
  }
  return form
}

export async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) }
  if (token) headers.Authorization = `Bearer ${token}`

  // Do NOT set Content-Type for FormData — the browser/Expo will set it with the correct boundary.
  // Only set Content-Type for JSON bodies.
  if (typeof init.body === 'string') {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  const data = await res.json().catch(() => ({}))

  if (res.status === 401) {
    token = null
    await storage.remove(TOKEN_KEY)
    onUnauthorized?.()
  }

  if (!res.ok) {
    throw new ApiError(data.error ?? data.message ?? `Request failed (${res.status})`, res.status, data.fieldErrors)
  }
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

// Matches the dashboard's ScannedContactData interface exactly.
export interface ScannedCard {
  name: string
  company: string
  designation: string
  phone: string
  mobile: string
  email: string
  website: string
  address: string
}

// ---- Endpoints ----
export const getVisits = (scope: 'today' | 'upcoming' | 'all', from?: string, to?: string) => {
  const params = [`scope=${encodeURIComponent(scope)}`]
  if (from) params.push(`from=${encodeURIComponent(from)}`)
  if (to) params.push(`to=${encodeURIComponent(to)}`)
  return request<{ visits: Visit[] }>(`/api/mobile/visits?${params.join('&')}`).then((r) => r.visits)
}

export const getVisit = (id: string) =>
  request<{ visit: Visit }>(`/api/mobile/visits/${id}`).then((r) => r.visit)

export const createVisit = (b: {
  title: string; purpose: string; scheduledAt: string; company?: string; contactName?: string
  contactMobile?: string; contactEmail?: string; address?: string; latitude?: number; longitude?: number
}) => post<{ id: string }>('/api/mobile/visits', b)

export const setVisitStatus = (id: string, status: VisitStatus) => post(`/api/mobile/visits/${id}/status`, { status })

export const checkIn = (id: string, b: {
  latitude: number; longitude: number; accuracy?: number; mocked?: boolean; notes?: string; photoUrl?: string
}) => post<{ ok: true }>(`/api/mobile/visits/${id}/check-in`, b)

export const submitReport = (id: string, b: {
  purpose: string; discussion: string; nextSteps: string; requirements?: string; competitorInfo?: string; customerFeedback?: string
}) => post<{ id: string; dailyReportId?: string }>(`/api/mobile/visits/${id}/report`, b)

export const saveContact = (c: Partial<ScannedCard>) => {
  const v = (s?: string) => (!s || s.trim() === '-' ? '' : s.trim())
  return post<{ id: string }>('/api/mobile/contacts', {
    name: v(c.name), company: v(c.company), designation: v(c.designation), email: v(c.email),
    phone: v(c.phone), mobile: v(c.mobile), address: v(c.address),
  })
}

export const pingLocation = (b: { latitude: number; longitude: number; accuracy?: number; heading?: number; speed?: number }) =>
  post('/api/field-sales/live-location', b)
export const stopLocation = () => request('/api/field-sales/live-location', { method: 'DELETE' })

/** Business card OCR — uses the dashboard's existing AI scan endpoint. */
export async function scanCard(uri: string): Promise<ScannedCard> {
  const form = createFileFormData(uri, 'file', 'card.jpg', 'image/jpeg')
  const r = await request<{ contact: ScannedCard }>('/api/contacts/scan', { method: 'POST', body: form })
  return r.contact
}