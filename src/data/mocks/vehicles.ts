/**
 * DEMO / MOCK — árvore de veículos fictícia.
 * Cascata: Montadora → Modelo → Versão → Motor → Ano.
 * Não representa a base real de veículos da HF.
 */
import type { VehicleOptionTree } from '@/types'
import { MOCK_DISCLAIMER } from './categories'

export { MOCK_DISCLAIMER }

export const mockVehicleTree: VehicleOptionTree = {
  makers: ['Volkswagen', 'Chevrolet', 'Fiat', 'Hyundai', 'Toyota', 'Honda'],
  modelsByMaker: {
    Volkswagen: ['Gol', 'Voyage', 'Polo', 'T-Cross'],
    Chevrolet: ['Onix', 'Prisma', 'Tracker', 'S10'],
    Fiat: ['Argo', 'Cronos', 'Strada', 'Toro'],
    Hyundai: ['HB20', 'Creta', 'i30'],
    Toyota: ['Corolla', 'Etios', 'Hilux'],
    Honda: ['Civic', 'City', 'HR-V'],
  },
  yearsByModel: {
    Gol: ['2018', '2019', '2020', '2021', '2022'],
    Voyage: ['2018', '2019', '2020', '2021'],
    Polo: ['2019', '2020', '2021', '2022', '2023'],
    'T-Cross': ['2020', '2021', '2022', '2023'],
    Onix: ['2018', '2019', '2020', '2021', '2022', '2023'],
    Prisma: ['2018', '2019', '2020'],
    Tracker: ['2021', '2022', '2023'],
    S10: ['2019', '2020', '2021', '2022'],
    Argo: ['2018', '2019', '2020', '2021', '2022'],
    Cronos: ['2019', '2020', '2021', '2022'],
    Strada: ['2020', '2021', '2022', '2023'],
    Toro: ['2019', '2020', '2021', '2022'],
    HB20: ['2018', '2019', '2020', '2021', '2022'],
    Creta: ['2019', '2020', '2021', '2022', '2023'],
    i30: ['2018', '2019'],
    Corolla: ['2018', '2019', '2020', '2021', '2022', '2023'],
    Etios: ['2018', '2019', '2020'],
    Hilux: ['2019', '2020', '2021', '2022'],
    Civic: ['2018', '2019', '2020', '2021'],
    City: ['2019', '2020', '2021', '2022'],
    'HR-V': ['2019', '2020', '2021', '2022', '2023'],
  },
  enginesByModelYear: {
    'Onix|2020': ['1.0', '1.0 Turbo'],
    'Onix|2021': ['1.0', '1.0 Turbo'],
    'Gol|2020': ['1.0', '1.6'],
    'HB20|2020': ['1.0', '1.6'],
    'Corolla|2020': ['2.0', '1.8 Hybrid'],
    'Argo|2020': ['1.0', '1.3', '1.8'],
  },
  enginesByModel: {
    Onix: ['1.0', '1.0 Turbo'],
    Gol: ['1.0', '1.6'],
    Argo: ['1.0', '1.3', '1.8'],
    HB20: ['1.0', '1.6'],
  },
  versionsByModel: {
    HB20: ['Sense', 'Vision', 'Evolution'],
    Onix: ['LT', 'LTZ'],
    Gol: ['1.0', '1.6'],
  },
  enginesByModelVersion: {
    'HB20|Sense': ['1.0'],
    'HB20|Vision': ['1.0', '1.6'],
    'HB20|Evolution': ['1.0'],
    'Onix|LT': ['1.0'],
    'Onix|LTZ': ['1.0', '1.0 Turbo'],
    'Gol|1.0': ['1.0'],
    'Gol|1.6': ['1.6'],
  },
  yearsByModelVersion: {
    'HB20|Sense': ['2022', '2021', '2020', '2019'],
    'HB20|Vision': ['2022', '2021', '2020'],
    'HB20|Evolution': ['2022', '2021'],
    'Onix|LT': ['2021', '2020'],
    'Onix|LTZ': ['2021', '2020'],
    'Gol|1.0': ['2020', '2019'],
    'Gol|1.6': ['2020', '2019'],
  },
}
