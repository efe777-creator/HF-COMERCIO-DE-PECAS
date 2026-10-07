import { Button } from '@/components/common/Button'
import { Select } from '@/components/common/Select'
import { SavedVehiclesQuickPick } from '@/components/vehicle/SavedVehiclesQuickPick'
import { useVehicleOptions } from '@/hooks/useCatalog'
import { buildVehicleQuery } from '@/services/vehicles/vehicleService'
import type { VehicleFilter } from '@/types'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loading } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'

/**
 * Seletor de veículo — TODOS os campos são opcionais.
 * Qualquer subconjunto (ou nenhum) pode iniciar a busca.
 * Label oficial: "Montadora" (nunca "marca do carro").
 */
export function VehicleSelector({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const { data: tree, loading, error } = useVehicleOptions()
  const [filter, setFilter] = useState<VehicleFilter>({})

  const modelOptions = useMemo(() => {
    if (!tree || !filter.maker) {
      // Modelos de todas as montadoras se Montadora vazia — permite Modelo isolado
      if (!tree) return []
      const all = Object.values(tree.modelsByMaker).flat()
      return [...new Set(all)].sort().map((m) => ({ value: m, label: m }))
    }
    return (tree.modelsByMaker[filter.maker] ?? []).map((m) => ({ value: m, label: m }))
  }, [tree, filter.maker])

  const yearOptions = useMemo(() => {
    if (!tree || !filter.model) {
      if (!tree) return []
      const all = Object.values(tree.yearsByModel).flat()
      return [...new Set(all)].sort().map((y) => ({ value: y, label: y }))
    }
    return (tree.yearsByModel[filter.model] ?? []).map((y) => ({ value: y, label: y }))
  }, [tree, filter.model])

  const engineOptions = useMemo(() => {
    if (!tree) return []
    if (filter.model && filter.year) {
      const key = `${filter.model}|${filter.year}`
      return (tree.enginesByModelYear[key] ?? []).map((e) => ({ value: e, label: e }))
    }
    // Motor isolado: lista valores conhecidos
    const all = Object.values(tree.enginesByModelYear).flat()
    return [...new Set(all)].sort().map((e) => ({ value: e, label: e }))
  }, [tree, filter.model, filter.year])

  if (loading) return <Loading label="Carregando veículos…" />
  if (error || !tree) return <ErrorState message={error ?? 'Dados de veículo indisponíveis'} />

  return (
    <div
      id="veiculo"
      className={[
        'rounded-[18px] bg-white text-fal-navy-dark shadow-[0_20px_50px_rgba(0,0,0,0.2)]',
        compact ? 'p-4' : 'p-6',
      ].join(' ')}
    >
      <h2 className={['mt-0 font-extrabold', compact ? 'text-xl' : 'text-[23px]'].join(' ')}>
        🚗 Encontre peças para seu veículo
      </h2>
      <p className="text-sm text-fal-muted">
        Você pode informar apenas um critério ou combinar Montadora, Modelo, Ano e Motor para
        refinar a busca. Nenhum campo é obrigatório.
      </p>

      <div className="mt-3 border-t border-fal-line/60 pt-3">
        <SavedVehiclesQuickPick />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Montadora"
          name="maker"
          placeholder="Todas / opcional"
          value={filter.maker ?? ''}
          options={tree.makers.map((m) => ({ value: m, label: m }))}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              maker: e.target.value || undefined,
              // limpa dependentes apenas quando montadora muda para valor diferente
              model: undefined,
              year: undefined,
              engine: undefined,
            }))
          }
        />
        <Select
          label="Modelo"
          name="model"
          placeholder="Todos / opcional"
          value={filter.model ?? ''}
          options={modelOptions}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              model: e.target.value || undefined,
              year: undefined,
              engine: undefined,
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
              engine: undefined,
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
