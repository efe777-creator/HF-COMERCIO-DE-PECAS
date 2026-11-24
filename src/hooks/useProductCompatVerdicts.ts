import {
  classifyCardCompatibility,
  vehicleFilterToCompatInput,
  type CompatibilityVerdict,
} from '@/services/compatibility/compatibilityEngine'
import { loadPvcEvidenceByProductIds } from '@/services/compatibility/loadPvcEvidence'
import type { VehicleFilter } from '@/types'
import { useEffect, useMemo, useState } from 'react'

/** Reavalia fit para productIds sob filtro de veículo (URL/catálogo). Sem fit → mapa vazio. */
export function useProductCompatVerdicts(
  productIds: string[],
  vehicleFilter?: VehicleFilter | null,
): {
  loading: boolean
  verdicts: Map<string, CompatibilityVerdict>
} {
  const input = useMemo(() => vehicleFilterToCompatInput(vehicleFilter), [vehicleFilter])
  const idsKey = useMemo(
    () => [...new Set(productIds.filter(Boolean))].sort().join('|'),
    [productIds],
  )
  const [loading, setLoading] = useState(false)
  const [verdicts, setVerdicts] = useState<Map<string, CompatibilityVerdict>>(() => new Map())

  useEffect(() => {
    if (!input || !idsKey) {
      setVerdicts(new Map())
      setLoading(false)
      return
    }
    const ids = idsKey.split('|').filter(Boolean)
    let cancelled = false
    setLoading(true)
    void loadPvcEvidenceByProductIds(ids)
      .then((map) => {
        if (cancelled) return
        const next = new Map<string, CompatibilityVerdict>()
        for (const id of ids) {
          next.set(id, classifyCardCompatibility(input, map.get(id) ?? []))
        }
        setVerdicts(next)
      })
      .catch(() => {
        if (cancelled) return
        const next = new Map<string, CompatibilityVerdict>()
        for (const id of ids) {
          next.set(id, classifyCardCompatibility(input, []))
        }
        setVerdicts(next)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [input, idsKey])

  return { loading, verdicts }
}
