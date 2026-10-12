export const logger = {
  debug: (...args: unknown[]) => console.debug('[KF]', ...args),
  info: (...args: unknown[]) => console.info('[KF]', ...args),
  warn: (...args: unknown[]) => console.warn('[KF]', ...args),
  error: (msg: string, _meta?: unknown, error?: Error) => console.error('[KF]', msg, error?.message),
}
