import { describe, expect, it } from 'vitest'
import { buildYearsByModelFromSources } from '@/services/vehicles/buildYearsByModel'

describe('buildYearsByModelFromSources', () => {
  it('expande período PVC 1999–2010 e inclui vv.year', () => {
    const years = buildYearsByModelFromSources([
      {
        modelName: 'Gol',
        versionYear: 2005,
        yearStart: 1999,
        yearEnd: 2010,
      },
    ])
    expect(years.Gol).toContain('1999')
    expect(years.Gol).toContain('2010')
    expect(years.Gol).toContain('2005')
    expect(years.Gol[0]).toBe('2010')
  })

  it('sem PVC usa fab do modelo', () => {
    const years = buildYearsByModelFromSources([
      {
        modelName: 'Onix',
        versionYear: null,
        yearStart: null,
        yearEnd: null,
        productionYearStart: 2012,
        productionYearEnd: 2015,
      },
    ])
    expect(years.Onix).toEqual(['2015', '2014', '2013', '2012'])
  })

  it('sem PVC com vv.year', () => {
    const years = buildYearsByModelFromSources([
      {
        modelName: 'Palio',
        versionYear: 2012,
        yearStart: null,
        yearEnd: null,
      },
    ])
    expect(years.Palio).toEqual(['2012'])
  })
})
