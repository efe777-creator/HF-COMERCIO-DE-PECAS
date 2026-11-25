import { isValidCnpj, onlyDigits } from './cnpj'
import { macroRegionFromUf, type BrMacroRegion } from './brMacroRegion'
import { formatCep, onlyCepDigits } from './viaCep'

/** Snapshot permitido — sem QSA. */
export type BrasilApiCnpjLookup = {
  cnpj: string
  legalName: string
  tradeName: string | null
  cnpjStatus: string | null
  cnpjStatusCode: number | null
  cnaeCode: string | null
  email: string | null
  phone: string | null
  address: {
    postalCode: string | null
    street: string | null
    number: string | null
    complement: string | null
    district: string | null
    city: string | null
    state: string | null
    ibgeCode: string | null
    macroRegion: BrMacroRegion | null
  }
  checkedAt: string
  /** true se situação ≠ ativa (código 2). */
  statusWarning: boolean
}

type BrasilApiJson = {
  cnpj?: string
  razao_social?: string
  nome_fantasia?: string
  situacao_cadastral?: number
  descricao_situacao_cadastral?: string
  cnae_fiscal?: number
  cnae_fiscal_descricao?: string
  email?: string | null
  ddd_telefone_1?: string
  cep?: string
  logradouro?: string
  descricao_tipo_de_logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  codigo_municipio_ibge?: number | string
}

const STATUS_LABEL: Record<number, string> = {
  1: 'Nula',
  2: 'Ativa',
  3: 'Suspensa',
  4: 'Inapta',
  8: 'Baixada',
}

export function isCnpjStatusWarning(code: number | null, label: string | null): boolean {
  if (code != null && code !== 2) return true
  if (!label) return false
  const l = label.toLowerCase()
  return (
    l.includes('baixad') ||
    l.includes('suspens') ||
    l.includes('inapt') ||
    l.includes('nula')
  )
}

/**
 * Consulta BrasilAPI CNPJ. Valida dígitos localmente antes.
 * Não persiste QSA.
 */
export async function lookupBrasilApiCnpj(
  value: string,
  opts?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<BrasilApiCnpjLookup> {
  const cnpj = onlyDigits(value)
  if (!isValidCnpj(cnpj)) throw new Error('CNPJ inválido')

  const timeoutMs = opts?.timeoutMs ?? 8000
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const signal = opts?.signal
  if (signal) {
    if (signal.aborted) ctrl.abort()
    else signal.addEventListener('abort', () => ctrl.abort(), { once: true })
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: ctrl.signal,
    })
    if (res.status === 404) throw new Error('CNPJ não encontrado na Receita')
    if (!res.ok) throw new Error(`BrasilAPI HTTP ${res.status}`)
    const data = (await res.json()) as BrasilApiJson

    const code = data.situacao_cadastral ?? null
    const statusLabel =
      data.descricao_situacao_cadastral?.trim() ||
      (code != null ? STATUS_LABEL[code] ?? String(code) : null)

    const state = (data.uf ?? '').toUpperCase() || null
    const streetParts = [
      data.descricao_tipo_de_logradouro,
      data.logradouro,
    ].filter(Boolean)
    const street = streetParts.join(' ').trim() || null
    const cepDigits = data.cep ? onlyCepDigits(data.cep) : ''
    const phoneRaw = (data.ddd_telefone_1 ?? '').replace(/\D/g, '')
    const ibge =
      data.codigo_municipio_ibge != null
        ? String(data.codigo_municipio_ibge)
        : null

    return {
      cnpj,
      legalName: (data.razao_social ?? '').trim(),
      tradeName: data.nome_fantasia?.trim() || null,
      cnpjStatus: statusLabel,
      cnpjStatusCode: code,
      cnaeCode:
        data.cnae_fiscal != null
          ? String(data.cnae_fiscal)
          : null,
      email: data.email?.trim() || null,
      phone: phoneRaw || null,
      address: {
        postalCode: cepDigits.length === 8 ? formatCep(cepDigits) : null,
        street,
        number: data.numero?.trim() || null,
        complement: data.complemento?.trim() || null,
        district: data.bairro?.trim() || null,
        city: data.municipio?.trim() || null,
        state,
        ibgeCode: ibge,
        macroRegion: macroRegionFromUf(state),
      },
      checkedAt: new Date().toISOString(),
      statusWarning: isCnpjStatusWarning(code, statusLabel),
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Consulta CNPJ esgotou o tempo — preencha manualmente')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}
