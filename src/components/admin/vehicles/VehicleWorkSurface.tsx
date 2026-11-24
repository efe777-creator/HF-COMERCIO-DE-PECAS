import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { entityStatusLabel } from '@/lib/adminLabels'
import {
  formatVehicleIdentity,
  pvcConfigMatchesTerm,
  pvcEngineOptions,
  pvcFuelOptions,
  pvcGenerationOptions,
  pvcVersionNameOptions,
  VEHICLE_HIERARCHY_SHORT,
} from '@/lib/pvcVehicleCascade'
import {
  catalogFabricationYearOptions,
  formatVehicleAppYear,
  productionYearOptions,
} from '@/lib/vehicleAppYear'
import { adminUpsertManufacturer } from '@/services/admin/adminManufacturerService'
import {
  adminGetVehicleModel,
  adminListVersions,
  adminSetModelStatus,
  adminSetVersionStatus,
  adminUpsertModel,
  adminUpsertVersion,
  VEHICLE_NEW_MODEL_TAB_ID,
  type AdminVehicleModelListItem,
} from '@/services/admin/adminVehicleService'
import type { Manufacturer, VehicleVersion } from '@/types'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  modelId: string
  manufacturers: Manufacturer[]
  onManufacturersChange?: (list: Manufacturer[]) => void
  onClose: () => void
  onCreated?: (created: AdminVehicleModelListItem, draftTabId: string) => void
  onModelUpdated?: (model: AdminVehicleModelListItem) => void
}

