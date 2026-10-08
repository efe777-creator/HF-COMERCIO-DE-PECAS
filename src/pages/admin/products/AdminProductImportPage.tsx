import { Button } from '@/components/common/Button'
import { PageShell } from '@/components/layout/PageShell'
import { useAuth } from '@/contexts/AuthContext'
import {
  adminApplyCatalogImport,
  adminCreateCatalogImport,
  adminPreviewCatalogImport,
  type CatalogImportPreviewRow,
} from '@/services/admin/adminCatalogImportService'
import { delimiterLabel } from '@/services/import'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function canImportCatalog(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

export function AdminProductImportPage() {
  const { user } = useAuth()
  const allowed = canImportCatalog(user?.role)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [delimiter, setDelimiter] = useState<string | null>(null)
  const [preview, setPreview] = useState<CatalogImportPreviewRow[] | null>(null)
  const [importId, setImportId] = useState<string | null>(null)
  const [report, setReport] = useState<string | null>(null)
  const [showOnlyErrors, setShowOnlyErrors] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'preview' | 'confirm' | 'done'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function onFile(file: File) {
    setBusy(true)
    setError(null)
    setReport(null)
    setImportId(null)
    setPreview(null)
    setPhase('idle')
    try {
      setFileName(file.name)
      const { rows, delimiter: d, fileErrors } = await adminPreviewCatalogImport(file)
      setDelimiter(d)
      if (fileErrors.length) {
        setError(fileErrors.join(' · '))
        return
      }
      if (rows.length === 0) {
        setError('Arquivo sem linhas de dados')
        return
      }
      const id = await adminCreateCatalogImport({
        filename: file.name,
        createdBy: user?.id ?? null,
        rows,
      })
      setImportId(id)
      setPreview(rows)
      setPhase('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no preview')
    } finally {
      setBusy(false)
    }
  }

  async function onConfirm() {
    if (!importId) return
    setBusy(true)
    setError(null)
    try {
      const result = await adminApplyCatalogImport(importId)
      setReport(
        `Criados: ${result.created}. Atualizados: ${result.updated}. Ignorados: ${result.skipped}. ` +
          `(Categorias não são criadas na importação — cadastre em Admin → Categorias.)`,
      )
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar importação')
      setPhase('preview')
    } finally {
      setBusy(false)
    }
  }

  const validCount = preview?.filter((r) => r.ok).length ?? 0
  const visible = preview
    ? showOnlyErrors
      ? preview.filter((r) => !r.ok)
      : preview
    : []

  return (
    <PageShell
      title="Importar produtos (cadastro)"
      description="Código referência, nome, categoria, grupo, subgrupo, posição, lado e descrições. Sem montadora — aplicações são outra importação. Novos entram como rascunho e indisponíveis."
      actions={
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <a href="/moldes-importacao/01_produtos.csv" download className="text-hf-red-bright">
            Baixar molde
          </a>
          <Link to="/admin/produtos/importacoes" className="text-hf-ink">
            Hub ←
          </Link>
          <Link to="/admin/produtos/importar-aplicacoes" className="text-hf-ink">
            Aplicações →
          </Link>
          <Link to="/admin/produtos/importar-hf" className="text-hf-ink">
            Arquivo HF completo →
          </Link>
        </div>
      }
    >
      {!allowed ? (
        <p className="text-sm text-red-600">
          Somente administrador ou gerente podem importar o catálogo.
        </p>
      ) : (
        <div className="space-y-4">
          {phase !== 'done' ? (
            <div className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
              <h2 className="m-0 text-lg font-extrabold text-hf-ink">Arquivo de cadastro</h2>
              <p className="mt-1 text-sm text-hf-muted">
                Envie CSV ou Excel com código referência, nome, categoria, grupo (e opcionalmente
                subgrupo, posição, lado e descrições). SKUs repetidos no arquivo são consolidados
                em um produto. Produtos novos entram como rascunho e indisponíveis; a reimportação
                atualiza o cadastro sem alterar preço nem estoque.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                className="sr-only"
                disabled={busy || phase === 'confirm'}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onFile(f)
                  e.target.value = ''
                }}
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  disabled={busy || phase === 'confirm'}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {busy ? 'Lendo arquivo…' : 'Escolher arquivo e importar'}
                </Button>
                {fileName ? (
                  <p className="m-0 text-sm text-hf-muted">
                    {fileName}
                    {delimiter
                      ? ` · separador ${delimiterLabel(delimiter as ';' | ',' | '\t')}`
                      : null}
                  </p>
                ) : (
                  <p className="m-0 text-sm text-hf-muted">Nenhum arquivo selecionado</p>
                )}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {phase === 'done' && report ? (
            <div className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
              <h2 className="m-0 text-lg font-extrabold text-hf-ink">Importação concluída</h2>
              <p className="mt-2 text-sm">{report}</p>
              <Button
                className="mt-3"
                variant="light"
                onClick={() => {
                  setPhase('idle')
                  setPreview(null)
                  setImportId(null)
                  setReport(null)
                  setFileName(null)
                }}
              >
                Nova importação
              </Button>
            </div>
          ) : null}

          {preview && phase !== 'done' ? (
            <>
              <p className="rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3 text-sm">
                Nenhuma alteração foi feita até a confirmação. Válidos: {validCount}.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyErrors}
                  onChange={(e) => setShowOnlyErrors(e.target.checked)}
                />
                Mostrar só erros
              </label>
              <div className="overflow-x-auto rounded-[14px] border border-hf-line bg-hf-surface">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-hf-line bg-hf-bg text-xs uppercase text-hf-muted">
                    <tr>
                      <th className="px-2 py-2">Linha</th>
                      <th className="px-2 py-2">Código referência</th>
                      <th className="px-2 py-2">Nome</th>
                      <th className="px-2 py-2">Categoria</th>
                      <th className="px-2 py-2">Grupo</th>
                      <th className="px-2 py-2">Posição</th>
                      <th className="px-2 py-2">Lado</th>
                      <th className="px-2 py-2">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={r.sku} className="border-b border-hf-line last:border-0">
                        <td className="px-2 py-1.5">{r.lineNumber}</td>
                        <td className="px-2 py-1.5 font-medium">{r.sku}</td>
                        <td className="px-2 py-1.5">{r.name}</td>
                        <td className="px-2 py-1.5">{r.categoria}</td>
                        <td className="px-2 py-1.5">{r.grupo}</td>
                        <td className="px-2 py-1.5">{r.posicao ?? '—'}</td>
                        <td className="px-2 py-1.5">{r.lado ?? '—'}</td>
                        <td className="px-2 py-1.5">
                          {r.ok
                            ? r.action === 'create'
                              ? 'Novo cadastro'
                              : 'Será atualizado'
                            : r.message}
                          {r.warnings?.length ? (
                            <span className="mt-0.5 block text-xs text-amber-700">
                              {r.warnings.join(' ')}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {busy ? <p className="text-sm text-hf-muted">Processando…</p> : null}

          {phase === 'preview' ? (
            <Button
              variant="primary"
              disabled={busy || validCount === 0}
              onClick={() => setPhase('confirm')}
            >
              Revisar e confirmar
            </Button>
          ) : null}

          {phase === 'confirm' ? (
            <div className="rounded-[14px] border border-hf-line/20 bg-hf-surface p-4">
              <h2 className="m-0 text-lg font-extrabold">Confirmar importação?</h2>
              <p className="mt-2 text-sm text-hf-muted">
                Esta ação grava {validCount} produto(s) no catálogo (rascunho se novos).
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
