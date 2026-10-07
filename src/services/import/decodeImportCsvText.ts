/**
 * Decodifica CSV de importação.
 * Excel no Windows costuma exportar Windows-1252; File.text() força UTF-8 e
 * gera U+FFFD (ex.: SUSPENSÃO → SUSPENS�O). Tenta UTF-8 estrito; fallback CP1252.
 */

export function decodeImportCsvText(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes)
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return text
}
