/** Extrai mensagem legível de Error / PostgrestError / objeto `{ message }`. */
export function adminErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) {
    const m = e.message.trim()
    if (m) return m
  }
  if (e && typeof e === 'object' && 'message' in e) {
    const m = String((e as { message: unknown }).message ?? '').trim()
    if (m) return m
  }
  if (typeof e === 'string' && e.trim()) return e.trim()
  return fallback
}
