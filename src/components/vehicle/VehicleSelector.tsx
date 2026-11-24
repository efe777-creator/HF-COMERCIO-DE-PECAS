import { Button } from '@/components/common/Button'
import { Select } from '@/components/common/Select'
import { SavedVehiclesQuickPick } from '@/components/vehicle/SavedVehiclesQuickPick'
import { useVehicleOptions } from '@/hooks/useCatalog'
import {
  buildVehicleQuery,
  vehicleModelVersionKey,
} from '@/services/vehicles/vehicleService'
import type { VehicleFilter } from '@/types'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loading } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/**
 * Seletor de veículo — TODOS os campos são opcionais e nunca bloqueiam a busca.
 * Cascata só reduz opções; não desabilita selects.
 * Label oficial: "Montadora" (nunca "marca do carro").
 */
export function VehicleSelector({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const { data: tree, loading, error } = useVehicleOptions()
  const [filter, setFilter] = useState<VehicleFilter>({})

  const modelOptions = useMemo(() => {
    if (!tree) return []
    const list = filter.maker
      ? (tree.modelsByMaker[filter.maker] ?? [])
      : uniqueSorted(Object.values(tree.modelsByMaker).flat())
    return list.map((m) => ({ value: m, label: m }))
  }, [tree, filter.maker])

  const versionOptions = useMemo(() => {
    if (!tree) return []
    const list = filter.model
      ? (tree.versionsByModel[filter.model] ?? [])
      : uniqueSorted(Object.values(tree.versionsByModel).flat())
    return list.map((v) => ({ value: v, label: v }))
  }, [tree, filter.model])

  const engineOptions = useMemo(() => {
    if (!tree) return []
    if (filter.model && filter.version) {
      const key = vehicleModelVersionKey(filter.model, filter.version)
      const byVersion = tree.enginesByModelVersion[key] ?? []
      if (byVersion.length) return byVersion.map((e) => ({ value: e, label: e }))
    }
    if (filter.model) {
      return (tree.enginesByModel[filter.model] ?? []).map((e) => ({ value: e, label: e }))
    }
    return uniqueSorted(Object.values(tree.enginesByModel).flat()).map((e) => ({
      value: e,
      label: e,
    }))
  }, [tree, filter.model, filter.version])

  const yearOptions = useMemo(() => {
    if (!tree) return []
    if (filter.model && filter.version) {
      const key = vehicleModelVersionKey(filter.model, filter.version)
      const byVersion = tree.yearsByModelVersion[key] ?? []
      if (byVersion.length) return byVersion.map((y) => ({ value: y, label: y }))
    }
    if (filter.model) {
      return (tree.yearsByModel[filter.model] ?? []).map((y) => ({ value: y, label: y }))
    }
    return uniqueSorted(Object.values(tree.yearsByModel).flat()).map((y) => ({
      value: y,
      label: y,
    }))
  }, [tree, filter.model, filter.version])

  if (loading) return <Loading label="Carregando veículos…" />
  if (error || !tree) return <ErrorState message={error ?? 'Dados de veículo indisponíveis'} />

  return (
    <div
      id="veiculo"
      className={[
        'rounded-[18px] bg-hf-surface text-hf-ink shadow-[0_20px_50px_rgba(0,0,0,0.2)]',
        compact ? 'p-4' : 'p-6',
      ].join(' ')}
    >
      <h2 className={['mt-0 font-extrabold', compact ? 'text-xl' : 'text-[23px]'].join(' ')}>
        Encontre peças para seu veículo
      </h2>
      <p className="text-sm text-hf-muted">
        Informe só o que souber — qualquer campo é opcional. Busca e filtros nunca se bloqueiam.
      </p>

      <div className="mt-3 border-t border-hf-line/60 pt-3">
        <SavedVehiclesQuickPick />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Montadora"
          name="maker"
          placeholder="Todas / opcional"
          value={filter.maker ?? ''}
          options={tree.makers.map((m) => ({ value: m, label: m }))}
          onChange={(e) => {
            const nextMaker = e.target.value || undefined
            const allowed = nextMaker ? (tree.modelsByMaker[nextMaker] ?? []) : []
            const modelOk = !nextMaker || !filter.model || allowed.includes(filter.model)
            setFilter((f) =>
              modelOk
                ? { ...f, maker: nextMaker }
                : {
                    maker: nextMaker,
                    model: undefined,
                    version: undefined,
                    engine: undefined,
                    year: undefined,
                  },
            )
          }}
        />
        <Select
          label="Modelo"
          name="model"
          placeholder="Todos / opcional"
          value={filter.model ?? ''}
          options={modelOptions}
          onChange={(e) => {
            const nextModel = e.target.value || undefined
            const versionOk =
              !nextModel ||
              !filter.version ||
              (tree.versionsByModel[nextModel] ?? []).includes(filter.version)
            setFilter((f) =>
              versionOk
                ? { ...f, model: nextModel }
                : {
                    ...f,
                    model: nextModel,
                    version: undefined,
                    engine: undefined,
                    year: undefined,
                  },
            )
          }}
        />
        <Select
          label="Versão"
          name="version"
          placeholder="Todas / opcional"
          value={filter.version ?? ''}
          options={versionOptions}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              version: e.target.value || undefined,
            }))
          }
        />
        <Select
          label="Motor"
          name="engine"
          placeholder="Todos / opcional"
          value={filter.engine ?? ''}
          options={engineOptions}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              engine: e.target.value || undefined,
            }))
          }
        />
        <Select
          label="Ano"
          name="year"
          placeholder="Todos / opcional"
          value={filter.year ?? ''}
          options={yearOptions}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              year: e.target.value || undefined,
            }))
          }
        />
      </div>

      <Button
        variant="primary"
        fullWidth
        className="mt-4"
        onClick={() => {
          const params = buildVehicleQuery(filter)
          const qs = params.toString()
          navigate(qs ? `/catalogo?${qs}` : '/catalogo')
        }}
      >
        Ver peças compatíveis
      </Button>
    </div>
  )
}
