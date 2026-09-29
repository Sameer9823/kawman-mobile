import { useSyncExternalStore } from 'react'
import { hasToken, loadToken, setUnauthorizedHandler } from './api'

type State = { ready: boolean; authed: boolean }
let state: State = { ready: false, authed: false }
const listeners = new Set<() => void>()
const set = (s: State) => { state = s; listeners.forEach((l) => l()) }

export const markSignedIn = () => set({ ready: true, authed: true })
export const markSignedOut = () => set({ ready: true, authed: false })

export async function initAuth() {
  setUnauthorizedHandler(markSignedOut)
  await loadToken()
  set({ ready: true, authed: hasToken() })
}

export const useAuthState = () =>
  useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => state)
