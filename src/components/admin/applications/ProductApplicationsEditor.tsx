import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  PVC_CASCADE_HINT,
  formatVehicleConfigIdentity,
  formatVehicleIdentity,
  pvcEngineOptions,
  pvcFuelOptions,
  pvcGenerationOptions,
  pvcMatchingVersions,
  pvcVersionNameOptions,
} from '@/lib/pvcVehicleCascade'
import {
  formatVehicleAppYear,
  productionYearOptions,
  validatePvcYearInputs,
} from '@/lib/vehicleAppYear'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  adminAddApplication,
  adminListApplications,
  adminRemoveApplication,
  adminUpdateApplication,
  type PvcValidationStatus,
} from '@/services/admin/adminProductService'
import { adminListModels, adminListVersions } from '@/services/admin/adminVehicleService'
import type { Manufacturer, VehicleModel, VehicleVersion } from '@/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export type ProductAppRow = {
  id: string
  year_start?: number | null
  year_end?: number | null
  validation_status?: string
  notes?: string | null
  vehicle_version_id?: string
  vehicle_versions?: {
    id?: string
    year: number | null
    engine: string | null
    fuel?: string | null
    version_name: string | null
    generation?: string | null
    manufacturer_id?: string
    model_id?: string
    manufacturers?:
      | { id?: string; name: string }
      | { id?: string; name: string }[]
    models?: { id?: string; name: string } | { id?: string; name: string }[]
  }
}

type Props = {
  productId: string
  makers?: Manufacturer[]
  onMutated?: () => void
  variant?: 'section' | 'embedded'
}

type FormState = {
  yearStart: string
  yearEnd: string
  notes: string
  validation: PvcValidationStatus
}

const emptyForm = (): FormState => ({
  yearStart: '',
  yearEnd: '',
  notes: '',
  validation: 'draft',
})

function oneName(
  v: { id?: string; name: string } | { id?: string; name: string }[] | undefined,
): { id: string | null; name: string | null } {
  if (!v) return { id: null, name: null }
  if (Array.isArray(v)) {
    const first = v[0]
    return { id: first?.id ?? null, name: first?.name ?? null }
  }
  return { id: v.id ?? null, name: v.name }
}

