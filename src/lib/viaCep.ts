import {
  macroRegionFromUf,
  normalizeMacroRegionLabel,
  type BrMacroRegion,
} from './brMacroRegion'

export type ViaCepAddress = {
  postalCode: string
  street: string
  complement: string
  district: string
  city: string
  state: string
  ibgeCode: string | null
  macroRegion: BrMacroRegion | null
}

export function onlyCepDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8)
}

export function formatCep(value: string): string {
  const d = onlyCepDigits(value)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

type ViaCepJson = {
  erro?: boolean | string
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
  ibge?: string
  regiao?: string
}

/**
 * Consulta ViaCEP. Retorna null se CEP inexistente.
 * Lança se formato inválido ou falha de rede.
 */
export async function lookupViaCep(
  value: string,
  opts?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<ViaCepAddress | null> {
  const cep = onlyCepDigits(value)
  if (cep.length !== 8) throw new Error('CEP precisa ter 8 dígitos')

  const timeoutMs = opts?.timeoutMs ?? 5000
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const signal = opts?.signal
  if (signal) {
    if (signal.aborted) ctrl.abort()
    else signal.addEventListener('abort', () => ctrl.abort(), { once: true })
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`ViaCEP HTTP ${res.status}`)
    const data = (await res.json()) as ViaCepJson
    if (data.erro === true || data.erro === 'true') return null

    const state = (data.uf ?? '').toUpperCase()
    const macro =
      normalizeMacroRegionLabel(data.regiao) ?? macroRegionFromUf(state)

    return {
      postalCode: formatCep(data.cep ?? cep),
      street: data.logradouro ?? '',
      complement: data.complemento ?? '',
      district: data.bairro ?? '',
      city: data.localidade ?? '',
      state,
      ibgeCode: data.ibge ? String(data.ibge) : null,
      macroRegion: macro,
    }
  } finally {
    clearTimeout(timer)
  }
}
