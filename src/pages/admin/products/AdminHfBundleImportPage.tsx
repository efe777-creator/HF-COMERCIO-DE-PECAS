import { Button } from '@/components/common/Button'
import { PageShell } from '@/components/layout/PageShell'
import { useAuth } from '@/contexts/AuthContext'
import {
  adminApplyHfBundleImport,
  adminCreateHfBundleImports,
  adminPreviewHfBundleImport,
  type HfBundleApplyResult,
} from '@/services/admin/adminHfBundleImportService'
import type { ApplicationPreviewRow } from '@/services/import/applicationImportCore'
import type { CatalogImportPreviewRow } from '@/services/admin/adminCatalogImportService'
import { useState } from 'react'
import { Link } from 'react-router-dom'

function canImport(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

export function AdminHfBundleImportPage() {
  const { user } = useAuth()
  const allowed = canImport(user?.role)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [products, setProducts] = useState<CatalogImportPreviewRow[] | null>(null)
  const [applications, setApplications] = useState<ApplicationPreviewRow[] | null>(null)
  const [productImportId, setProductImportId] = useState<string | null>(null)
  const [applicationImportId, setApplicationImportId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'idle' | 'preview' | 'confirm' | 'done'>('idle')
  const [result, setResult] = useState<HfBundleApplyResult | null>(null)

  async function onFile(file: File) {
    setBusy(true)
    setError(null)
    setResult(null)
    setPhase('idle')
    try {
      setFileName(file.name)
      const preview = await adminPreviewHfBundleImport(file)
      if (preview.fileErrors.length) {
        setError(preview.fileErrors.join(' · '))
        return
      }
      if (!preview.products.length) {
        setError('Arquivo sem produtos válidos')
        return
      }
      const ids = await adminCreateHfBundleImports({
        filename: file.name,
        createdBy: user?.id ?? null,
        products: preview.products,
        applications: preview.applications,
      })
      setProducts(preview.products)
      setApplications(preview.applications)
      setProductImportId(ids.productImportId)
      setApplicationImportId(ids.applicationImportId)
      setPhase('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao ler arquivo')
    } finally {
      setBusy(false)
    }
  }

  async function onConfirm() {
    if (!productImportId || !applicationImportId) return
    setBusy(true)
    setError(null)
    try {
      const r = await adminApplyHfBundleImport({
        productImportId,
        applicationImportId,
      })
      setResult(r)
      setPhase('done')
      if (r.applicationsError) setError(r.applicationsError)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar')
      setPhase('preview')
    } finally {
      setBusy(false)
    }
  }

  const prodOk = products?.filter((p) => p.ok).length ?? 0
  const appOk = applications?.filter((a) => a.applyable).length ?? 0

  return (
    <PageShell
      title="Importar arquivo HF (produto + aplicações)"
      description="Uma planilha completa: o sistema separa 1 cadastro por código referência e uma aplicação por linha. Produtos são gravados antes das aplicações."
      actions={
        <Link to="/admin/produtos/importar" className="text-sm font-semibold text-fal-navy">
          Só produtos →
        </Link>
      }
    >
      {!allowed ? (
        <p className="text-sm text-red-600">Somente administrador ou gerente.</p>
      ) : (
        <div className="space-y-4">
          {phase !== 'done' ? (
            <label className="block rounded-[12px] border border-dashed border-fal-line bg-white p-4 text-sm">
              <span className="mb-2 block font-semibold text-fal-navy">Arquivo CSV ou Excel</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                disabled={busy || phase === 'confirm'}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onFile(f)
                }}
              />
              {fileName ? <p className="mt-2 text-fal-muted">{fileName}</p> : null}
            </label>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {phase === 'preview' || phase === 'confirm' ? (
            <div className="rounded-[12px] border border-fal-line bg-white p-4 text-sm">
              <p className="m-0 font-semibold text-fal-navy">Resumo da prévia</p>
              <ul className="mt-2 list-disc pl-5">
                <li>Produtos (únicos): {products?.length ?? 0} — aplicáveis: {prodOk}</li>
                <li>Aplicações (linhas): {applications?.length ?? 0} — aplicáveis: {appOk}</li>
              </ul>
              <p className="mt-3 mb-0 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3">
                Nenhuma alteração foi feita até a confirmação. Na confirmação, produtos serão
                gravados antes das aplicações.
              </p>
              {products && products.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <p className="mb-2 font-semibold">Produtos (amostra)</p>
                  <table className="min-w-full text-left text-xs">
                    <thead className="border-b border-fal-line text-fal-muted uppercase">
                      <tr>
                        <th className="px-2 py-1">SKU</th>
                        <th className="px-2 py-1">Nome</th>
                        <th className="px-2 py-1">Posição</th>
                        <th className="px-2 py-1">Lado</th>
                        <th className="px-2 py-1">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.slice(0, 20).map((r) => (
                        <tr key={r.sku} className="border-b border-fal-line">
                          <td className="px-2 py-1 font-medium">{r.sku}</td>
                          <td className="px-2 py-1">{r.name}</td>
                          <td className="px-2 py-1">{r.posicao ?? '—'}</td>
                          <td className="px-2 py-1">{r.lado ?? '—'}</td>
                          <td className="px-2 py-1">{r.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === 'done' && result ? (
            <div className="space-y-2 rounded-[14px] border border-fal-line bg-white p-4 text-sm">
              <h2 className="m-0 text-lg font-extrabold">Importação concluída</h2>
              <p>
                Produtos — criados: {result.products.created}, atualizados:{' '}
                {result.products.updated}, categorias novas: {result.products.categories_created}
              </p>
              {result.applications ? (
                <p>
                  Aplicações — criadas: {result.applications.created_applications}, atualizadas:{' '}
                  {result.applications.updated_applications}, já contempladas:{' '}
                  {result.applications.already_covered}
                </p>
              ) : (
                <p className="text-fal-danger">
                  Cadastro gravado; aplicações não aplicadas. Corrija e use “Importar aplicações”.
                </p>
              )}
              <Button
                variant="light"
                onClick={() => {
                  setPhase('idle')
                  setProducts(null)
                  setApplications(null)
                  setResult(null)
                  setFileName(null)
                  setError(null)
                }}
              >
                Nova importação
              </Button>
            </div>
          ) : null}

          {busy ? <p className="text-sm text-fal-muted">Processando…</p> : null}

          {phase === 'preview' ? (
            <Button
              variant="primary"
              disabled={busy || prodOk === 0}
              onClick={() => setPhase('confirm')}
            >
              Revisar e confirmar
            </Button>
          ) : null}

          {phase === 'confirm' ? (
            <div className="rounded-[14px] border border-fal-navy/20 bg-white p-4">
              <h2 className="m-0 text-lg font-extrabold">Confirmar importação?</h2>
              <p className="mt-2 text-sm text-fal-muted">
                Produtos ({prodOk}) serão gravados primeiro; depois as aplicações ({appOk}).
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="light" disabled={busy} onClick={() => setPhase('preview')}>
                  Voltar para revisão
                </Button>
                <Button variant="primary" disabled={busy} onClick={() => void onConfirm()}>
                  Confirmar importação
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </PageShell>
  )
}
