import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import { CODIGO_REFERENCIA_LABEL } from '@/lib/productLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminApplyImageSkuImport,
  adminPreviewImageSkuImport,
  type ImageSkuMatchRow,
} from '@/services/admin/adminImageSkuImportService'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type Phase = 'idle' | 'preview' | 'running' | 'done'

export function AdminImageSkuImportPage() {
  const { push } = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [preview, setPreview] = useState<ImageSkuMatchRow[] | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skipIfHasImage, setSkipIfHasImage] = useState(true)
  const [progress, setProgress] = useState<{ done: number; total: number; current: string | null }>({
    done: 0,
    total: 0,
    current: null,
  })
  const [report, setReport] = useState<{ ok: number; skip: number; error: number } | null>(null)

  const counts = useMemo(() => {
    if (!preview) return null
    return {
      ok: preview.filter((r) => r.status === 'ok').length,
      skip: preview.filter((r) => r.status === 'skip').length,
      error: preview.filter((r) => r.status === 'error').length,
    }
  }, [preview])

  async function onPick(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    setError(null)
    setReport(null)
    setPhase('idle')
    try {
      const arr = Array.from(list)
      setFiles(arr)
      const rows = await adminPreviewImageSkuImport(arr, { skipIfHasImage })
      setPreview(rows)
      setPhase('preview')
    } catch (err) {
      setPreview(null)
      const msg = toUserMessage(err, 'Falha ao analisar arquivos')
      setError(msg)
      push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onApply() {
    if (!preview?.length || !files.length) return
    setBusy(true)
    setError(null)
    setPhase('running')
    setProgress({ done: 0, total: preview.filter((r) => r.status === 'ok').length, current: null })
    try {
      const result = await adminApplyImageSkuImport(files, preview, (p) =>
        setProgress({ done: p.done, total: p.total, current: p.currentFile }),
      )
      setPreview(result.rows)
      setReport({ ok: result.ok, skip: result.skip, error: result.error })
      setPhase('done')
      push(
        `Imagens: ${result.ok} enviada(s), ${result.skip} pulada(s), ${result.error} erro(s)`,
        result.error ? 'error' : 'success',
      )
    } catch (err) {
      const msg = toUserMessage(err, 'Falha ao enviar imagens')
      setError(msg)
      push(msg, 'error')
      setPhase('preview')
    } finally {
      setBusy(false)
    }
  }

  const pct =
    progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-hf-ink">Importar imagens por código</h1>
        <p className="mt-1 max-w-2xl text-sm text-hf-muted">
          Selecione várias fotos. O nome do arquivo deve ser o {CODIGO_REFERENCIA_LABEL} (SKU), o
          código do fabricante ou uma referência cadastrada (ex.: <code>SKU.jpg</code>,{' '}
          <code>SKU_1.png</code>).
        </p>
        <p className="mt-1">
          <Link to="/admin/produtos/importacoes" className="text-sm font-semibold text-hf-red underline">
            ← Hub de importações
          </Link>
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-hf-ink">
        <input
          type="checkbox"
          checked={skipIfHasImage}
          disabled={busy}
          onChange={(e) => setSkipIfHasImage(e.target.checked)}
        />
        Pular produtos que já têm imagem
      </label>

      <div className="rounded-hf border border-hf-line bg-hf-surface p-4">
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={(e) => void onPick(e.target.files)}
        />
      </div>

      {error ? (
        <p className="rounded-hf border border-hf-danger/40 bg-hf-danger/10 px-3 py-2 text-sm text-hf-danger">
          {error}
        </p>
      ) : null}

      {counts ? (
        <p className="text-sm text-hf-muted">
          Prévia: {counts.ok} prontos · {counts.skip} pulados · {counts.error} erros · {files.length}{' '}
          arquivo(s)
        </p>
      ) : null}

      {phase === 'running' ? (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-hf-surface-2">
            <div className="h-full bg-hf-red transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-hf-muted">
            {progress.done}/{progress.total}
            {progress.current ? ` — ${progress.current}` : ''}
          </p>
        </div>
      ) : null}

      {report ? (
        <p className="text-sm font-semibold text-hf-ink">
          Resultado: {report.ok} ok · {report.skip} skip · {report.error} erro
        </p>
      ) : null}

      {preview?.length ? (
        <div className="overflow-x-auto rounded-hf border border-hf-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-hf-surface-2 text-hf-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Arquivo</th>
                <th className="px-3 py-2 font-semibold">Chave</th>
                <th className="px-3 py-2 font-semibold">Produto</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Msg</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r) => (
                <tr key={r.fileName} className="border-t border-hf-line">
                  <td className="px-3 py-2 font-mono text-xs">{r.fileName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.key ?? '—'}</td>
                  <td className="px-3 py-2">{r.productLabel ?? '—'}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2 text-hf-muted">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={busy || !preview?.some((r) => r.status === 'ok')}
          onClick={() => void onApply()}
        >
          Enviar imagens prontas
        </Button>
      </div>
    </div>
  )
}
