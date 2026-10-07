export type { ImportKind, CsvDelimiter, ImportContract, ImportGrid, StructuralValidationResult } from './types'
export { detectCsvDelimiter, delimiterLabel } from './delimiter'
export { parseCsvToGrid } from './parseCsv'
export { parseXlsxToGrid } from './parseXlsx'
export { getImportContract, listImportKinds, IMPORT_MAX_ROWS } from './contracts'
export { buildColumnMapping, mapGridRows } from './mapColumns'
export { validateImportGrid, findDuplicateKeys } from './validate'
export { normalizeHeader } from './headers'
export {
  analyzeApplicationMappedRows,
  applicationLogicKey,
  expandMappedRowsForVersions,
  parseYearPeriod,
  previewRowToFrozenPayload,
  resolveVehicleVersionMatch,
  splitVersionSafe,
  comparePeriods,
  mergePeriods,
} from './applicationImportCore'
export type { ApplicationPreviewRow } from './applicationImportCore'
export {
  consolidateProductRows,
  splitHfMappedRows,
  productFrozenPayload,
} from './productImportCore'
export type { ProductPreviewRow } from './productImportCore'
export { getHfBundleContract } from './contracts'
