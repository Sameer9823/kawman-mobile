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
    credentials: 'omit',
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
 * Create a FormData entry from a file URI or URL.
 *
 * SDK 57: expo-file-system's `File` takes path segments only (`new File(...uris)`),
 * not the pre-SDK-57 `new File(uri, { name, type })` options object.
 *
 * `File.bytes()` reads `file://` and Android `content://` URIs (JavaFile /
 * ContentProviderFile) but rejects every other scheme: a `https://` URL — the
 * Cloudinary URL handed to `scanCard` — hits the `JavaFile` branch and throws
 * `IllegalArgumentException: URI scheme is not "file"`, the "Scan business card"
 * crash. Fetch network URLs instead (Expo's fetch also serves `file://`). Bytes
 * are still read lazily when the request is sent — expo's serializer
 * (convertFormDataAsync) `await`s the `bytes()` callback, and the OCR route
 * validates `file.type.startsWith('image/')`.
 */
export function createFileFormData(uri: string, fieldName = 'file', fileName = `upload-${Date.now()}.jpg`, mimeType = 'image/jpeg'): FormData {
  const form = new FormData()
  // @ts-expect-error - Expo's fetch accepts any Blob-like part (bytes()+name+type); the DOM type only allows string | Blob.
  form.append(fieldName, { bytes: async () => readUriAsBytes(uri), name: fileName, type: mimeType })
  return form
}

async function readUriAsBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    const res = await fetch(uri)
    if (!res.ok) throw new Error(`Unable to read image from ${uri} (${res.status})`)
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  }
  return new File(uri).bytes()
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

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'omit' })
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
  companyId: string | null; contactId: string | null
  visitReport: { id: string; createdAt: string; nextSteps: string } | null
  purposeMeta: { productIds?: string[]; purposeOther?: string } | null
  followUps: { id: string; title: string; dueDate: string; status: string }[]
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

export interface Company {
  id: string
  name: string
}

export interface Contact {
  id: string
  name: string
  designation: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  address: string | null
  company: string | null
  companyId: string | null
}

export const getCompanies = () =>
  request<{ companies: Company[] }>('/api/mobile/companies').then((r) => r.companies)

export interface Product {
  id: string
  label: string
  category: string | null
}

const PRODUCTS_CACHE_KEY = 'kf_products_cache'

export const getProducts = async (forceRefresh = false): Promise<Product[]> => {
  if (!forceRefresh) {
    const cached = await storage.get(PRODUCTS_CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.ts && Date.now() - parsed.ts < 24 * 60 * 60 * 1000) {
          return parsed.products
        }
      } catch { }
    }
  }
  try {
    const data = await request<{ products: Product[] }>('/api/mobile/products')
    await storage.set(PRODUCTS_CACHE_KEY, JSON.stringify({ products: data.products, ts: Date.now() }))
    return data.products
  } catch (e) {
    // On error, try to return stale cache
    const cached = await storage.get(PRODUCTS_CACHE_KEY)
    if (cached) {
      try {
        return JSON.parse(cached).products
      } catch { }
    }
    throw e
  }
}

export const getContacts = (search?: string) => {
  const params = search ? `?search=${encodeURIComponent(search)}` : ''
  return request<{ contacts: Contact[] }>(`/api/mobile/contacts${params}`).then((r) => r.contacts)
}

export interface FollowUp {
  id: string
  title: string
  description: string | null
  dueDate: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  company: string | null
  contact: string | null
  deal: string | null
  lead: string | null
}

export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'

export interface MeProfile {
  id: string
  name: string | null
  email: string
  phone: string | null
  designation: string | null
  organizationId: string
  roles: string[]
  permissions: string[]
}

export const getMe = () =>
  request<{ id: string; name: string | null; email: string; phone: string | null; designation: string | null; organizationId: string; roles: string[]; permissions: string[] }>(
    '/api/mobile/me',
  ).then((r) => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, designation: r.designation, organizationId: r.organizationId, roles: r.roles, permissions: r.permissions ?? [] }))

