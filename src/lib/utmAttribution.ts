/** UTM em sessionStorage → leads.attribution (Onda 3/5). */

const KEY = 'hf_utm_attribution'

export type UtmAttribution = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export function captureUtmFromSearch(search: string): void {
  try {
    const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    const next: UtmAttribution = {}
    const s = q.get('utm_source')?.trim()
    const m = q.get('utm_medium')?.trim()
    const c = q.get('utm_campaign')?.trim()
    if (s) next.utm_source = s
    if (m) next.utm_medium = m
    if (c) next.utm_campaign = c
    if (!Object.keys(next).length) return
    sessionStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function readStoredUtmAttribution(): UtmAttribution | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UtmAttribution
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}
