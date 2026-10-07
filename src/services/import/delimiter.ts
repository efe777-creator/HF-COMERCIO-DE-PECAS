import { splitCsvRecords } from './csvSplit'
import type { CsvDelimiter } from './types'

const DELIMITERS: CsvDelimiter[] = [';', ',', '\t']

/**
 * Conta ocorrências do delimitador fora de aspas simples/duplas.
 */
function countDelimiter(line: string, delimiter: CsvDelimiter): number {
  let count = 0
  let inQuotes = false
  let quoteChar = ''
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === quoteChar) {
        if (line[i + 1] === quoteChar) {
          i++
        } else {
          inQuotes = false
        }
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      inQuotes = true
      quoteChar = ch
      continue
    }
    if (ch === delimiter) count++
  }
  return count
}

/**
 * Detecta delimitador preferindo `;` (D11). Empate → `;`.
 * Amostra: primeiras linhas não vazias do arquivo.
 */
export function detectCsvDelimiter(text: string): CsvDelimiter {
  // Usa registros lógicos (aspas) para não amostrar meio de descrição multilinha.
  const sample = splitCsvRecords(text)
    .map((r) => r.text.trim())
    .filter(Boolean)
    .slice(0, 10)

  if (sample.length === 0) return ';'

  const scores: Record<CsvDelimiter, number> = { ';': 0, ',': 0, '\t': 0 }
  for (const line of sample) {
    for (const d of DELIMITERS) {
      scores[d] += countDelimiter(line, d)
    }
  }

  // Preferência F8.1: ponto-e-vírgula
  let best: CsvDelimiter = ';'
  let bestScore = scores[';']
  for (const d of DELIMITERS) {
    if (d === ';') continue
    if (scores[d] > bestScore) {
      best = d
      bestScore = scores[d]
    }
  }

  // Se ninguém pontuou, default ;
  if (bestScore === 0) return ';'
  return best
}

export function delimiterLabel(d: CsvDelimiter): string {
  if (d === '\t') return 'TAB'
  if (d === ',') return 'vírgula (,)'
  return 'ponto-e-vírgula (;)'
}
