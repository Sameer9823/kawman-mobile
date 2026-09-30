import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { request, createFileFormData, appendFormData } from './api'

/** Camera only (no gallery) so check-in proof can't be an old photo. */
export async function takePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) throw new Error('Camera permission is required.')
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
  return r.canceled ? null : r.assets[0].uri
}

export async function pickFromGallery(): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
  return r.canceled ? null : r.assets[0].uri
}

/** Shrink to <~1MB so it stays well under Vercel's 4.5MB body limit and uploads fast on 4G. */
export async function compress(uri: string, width = 1600): Promise<string> {
  const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width } }], {
    compress: 0.75, format: ImageManipulator.SaveFormat.JPEG,
  })
  return out.uri
}

/** Direct signed upload to Cloudinary; the server only ever sees the resulting URL. */
export async function uploadToCloudinary(uri: string): Promise<string> {
  const sig = await request<{ timestamp: number; folder: string; signature: string; apiKey: string; cloudName: string }>(
    '/api/mobile/upload-signature', { method: 'POST', body: '{}' },
  )
  const form = createFileFormData(uri, 'file', `photo-${Date.now()}.jpg`, 'image/jpeg')
  appendFormData(form, 'api_key', sig.apiKey)
  appendFormData(form, 'timestamp', sig.timestamp)
  appendFormData(form, 'folder', sig.folder)
  appendFormData(form, 'signature', sig.signature)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: form })
  const j = await res.json()
  if (!res.ok || !j.secure_url) throw new Error(j.error?.message ?? 'Photo upload failed')
  return j.secure_url as string
}