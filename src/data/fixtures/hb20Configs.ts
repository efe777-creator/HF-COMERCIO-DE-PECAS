/** Fixture operacional — família HYUNDAI HB20 / HB20X (modelos separados). */
export type Hb20ConfigFixture = {
  generation: string
  versionName: string
  engine: string
  fuel: string
  yearStart: number
  yearEnd: number | null
}

export const HB20_MODEL = {
  name: 'HB20',
  productionYearStart: 2012,
  productionYearEnd: null as number | null,
} as const

/** Modelo próprio — não é versão do HB20. */
export const HB20X_MODEL = {
  name: 'HB20X',
  productionYearStart: 2013,
  productionYearEnd: null as number | null,
} as const

type PeriodSeed = {
  generation: string
  engine: string
  fuel: string
  yearStart: number
  yearEnd: number | null
  versions: string[]
}

function expand(seeds: PeriodSeed[]): Hb20ConfigFixture[] {
  return seeds.flatMap((s) =>
    s.versions.map((versionName) => ({
      generation: s.generation,
      versionName,
      engine: s.engine,
      fuel: s.fuel,
      yearStart: s.yearStart,
      yearEnd: s.yearEnd,
    })),
  )
}

/** Só hatch HB20 — sem HB20X/HB20S (são outros modelos). */
const HB20_PERIOD_SEEDS: PeriodSeed[] = [
  {
    generation: '1ª Geração (2012–2015)',
    engine: '1.0',
    fuel: '',
    yearStart: 2012,
    yearEnd: 2015,
    versions: [
      'Comfort',
      'Comfort Plus',
      'Comfort Style',
      'Copa do Mundo',
      'For You',
      'Spicy',
    ],
  },
  {
    generation: '1ª Geração (2012–2015)',
    engine: '1.6',
    fuel: '',
    yearStart: 2012,
    yearEnd: 2015,
    versions: [
      'Comfort',
      'Comfort Plus',
      'Comfort Style',
      'Premium',
      'Copa do Mundo',
      'Impress',
    ],
  },
  {
    generation: '1ª Geração Facelift (2016–2019)',
    engine: '1.0',
    fuel: '',
    yearStart: 2015,
    yearEnd: 2019,
    versions: [
      'Comfort',
      'Comfort Plus',
      'Comfort Style',
      'Ocean',
      'Edição 5 Anos',
      'Copa do Mundo',
      'Unique',
    ],
  },
  {
    generation: '1ª Geração Facelift (2016–2019)',
    engine: '1.0 Turbo',
    fuel: '',
    yearStart: 2016,
    yearEnd: 2019,
    versions: ['Comfort Plus', 'Comfort Style'],
  },
  {
    generation: '1ª Geração Facelift (2016–2019)',
    engine: '1.6',
    fuel: '',
    yearStart: 2015,
    yearEnd: 2019,
    versions: [
      'Comfort Plus',
      'Comfort Style',
      'Premium',
      'R spec',
      'Ocean',
      'Edição 5 Anos',
      '1 Million',
    ],
  },
  {
    generation: '2ª Geração (2020–2022)',
    engine: '1.0',
    fuel: '',
    yearStart: 2019,
    yearEnd: 2022,
    versions: [
      'Sense',
      'Vision',
      'Evolution',
      'Sport',
      'Nova Série',
      'Edição Especial',
    ],
  },
  {
    generation: '2ª Geração (2020–2022)',
    engine: '1.0 Turbo',
    fuel: '',
    yearStart: 2019,
    yearEnd: 2022,
    versions: ['Evolution', 'Diamond', 'Diamond Plus', 'Sport'],
  },
  {
    generation: '2ª Geração (2020–2022)',
    engine: '1.6',
    fuel: '',
    yearStart: 2019,
    yearEnd: 2021,
    versions: ['Vision', 'Evolution'],
  },
  {
    generation: '2ª Geração Facelift (2023–Atual)',
    engine: '1.0',
    fuel: '',
    yearStart: 2022,
    yearEnd: null,
    versions: [
      'Sense',
      'Sense Plus',
      'Comfort',
      'Comfort Plus',
      'Limited',
      'Limited Plus',
    ],
  },
  {
    generation: '2ª Geração Facelift (2023–Atual)',
    engine: '1.0 Turbo',
    fuel: '',
    yearStart: 2022,
    yearEnd: null,
    versions: [
      'Comfort',
      'Comfort Plus',
      'Platinum',
      'Platinum Safety',
      'Platinum Plus',
      'Copa do Mundo',
    ],
  },
]

/** Aventureiro — modelo HB20X (versões sem prefixo HB20X). */
const HB20X_PERIOD_SEEDS: PeriodSeed[] = [
  {
    generation: '1ª Geração (2012–2015)',
    engine: '1.6',
    fuel: '',
    yearStart: 2013,
    yearEnd: 2015,
    versions: ['Style', 'Premium'],
  },
  {
    generation: '1ª Geração Facelift (2016–2019)',
    engine: '1.6',
    fuel: '',
    yearStart: 2015,
    yearEnd: 2019,
    versions: ['Style', 'Premium'],
  },
  {
    generation: '2ª Geração (2020–2022)',
    engine: '1.6',
    fuel: '',
    yearStart: 2019,
    yearEnd: 2021,
    versions: ['Vision', 'Evolution', 'Diamond', 'Diamond Plus'],
  },
]

export const HB20_CONFIGS: Hb20ConfigFixture[] = expand(HB20_PERIOD_SEEDS)
export const HB20X_CONFIGS: Hb20ConfigFixture[] = expand(HB20X_PERIOD_SEEDS)

export const HB20_CONFIG_COUNT = HB20_CONFIGS.length
export const HB20X_CONFIG_COUNT = HB20X_CONFIGS.length
