import * as Location from 'expo-location'
import { pingLocation, stopLocation, startDutySession, endDutySession } from './api'

/**
 * Foreground live tracking for the dashboard's Live Map. Runs while the app is
 * open. (Tracking with the screen off needs an Android foreground service —
 * a follow-up; see README.)
 */
let sub: Location.LocationSubscription | null = null
type Listener = (s: { onDuty: boolean; mockedWarning: boolean }) => void
let listener: Listener | null = null
let mockedWarning = false

export const isOnDuty = () => sub !== null
export const onDutyChange = (l: Listener | null) => { listener = l }
const emit = () => listener?.({ onDuty: sub !== null, mockedWarning })

export async function startDuty() {
  if (sub) return
  const perm = await Location.requestForegroundPermissionsAsync()
  if (!perm.granted) throw new Error('Location permission is required.')
  sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 30_000, distanceInterval: 25 },
    (p) => {
      mockedWarning = Boolean(p.mocked)
      emit()
      if (p.mocked) return // never send spoofed positions to the dashboard
      pingLocation({
        latitude: p.coords.latitude, longitude: p.coords.longitude,
        accuracy: p.coords.accuracy ?? undefined,
        heading: p.coords.heading ?? undefined, speed: p.coords.speed ?? undefined,
      }).catch(() => {})
    },
  )

  // Record duty start on the server so admins can see it
  startDutySession().catch(() => {})
  emit()
}

export async function stopDuty() {
  sub?.remove(); sub = null; mockedWarning = false

  // Record duty end on the server
  endDutySession().catch(() => {})
  await stopLocation().catch(() => {})
  emit()
}
