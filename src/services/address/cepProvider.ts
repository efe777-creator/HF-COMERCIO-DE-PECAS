import type { CepLookupResult, CepProvider } from '@/types'
import { viaCepProvider } from '@/services/address/viaCepProvider'

let activeProvider: CepProvider = viaCepProvider

export function setCepProvider(provider: CepProvider) {
  activeProvider = provider
}

export function getCepProvider(): CepProvider {
  return activeProvider
}

export type { CepLookupResult, CepProvider }
