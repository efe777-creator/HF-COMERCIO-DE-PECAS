/**
 * Normalização de texto para importação de catálogo (F8.1-N).
 * Preserva acentos válidos; corrige mojibake comum (UTF-8 lido como Latin-1).
 */

const MOJIBAKE_MAP: Array<[RegExp, string]> = [
  [/Ã¡/g, 'á'],
  [/Ã /g, 'à'],
  [/Ã£/g, 'ã'],
  [/Ã¢/g, 'â'],
  [/Ã©/g, 'é'],
  [/Ãª/g, 'ê'],
  [/Ã­/g, 'í'],
  [/Ã³/g, 'ó'],
  [/Ã´/g, 'ô'],
  [/Ãµ/g, 'õ'],
  [/Ãº/g, 'ú'],
  [/Ã¼/g, 'ü'],
  [/Ã§/g, 'ç'],
  [/Ã/g, 'Á'],
  [/Ã‰/g, 'É'],
  [/Ã/g, 'Í'],
  [/Ã“/g, 'Ó'],
  [/Ãš/g, 'Ú'],
  [/Ã‡/g, 'Ç'],
  [/Â /g, ''],
  [/Â/g, ''],
]

export function fixMojibake(input: string): string {
  let s = input
  for (const [re, rep] of MOJIBAKE_MAP) {
    s = s.replace(re, rep)
  }
  return s
}

export function normalizeImportText(input: string | null | undefined): string {
  if (input == null) return ''
  let s = String(input)
  // BOM
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)
  s = fixMojibake(s)
  // controles (exceto tab/newline já tratados no parse)
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  // NBSP → espaço
  s = s.replace(/\u00A0/g, ' ')
  // espaços múltiplos
  s = s.replace(/[ \t]+/g, ' ').trim()
  return s
}
