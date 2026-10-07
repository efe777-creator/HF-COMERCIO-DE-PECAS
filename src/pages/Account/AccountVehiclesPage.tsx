import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import {
  addSavedVehicle,
  listSavedVehicles,
  removeSavedVehicle,
  resolveVersionId,
  setPrimaryVehicle,
} from '@/services/customers/customerVehicleService'
import { getVehicleOptions } from '@/services/vehicles/vehicleService'
import type { CustomerSavedVehicle, VehicleOptionTree } from '@/types'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

export function AccountVehiclesPage() {
  const [items, setItems] = useState<CustomerSavedVehicle[]>([])
  const [tree, setTree] = useState<VehicleOptionTree | null>(null)
  const [maker, setMaker] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [engine, setEngine] = useState('')
  const [version, setVersion] = useState('')
  const [nickname, setNickname] = useState('')
  const [asPrimary, setAsPrimary] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const [list, options] = await Promise.all([listSavedVehicles(), getVehicleOptions()])
      setItems(list)
      setTree(options)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar veículos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const modelOptions = useMemo(() => {
    if (!tree || !maker) return []
    return (tree.modelsByMaker[maker] ?? []).map((m) => ({ value: m, label: m }))
  }, [tree, maker])

  const yearOptions = useMemo(() => {
    if (!tree || !model) return []
    return (tree.yearsByModel[model] ?? []).map((y) => ({ value: y, label: y }))
  }, [tree, model])

  const engineOptions = useMemo(() => {
    if (!tree || !model) return []
    if (year) {
      const byYear = tree.enginesByModelYear[`${model}|${year}`] ?? []
      if (byYear.length) return byYear.map((e) => ({ value: e, label: e }))
    }
    return (tree.enginesByModel[model] ?? []).map((e) => ({ value: e, label: e }))
  }, [tree, model, year])

  const versionOptions = useMemo(() => {
    if (!tree || !model) return []
    return (tree.versionsByModel[model] ?? []).map((v) => ({ value: v, label: v }))
  }, [tree, model])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!maker || !model) {
      setError('Selecione montadora e modelo.')
      return
    }
    try {
      const resolved = await resolveVersionId({ maker, model, year, engine, version })
      if (!resolved) {
        setError('Nenhuma configuração correspondente no cadastro mestre. Ajuste os filtros.')
        return
      }
      await addSavedVehicle({
        versionId: resolved.versionId,
        manufacturerId: resolved.manufacturerId,
        modelId: resolved.modelId,
        year: resolved.year,
        engine: resolved.engine,
        nickname,
        isPrimary: asPrimary || items.length === 0,
      })
      setMaker('')
      setModel('')
      setYear('')
      setEngine('')
      setVersion('')
      setNickname('')
      setAsPrimary(false)
      setMessage('Veículo salvo.')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar veículo')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-fal border border-fal-line bg-white p-5">
        <h2 className="mt-0 text-xl font-extrabold">Meus veículos</h2>
        <p className="text-sm text-fal-muted">
          Referencia o cadastro mestre (não cria montadora/modelo novos). Use na busca pelo
          catálogo.
        </p>
        {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
        {message ? <p className="text-sm font-semibold text-fal-navy">{message}</p> : null}

        <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Select
            label="Montadora"
            value={maker}
            options={(tree?.makers ?? []).map((m) => ({ value: m, label: m }))}
            placeholder="Selecione"
            onChange={(e) => {
              setMaker(e.target.value)
              setModel('')
              setYear('')
              setEngine('')
              setVersion('')
            }}
          />
          <Select
            label="Modelo"
            value={model}
            options={modelOptions}
            placeholder="Selecione"
            disabled={!maker}
            onChange={(e) => {
              setModel(e.target.value)
              setYear('')
              setEngine('')
              setVersion('')
            }}
          />
          <Select
            label="Ano"
            value={year}
            options={yearOptions}
            placeholder="Opcional"
            disabled={!model}
            onChange={(e) => setYear(e.target.value)}
          />
          <Select
            label="Motor"
            value={engine}
            options={engineOptions}
            placeholder="Opcional"
            disabled={!model}
            onChange={(e) => setEngine(e.target.value)}
          />
          <Select
            label="Versão"
            value={version}
            options={versionOptions}
            placeholder="Opcional"
            disabled={!model}
            onChange={(e) => setVersion(e.target.value)}
          />
          <Input label="Apelido (opcional)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
            <input type="checkbox" checked={asPrimary} onChange={(e) => setAsPrimary(e.target.checked)} />
            Definir como veículo principal
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Salvar veículo</Button>
          </div>
        </form>
      </div>

      {loading ? <Loading /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="Você ainda não cadastrou nenhum veículo."
          description="Salve um veículo do catálogo mestre para facilitar buscas futuras."
        />
      ) : null}

      <div className="space-y-3">
        {items.map((v) => (
          <div key={v.id} className="rounded-fal border border-fal-line bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="m-0 font-extrabold">
                  {v.nickname || `${v.makerName ?? ''} ${v.modelName ?? ''}`.trim() || 'Veículo'}
                  {v.isPrimary ? <span className="text-xs text-fal-success"> · Principal</span> : null}
                </p>
                <p className="mb-0 mt-1 text-sm text-fal-muted">
                  {[v.makerName, v.modelName, v.year, v.engine, v.versionName].filter(Boolean).join(' · ')}
                </p>
                <Link
                  className="mt-2 inline-block text-sm font-semibold text-fal-auth-link"
                  to={`/catalogo?maker=${encodeURIComponent(v.makerName ?? '')}&model=${encodeURIComponent(v.modelName ?? '')}${v.year ? `&year=${v.year}` : ''}${v.engine ? `&engine=${encodeURIComponent(v.engine)}` : ''}${v.versionName ? `&version=${encodeURIComponent(v.versionName)}` : ''}`}
                >
                  Ver peças compatíveis
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {!v.isPrimary ? (
                  <Button
                    type="button"
                    variant="light"
                    size="sm"
                    onClick={() =>
                      void setPrimaryVehicle(v.id)
                        .then(reload)
                        .catch((err) => setError(String(err)))
                    }
                  >
                    Tornar principal
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (!window.confirm('Remover este veículo salvo?')) return
                    void removeSavedVehicle(v.id)
                      .then(reload)
                      .catch((err) => setError(String(err)))
                  }}
                >
                  Remover
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
