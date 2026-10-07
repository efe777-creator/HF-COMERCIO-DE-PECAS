import type { CsvDelimiter } from './types'

/**
 * Quebra o texto CSV em registros (linhas lógicas), respeitando aspas.
 * Newlines dentro de campo entre aspas (descrição multilinha) NÃO abrem registro novo.
 */
export function splitCsvRecords(text: string): { text: string; lineNumber: number }[] {
  const src = text.replace(/^\uFEFF/, '')
  const records: { text: string; lineNumber: number }[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''
  let lineNumber = 1
  let recordStartLine = 1

  const pushRecord = () => {
    const trimmed = current.replace(/\r$/, '')
    if (trimmed.trim().length > 0) {
      records.push({ text: trimmed, lineNumber: recordStartLine })
    }
    current = ''
  }

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!

    if (inQuotes) {
      current += ch
      if (ch === '\n') lineNumber++
      if (ch === quoteChar) {
        if (src[i + 1] === quoteChar) {
          current += src[i + 1]!
          i++
        } else {
          inQuotes = false
          quoteChar = ''
        }
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      inQuotes = true
      quoteChar = ch
      if (!current) recordStartLine = lineNumber
      current += ch
      continue
    }

    if (ch === '\n') {
      pushRecord()
      lineNumber++
      recordStartLine = lineNumber
      continue
    }

    if (ch === '\r') {
      if (src[i + 1] === '\n') continue
      pushRecord()
      lineNumber++
      recordStartLine = lineNumber
      continue
    }

    if (!current) recordStartLine = lineNumber
    current += ch
  }

  if (current.trim().length > 0 || current.includes('"') || current.includes("'")) {
    pushRecord()
  }

  return records
}

/** Remove aspas externas e unescapa aspas duplicadas. */
export function stripCellQuotes(raw: string): string {
  const s = raw.trim()
  if (s.length >= 2) {
    const q = s[0]
    if ((q === '"' || q === "'") && s[s.length - 1] === q) {
      const inner = s.slice(1, -1)
      if (q === '"') return inner.replace(/""/g, '"')
      return inner.replace(/''/g, "'")
    }
  }
  return s
}

/**
 * Split de uma linha CSV respeitando aspas.
 * Não usa regex frágil para valores BR com vírgula quando o delimitador é `;`.
 */
export function splitCsvLine(line: string, delimiter: CsvDelimiter): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === quoteChar) {
        if (line[i + 1] === quoteChar) {
          current += quoteChar
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      inQuotes = true
      quoteChar = ch
      continue
    }
    if (ch === delimiter) {
      cells.push(stripCellQuotes(current))
      current = ''
      continue
    }
    current += ch
  }
  cells.push(stripCellQuotes(current))
  return cells
}
