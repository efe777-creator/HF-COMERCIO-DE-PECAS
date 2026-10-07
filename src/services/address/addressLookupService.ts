import { getCepProvider } from '@/services/address/cepProvider'
import {
  CepInvalidError,
  CepNotFoundError,
  CepUnavailableError,
} from '@/services/address/viaCepProvider'
import { isCompleteCep, normalizeCep } from '@/lib/cep'
import type { CepLookupResult } from '@/types'

export { normalizeCep, formatCepMask, isCompleteCep } from '@/lib/cep'
export { CepInvalidError, CepNotFoundError, CepUnavailableError }

export type CepLookupStatus =
  | { ok: true; data: CepLookupResult }
  | { ok: false; code: 'invalid' | 'not_found' | 'unavailable'; message: string }

/** Consulta CEP via provider ativo; nunca lança — retorna status tipado. */
export async function lookupCep(cep: string): Promise<CepLookupStatus> {
  const digits = normalizeCep(cep)
  if (!isCompleteCep(digits)) {
    return { ok: false, code: 'invalid', message: 'Informe um CEP com 8 dígitos.' }
  }
  try {
    const data = await getCepProvider().lookupByCep(digits)
    return { ok: true, data }
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    const message = e instanceof Error ? e.message : ''
    if (e instanceof CepNotFoundError || name === 'CepNotFoundError') {
      return { ok: false, code: 'not_found', message: message || 'CEP não encontrado' }
    }
    if (e instanceof CepInvalidError || name === 'CepInvalidError') {
      return { ok: false, code: 'invalid', message: message || 'CEP inválido' }
    }
    if (e instanceof CepUnavailableError || name === 'CepUnavailableError') {
      return {
        ok: false,
        code: 'unavailable',
        message: 'Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.',
      }
    }
    return {
      ok: false,
      code: 'unavailable',
      message: 'Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.',
    }
  }
}
