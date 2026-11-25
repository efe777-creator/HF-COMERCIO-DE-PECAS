/** Mensagem segura para UI a partir de Error / PostgrestError desconhecido. */
export function toUserMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message.trim()
  if (typeof err === 'string' && err.trim()) return err.trim()
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message?: unknown }).message ?? '').trim()
    if (msg) return msg
  }
  return fallback
}
