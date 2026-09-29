import * as Location from 'expo-location'

export interface Fix { latitude: number; longitude: number; accuracy?: number; mocked: boolean }

export async function getFix(): Promise<Fix> {
  const perm = await Location.requestForegroundPermissionsAsync()
  if (!perm.granted) throw new Error('Location permission is required.')
  const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
  return {
    latitude: p.coords.latitude,
    longitude: p.coords.longitude,
    accuracy: p.coords.accuracy ?? undefined,
    mocked: Boolean(p.mocked), // Android: true when a mock-location app is feeding GPS
  }
}
