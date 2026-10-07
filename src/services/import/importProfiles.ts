export type ImportProfileKind = 'price_list' | 'catalog'

export type ImportColumnMapping = Record<string, string>

export type SavedImportProfile = {
  id: string
  name: string
  kind: ImportProfileKind
  /** Cabeçalhos normalizados usados para detecção */
  headersFingerprint: string[]
  /** Campo canônico → nome da coluna no arquivo */
  mapping: ImportColumnMapping
  allowZeroPrice?: boolean
  createdAt: string
  updatedAt: string
}

const STORAGE_PREFIX = 'hf-import-profiles:'

function storageKey(kind: ImportProfileKind): string {
  return `${STORAGE_PREFIX}${kind}`
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function fingerprintHeaders(headers: string[]): string[] {
  return headers.map(normalizeHeader).filter(Boolean).sort()
}

export function listImportProfiles(kind: ImportProfileKind): SavedImportProfile[] {
  try {
    const raw = localStorage.getItem(storageKey(kind))
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedImportProfile[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeProfiles(kind: ImportProfileKind, profiles: SavedImportProfile[]): void {
  localStorage.setItem(storageKey(kind), JSON.stringify(profiles))
}

export function saveImportProfile(
  input: Omit<SavedImportProfile, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): SavedImportProfile {
  const now = new Date().toISOString()
  const profiles = listImportProfiles(input.kind)
  const existingIdx = input.id ? profiles.findIndex((p) => p.id === input.id) : -1
  const profile: SavedImportProfile = {
    id: input.id ?? crypto.randomUUID(),
    name: input.name.trim(),
    kind: input.kind,
    headersFingerprint: input.headersFingerprint,
    mapping: input.mapping,
    allowZeroPrice: input.allowZeroPrice,
    createdAt: existingIdx >= 0 ? profiles[existingIdx]!.createdAt : now,
    updatedAt: now,
  }
  if (existingIdx >= 0) profiles[existingIdx] = profile
  else profiles.push(profile)
  writeProfiles(input.kind, profiles)
  return profile
}

export function deleteImportProfile(kind: ImportProfileKind, id: string): void {
  writeProfiles(
    kind,
    listImportProfiles(kind).filter((p) => p.id !== id),
  )
}

/** Detecta perfil cujo fingerprint de cabeçalho bate com o arquivo. */
export function detectImportProfile(
  kind: ImportProfileKind,
  headers: string[],
): SavedImportProfile | null {
  const fp = fingerprintHeaders(headers)
  const key = fp.join('|')
  for (const p of listImportProfiles(kind)) {
    if (p.headersFingerprint.join('|') === key) return p
  }
  return null
}
