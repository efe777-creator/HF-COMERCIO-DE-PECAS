import { describe, expect, it } from 'vitest'
import type { CompatibilityVerdict } from '@/services/compatibility/compatibilityEngine'
import {
  compatFaltante,
  compatMotivo,
  compatSealDisplayLabel,
  needsCompatPurchaseConfirm,
} from './compatCopy'

const confirmed: CompatibilityVerdict = {
  state: 'confirmed',
  label: 'Compatibilidade confirmada',
  evidences: [{ code: 'year', detail: 'Ano 2015 no período da aplicação' }],
}

const similar: CompatibilityVerdict = {
  state: 'probable',
  label: 'Compatibilidade provável',
  evidences: [{ code: 'maker_model_only', detail: 'Só montadora/modelo' }],
}

const noPvc: CompatibilityVerdict = {
  state: 'unconfirmed',
  label: 'Compatibilidade não confirmada',
  evidences: [
    { code: 'no_pvc', detail: 'Sem aplicação PVC completa — compatibilidade a verificar' },
  ],
}

const missing: CompatibilityVerdict = {
  state: 'unconfirmed',
  label: 'Compatibilidade não confirmada',
  evidences: [
    { code: 'maker_model', detail: 'Aplicação Fiat Uno' },
    { code: 'engine_missing', detail: 'Aplicação exige motor; veículo sem motor informado' },
    { code: 'version_missing', detail: 'Aplicação tem versão; veículo sem versão vinculada' },
  ],
}

const incompatible: CompatibilityVerdict = {
  state: 'unconfirmed',
  label: 'Compatibilidade não confirmada',
  evidences: [
    {
      code: 'no_intersection',
      detail: 'Nenhuma aplicação PVC cruza com o veículo informado',
    },
  ],
}

describe('compatCopy E.1', () => {
  it('labels de selo', () => {
    expect(compatSealDisplayLabel(confirmed)).toBe('Compatível')
    expect(compatSealDisplayLabel(similar)).toBe('Compatível similar')
    expect(compatSealDisplayLabel(noPvc)).toBe('A verificar')
    expect(compatSealDisplayLabel(incompatible)).toBe('Incompatível')
  })

  it('motivo e faltante', () => {
    expect(compatMotivo(noPvc)).toMatch(/PVC/)
    expect(compatFaltante(noPvc)).toBe('aplicação PVC completa')
    expect(compatFaltante(missing)).toBe('motor, versão')
    expect(compatFaltante(similar)).toBe('ano, motor ou versão')
    expect(compatFaltante(incompatible)).toBeNull()
  })

  it('confirm só similar / A verificar', () => {
    expect(needsCompatPurchaseConfirm(confirmed)).toBe(false)
    expect(needsCompatPurchaseConfirm(similar)).toBe(true)
    expect(needsCompatPurchaseConfirm(noPvc)).toBe(true)
    expect(needsCompatPurchaseConfirm(incompatible)).toBe(false)
    expect(needsCompatPurchaseConfirm(null)).toBe(false)
  })
})
