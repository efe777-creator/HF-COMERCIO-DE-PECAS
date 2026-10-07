import { Button } from '@/components/common/Button'
import { PageShell } from '@/components/layout/PageShell'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateTime } from '@/lib/datetime'
import {
  adminApplyApplicationsImport,
  adminCreateApplicationsImport,
  adminPreviewApplicationsImport,
  type ApplicationPreviewRow,
  type ApplicationsImportApplyResult,
} from '@/services/admin/adminApplicationsImportService'
import { delimiterLabel } from '@/services/import'
import { useState } from 'react'
import { Link } from 'react-router-dom'

function canImport(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

const ACTION_LABEL: Record<ApplicationPreviewRow['action'], string> = {
  found: 'Já cadastrado',
  new: 'Novo cadastro',
  update: 'Será atualizado',
  already_covered: 'Já contemplado',
  review: 'Precisa de revisão',
  error: 'Erro',
}

type Phase = 'idle' | 'preview' | 'confirm' | 'done'

export function AdminApplicationsImportPage() {
  const { user } = useAuth()
  const allowed = canImport(user?.role)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [delimiter, setDelimiter] = useState<string | null>(null)
  const [preview, setPreview] = useState<ApplicationPreviewRow[] | null>(null)
  const [importId, setImportId] = useState<string | null>(null)
  const [showOnlyIssues, setShowOnlyIssues] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [report, setReport] = useState<ApplicationsImportApplyResult | null>(null)
  const [appliedAt, setAppliedAt] = useState<string | null>(null)

  async function onFile(file: File) {
    setBusy(true)
    setError(null)
    setPreview(null)
    setImportId(null)
    setReport(null)
    setPhase('idle')
    try {
      setFileName(file.name)
      const { rows, delimiter: d, fileErrors } = await adminPreviewApplicationsImport(file)
      setDelimiter(d)
      if (fileErrors.length) {
        setError(fileErrors.join(' · '))
        return
      }
      if (rows.length === 0) {
        setError('Arquivo sem linhas de dados')
        return
      }
      const id = await adminCreateApplicationsImport({
        filename: file.name,
        createdBy: user?.id ?? null,
        rows,
      })
      setImportId(id)
      setPreview(rows)
      setPhase('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao ler arquivo')
    } finally {
      setBusy(false)
    }
  }

  async function onConfirm() {
    if (!importId) return
    setBusy(true)
    setError(null)
    try {
      const result = await adminApplyApplicationsImport(importId)
      setReport(result)
      setAppliedAt(new Date().toISOString())
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar importação')
      setPhase('preview')
    } finally {
      setBusy(false)
    }
  }

  const visible = preview
    ? showOnlyIssues
      ? preview.filter((r) => r.action === 'error' || r.action === 'review')
      : preview
    : []

  const summary = preview
    ? {
        productExisting: preview.filter((r) => r.productExists && r.applyable).length,
        productMissing: preview.filter((r) => r.action === 'error' && !r.productExists).length,
        appNew: preview.filter((r) => r.action === 'new').length,
        appUpdate: preview.filter((r) => r.action === 'update').length,
        covered: preview.filter((r) => r.action === 'already_covered').length,
        review: preview.filter((r) => r.action === 'review').length,
        error: preview.filter((r) => r.action === 'error').length,
        applyable: preview.filter((r) => r.applyable).length,
      }
    : null

  return (
    <PageShell
      title="Importar aplicações"
      description="Código referência, montadora, modelo, versão e anos. O produto precisa existir — esta importação não cria cadastro de produto."
      actions={
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link to="/admin/produtos/importar" className="text-hf-ink">
            Cadastro de produtos →
          </Link>
          <Link to="/admin/produtos/importar-hf" className="text-hf-ink">
            Arquivo HF completo →
          </Link>
        </div>
      }
    >
      {!allowed ? (
        <p className="text-sm text-red-600">
          Somente administrador ou gerente podem importar aplicações.
        </p>
      ) : (
        <div className="space-y-4">
          {phase !== 'done' ? (
            <label className="block rounded-[12px] border border-dashed border-hf-line bg-hf-surface p-4 text-sm">
              <span className="mb-2 block font-semibold text-hf-ink">Arquivo CSV ou Excel</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                disabled={busy || phase === 'confirm'}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onFile(f)
                }}
              />
              {fileName ? (
                <p className="mt-2 text-hf-muted">
                  {fileName}
                  {delimiter ? ` · separador ${delimiterLabel(delimiter as ';' | ',' | '\t')}` : null}
                </p>
              ) : null}
            </label>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {phase === 'done' && report ? (
            <div className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4">
              <h2 className="m-0 text-lg font-extrabold text-hf-ink">Importação concluída</h2>
              <p className="m-0 text-sm text-hf-muted">
                Arquivo: {fileName ?? '—'}
                {appliedAt ? ` · ${formatDateTime(appliedAt)}` : null}
                {user?.email ? ` · ${user.email}` : null}
              </p>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="m-0 font-semibold text-hf-ink">Produtos</p>
                  <ul className="mt-1 list-disc pl-5 text-hf-muted">
                    <li>Criados: {report.created_products}</li>
                    <li>Já cadastrados: {report.existing_products}</li>
                  </ul>
                </div>
                <div>
                  <p className="m-0 font-semibold text-hf-ink">Aplicações</p>
                  <ul className="mt-1 list-disc pl-5 text-hf-muted">
                    <li>Criadas: {report.created_applications}</li>
                    <li>Atualizadas: {report.updated_applications}</li>
                    <li>Já contempladas: {report.already_covered}</li>
                  </ul>
                </div>
                <div>
                  <p className="m-0 font-semibold text-hf-ink">Veículos</p>
                  <ul className="mt-1 list-disc pl-5 text-hf-muted">
                    <li>
                      Montadoras novas / existentes: {report.created_manufacturers} /{' '}
                      {report.existing_manufacturers}
                    </li>
                    <li>
                      Modelos novos / existentes: {report.created_models} / {report.existing_models}
                    </li>
                    <li>
                      Versões novas / existentes: {report.created_versions} /{' '}
                      {report.existing_versions}
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="m-0 font-semibold text-hf-ink">Não aplicados</p>
                  <ul className="mt-1 list-disc pl-5 text-hf-muted">
                    <li>Revisão: {report.skipped_review}</li>
                    <li>Erros: {report.skipped_error}</li>
                    <li>Total processado: {report.total_processed}</li>
                  </ul>
                </div>
              </div>
              {(report.skipped_review > 0 || report.skipped_error > 0) && (
                <p className="m-0 text-sm text-hf-muted">
                  Itens em revisão ou com erro não foram gravados. Corrija o arquivo ou o cadastro
                  de veículos e importe novamente.
                </p>
              )}
              <Button
                variant="light"
                onClick={() => {
                  setPhase('idle')
                  setPreview(null)
                  setImportId(null)
                  setReport(null)
                  setFileName(null)
                  setError(null)
                }}
              >
                Nova importação
              </Button>
            </div>
          ) : null}

          {summary && phase !== 'done' ? (
            <div className="rounded-[12px] border border-hf-line bg-hf-surface p-4 text-sm">
              <p className="m-0 font-semibold text-hf-ink">Resumo da prévia</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="m-0 text-hf-muted">Produtos (referência)</p>
                  <ul className="mt-1 list-disc pl-5">
                    <li>Já cadastrados (ok): {summary.productExisting}</li>
                    <li>Não cadastrados (erro): {summary.productMissing}</li>
                  </ul>
                </div>
                <div>
                  <p className="m-0 text-hf-muted">Aplicações</p>
                  <ul className="mt-1 list-disc pl-5">
                    <li>Novas: {summary.appNew}</li>
                    <li>Atualizadas: {summary.appUpdate}</li>
                    <li>Já contempladas: {summary.covered}</li>
                    <li>Revisão: {summary.review}</li>
                    <li>Erros: {summary.error}</li>
                  </ul>
                </div>
              </div>
              <p className="mt-3 mb-0 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3">
                Nenhuma alteração foi feita até a confirmação.
              </p>
            </div>
          ) : null}

          {preview && phase !== 'done' ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOnlyIssues}
                onChange={(e) => setShowOnlyIssues(e.target.checked)}
              />
              Mostrar só revisão e erros
            </label>
          ) : null}

          {visible.length > 0 && phase !== 'done' ? (
            <div className="overflow-x-auto rounded-[14px] border border-hf-line bg-hf-surface">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-hf-line bg-hf-bg text-xs uppercase text-hf-muted">
                  <tr>
                    <th className="px-2 py-2">Linha</th>
                    <th className="px-2 py-2">Código referência</th>
                    <th className="px-2 py-2">Montadora</th>
                    <th className="px-2 py-2">Modelo</th>
                    <th className="px-2 py-2">Versão</th>
                    <th className="px-2 py-2">Anos</th>
                    <th className="px-2 py-2">Situação</th>
                    <th className="px-2 py-2">Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r, idx) => (
                    <tr
                      key={`${r.lineNumber}-${r.versao}-${idx}`}
                      className="border-b border-hf-line last:border-0"
                    >
                      <td className="px-2 py-1.5">{r.lineNumber}</td>
                      <td className="px-2 py-1.5 font-medium">{r.sku}</td>
                      <td className="px-2 py-1.5">{r.montadora}</td>
                      <td className="px-2 py-1.5">{r.modelo}</td>
                      <td className="px-2 py-1.5">{r.versao || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        {r.yearStart ?? '—'}
                        {' → '}
                        {r.yearEnd ?? 'vigente'}
                      </td>
                      <td className="px-2 py-1.5">{ACTION_LABEL[r.action]}</td>
                      <td className="px-2 py-1.5 text-hf-muted">{r.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {busy ? <p className="text-sm text-hf-muted">Processando…</p> : null}

          {phase === 'preview' && summary ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                disabled={busy || summary.applyable === 0}
                onClick={() => setPhase('confirm')}
              >
                Revisar e confirmar
              </Button>
            </div>
          ) : null}

          {phase === 'confirm' ? (
            <div className="rounded-[14px] border border-hf-line/20 bg-hf-surface p-4 shadow-sm">
              <h2 className="m-0 text-lg font-extrabold text-hf-ink">Confirmar importação?</h2>
              <p className="mt-2 text-sm text-hf-muted">
                Esta ação irá aplicar as alterações aprovadas ao catálogo (
                {summary?.applyable ?? 0} item(ns)). Itens em revisão ou com erro não serão
                gravados.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="light" disabled={busy} onClick={() => setPhase('preview')}>
                  Voltar para revisão
                </Button>
                <Button variant="primary" disabled={busy} onClick={() => void onConfirm()}>
                  {busy ? 'Aplicando…' : 'Confirmar importação'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </PageShell>
  )
}
