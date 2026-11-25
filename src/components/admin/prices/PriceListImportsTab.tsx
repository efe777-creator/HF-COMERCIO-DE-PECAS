import { Button } from '@/components/common/Button'
import { formatDateTime } from '@/lib/datetime'
import type {
  PriceListImportDetail,
  PriceListImportSummary,
} from '@/services/admin/adminPriceListService'
import { Link } from 'react-router-dom'

type Props = {
  allowed: boolean
  imports: PriceListImportSummary[]
  importDetail: PriceListImportDetail | null
  onOpenWizard: () => void
  onOpenDetail: (importId: string) => void
  onCloseDetail: () => void
}

export function PriceListImportsTab({
  allowed,
  imports,
  importDetail,
  onOpenWizard,
  onOpenDetail,
  onCloseDetail,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="m-0 text-lg font-extrabold text-hf-ink">Histórico de importações</h2>
            <p className="mt-1 text-sm text-hf-muted">
              Importações desta lista (kind=price_list / custo). Hub:{' '}
              <Link className="font-semibold text-hf-ink underline" to="/admin/importacoes">
                Importações
              </Link>
              .
            </p>
          </div>
          <Button type="button" disabled={!allowed} onClick={onOpenWizard}>
            Nova importação
          </Button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-hf-bg text-hf-muted">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Arquivo</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Linhas</th>
                <th className="px-3 py-2 text-right">Erros</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {imports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-hf-muted">
                    Nenhuma importação registrada para esta lista.
                  </td>
                </tr>
              ) : (
                imports.map((imp) => (
                  <tr key={imp.id} className="border-b border-hf-line/70">
                    <td className="px-3 py-2 text-xs">{formatDateTime(imp.createdAt)}</td>
                    <td className="px-3 py-2">{imp.filename}</td>
                    <td className="px-3 py-2">{imp.status}</td>
                    <td className="px-3 py-2 text-right">{imp.totalItems}</td>
                    <td className="px-3 py-2 text-right">{imp.errorItems}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="font-semibold text-hf-ink underline"
                        onClick={() => onOpenDetail(imp.id)}
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {importDetail ? (
        <div className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-base font-extrabold text-hf-ink">
              Detalhe · {importDetail.filename}
            </h3>
            <Button type="button" variant="light" onClick={onCloseDetail}>
              Fechar
            </Button>
          </div>
          <p className="mt-1 text-sm text-hf-muted">
            Status {importDetail.status} · {importDetail.totalItems} linhas ·{' '}
            {importDetail.errorItems} erros
          </p>
          {importDetail.items?.length ? (
            <div className="mt-3 max-h-64 overflow-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-hf-bg text-hf-muted">
                  <tr>
                    <th className="px-2 py-1">Linha</th>
                    <th className="px-2 py-1">SKU</th>
                    <th className="px-2 py-1">Resultado</th>
                    <th className="px-2 py-1">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {importDetail.items.slice(0, 80).map((row) => (
                    <tr key={row.id} className="border-b border-hf-line/50">
                      <td className="px-2 py-1">{row.lineNumber ?? '—'}</td>
                      <td className="px-2 py-1">
                        {String(row.payload?.sku ?? row.payload?.codigo ?? '—')}
                      </td>
                      <td className="px-2 py-1">{row.result ?? '—'}</td>
                      <td className="px-2 py-1 text-red-700">{row.errors.join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