export function VehicleWorkSurface({
  modelId,
  manufacturers,
  onManufacturersChange,
  onClose,
  onCreated,
  onModelUpdated,
}: Props) {
  const isNew = modelId === VEHICLE_NEW_MODEL_TAB_ID

  const [loading, setLoading] = useState(!isNew)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showNewMaker, setShowNewMaker] = useState(false)
  const [newMakerName, setNewMakerName] = useState('')

  const [manufacturerId, setManufacturerId] = useState('')
  const [name, setName] = useState('')
  const [prodYearStart, setProdYearStart] = useState('')
  const [prodYearEnd, setProdYearEnd] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [manufacturerName, setManufacturerName] = useState('')
  const [versionCount, setVersionCount] = useState(0)

  const [versions, setVersions] = useState<VehicleVersion[]>([])
  const [configQ, setConfigQ] = useState('')
  const [showInactiveConfigs, setShowInactiveConfigs] = useState(false)
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null)
  const [configYearStart, setConfigYearStart] = useState('')
  const [configYearEnd, setConfigYearEnd] = useState('')
  const [generation, setGeneration] = useState('')
  const [engine, setEngine] = useState('')
  const [fuel, setFuel] = useState('')
  const [versionName, setVersionName] = useState('')

  const fabYearOptions = useMemo(() => catalogFabricationYearOptions(), [])
  const yearOptions = useMemo(
    () =>
      productionYearOptions(
        prodYearStart.trim() ? Number(prodYearStart) : null,
        prodYearEnd.trim() ? Number(prodYearEnd) : null,
      ),
    [prodYearStart, prodYearEnd],
  )
  const generationSuggestions = useMemo(() => pvcGenerationOptions(versions), [versions])
  const versionSuggestions = useMemo(
    () => pvcVersionNameOptions(versions, generation),
    [versions, generation],
  )
  const engineSuggestions = useMemo(
    () => pvcEngineOptions(versions, generation, versionName),
    [versions, generation, versionName],
  )
  const fuelSuggestions = useMemo(
    () => pvcFuelOptions(versions, generation, versionName, engine),
    [versions, generation, versionName, engine],
  )

  const activeVersionCount = useMemo(
    () => versions.filter((v) => v.status === 'active').length,
    [versions],
  )

  const filteredVersions = useMemo(
    () =>
      versions.filter((v) => {
        if (!showInactiveConfigs && v.status !== 'active') return false
        return pvcConfigMatchesTerm(v, configQ)
      }),
    [versions, configQ, showInactiveConfigs],
  )

  /** Após salvar: mantém motor + período (+ opcionais); limpa versão. */
  const resetVersionForm = useCallback((opts?: { clearSticky?: boolean }) => {
    setEditingVersionId(null)
    setVersionName('')
    if (opts?.clearSticky) {
      setConfigYearStart('')
      setConfigYearEnd('')
      setEngine('')
      setGeneration('')
      setFuel('')
    }
  }, [])

  function periodsOverlap(
    aStart: number | null,
    aEnd: number | null,
    bStart: number | null,
    bEnd: number | null,
  ): boolean {
    const a0 = aStart ?? Number.NEGATIVE_INFINITY
    const a1 = aEnd ?? Number.POSITIVE_INFINITY
    const b0 = bStart ?? Number.NEGATIVE_INFINITY
    const b1 = bEnd ?? Number.POSITIVE_INFINITY
    return a0 <= b1 && b0 <= a1
  }

  function findNearDuplicate(
    excludeId: string | null,
    ys: number | null,
    ye: number | null,
  ): VehicleVersion | null {
    const g = generation.trim()
    const ver = versionName.trim()
    const eng = engine.trim()
    const fu = fuel.trim()
    return (
      versions.find((v) => {
        if (excludeId && v.id === excludeId) return false
        if ((v.generation ?? '').trim() !== g) return false
        if ((v.versionName ?? '').trim() !== ver) return false
        if ((v.engine ?? '').trim() !== eng) return false
        if ((v.fuel ?? '').trim() !== fu) return false
        return periodsOverlap(ys, ye, v.yearStart ?? v.year, v.yearEnd)
      }) ?? null
    )
  }

  const load = useCallback(async () => {
    if (isNew) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const row = await adminGetVehicleModel(modelId)
      if (!row) {
        setError('Modelo não encontrado.')
        return
      }
      setManufacturerId(row.manufacturerId)
      setManufacturerName(row.manufacturerName)
      setName(row.name)
      setProdYearStart(row.productionYearStart != null ? String(row.productionYearStart) : '')
      setProdYearEnd(row.productionYearEnd != null ? String(row.productionYearEnd) : '')
      setStatus(row.status)
      const list = await adminListVersions(modelId)
      setVersions(list)
      setVersionCount(list.filter((v) => v.status === 'active').length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar modelo')
    } finally {
      setLoading(false)
    }
  }, [isNew, modelId])

  useEffect(() => {
    void load()
  }, [load])

  function toListItem(
    id: string,
    saved?: Partial<AdminVehicleModelListItem>,
  ): AdminVehicleModelListItem {
    const maker =
      manufacturers.find((m) => m.id === manufacturerId)?.name || manufacturerName || '—'
    const previews = versions.slice(0, 3).map((v) => ({
      generation: v.generation,
      versionName: v.versionName,
      engine: v.engine,
      fuel: v.fuel,
    }))
    return {
      id,
      manufacturerId,
      manufacturerName: maker,
      name: name.trim(),
      slug: saved?.slug ?? '',
      status,
      productionYearStart: prodYearStart.trim() ? Number(prodYearStart) : null,
      productionYearEnd: prodYearEnd.trim() ? Number(prodYearEnd) : null,
      versionCount: saved?.versionCount ?? versionCount,
      configPreviews: saved?.configPreviews ?? previews,
      ...saved,
    }
  }

  async function createMakerInline() {
    if (!newMakerName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const created = await adminUpsertManufacturer({ name: newMakerName.trim(), status: 'active' })
      const next = [...manufacturers.filter((m) => m.id !== created.id), created].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR'),
      )
      onManufacturersChange?.(next)
      setManufacturerId(created.id)
      setManufacturerName(created.name)
      setNewMakerName('')
      setShowNewMaker(false)
      setMessage(`Montadora "${created.name}" criada.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar montadora')
    } finally {
      setBusy(false)
    }
  }

  async function saveModel(e: FormEvent) {
    e.preventDefault()
    if (!manufacturerId || !name.trim()) {
      setError('Informe montadora e nome do modelo.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await adminUpsertModel({
        id: isNew ? undefined : modelId,
        manufacturerId,
        name,
        status,
        productionYearStart: prodYearStart.trim() ? Number(prodYearStart) : null,
        productionYearEnd: prodYearEnd.trim() ? Number(prodYearEnd) : null,
      })
      const makerName =
        manufacturers.find((m) => m.id === manufacturerId)?.name || manufacturerName || '—'
      const item: AdminVehicleModelListItem = {
        ...saved,
        manufacturerName: makerName,
        versionCount: isNew ? 0 : versionCount,
        configPreviews: isNew
          ? []
          : versions.slice(0, 3).map((v) => ({
              generation: v.generation,
              versionName: v.versionName,
              engine: v.engine,
              fuel: v.fuel,
            })),
      }
      if (isNew) {
        onCreated?.(item, VEHICLE_NEW_MODEL_TAB_ID)
        setMessage('Modelo criado.')
      } else {
        onModelUpdated?.(item)
        setMessage('Modelo salvo.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar modelo')
    } finally {
      setBusy(false)
    }
  }

  async function toggleModelStatus() {
    if (isNew) return
    const next = status === 'active' ? 'inactive' : 'active'
    setBusy(true)
    setError(null)
    try {
      await adminSetModelStatus(modelId, next)
      setStatus(next)
      onModelUpdated?.(toListItem(modelId, { status: next }))
      setMessage(next === 'active' ? 'Modelo ativado.' : 'Modelo inativado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao alterar status')
    } finally {
      setBusy(false)
    }
  }

  async function saveVersion(e: FormEvent) {
    e.preventDefault()
    if (isNew || !manufacturerId) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const ys = configYearStart.trim() ? Number(configYearStart) : null
      const ye = configYearEnd.trim() ? Number(configYearEnd) : null
      if (ys != null && ye != null && ye < ys) {
        setError('Ano fim da configuração menor que o ano início.')
        setBusy(false)
        return
      }
      const fabStart = prodYearStart.trim() ? Number(prodYearStart) : null
      const fabEnd = prodYearEnd.trim() ? Number(prodYearEnd) : null
      if (fabStart != null && ys != null && ys < fabStart) {
        setError(`Ano início da config (${ys}) anterior à fabricação do modelo (${fabStart}).`)
        setBusy(false)
        return
      }
      if (fabEnd != null && ys != null && ys > fabEnd) {
        setError(`Ano início da config (${ys}) posterior ao fim de linha do modelo (${fabEnd}).`)
        setBusy(false)
        return
      }
      if (fabEnd != null && ye != null && ye > fabEnd) {
        setError(`Ano fim da config (${ye}) posterior ao fim de linha do modelo (${fabEnd}).`)
        setBusy(false)
        return
      }
      if (fabStart != null && ye != null && ye < fabStart) {
        setError(`Ano fim da config (${ye}) anterior à fabricação do modelo (${fabStart}).`)
        setBusy(false)
        return
      }

      if (versionName.includes('/')) {
        const ok = window.confirm(
          'A versão parece ter vários nomes separados por “/”. Cada versão (ex.: Sense, Sense Plus) deve ser uma configuração própria. Salvar assim mesmo?',
        )
        if (!ok) {
          setBusy(false)
          return
        }
      }

      const dup = findNearDuplicate(editingVersionId, ys, ye)
      if (dup) {
        const ok = window.confirm(
          'Já existe configuração com a mesma geração/versão/motor/combustível e período sobreposto. Salvar mesmo assim?',
        )
        if (!ok) {
          setBusy(false)
          return
        }
      }

      const wasEditing = Boolean(editingVersionId)
      await adminUpsertVersion({
        id: editingVersionId ?? undefined,
        manufacturerId,
        modelId,
        yearStart: ys,
        yearEnd: ye,
        generation: generation.trim() || null,
        engine: engine.trim() || null,
        fuel: fuel.trim() || null,
        versionName: versionName.trim() || null,
        status: versions.find((v) => v.id === editingVersionId)?.status ?? 'active',
      })
      const list = await adminListVersions(modelId)
      const activeList = list.filter((v) => v.status === 'active')
      setVersions(list)
      setVersionCount(activeList.length)
      resetVersionForm()
      onModelUpdated?.(
        toListItem(modelId, {
          versionCount: activeList.length,
          configPreviews: activeList.slice(0, 3).map((v) => ({
            generation: v.generation,
            versionName: v.versionName,
            engine: v.engine,
            fuel: v.fuel,
          })),
        }),
      )
      setMessage(
        wasEditing
          ? 'Configuração atualizada. Motor/período mantidos — informe a próxima versão.'
          : 'Configuração criada. Motor/período mantidos — informe a próxima versão.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar configuração')
    } finally {
      setBusy(false)
    }
  }

  function startEditVersion(v: VehicleVersion) {
    setEditingVersionId(v.id)
    const start = v.yearStart ?? v.year
    setConfigYearStart(start != null ? String(start) : '')
    setConfigYearEnd(v.yearEnd != null ? String(v.yearEnd) : '')
    setGeneration(v.generation ?? '')
    setEngine(v.engine ?? '')
    setFuel(v.fuel ?? '')
    setVersionName(v.versionName ?? '')
  }

  if (loading) {
    return <p className="m-0 p-3 text-sm text-hf-muted">Carregando modelo…</p>
  }

  const headerIdentity = formatVehicleIdentity({
    maker: manufacturerName || manufacturers.find((m) => m.id === manufacturerId)?.name,
    model: name,
  })

  return (
    <div className="space-y-3 p-2" data-vehicle-work-surface={isNew ? 'new' : 'edit'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
            {isNew ? 'Novo modelo' : 'Guia do modelo'}
          </p>
          <h2 className="m-0 text-base font-extrabold text-hf-ink">
            {isNew ? 'Cadastro' : headerIdentity || name || '—'}
          </h2>
          {!isNew ? (
            <p className="m-0 text-xs text-hf-muted">
              {entityStatusLabel(status)} · {versionCount} config(s)
            </p>
          ) : null}
        </div>
        <button type="button" className="text-xs font-semibold text-hf-muted" onClick={onClose}>
          Fechar
        </button>
      </div>

      {error ? <p className="m-0 text-xs text-hf-danger">{error}</p> : null}
      {message ? <p className="m-0 text-xs font-semibold text-hf-ink">{message}</p> : null}

      <form
        onSubmit={(e) => void saveModel(e)}
        className="space-y-3 rounded-[12px] border border-hf-line bg-hf-surface p-3"
      >
        <div className="space-y-2">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
            1. Montadora
          </p>
          {isNew ? (
            <>
              <select
                className="w-full rounded-[10px] border border-hf-line px-3 py-2 text-sm"
                value={manufacturerId}
                required
                onChange={(e) => setManufacturerId(e.target.value)}
              >
                <option value="">Selecione</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {!showNewMaker ? (
                <button
                  type="button"
                  className="text-[11px] font-semibold text-hf-auth-link"
                  onClick={() => setShowNewMaker(true)}
                >
                  + Nova montadora
                </button>
              ) : (
                <div className="flex flex-wrap items-end gap-2 rounded-[10px] border border-hf-line bg-hf-bg/50 p-2">
                  <div className="min-w-[160px] flex-1">
                    <Input
                      label="Nome da montadora"
                      value={newMakerName}
                      onChange={(e) => setNewMakerName(e.target.value)}
                      placeholder="Ex.: Volkswagen"
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={busy || !newMakerName.trim()}
                    onClick={() => void createMakerInline()}
                  >
                    Criar
                  </Button>
                  <Button type="button" variant="light" onClick={() => setShowNewMaker(false)}>
                    Cancelar
                  </Button>
                </div>
              )}
              <p className="m-0 text-[11px] text-hf-muted">
                Lista completa em{' '}
                <Link className="font-semibold text-hf-auth-link" to="/admin/montadoras">
                  Montadoras
                </Link>
                .
              </p>
            </>
          ) : (
            <p className="m-0 rounded-[10px] border border-hf-line bg-hf-bg px-3 py-2 text-sm font-semibold">
              {manufacturerName || '—'}
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-hf-line pt-3">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
            2. Modelo
          </p>
          <Input
            label="Nome do modelo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ex.: Gol"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Início de fabricação</span>
              <select
                className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                value={prodYearStart}
                onChange={(e) => {
                  const next = e.target.value
                  setProdYearStart(next)
                  if (
                    next &&
                    prodYearEnd &&
                    Number(prodYearEnd) < Number(next)
                  ) {
                    setProdYearEnd('')
                  }
                  setConfigYearStart('')
                  setConfigYearEnd('')
                }}
              >
                <option value="">—</option>
                {fabYearOptions.map((y) => (
                  <option key={`fab-s-${y}`} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Saiu de linha</span>
              <select
                className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                value={prodYearEnd}
                onChange={(e) => {
                  setProdYearEnd(e.target.value)
                  setConfigYearStart('')
                  setConfigYearEnd('')
                }}
              >
                <option value="">Em linha / desconhecido</option>
                {fabYearOptions
                  .filter((y) => !prodYearStart || y >= Number(prodYearStart))
                  .map((y) => (
                    <option key={`fab-e-${y}`} value={String(y)}>
                      {y}
                    </option>
                  ))}
              </select>
              <p className="mt-1 m-0 text-[11px] text-hf-muted">
                Fabricação do modelo ≠ período da peça na aplicação. Define os anos das configs.
              </p>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando…' : isNew ? 'Criar modelo' : 'Salvar modelo'}
            </Button>
            {!isNew ? (
              <Button
                type="button"
                variant="light"
                disabled={busy}
                onClick={() => void toggleModelStatus()}
              >
                {status === 'active' ? 'Inativar' : 'Ativar'}
              </Button>
            ) : null}
          </div>
        </div>
      </form>

      {!isNew ? (
        <div className="space-y-2 rounded-[12px] border border-hf-line bg-hf-surface p-3">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
            3. Identificações — Versão → Motor → Período ({activeVersionCount}
            {versions.length !== activeVersionCount
              ? ` ativas · ${versions.length} total`
              : ''}
            )
          </p>
          <p className="m-0 text-[11px] text-hf-muted">
            {VEHICLE_HIERARCHY_SHORT}. Uma linha = uma versão + motor + período do veículo.
            Período da aplicação (peça) é outro intervalo, na ficha do produto.
          </p>

          <form
            onSubmit={(e) => void saveVersion(e)}
            className="grid gap-2 rounded-[10px] border border-hf-line bg-hf-bg/40 p-2 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <Input
                label="Versão (vazio = todas)"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                list="vv-version-suggest"
                placeholder="Ex.: Sense Plus"
              />
              <datalist id="vv-version-suggest">
                {versionSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <p className="mt-1 m-0 text-[11px] text-hf-muted">
                Uma versão por linha. Não junte vários nomes com /.
              </p>
            </div>
            <div>
              <Input
                label="Motor (vazio = todos)"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                list="vv-engine-suggest"
                placeholder="Ex.: 1.0"
                hint="Curto: 1.0, 1.0 Turbo, 1.6"
              />
              <datalist id="vv-engine-suggest">
                {engineSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="hidden md:block" aria-hidden />
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Ano início (período do veículo)</span>
              <select
                className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                value={configYearStart}
                onChange={(e) => setConfigYearStart(e.target.value)}
                disabled={yearOptions.length === 0}
              >
                <option value="">—</option>
                {yearOptions.map((y) => (
                  <option key={`cs-${y}`} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Ano fim (vazio = vigente)</span>
              <select
                className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                value={configYearEnd}
                onChange={(e) => setConfigYearEnd(e.target.value)}
                disabled={yearOptions.length === 0}
              >
                <option value="">Vigente / aberto</option>
                {yearOptions.map((y) => (
                  <option key={`ce-${y}`} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              {yearOptions.length === 0 ? (
                <p className="mt-1 m-0 text-[11px] text-hf-muted">
                  Informe início de fabricação no modelo para habilitar os seletores.
                </p>
              ) : null}
            </label>
            <div className="md:col-span-2 rounded-[10px] border border-dashed border-hf-line bg-hf-surface/60 p-2">
              <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
                Opcionais (só se o veículo precisar)
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <Input
                    label="Geração"
                    value={generation}
                    onChange={(e) => setGeneration(e.target.value)}
                    list="vv-generation-suggest"
                    placeholder="Ex.: 2ª Geração Facelift"
                  />
                  <datalist id="vv-generation-suggest">
                    {generationSuggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Input
                    label="Combustível"
                    value={fuel}
                    onChange={(e) => setFuel(e.target.value)}
                    list="vv-fuel-suggest"
                    placeholder="Ex.: Diesel"
                  />
                  <datalist id="vv-fuel-suggest">
                    {fuelSuggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2 md:col-span-2">
              <Button type="submit" disabled={busy}>
                {editingVersionId ? 'Salvar identificação' : 'Criar identificação'}
              </Button>
              {editingVersionId ? (
                <Button
                  type="button"
                  variant="light"
                  disabled={busy}
                  onClick={() => resetVersionForm({ clearSticky: true })}
                >
                  Cancelar edição
                </Button>
              ) : null}
              <Button
                type="button"
                variant="light"
                disabled={busy}
                onClick={() => resetVersionForm({ clearSticky: true })}
              >
                Limpar formulário
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <Input
                label="Filtrar (qualquer termo)"
                value={configQ}
                onChange={(e) => setConfigQ(e.target.value)}
                placeholder="versão, motor…"
              />
            </div>
            <label className="mb-1 flex items-center gap-1.5 text-[11px] text-hf-muted">
              <input
                type="checkbox"
                checked={showInactiveConfigs}
                onChange={(e) => setShowInactiveConfigs(e.target.checked)}
              />
              Mostrar inativas
            </label>
          </div>

          <ul className="m-0 max-h-[28rem] list-none space-y-2 overflow-y-auto p-0">
            {filteredVersions.length === 0 ? (
              <li className="text-xs text-hf-muted">
                {versions.length === 0
                  ? 'Nenhuma configuração neste modelo.'
                  : 'Nenhuma config com este termo.'}
              </li>
            ) : (
              filteredVersions.map((v) => {
                const periodLabel =
                  formatVehicleAppYear({
                    yearStart: v.yearStart ?? v.year ?? null,
                    yearEnd: v.yearEnd ?? null,
                  }) ?? null
                const isEditing = editingVersionId === v.id
                return (
                  <li
                    key={v.id}
                    className={
                      isEditing
                        ? 'rounded-[10px] border border-hf-auth-link/40 bg-hf-auth-link/5 p-2.5'
                        : 'rounded-[10px] border border-hf-line bg-hf-bg/50 p-2.5'
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="m-0 text-sm font-semibold text-hf-ink">
                            {v.versionName?.trim() || (
                              <span className="font-medium text-hf-muted">Sem versão</span>
                            )}
                          </p>
                          {periodLabel ? (
                            <span className="rounded-md border border-hf-line bg-hf-surface px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-hf-ink">
                              {periodLabel}
                            </span>
                          ) : null}
                          <span
                            className={
                              v.status === 'active'
                                ? 'rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800'
                                : 'rounded-md bg-hf-line/60 px-1.5 py-0.5 text-[10px] font-semibold text-hf-muted'
                            }
                          >
                            {entityStatusLabel(v.status)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-hf-muted">
                          <span>
                            <span className="font-bold uppercase tracking-wide text-[10px]">
                              Motor
                            </span>{' '}
                            <span className="font-medium text-hf-ink">
                              {v.engine?.trim() || '—'}
                            </span>
                          </span>
                          {v.fuel?.trim() ? (
                            <span>
                              <span className="font-bold uppercase tracking-wide text-[10px]">
                                Combustível
                              </span>{' '}
                              <span className="font-medium text-hf-ink">{v.fuel.trim()}</span>
                            </span>
                          ) : null}
                          {v.generation?.trim() ? (
                            <span>
                              <span className="font-bold uppercase tracking-wide text-[10px]">
                                Geração
                              </span>{' '}
                              <span className="font-medium text-hf-ink">
                                {v.generation.trim()}
                              </span>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <span className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          className="text-left text-[11px] font-semibold text-hf-auth-link"
                          onClick={() => startEditVersion(v)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-left text-[11px] font-semibold text-hf-muted"
                          disabled={busy}
                          onClick={() => {
                            const next = v.status === 'active' ? 'inactive' : 'active'
                            setBusy(true)
                            void adminSetVersionStatus(v.id, next)
                              .then(async () => {
                                setVersions(await adminListVersions(modelId))
                                setMessage(
                                  next === 'active'
                                    ? 'Configuração ativada.'
                                    : 'Configuração inativada.',
                                )
                              })
                              .catch((err) => setError(String(err)))
                              .finally(() => setBusy(false))
                          }}
                        >
                          {v.status === 'active' ? 'Inativar' : 'Ativar'}
                        </button>
                      </span>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
          {prodYearStart || prodYearEnd ? (
            <p className="m-0 text-[11px] text-hf-muted">
              Linha de fabricação:{' '}
              {formatVehicleAppYear({
                yearStart: prodYearStart.trim() ? Number(prodYearStart) : null,
                yearEnd: prodYearEnd.trim() ? Number(prodYearEnd) : null,
              }) ?? '—'}
            </p>
          ) : null}
          <div className="rounded-[10px] border border-dashed border-hf-line bg-hf-bg/40 p-2.5">
            <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
              Preview do formulário
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold text-hf-ink">
                {versionName.trim() || (
                  <span className="font-medium text-hf-muted">Sem versão</span>
                )}
              </span>
              {(configYearStart || configYearEnd) && (
                <span className="rounded-md border border-hf-line bg-hf-surface px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                  {formatVehicleAppYear({
                    yearStart: configYearStart.trim() ? Number(configYearStart) : null,
                    yearEnd: configYearEnd.trim() ? Number(configYearEnd) : null,
                  }) ?? '—'}
                </span>
              )}
            </div>
            <p className="mb-0 mt-1 text-[11px] text-hf-muted">
              Motor{' '}
              <span className="font-medium text-hf-ink">{engine.trim() || '—'}</span>
              {fuel.trim() ? (
                <>
                  {' · '}Combustível{' '}
                  <span className="font-medium text-hf-ink">{fuel.trim()}</span>
                </>
              ) : null}
              {generation.trim() ? (
                <>
                  {' · '}Geração{' '}
                  <span className="font-medium text-hf-ink">{generation.trim()}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : (
        <p className="m-0 text-xs text-hf-muted">
          Salve o modelo para cadastrar identificações (versão → motor → período).
        </p>
      )}
    </div>
  )
}
