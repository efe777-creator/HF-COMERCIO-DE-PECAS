import { describe, expect, it } from 'vitest'
import {
  analyzeApplicationMappedRows,
  applicationActionFromParts,
  classifyMatch,
  comparePeriods,
  expandMappedRowsForVersions,
  mergePeriods,
  parseYearPeriod,
  listVersionsForModel,
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
    expect(rows[0].action).toBe('new')
    expect(rows[0].createProduct).toBe(true)
    expect(rows[0].applyable).toBe(true)
    expect(rows[0].message).toMatch(/rascunho/i)
  })

  it('analyze — SKU inexistente sem nome = erro claro', () => {
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SEMNOME',
            name: '',
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
    expect(rows[0].message).toMatch(/não tem nome/i)
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

  // —— FIND-004 MARCHA 1: blank → todas as VVs do modelo ——

  it('T1 blank + 3 VVs do modelo → 3 applyable com vehicleVersionId distintos', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'Amortecedor' }]]),
      makers: [{ id: 'm1', name: 'Fiat' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Palio' }],
      versions: [
        { id: 'vv-a', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
        { id: 'vv-b', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.4' },
        { id: 'vv-c', manufacturerId: 'm1', modelId: 'mod1', versionName: 'Fire' },
      ],
      pvc: [],
    }
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SKU1',
            name: 'Amortecedor',
            montadora: 'Fiat',
            modelo: 'Palio',
            versao: '',
            ano_inicio: '2010',
            ano_fim: '2015',
          },
        },
      ],
      catalogs,
    )
    expect(rows).toHaveLength(3)
    expect(rows.every((r) => r.applyable)).toBe(true)
    expect(rows.every((r) => r.action === 'new')).toBe(true)
    expect(rows.every((r) => r.createVersion === false)).toBe(true)
    expect(rows.map((r) => r.vehicleVersionId).sort()).toEqual(['vv-a', 'vv-b', 'vv-c'])
  })

  it('T2 blank + 0 VV → 1 createVersion envelope', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'X' }]]),
      makers: [{ id: 'm1', name: 'Fiat' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Palio' }],
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
            montadora: 'Fiat',
            modelo: 'Palio',
            versao: '',
            ano_inicio: '2010',
            ano_fim: '2015',
          },
        },
      ],
      catalogs,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].createVersion).toBe(true)
    expect(rows[0].vehicleVersionId).toBeNull()
    expect(rows[0].action).toBe('new')
    expect(rows[0].applyable).toBe(true)
  })

  it('T3 versao explicita inalterada (1 VV)', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'X' }]]),
      makers: [{ id: 'm1', name: 'Fiat' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Palio' }],
      versions: [
        { id: 'vv-10', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
        { id: 'vv-14', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.4' },
      ],
      pvc: [],
    }
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SKU1',
            name: 'X',
            montadora: 'Fiat',
            modelo: 'Palio',
            versao: '1.0',
            ano_inicio: '2010',
            ano_fim: '2015',
          },
        },
      ],
      catalogs,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].vehicleVersionId).toBe('vv-10')
    expect(rows[0].versao).toBe('1.0')
    expect(rows[0].createVersion).toBe(false)
  })

  it('T4 blank + ano_fim vazio permanece null apos expansao', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'X' }]]),
      makers: [{ id: 'm1', name: 'Fiat' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Palio' }],
      versions: [
        { id: 'vv-a', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
        { id: 'vv-b', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.4' },
      ],
      pvc: [],
    }
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SKU1',
            name: 'X',
            montadora: 'Fiat',
            modelo: 'Palio',
            versao: '',
            ano_inicio: '2012',
            ano_fim: '',
          },
        },
      ],
      catalogs,
    )
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.yearStart === 2012)).toBe(true)
    expect(rows.every((r) => r.yearEnd === null)).toBe(true)
  })

  it('T5 blank nao expande para VV de outro model_id', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'X' }]]),
      makers: [{ id: 'm1', name: 'Fiat' }],
      models: [
        { id: 'mod-palio', manufacturerId: 'm1', name: 'Palio' },
        { id: 'mod-siena', manufacturerId: 'm1', name: 'Siena' },
      ],
      versions: [
        { id: 'vv-palio', manufacturerId: 'm1', modelId: 'mod-palio', versionName: '1.0' },
        { id: 'vv-siena', manufacturerId: 'm1', modelId: 'mod-siena', versionName: '1.0' },
      ],
      pvc: [],
    }
    expect(listVersionsForModel(catalogs.versions, 'm1', 'mod-palio').map((v) => v.id)).toEqual([
      'vv-palio',
    ])
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SKU1',
            name: 'X',
            montadora: 'Fiat',
            modelo: 'Palio',
            versao: '',
            ano_inicio: '2010',
            ano_fim: '2015',
          },
        },
      ],
      catalogs,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].vehicleVersionId).toBe('vv-palio')
  })

  it('M2 — blank + intervalo + split explicito coexistentes', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'X' }]]),
      makers: [{ id: 'm1', name: 'VW' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Gol' }],
      versions: [
        { id: 'vv-10', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
        { id: 'vv-16', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.6' },
        { id: 'vv-mi', manufacturerId: 'm1', modelId: 'mod1', versionName: 'Mi' },
      ],
      pvc: [],
    }
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SKU1',
            name: 'X',
            montadora: 'VW',
            modelo: 'Gol',
            versao: '',
            ano_inicio: '2008',
            ano_fim: '2017',
          },
        },
        {
          lineNumber: 3,
          values: {
            sku: 'SKU1',
            name: 'X',
            montadora: 'VW',
            modelo: 'Gol',
            versao: '1.0/1.6',
            ano_inicio: '2018',
            ano_fim: '',
          },
        },
      ],
      catalogs,
    )
    const blankRows = rows.filter((r) => r.lineNumber === 2)
    const splitRows = rows.filter((r) => r.lineNumber === 3)
    expect(blankRows).toHaveLength(3)
    expect(blankRows.every((r) => r.yearStart === 2008 && r.yearEnd === 2017)).toBe(true)
    expect(splitRows).toHaveLength(2)
    expect(splitRows.map((r) => r.versao).sort()).toEqual(['1.0', '1.6'])
    expect(splitRows.every((r) => r.yearEnd === null)).toBe(true)
  })

  it('M2 — arquivo duplica blank mesma chave → segunda already_covered (sem reexpandir)', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'X' }]]),
      makers: [{ id: 'm1', name: 'Fiat' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Palio' }],
      versions: [
        { id: 'vv-a', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
        { id: 'vv-b', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.4' },
      ],
      pvc: [],
    }
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SKU1',
            name: 'X',
            montadora: 'Fiat',
            modelo: 'Palio',
            versao: '',
            ano_inicio: '2010',
            ano_fim: '2015',
          },
        },
        {
          lineNumber: 3,
          values: {
            sku: 'SKU1',
            name: 'X',
            montadora: 'Fiat',
            modelo: 'Palio',
            versao: '',
            ano_inicio: '2010',
            ano_fim: '2015',
          },
        },
      ],
      catalogs,
    )
    expect(rows.filter((r) => r.lineNumber === 2)).toHaveLength(2)
    expect(rows.filter((r) => r.lineNumber === 3)).toHaveLength(1)
    expect(rows.find((r) => r.lineNumber === 3)?.action).toBe('already_covered')
    expect(rows.find((r) => r.lineNumber === 3)?.duplicateOfLine).toBe(2)
  })

  it('T6 blank + PVC ja cobre uma VV → already_covered nessa VV; demais new', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'X' }]]),
      makers: [{ id: 'm1', name: 'Fiat' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Palio' }],
      versions: [
        { id: 'vv-a', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.0' },
        { id: 'vv-b', manufacturerId: 'm1', modelId: 'mod1', versionName: '1.4' },
      ],
      pvc: [
        {
          productId: 'p1',
          vehicleVersionId: 'vv-a',
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
            name: 'X',
            montadora: 'Fiat',
            modelo: 'Palio',
            versao: '',
            ano_inicio: '2010',
            ano_fim: '2015',
          },
        },
      ],
      catalogs,
    )
    expect(rows).toHaveLength(2)
    const byVv = Object.fromEntries(rows.map((r) => [r.vehicleVersionId, r]))
    expect(byVv['vv-a'].action).toBe('already_covered')
    expect(byVv['vv-a'].applyable).toBe(false)
    expect(byVv['vv-b'].action).toBe('new')
    expect(byVv['vv-b'].applyable).toBe(true)
  })

  it('motorizacao em branco + versao → todas as engines daquela versao', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'X' }]]),
      makers: [{ id: 'm1', name: 'Fiat' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Palio' }],
      versions: [
        { id: 'vv-a', manufacturerId: 'm1', modelId: 'mod1', versionName: 'Fire', engine: '1.0' },
        { id: 'vv-b', manufacturerId: 'm1', modelId: 'mod1', versionName: 'Fire', engine: '1.4' },
        { id: 'vv-c', manufacturerId: 'm1', modelId: 'mod1', versionName: 'ELX', engine: '1.0' },
      ],
      pvc: [],
    }
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SKU1',
            name: 'X',
            montadora: 'Fiat',
            modelo: 'Palio',
            versao: 'Fire',
            motorizacao: '',
            ano_inicio: '2010',
            ano_fim: '2015',
          },
        },
      ],
      catalogs,
    )
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.vehicleVersionId).sort()).toEqual(['vv-a', 'vv-b'])
    expect(rows.every((r) => r.motorizacao === '1.0' || r.motorizacao === '1.4')).toBe(true)
  })

  it('motorizacao preenchida restringe engine', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'X' }]]),
      makers: [{ id: 'm1', name: 'Fiat' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Palio' }],
      versions: [
        { id: 'vv-a', manufacturerId: 'm1', modelId: 'mod1', versionName: 'Fire', engine: '1.0' },
        { id: 'vv-b', manufacturerId: 'm1', modelId: 'mod1', versionName: 'Fire', engine: '1.4' },
      ],
      pvc: [],
    }
    const rows = analyzeApplicationMappedRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'SKU1',
            name: 'X',
            montadora: 'Fiat',
            modelo: 'Palio',
            versao: 'Fire',
            motorizacao: '1.4',
            ano_inicio: '2010',
            ano_fim: '',
          },
        },
      ],
      catalogs,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].vehicleVersionId).toBe('vv-b')
    expect(rows[0].motorizacao).toBe('1.4')
    expect(rows[0].createVersion).toBe(false)
  })

  it('motorizacao + versao ambos preenchidos e ausentes → createVersion com engine', () => {
    const catalogs: ApplicationCatalogs = {
      productsBySku: new Map([['sku1', { id: 'p1', name: 'X' }]]),
      makers: [{ id: 'm1', name: 'Fiat' }],
      models: [{ id: 'mod1', manufacturerId: 'm1', name: 'Palio' }],
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
            montadora: 'Fiat',
            modelo: 'Palio',
            versao: 'Adventure',
            motorizacao: '1.8',
            ano_inicio: '2012',
            ano_fim: '2016',
          },
        },
      ],
      catalogs,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].createVersion).toBe(true)
    expect(rows[0].versao).toBe('Adventure')
    expect(rows[0].motorizacao).toBe('1.8')
  })
})
