import { describe, expect, it } from 'vitest'
import {
  analyzeApplicationMappedRows,
  applicationActionFromParts,
  classifyMatch,
  comparePeriods,
  expandMappedRowsForVersions,
  mergePeriods,
  parseYearPeriod,
  resolveVehicleVersionMatch,
  splitVersionSafe,
  type ApplicationCatalogs,
} from '@/services/import/applicationImportCore'

describe('applicationImportCore', () => {
  it('parseYearPeriod — fim vazio = vigente', () => {
    expect(parseYearPeriod('2020', '')).toEqual({
      ok: true,
      period: { start: 2020, end: null },
    })
  })

  it('parseYearPeriod — rejeita invertido', () => {
    expect(parseYearPeriod('2018', '2015').ok).toBe(false)
  })

  it('periodo fechado 08/17 e aberto 20/...', () => {
    expect(parseYearPeriod('2008', '2017')).toEqual({
      ok: true,
      period: { start: 2008, end: 2017 },
    })
    expect(parseYearPeriod('2020', null)).toEqual({
      ok: true,
      period: { start: 2020, end: null },
    })
  })

  it('splitVersionSafe — só números com /', () => {
    expect(splitVersionSafe('1.0/1.6')).toEqual({
      original: '1.0/1.6',
      parts: ['1.0', '1.6'],
      split: true,
    })
    expect(splitVersionSafe('1.0 Turbo').split).toBe(false)
    expect(splitVersionSafe('1.0 Turbo').parts).toEqual(['1.0 Turbo'])
  })

  it('expandMappedRowsForVersions — 1.0/1.6 vira duas linhas', () => {
    const expanded = expandMappedRowsForVersions([
      {
        lineNumber: 2,
        values: {
          sku: 'X',
          name: 'Peca',
          montadora: 'VW',
          modelo: 'Gol',
          versao: '1.0/1.6',
          ano_inicio: '2010',
          ano_fim: '2014',
        },
      },
    ])
    expect(expanded).toHaveLength(2)
    expect(expanded.map((r) => r.values.versao)).toEqual(['1.0', '1.6'])
  })

  it('comparePeriods — já coberto / expansão / lacuna', () => {
    expect(
      comparePeriods({ start: 2008, end: 2020 }, { start: 2018, end: 2018 }),
    ).toBe('noop_covered')
    expect(
      comparePeriods({ start: 2008, end: 2020 }, { start: 2021, end: null }),
    ).toBe('expand')
    expect(
      comparePeriods({ start: 2008, end: 2015 }, { start: 2018, end: 2018 }),
    ).toBe('review_gap')
  })

  it('mergePeriods', () => {
    expect(mergePeriods({ start: 2008, end: 2020 }, { start: 2021, end: null })).toEqual({
      start: 2008,
      end: null,
    })
  })

  it('classifyMatch', () => {
    expect(classifyMatch(['Kicks', 'Kicks II'], 'Kicks').confidence).toBe('exact')
    expect(classifyMatch(['Kicks 1.6', 'Kicks II'], 'Kicks').confidence).toBe('probable')
    expect(classifyMatch(['March'], 'Kicks').confidence).toBe('unidentified')
  })

  it('applicationActionFromParts', () => {
    expect(
      applicationActionFromParts({
        productResolved: true,
        vehicleConfidence: 'exact',
        periodAction: 'noop_covered',
      }),
    ).toBe('already_covered')
    expect(
      applicationActionFromParts({
        productResolved: false,
        vehicleConfidence: 'exact',
        periodAction: 'create',
      }),
    ).toBe('error')
    expect(
      applicationActionFromParts({
        productResolved: true,
        vehicleConfidence: 'exact',
        periodAction: 'create',
        versionAmbiguous: true,
      }),
    ).toBe('review')
  })

  it('resolveVehicleVersionMatch — ambígua sem vínculo PVC → revisão', () => {
    const r = resolveVehicleVersionMatch({
      manufacturerId: 'm1',
      modelId: 'mod1',
      versionName: '1.0',
      productId: 'p1',
      versions: [
        { id: 'v10', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
        { id: 'v25', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
      ],
      pvc: [],
    })
    expect(r.status).toBe('ambiguous')
    expect(r.versionId).toBeNull()
  })

  it('resolveVehicleVersionMatch — múltiplas mas PVC ligada → linked', () => {
    const r = resolveVehicleVersionMatch({
      manufacturerId: 'm1',
      modelId: 'mod1',
      versionName: '1.0',
      productId: 'p1',
      versions: [
        { id: 'v10', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
        { id: 'v25', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
      ],
      pvc: [
        {
          productId: 'p1',
          vehicleVersionId: 'v25',
          yearStart: 2010,
          yearEnd: 2015,
        },
      ],
    })
    expect(r.status).toBe('linked')
    expect(r.versionId).toBe('v25')
  })

  it('SKU inexistente → erro (nao cria produto)', () => {
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'NOVO',
            name: 'X',
            montadora: 'VW',
            modelo: 'Gol',
            versao: '1.0',
            ano_inicio: '2010',
            ano_fim: '2014',
          },
        },
      ],
      {
        productsBySku: new Map(),
        makers: [],
        models: [],
        versions: [],
        pvc: [],
      },
    )
    expect(rows[0].action).toBe('error')
    expect(rows[0].createProduct).toBe(false)
    expect(rows[0].message).toMatch(/não cadastrado/i)
  })

  it('analyzeApplicationMappedRows — dedupe lógico no arquivo', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['trw1', { id: 'p1', name: 'Terminal' }]]),
      makers: [],
      models: [],
      versions: [],
      pvc: [],
    }
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'TRW1',
            name: 'Terminal',
            montadora: 'VW',
            modelo: 'Gol',
            versao: '1.0',
            ano_inicio: '2010',
            ano_fim: '2014',
          },
        },
        {
          lineNumber: 3,
          values: {
            sku: 'TRW1',
            name: 'Terminal',
            montadora: 'VW',
            modelo: 'Gol',
            versao: '1.0',
            ano_inicio: '2010',
            ano_fim: '2014',
          },
        },
      ],
      catalogs,
    )
    expect(rows[0].action).not.toBe('already_covered')
    expect(rows[1].action).toBe('already_covered')
    expect(rows[1].duplicateOfLine).toBe(2)
  })

  it('analyze — produto existente + aplicacao nova; segunda montadora', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'Terminal' }]]),
      makers: [{ id: 'm1', name: 'Volkswagen' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Gol' }],
      versions: [
        { id: 'vv1', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
      ],
      pvc: [],
    }
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SKU1',
            name: 'Terminal',
            montadora: 'Volkswagen',
            modelo: 'Gol',
            versao: '1.0',
            ano_inicio: '2010',
            ano_fim: '2014',
          },
        },
        {
          lineNumber: 3,
          values: {
            sku: 'SKU1',
            name: 'Terminal',
            montadora: 'Chevrolet',
            modelo: 'Celta',
            versao: '1.0',
            ano_inicio: '2008',
            ano_fim: '2015',
          },
        },
      ],
      catalogs,
    )
    expect(rows[0].productExists).toBe(true)
    expect(rows[0].createProduct).toBe(false)
    expect(rows[0].action).toBe('new')
    expect(rows[0].applyable).toBe(true)
    expect(rows[1].createManufacturer).toBe(true)
    expect(rows[1].action).toBe('new')
  })

  it('analyze — aplicacao ja contemplada no PVC', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'Terminal' }]]),
      makers: [{ id: 'm1', name: 'VW' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Gol' }],
      versions: [
        { id: 'vv1', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
      ],
      pvc: [
        {
          productId: 'p1',
          vehicleVersionId: 'vv1',
          yearStart: 2008,
          yearEnd: 2020,
        },
      ],
    }
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SKU1',
            name: 'Terminal',
            montadora: 'VW',
            modelo: 'Gol',
            versao: '1.0',
            ano_inicio: '2010',
            ano_fim: '2015',
          },
        },
      ],
      catalogs,
    )
    expect(rows[0].action).toBe('already_covered')
    expect(rows[0].applyable).toBe(false)
  })

  it('analyze — lacuna de periodo → revisao', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'Terminal' }]]),
      makers: [{ id: 'm1', name: 'VW' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Gol' }],
      versions: [
        { id: 'vv1', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
      ],
      pvc: [
        {
          productId: 'p1',
          vehicleVersionId: 'vv1',
          yearStart: 2008,
          yearEnd: 2015,
        },
      ],
    }
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SKU1',
            name: 'Terminal',
            montadora: 'VW',
            modelo: 'Gol',
            versao: '1.0',
            ano_inicio: '2018',
            ano_fim: '2020',
          },
        },
      ],
      catalogs,
    )
    expect(rows[0].action).toBe('review')
    expect(rows[0].periodAction).toBe('review_gap')
  })

  it('analyze — modelo nao encontrado com maker exata → novo modelo', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'X' }]]),
      makers: [{ id: 'm1', name: 'Nissan' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'March' }],
      versions: [],
      pvc: [],
    }
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SKU1',
            name: 'X',
            montadora: 'Nissan',
            modelo: 'Kicks',
            versao: '1.6',
            ano_inicio: '2020',
            ano_fim: '',
          },
        },
      ],
      catalogs,
    )
    expect(rows[0].createModel).toBe(true)
    expect(rows[0].createVersion).toBe(true)
    expect(rows[0].action).toBe('new')
  })
})