export const updateMe = (body: { name?: string; phone?: string; designation?: string }) =>
  request<{ user: { id: string; name: string | null; email: string; phone: string | null; designation: string | null } }>('/api/mobile/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }).then((r) => r.user)

export interface DailyReportDraft {
  tasksCompletedCount: number
  crmRecordsUpdatedCount: number
  leadsWorkedOnCount: number
  filesUploadedCount: number
  activeWorkingTimeMinutes: number
  visitReportsCount: number
  checkInsCount: number
  existingReport: {
    id: string
    workDescription: string | null
    completedWork: string | null
    pendingWork: string | null
    blockers: string | null
    tomorrowPlan: string | null
    tasksCompletedCount: number
    crmRecordsUpdatedCount: number
    leadsWorkedOnCount: number
    filesUploadedCount: number
    activeWorkingTimeMinutes: number
    status: string
    updatedAt: string
  } | null
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

export type VisitPayload = {
  title: string
  purpose: string
  scheduledAt: string
  company?: string
  contactName?: string
  contactMobile?: string
  contactEmail?: string
  address?: string
  latitude?: number
  longitude?: number
  productIds?: string[]
  purposeOther?: string
}

export const createVisit = (b: VisitPayload) => post<{ id: string }>('/api/mobile/visits', b)

export const updateVisit = (id: string, b: VisitPayload) =>
  request<{ ok: true }>(`/api/mobile/visits/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(b) })

export const setVisitStatus = (id: string, status: VisitStatus) => post(`/api/mobile/visits/${id}/status`, { status })

export const deleteVisit = (id: string) => request<{ success: boolean }>(`/api/mobile/visits/${id}`, { method: 'DELETE' })

export const checkIn = (id: string, b: {
  latitude: number; longitude: number; accuracy?: number; mocked?: boolean; notes?: string; photoUrl?: string
}) => post<{ ok: true }>(`/api/mobile/visits/${id}/check-in`, b)

export const submitReport = (id: string, b: {
  purpose: string; discussion: string; nextSteps: string; requirements?: string; competitorInfo?: string; customerFeedback?: string
}) => post<{ id: string; dailyReportId?: string }>(`/api/mobile/visits/${id}/report`, b)

export const getFollowUps = () =>
  request<{ followUps: FollowUp[] }>('/api/mobile/follow-ups').then((r) => r.followUps)

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: Record<string, unknown> | null
  isRead: boolean
  createdAt: string
  readAt: string | null
  visitId?: string | null
}

export const getUnreadNotificationCount = () =>
  request<{ count: number }>('/api/notifications/unread-count').then((r) => r.count)

export const getNotifications = (limit = 20, offset = 0, unreadOnly = false) =>
  request<{ notifications: Notification[]; total: number; unreadCount: number; hasMore: boolean }>(
    `/api/notifications?limit=${limit}&offset=${offset}${unreadOnly ? '&unreadOnly=true' : ''}`
  ).then((r) => r)

export interface DevicePushToken {
  id: string
  token: string
  platform: 'android' | 'ios'
  deviceName: string | null
  createdAt: string
}

export const registerPushToken = (body: { token: string; platform: 'android' | 'ios'; deviceName?: string }) =>
  post<{ ok: true }>('/api/mobile/push-token', body)

export const unregisterPushToken = (token: string) =>
  request<{ ok: true }>('/api/mobile/push-token', { method: 'DELETE', body: JSON.stringify({ token }) })

export const markNotificationRead = (notificationId: string) =>
  request<{ success: boolean }>('/api/notifications', { method: 'PATCH', body: JSON.stringify({ notificationIds: [notificationId] }) })

export const markAllNotificationsRead = () =>
  request<{ success: boolean }>('/api/notifications', { method: 'PATCH', body: JSON.stringify({ markAll: true }) })

export const createFollowUp = (b: {
  title: string
  description?: string
  dueDate: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  companyId?: string
  contactId?: string
  dealId?: string
  leadId?: string
}) => post<{ id: string }>('/api/mobile/follow-ups', b)

export const updateFollowUpStatus = (id: string, status: FollowUpStatus) =>
  request<{ success: boolean }>(`/api/mobile/follow-ups?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) })

export const getDailyReportDraft = () =>
  request<{ draft: DailyReportDraft }>('/api/mobile/daily-report').then((r) => r.draft)

export const submitDailyReport = (b: {
  workDescription?: string
  completedWork?: string
  pendingWork?: string
  blockers?: string
  tomorrowPlan?: string
  tasksCompletedCount?: number
  crmRecordsUpdatedCount?: number
  leadsWorkedOnCount?: number
  filesUploadedCount?: number
  activeWorkingTimeMinutes?: number
}) => post<{ id: string; status: string; updatedAt: string }>('/api/mobile/daily-report', b)

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

// ---- Duty sessions (Start Day / End Day) ----

export interface DutySessionInfo {
  id: string
  userName: string
  userEmail: string
  userStatus: string
  startedAt: string
  endedAt: string | null
  isActive: boolean
  durationMinutes: number | null
}

export const startDutySession = () => post<{ ok: true; sessionId: string }>('/api/mobile/duty/start', {})

export const endDutySession = () => post<{ ok: true; ended: boolean }>('/api/mobile/duty/end', {})

export const getDutySessions = (date?: string) => {
  const params = date ? `?date=${encodeURIComponent(date)}` : ''
  return request<{ sessions: DutySessionInfo[] }>(`/api/mobile/duty/sessions${params}`).then((r) => r.sessions)
}