import { describe, expect, it } from 'vitest'
import {
  YEAR_NO_START_LABEL,
  effectiveYearEnd,
  expandTwoDigitYear,
  expandYearsForSelector,
  formatVehicleAppYear,
  parseYearRangeToken,
  parseYearToken,
  pvcPeriodOutsideModelFabWarning,
  toYy,
  validatePvcYearInputs,
  yearMatchesVehicleApp,
} from '@/lib/vehicleAppYear'

describe('vehicleAppYear (MARCHA UI)', () => {
  it('toYy — abreviação e virada de século', () => {
    expect(toYy(1997)).toBe('97')
    expect(toYy(2005)).toBe('05')
    expect(toYy(2012)).toBe('12')
    expect(toYy(2022)).toBe('22')
    expect(toYy(1949)).toBeNull()
    expect(toYy(2101)).toBeNull()
  })

  it('formatVehicleAppYear — início e fim', () => {
    expect(formatVehicleAppYear({ yearStart: 2000, yearEnd: 2005 })).toBe('00/05')
    expect(formatVehicleAppYear({ yearStart: 2020, yearEnd: 2022 })).toBe('20/22')
    expect(formatVehicleAppYear({ yearStart: 2010, yearEnd: 2010 })).toBe('10')
  })

  it('formatVehicleAppYear — só início → YY/... (card)', () => {
    expect(formatVehicleAppYear({ yearStart: 1997, yearEnd: null })).toBe('97/...')
    expect(formatVehicleAppYear({ yearStart: 2012, yearEnd: null })).toBe('12/...')
  })

  it('formatVehicleAppYear — só fim → .../YY', () => {
    expect(formatVehicleAppYear({ yearStart: null, yearEnd: 2010 })).toBe('.../10')
    expect(formatVehicleAppYear({ yearStart: null, yearEnd: 1997 })).toBe('.../97')
    expect(YEAR_NO_START_LABEL).toBe('Sem ano inicial')
  })

  it('formatVehicleAppYear — ambos ausentes / legado / inválido', () => {
    expect(formatVehicleAppYear({})).toBeNull()
    expect(formatVehicleAppYear({ versionYear: 2012 })).toBe('12')
    expect(formatVehicleAppYear({ yearStart: 1800, yearEnd: 2000 })).toBeNull()
    expect(formatVehicleAppYear({ yearStart: 2000, yearEnd: 9999 })).toBeNull()
  })

  it('effectiveYearEnd — preenchido ou ano civil atual', () => {
    expect(effectiveYearEnd(2022, 2026)).toBe(2022)
    expect(effectiveYearEnd(null, 2026)).toBe(2026)
    expect(effectiveYearEnd(undefined, 2026)).toBe(2026)
  })

  it('validatePvcYearInputs — início obrigatório, fim opcional', () => {
    expect(validatePvcYearInputs('', '')).toEqual({
      ok: false,
      message: 'Ano inicial é obrigatório',
    })
    expect(validatePvcYearInputs('2017', '')).toEqual({
      ok: true,
      yearStart: 2017,
      yearEnd: null,
    })
    expect(validatePvcYearInputs('2020', '2026')).toEqual({
      ok: true,
      yearStart: 2020,
      yearEnd: 2026,
    })
    expect(validatePvcYearInputs('2020', '2019').ok).toBe(false)
  })

  it('expandTwoDigitYear / parseYearToken', () => {
    expect(expandTwoDigitYear(99)).toBe(1999)
    expect(expandTwoDigitYear(10)).toBe(2010)
    expect(expandTwoDigitYear(1999)).toBe(1999)
    expect(parseYearToken('99')).toEqual({ ok: true, year: 1999 })
    expect(parseYearToken('10')).toEqual({ ok: true, year: 2010 })
    expect(parseYearToken('1999')).toEqual({ ok: true, year: 1999 })
    expect(parseYearToken('')).toEqual({ ok: true, year: null })
  })

  it('parseYearRangeToken / validatePvcYearInputs — 99/10', () => {
    expect(parseYearRangeToken('99/10')).toEqual({
      ok: true,
      yearStart: 1999,
      yearEnd: 2010,
    })
    expect(parseYearRangeToken('1999-2010')).toEqual({
      ok: true,
      yearStart: 1999,
      yearEnd: 2010,
    })
    expect(validatePvcYearInputs('99/10', '')).toEqual({
      ok: true,
      yearStart: 1999,
      yearEnd: 2010,
    })
    expect(validatePvcYearInputs('99', '10')).toEqual({
      ok: true,
      yearStart: 1999,
      yearEnd: 2010,
    })
  })

  it('pvcPeriodOutsideModelFabWarning — aviso suave', () => {
    expect(
      pvcPeriodOutsideModelFabWarning({
        yearStart: 2005,
        yearEnd: 2010,
        productionYearStart: 1999,
        productionYearEnd: 2015,
      }),
    ).toBeNull()
    expect(
      pvcPeriodOutsideModelFabWarning({
        yearStart: 1990,
        yearEnd: 1995,
        productionYearStart: 1999,
        productionYearEnd: 2015,
      }),
    ).toMatch(/Atenção/)
    expect(
      pvcPeriodOutsideModelFabWarning({
        yearStart: 2005,
        yearEnd: 2010,
        productionYearStart: null,
        productionYearEnd: null,
      }),
    ).toBeNull()
  })

  it('yearMatchesVehicleApp — alinhado ao SQL (inalterado)', () => {
    expect(yearMatchesVehicleApp(2000, 1997, null)).toBe(true)
    expect(yearMatchesVehicleApp(1996, 1997, null)).toBe(false)
    expect(yearMatchesVehicleApp(2003, 2000, 2005)).toBe(true)
    expect(yearMatchesVehicleApp(2006, 2000, 2005)).toBe(false)
    expect(yearMatchesVehicleApp(2012, null, null, 2012)).toBe(true)
    expect(yearMatchesVehicleApp(2012, null, null, null)).toBe(false)
  })

  it('expandYearsForSelector — intervalo fechado 20/26', () => {
    expect(expandYearsForSelector(2020, 2026, null, 40, 2026)).toEqual([
      2026, 2025, 2024, 2023, 2022, 2021, 2020,
    ])
  })

  it('expandYearsForSelector — aberto 17/... até ano atual', () => {
    expect(expandYearsForSelector(2017, null, null, 40, 2026)).toEqual([
      2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017,
    ])
  })

  it('expandYearsForSelector — aberto não inventa anos futuros', () => {
    expect(expandYearsForSelector(2020, null, null, 40, 2024)).toEqual([
      2024, 2023, 2022, 2021, 2020,
    ])
  })

  it('expandYearsForSelector — intervalo curto fechado', () => {
    expect(expandYearsForSelector(2000, 2002)).toEqual([2002, 2001, 2000])
  })

  it('expandYearsForSelector — 2010–2015 não inclui 2016', () => {
    const years = expandYearsForSelector(2010, 2015, null, 40, 2026)
    expect(years).toEqual([2015, 2014, 2013, 2012, 2011, 2010])
    expect(years).not.toContain(2016)
  })
})