function rowLabel(row: ProductAppRow): string {
  const vv = row.vehicle_versions
  const identity = formatVehicleIdentity({
    maker: oneName(vv?.manufacturers).name,
    model: oneName(vv?.models).name,
    generation: vv?.generation || undefined,
    version: vv?.version_name,
    engine: vv?.engine,
    fuel: vv?.fuel,
    wildcards: true,
  })
  const years = formatVehicleAppYear({
    yearStart: row.year_start,
    yearEnd: row.year_end,
    versionYear: vv?.year,
  })
  return [identity, years || null, row.validation_status || null, row.notes?.trim() || null]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Aplicação = vínculo produto ↔ identificações do veículo
 * (versão → motor → período; geração/combustível opcionais).
 */
export function ProductApplicationsEditor({
  productId,
  makers: makersProp,
  onMutated,
  variant = 'section',
}: Props) {
  const compact = variant === 'embedded'
  const hydrateLock = useRef(false)

  const [apps, setApps] = useState<ProductAppRow[]>([])
  const [makers, setMakers] = useState<Manufacturer[]>(makersProp ?? [])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [versions, setVersions] = useState<VehicleVersion[]>([])

  const [makerId, setMakerId] = useState('')
  const [modelId, setModelId] = useState('')
  const [generation, setGeneration] = useState('')
  const [engine, setEngine] = useState('')
  const [fuel, setFuel] = useState('')
  const [versionName, setVersionName] = useState('')
  const [versionId, setVersionId] = useState('')

  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const generationOptions = useMemo(() => pvcGenerationOptions(versions), [versions])
  const versionNameOptions = useMemo(
    () => pvcVersionNameOptions(versions, generation),
    [versions, generation],
  )
  const engineOptions = useMemo(
    () => pvcEngineOptions(versions, generation, versionName),
    [versions, generation, versionName],
  )
  const fuelOptions = useMemo(
    () => pvcFuelOptions(versions, generation, versionName, engine),
    [versions, generation, versionName, engine],
  )
  const matching = useMemo(
    () => pvcMatchingVersions(versions, generation, versionName, engine, fuel),
    [versions, generation, versionName, engine, fuel],
  )
  const selectedIdentity = useMemo(() => {
    const hit = matching.find((v) => v.id === versionId) ?? matching[0]
    if (!hit) return null
    const maker = makers.find((m) => m.id === makerId)?.name
    const model = models.find((m) => m.id === modelId)?.name
    return formatVehicleIdentity({
      maker,
      model,
      generation: hit.generation || undefined,
      version: hit.versionName,
      engine: hit.engine,
      fuel: hit.fuel,
      wildcards: true,
    })
  }, [matching, versionId, makers, makerId, models, modelId])

  const selectedModel = models.find((m) => m.id === modelId)
  const fabLabel = selectedModel
    ? formatVehicleAppYear({
        yearStart: selectedModel.productionYearStart,
        yearEnd: selectedModel.productionYearEnd,
      })
    : null
  const pvcYearOptions = useMemo(
    () =>
      productionYearOptions(
        selectedModel?.productionYearStart,
        selectedModel?.productionYearEnd,
      ),
    [selectedModel],
  )

  useEffect(() => {
    if (makersProp) {
      setMakers(makersProp)
      return
    }
    void adminListManufacturers()
      .then(setMakers)
      .catch((e) => setError(String(e.message ?? e)))
  }, [makersProp])

  useEffect(() => {
    void adminListApplications(productId)
      .then((rows) => setApps(rows as ProductAppRow[]))
      .catch((e) => setError(String(e.message ?? e)))
  }, [productId])

  useEffect(() => {
    if (hydrateLock.current) return
    if (!makerId) {
      setModels([])
      setModelId('')
      setVersions([])
      setGeneration('')
      setEngine('')
      setFuel('')
      setVersionName('')
      setVersionId('')
      return
    }
    void adminListModels(makerId)
      .then(setModels)
      .catch(() => setModels([]))
  }, [makerId])

  useEffect(() => {
    if (hydrateLock.current) return
    if (!modelId) {
      setVersions([])
      setGeneration('')
      setEngine('')
      setFuel('')
      setVersionName('')
      setVersionId('')
      return
    }
    void adminListVersions(modelId)
      .then((rows) => setVersions(rows.filter((v) => v.status !== 'inactive')))
      .catch(() => setVersions([]))
  }, [modelId])

  /** Se o filtro deixa 1 config, seleciona automaticamente. */
  useEffect(() => {
    if (hydrateLock.current) return
    if (matching.length === 1) {
      setVersionId(matching[0]!.id)
      return
    }
    if (versionId && !matching.some((v) => v.id === versionId)) {
      setVersionId('')
    }
  }, [matching, versionId])

  async function reload() {
    setApps((await adminListApplications(productId)) as ProductAppRow[])
    onMutated?.()
  }

  function resetCascade() {
    setMakerId('')
    setModelId('')
    setModels([])
    setVersions([])
    setGeneration('')
    setEngine('')
    setFuel('')
    setVersionName('')
    setVersionId('')
  }

  function cancelEdit() {
    hydrateLock.current = false
    setEditingId(null)
    setForm(emptyForm())
    resetCascade()
  }

  async function startEdit(row: ProductAppRow) {
    hydrateLock.current = true
    setEditingId(row.id)
    setForm({
      yearStart: row.year_start != null ? String(row.year_start) : '',
      yearEnd: row.year_end != null ? String(row.year_end) : '',
      notes: row.notes ?? '',
      validation: (row.validation_status as PvcValidationStatus) || 'draft',
    })
    setMessage(null)
    setError(null)

    const vv = row.vehicle_versions
    const maker = oneName(vv?.manufacturers)
    const model = oneName(vv?.models)
    const mid = vv?.manufacturer_id || maker.id || ''
    const modId = vv?.model_id || model.id || ''
    const verId = row.vehicle_version_id || vv?.id || ''

    setMakerId(mid)
    setModelId('')
    setVersions([])
    setGeneration('')
    setEngine('')
    setFuel('')
    setVersionName('')
    setVersionId('')

    try {
      if (mid) {
        const mods = await adminListModels(mid)
        setModels(mods)
        setModelId(modId)
        if (modId) {
          const vers = (await adminListVersions(modId)).filter((v) => v.status !== 'inactive')
          setVersions(vers)
          const hit = vers.find((v) => v.id === verId)
          setGeneration(hit?.generation?.trim() || vv?.generation?.trim() || '')
          setEngine(hit?.engine?.trim() || vv?.engine?.trim() || '')
          setFuel(hit?.fuel?.trim() || vv?.fuel?.trim() || '')
          setVersionName(hit?.versionName?.trim() || vv?.version_name?.trim() || '')
          setVersionId(verId)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar cascata')
    } finally {
      // libera efeitos após o paint com estado hidratado
      requestAnimationFrame(() => {
        hydrateLock.current = false
      })
    }
  }

  async function submit() {
    const years = validatePvcYearInputs(form.yearStart, form.yearEnd)
    if (!years.ok) {
      setError(years.message)
      return
    }
    if (!makerId || !modelId) {
      setError('Selecione montadora e modelo (cadastro em Veículos)')
      return
    }
    if (!versionId) {
      setError(
        matching.length === 0
          ? 'Nenhuma identificação cadastrada bate com versão/motor. Cadastre em Veículos ou ajuste o filtro.'
          : 'Selecione a identificação do veículo (versão · motor · período)',
      )
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      if (editingId) {
        await adminUpdateApplication(editingId, {
          yearStart: years.yearStart,
          yearEnd: years.yearEnd,
          notes: form.notes.trim() || null,
          validationStatus: form.validation,
          vehicleVersionId: versionId,
        })
        setMessage('Aplicação atualizada.')
      } else {
        await adminAddApplication(productId, versionId, {
          yearStart: years.yearStart,
          yearEnd: years.yearEnd,
          notes: form.notes.trim() || undefined,
          validationStatus: form.validation,
        })
        setMessage('Aplicação vinculada.')
      }
      cancelEdit()
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar aplicação')
    } finally {
      setBusy(false)
    }
  }

  async function linkAllMatching() {
    if (matching.length < 2) return
    const years = validatePvcYearInputs(form.yearStart, form.yearEnd)
    if (!years.ok) {
      setError(years.message)
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      let n = 0
      for (const v of matching) {
        await adminAddApplication(productId, v.id, {
          yearStart: years.yearStart,
          yearEnd: years.yearEnd,
          notes: form.notes.trim() || undefined,
          validationStatus: form.validation,
        })
        n += 1
      }
      cancelEdit()
      await reload()
      setMessage(`${n} aplicações vinculadas.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao vincular em lote')
    } finally {
      setBusy(false)
    }
  }

  const selectCls = 'w-full rounded-[10px] border border-hf-line px-3 py-2 text-sm'

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'} data-apps-editor={variant}>
      <p className="m-0 text-xs text-hf-muted">
        {PVC_CASCADE_HINT} Lado/posição da peça ficam no cadastro do produto.
      </p>
      <p className="m-0 text-xs text-hf-muted">
        Identificações vêm de{' '}
        <Link className="font-semibold text-hf-auth-link" to="/admin/veiculos">
          Veículos
        </Link>{' '}
        (versão → motor → período).
      </p>
      {error ? <p className="m-0 text-xs text-hf-danger">{error}</p> : null}
      {message ? <p className="m-0 text-xs font-semibold text-hf-ink">{message}</p> : null}

      <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
        {editingId ? 'Editar aplicação' : 'Nova aplicação'}
      </p>

      <div className={compact ? 'grid gap-2' : 'grid gap-2 md:grid-cols-3 lg:grid-cols-4'}>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Montadora</span>
          <select
            className={selectCls}
            value={makerId}
            onChange={(e) => {
              hydrateLock.current = false
              setMakerId(e.target.value)
              setModelId('')
              setGeneration('')
              setVersionName('')
              setEngine('')
              setFuel('')
              setVersionId('')
            }}
          >
            <option value="">—</option>
            {makers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold">Modelo</span>
          <select
            className={selectCls}
            value={modelId}
            disabled={!makerId}
            onChange={(e) => {
              hydrateLock.current = false
              setModelId(e.target.value)
              setGeneration('')
              setVersionName('')
              setEngine('')
              setFuel('')
              setVersionId('')
            }}
          >
            <option value="">—</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold">Versão</span>
          <select
            className={selectCls}
            value={versionName}
            disabled={!modelId}
            onChange={(e) => {
              setVersionName(e.target.value)
              setEngine('')
              setFuel('')
              setVersionId('')
            }}
          >
            <option value="">Todas / qualquer</option>
            {versionNameOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold">Motor</span>
          <select
            className={selectCls}
            value={engine}
            disabled={!modelId}
            onChange={(e) => {
              setEngine(e.target.value)
              setFuel('')
              setVersionId('')
            }}
          >
            <option value="">Todos / qualquer</option>
            {engineOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold">Geração (opcional)</span>
          <select
            className={selectCls}
            value={generation}
            disabled={!modelId}
            onChange={(e) => {
              setGeneration(e.target.value)
              setVersionId('')
            }}
          >
            <option value="">Qualquer</option>
            {generationOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold">Combustível (opcional)</span>
          <select
            className={selectCls}
            value={fuel}
            disabled={!modelId}
            onChange={(e) => {
              setFuel(e.target.value)
              setVersionId('')
            }}
          >
            <option value="">Qualquer</option>
            {fuelOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm md:col-span-2">
          <span className="mb-1 block font-semibold">
            Identificação do veículo ({matching.length})
          </span>
          <select
            className={selectCls}
            value={versionId}
            disabled={!modelId || matching.length === 0}
            onChange={(e) => setVersionId(e.target.value)}
          >
            <option value="">
              {matching.length === 0
                ? 'Nenhuma identificação bate — ajuste filtro ou cadastre em Veículos'
                : 'Escolher identificação…'}
            </option>
            {matching.map((v) => (
              <option key={v.id} value={v.id}>
                {formatVehicleConfigIdentity(v, { includeYear: true })}
              </option>
            ))}
          </select>
          {selectedIdentity ? (
            <p className="mt-1 m-0 text-[11px] font-semibold text-hf-ink">{selectedIdentity}</p>
          ) : null}
        </label>

        {selectedModel ? (
          <p className="m-0 text-[11px] text-hf-muted md:col-span-2 lg:col-span-4">
            Fabricação do modelo {selectedModel.name}: {fabLabel ?? 'não informada'} (≠ período da
            aplicação abaixo — anos em que a peça serve).
          </p>
        ) : null}

        <label className="text-sm">
          <span className="mb-1 block font-semibold">Período da aplicação — início</span>
          <select
            className={selectCls}
            value={form.yearStart}
            disabled={!modelId || pvcYearOptions.length === 0}
            onChange={(e) => setForm((f) => ({ ...f, yearStart: e.target.value }))}
          >
            <option value="">—</option>
            {pvcYearOptions.map((y) => (
              <option key={`s-${y}`} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
          {modelId && pvcYearOptions.length === 0 ? (
            <p className="mt-1 m-0 text-[11px] text-hf-muted">
              Cadastre início de fabricação no modelo em Veículos.
            </p>
          ) : null}
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">
            Período da aplicação — fim (vazio = vigente)
          </span>
          <select
            className={selectCls}
            value={form.yearEnd}
            disabled={!modelId || pvcYearOptions.length === 0}
            onChange={(e) => setForm((f) => ({ ...f, yearEnd: e.target.value }))}
          >
            <option value="">Vigente / aberto</option>
            {pvcYearOptions.map((y) => (
              <option key={`e-${y}`} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Validação</span>
          <select
            className={selectCls}
            value={form.validation}
            onChange={(e) =>
              setForm((f) => ({ ...f, validation: e.target.value as PvcValidationStatus }))
            }
          >
            <option value="draft">Rascunho</option>
            <option value="validated">Validada</option>
            <option value="rejected">Rejeitada</option>
          </select>
        </label>
        <Input
          label="Observação"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Opcional"
        />

        <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-4">
          <Button type="button" disabled={busy || !versionId} onClick={() => void submit()}>
            {busy ? '…' : editingId ? 'Salvar aplicação' : 'Vincular aplicação'}
          </Button>
          {!editingId && matching.length > 1 ? (
            <Button
              type="button"
              variant="light"
              disabled={busy}
              onClick={() => void linkAllMatching()}
            >
              Vincular todas ({matching.length})
            </Button>
          ) : null}
          {editingId ? (
            <Button type="button" variant="light" disabled={busy} onClick={cancelEdit}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </div>

      <ul
        className={[
          'm-0 space-y-1 p-0 list-none text-xs',
          compact ? 'max-h-56 overflow-y-auto' : '',
        ].join(' ')}
      >
        {apps.length === 0 ? (
          <li className="text-hf-muted">Nenhuma aplicação.</li>
        ) : (
          apps.map((a) => (
            <li
              key={a.id}
              className={[
                'flex flex-wrap items-center justify-between gap-2 border-b border-hf-line py-1.5',
                editingId === a.id ? 'bg-hf-red/5' : '',
              ].join(' ')}
            >
              <span className="min-w-0 flex-1">{rowLabel(a)}</span>
              <span className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="font-semibold text-hf-auth-link"
                  onClick={() => void startEdit(a)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="font-semibold text-hf-danger"
                  onClick={() => {
                    if (!window.confirm('Remover esta aplicação?')) return
                    void adminRemoveApplication(a.id)
                      .then(() => reload())
                      .catch((e) => setError(String(e.message ?? e)))
                  }}
                >
                  Remover
                </button>
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
