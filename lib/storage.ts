import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const web = Platform.OS === 'web'

export const storage = {
  get: async (k: string): Promise<string | null> =>
    web ? window.localStorage.getItem(k) : SecureStore.getItemAsync(k),
  set: async (k: string, v: string): Promise<void> => {
    if (web) window.localStorage.setItem(k, v)
    else await SecureStore.setItemAsync(k, v)
  },
  remove: async (k: string): Promise<void> => {
    if (web) window.localStorage.removeItem(k)
    else await SecureStore.deleteItemAsync(k)
  },
}