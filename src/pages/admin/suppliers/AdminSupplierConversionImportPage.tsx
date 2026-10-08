import { Button } from '@/components/common/Button'
import { useAuth } from '@/contexts/AuthContext'
import {
  adminApplyConversionImport,
  adminCreateConversionImport,
  adminPreviewConversionImport,
  type ConversionImportPreviewRow,
} from '@/services/admin/adminConversionImportService'
import { adminListSuppliers } from '@/services/admin/adminSupplierService'
import { delimiterLabel, type CsvDelimiter } from '@/services/import'
import type { Supplier } from '@/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function canImport(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

export function AdminSupplierConversionImportPage() {
  const { user } = useAuth()
  const allowed = canImport(user?.role)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [delimiter, setDelimiter] = useState<string | null>(null)
  const [preview, setPreview] = useState<ConversionImportPreviewRow[] | null>(null)
  const [importId, setImportId] = useState<string | null>(null)
  const [report, setReport] = useState<string | null>(null)
  const [showOnlyErrors, setShowOnlyErrors] = useState(false)

  useEffect(() => {
    void (async () => {
      setLoadingSuppliers(true)
      try {
        const list = await adminListSuppliers()
        setSuppliers(list.filter((s) => s.status === 'active'))
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar fornecedores')
      } finally {
        setLoadingSuppliers(false)
      }
    })()
  }, [])

  function clearPreview() {
    setPreview(null)
    setImportId(null)
    setFileName(null)
    setDelimiter(null)
  }

  async function onFile(file: File) {
    if (!supplierId) {
      setError('Selecione o fornecedor antes do arquivo')
      return
    }
    setBusy(true)
    setError(null)
    setReport(null)
    clearPreview()
    try {
      setFileName(file.name)
      const { rows, delimiter: d, fileErrors } = await adminPreviewConversionImport({
        file,
        supplierId,
      })
      setDelimiter(d)
      if (fileErrors.length) {
        setError(fileErrors.join(' · '))
        return
      }
      if (rows.length === 0) {
        setError('Arquivo sem linhas de dados')
        return
      }
      setPreview(rows)
      const id = await adminCreateConversionImport({
        filename: file.name,
        supplierId,
        createdBy: user?.id ?? null,
        rows,
      })
      setImportId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no preview')
    } finally {
      setBusy(false)
    }
  }

  async function onConfirm() {
    if (!importId) return
    const valid = preview?.filter((r) => r.ok).length ?? 0
    if (valid === 0) return
    const supplierName = suppliers.find((s) => s.id === supplierId)?.name ?? 'fornecedor'
    const ok = window.confirm(
      `Confirmar ${valid} conversão(ões) para "${supplierName}"?\n\n` +
        `SKU FAL inexistente não cria produto.\n` +
        `Linhas com erro serão ignoradas.`,
    )
    if (!ok) return

    setBusy(true)
    setError(null)
    try {
      const result = await adminApplyConversionImport(importId)
      setReport(
        `Criadas: ${result.created}. Atualizadas: ${result.updated}. ` +
          `Falhas: ${result.failed}. Ignoradas: ${result.skipped}.`,
      )
      clearPreview()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar importação')
    } finally {
      setBusy(false)
    }
  }

  const validCount = preview?.filter((r) => r.ok).length ?? 0
  const invalidCount = preview?.filter((r) => !r.ok).length ?? 0
  const visible = preview
    ? showOnlyErrors
      ? preview.filter((r) => !r.ok)
      : preview
    : []

  return (
    <div className="space-y-4">
      <div>
        <Link to="/admin/fornecedores" className="text-sm font-semibold text-hf-ink underline">
          ← Voltar aos fornecedores
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-hf-ink">Importar conversões</h1>
          <a href="/moldes-importacao/04_conversoes_fornecedor.csv" download>
            <Button type="button" variant="light">
              Baixar molde
            </Button>
          </a>
        </div>
        <p className="mt-1 text-sm text-hf-muted">
          Formato: <code className="rounded bg-hf-bg px-1">codigo_fal;codigo_fornecedor</code>.
          Fornecedor obrigatório na tela (não inferido do arquivo). Persiste em{' '}
          <strong>supplier_products</strong> — não usa product_references.
        </p>
      </div>

      {!allowed ? (
        <p className="rounded-[14px] border border-hf-danger/40 bg-hf-surface-2 p-4 text-sm text-hf-danger">
          Somente administrador ou gerente podem importar conversões.
        </p>
      ) : (
        <div className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-extrabold text-hf-muted">Fornecedor *</span>
            <select
              className="w-full max-w-md rounded-[9px] border border-hf-line bg-hf-surface px-3 py-3"
              value={supplierId}
              disabled={busy || loadingSuppliers || Boolean(preview)}
              onChange={(e) => {
                setSupplierId(e.target.value)
                clearPreview()
                setReport(null)
              }}
            >
              <option value="">Selecione…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.code ? ` (${s.code})` : ''}
                </option>
              ))}
            </select>
          </label>

          <div>
            <h2 className="m-0 text-lg font-extrabold text-hf-ink">Arquivo</h2>
            <p className="mt-1 text-sm text-hf-muted">
              Upsert por código do fornecedor. SKU inexistente = erro (sem criar produto).
            </p>
            <input
              className="mt-3 block w-full text-sm"
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              disabled={busy || !supplierId}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onFile(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {report ? <p className="text-sm text-green-700">{report}</p> : null}

      {preview ? (
        <div className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-sm">
              Arquivo <strong>{fileName}</strong>
              {delimiter
                ? ` · delimitador ${delimiterLabel(delimiter as CsvDelimiter)}`
                : null}{' '}
              — válidos: {validCount}, inválidos: {invalidCount}
            </p>
            <label className="flex items-center gap-2 text-sm font-semibold text-hf-ink">
              <input
                type="checkbox"
                checked={showOnlyErrors}
                onChange={(e) => setShowOnlyErrors(e.target.checked)}
              />
              Somente erros
            </label>
          </div>

          <div className="max-h-80 overflow-auto rounded border border-hf-line text-xs">
            <table className="min-w-full">
              <thead>
                <tr className="bg-hf-bg text-left">
                  <th className="px-2 py-1">Linha</th>
                  <th className="px-2 py-1">SKU FAL</th>
                  <th className="px-2 py-1">Cód. fornecedor</th>
                  <th className="px-2 py-1">Ação</th>
                  <th className="px-2 py-1">Erros / avisos</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 100).map((r) => (
                  <tr key={r.line} className={r.ok ? '' : 'bg-hf-surface-2'}>
                    <td className="px-2 py-1">{r.line}</td>
                    <td className="px-2 py-1 font-mono">{r.sku || '—'}</td>
                    <td className="px-2 py-1 font-mono">{r.supplierSku || '—'}</td>
                    <td className="px-2 py-1">
                      {r.action === 'create'
                        ? 'Criar vínculo'
                        : r.action === 'update'
                          ? 'Atualizar'
                          : '—'}
                    </td>
                    <td className="px-2 py-1">
                      <span className="text-hf-danger">{r.errors.join('; ')}</span>
                      {r.warnings.length ? (
                        <span className="block text-amber-700">{r.warnings.join('; ')}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || validCount === 0 || !importId}
              onClick={() => void onConfirm()}
            >
              {busy ? 'Processando…' : `Confirmar importação (${validCount})`}
            </Button>
            <Button type="button" variant="light" disabled={busy} onClick={clearPreview}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}


